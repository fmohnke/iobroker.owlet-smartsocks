/* SPDX-License-Identifier: MIT */
'use strict';

const { REGION_INFO } = require('./region_info');

function assertOk(cond, msg) { if (!cond) throw new Error(msg); }

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'accept': 'application/json', ...(opts.headers||{}) },
    ...opts
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
    err.status = res.status; err.body = body || text;
    throw err;
  }
  return body;
}

function pickRegion(cfg, override) {
  if (override && typeof override === 'object') {
    const merged = { ...cfg, ...Object.fromEntries(Object.entries(override).filter(([_,v]) => v)) };
    return merged;
  }
  return cfg;
}

class OwletClientNode {
  constructor(region, email, password, override = {}) {
    this.region = (region || 'europe').toLowerCase();
    if (this.region === 'america') this.region = 'world';

    const baseCfg = REGION_INFO[this.region];
    assertOk(baseCfg, `Unsupported region: ${this.region}`);
    const cfg = pickRegion(baseCfg, override);

    this.url_base = cfg.url_base;
    this.url_mini = cfg.url_mini;
    this.url_signin = cfg.url_signin;
    this.apiKey   = cfg.apiKey;
    this.app_id   = cfg.app_id;
    this.app_secret = cfg.app_secret;

    for (const [k,v] of Object.entries({url_base:this.url_base,url_mini:this.url_mini,url_signin:this.url_signin,apiKey:this.apiKey,app_id:this.app_id,app_secret:this.app_secret})) {
      assertOk(v && !String(v).startsWith('<<'), `Region config ${k} missing for ${this.region}.`);
    }

    this.email = email;
    this.password = password;

    this.api_token = null;
    this.expiry    = 0;
    this.refresh   = null;
  }

  async passwordVerification() {
    const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${this.apiKey}`;
    const body = new URLSearchParams({ email: this.email, password: this.password, returnSecureToken: 'true' });
    const headers = {
      'X-Android-Package': 'com.owletcare.owletcare',
      'X-Android-Cert': '2A3BC26DB0B8B0792DBE28E6FFDC2598F9B12B74',
      'content-type': 'application/x-www-form-urlencoded'
    };
    const res = await fetch(url, { method: 'POST', headers, body });
    const j = await res.json().catch(() => ({}));
    if (res.status !== 200) {
      if (res.status === 400) {
        const message = (j && j.error && j.error.message) || '';
        const prefix = String(message).split(':')[0];
        switch (prefix) {
          case 'INVALID_LOGIN_CREDENTIALS': throw new Error('Invalid login credentials');
          case 'TOO_MANY_ATTEMPTS_TRY_LATER': throw new Error('Too many incorrect attempts');
          case 'API key not valid. Please pass a valid API key.':
          case 'MISSING_EMAIL':
          case 'MISSING_PASSWORD':
            throw new Error('Identitytoolkit API failure 400');
          default: throw new Error('Generic identitytoolkit error');
        }
      }
      if (res.status === 403) throw new Error('IdentityToolkit 403');
      if (res.status === 404) throw new Error('IdentityToolkit 404');
      throw new Error(`IdentityToolkit error ${res.status}`);
    }
    this.refresh = j.refreshToken;
  }

  async getMiniToken(id_token) {
    const headers = { 'Authorization': id_token };
    const j = await jsonFetch(this.url_mini, { headers });
    if (!j || !j.mini_token) throw new Error('mini_token missing');
    return j.mini_token;
  }

  async tokenSignIn(mini_token) {
    const j = await jsonFetch(this.url_signin, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app_id: this.app_id, app_secret: this.app_secret, provider: 'owl_id', token: mini_token })
    });
    if (!j || !j.access_token || !j.expires_in) throw new Error('signin failed');
    this.api_token = j.access_token;
    this.expiry = Math.floor(Date.now()/1000) - 60 + Number(j.expires_in);
  }

  async refreshAuthentication() {
    if (!this.refresh) throw new Error('No refresh token');
    const url = `https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`;
    const body = new URLSearchParams({ grantType: 'refresh_token', refreshToken: this.refresh });
    const headers = {
      'X-Android-Package': 'com.owletcare.owletcare',
      'X-Android-Cert': '2A3BC26DB0B8B0792DBE28E6FFDC2598F9B12B74',
      'content-type': 'application/x-www-form-urlencoded'
    };
    const res = await fetch(url, { method: 'POST', headers, body });
    const j = await res.json().catch(() => ({}));
    if (res.status !== 200) {
      if (res.status === 400) throw new Error('Refresh token not valid');
      throw new Error('Generic refresh error');
    }
    this.refresh = j.refresh_token || this.refresh;
    const id_token = j.id_token;
    const mini = await this.getMiniToken(id_token);
    await this.tokenSignIn(mini);
  }

  async authenticate() {
    const now = Math.floor(Date.now()/1000);
    if (!this.api_token || !this.expiry || this.expiry <= now) {
      if (!this.refresh) await this.passwordVerification();
      await this.refreshAuthentication();
    }
  }

  async _request(method, url, data=null) {
    await this.authenticate();
    const res = await fetch(this.url_base + url, {
      method,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': 'auth_token ' + this.api_token
      },
      body: data ? JSON.stringify(data) : undefined
    });
    if (res.status !== 200 && res.status !== 201) {
      const t = await res.text().catch(()=>'');
      throw new Error(`Owlet request failed ${res.status}: ${t}`);
    }
    return res.json();
  }

  async activate(dsn) {
    const data = { datapoint: { metadata: {}, value: 1 } };
    await this._request('POST', `/dsns/${encodeURIComponent(dsn)}/properties/APP_ACTIVE/datapoints.json`, data);
  }

  async getDevices(versions=[3,2]) {
    const api_response = await this._request('GET', '/devices.json');
    if (!Array.isArray(api_response)) throw new Error('Unexpected devices response');

    const valid = [];
    for (const d of api_response) {
      const dsn = d && d.device && d.device.dsn;
      if (!dsn) continue;
      try {
        const props = await this.getPropertiesRaw(dsn);
        const hasV3 = !!props.response['REAL_TIME_VITALS'];
        const hasV2 = !!props.response['CHARGE_STATUS'];
        if ((hasV3 && versions.includes(3)) || (hasV2 && versions.includes(2))) {
          valid.push(d);
        }
      } catch (_) { /* ignore */ }
    }
    if (!valid.length) throw new Error('No devices found');
    return { response: valid };
  }

  async getAllDevicesRaw() {
    const api_response = await this._request('GET', '/devices.json');
    if (!Array.isArray(api_response)) throw new Error('Unexpected devices response');
    return { response: api_response };
  }

  async getPropertiesRaw(dsn) {
    await this.activate(dsn);
    const api_response = await this._request('GET', `/dsns/${encodeURIComponent(dsn)}/properties.json`);
    const properties = {};
    for (const item of api_response) {
      if (item && item.property && item.property.name) {
        properties[item.property.name] = item.property;
      }
    }
    return { response: properties };
  }
}

module.exports = { OwletClientNode };
