/* SPDX-License-Identifier: MIT */
'use strict';
const utils = require('@iobroker/adapter-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { OwletClientNode } = require('./lib/owlet_client_node');
const { fromRaw } = require('./lib/normalise');

const PROPERTY_META = {
  app_active: { type: 'boolean', role: 'indicator' },
  high_heart_rate_alert: { type: 'boolean', role: 'indicator.alarm' },
  high_oxygen_alert: { type: 'boolean', role: 'indicator.alarm' },
  low_battery_alert: { type: 'boolean', role: 'indicator.alarm' },
  low_heart_rate_alert: { type: 'boolean', role: 'indicator.alarm' },
  low_oxygen_alert: { type: 'boolean', role: 'indicator.alarm' },
  ppg_log_file: { type: 'boolean', role: 'indicator' },
  firmware_update_available: { type: 'boolean', role: 'indicator.update' },
  lost_power_alert: { type: 'boolean', role: 'indicator.alarm' },
  sock_disconnected: { type: 'boolean', role: 'indicator.alarm' },
  sock_off: { type: 'boolean', role: 'indicator' },
  oxygen_saturation: { type: 'number', role: 'value', unit: '%' },
  heart_rate: { type: 'number', role: 'value.bpm', unit: 'bpm' },
  moving: { type: 'boolean', role: 'indicator.working' },
  sock_connection: { type: 'number', role: 'value' },
  skin_temperature: { type: 'number', role: 'value.temperature', unit: '°C' },
  base_station_on: { type: 'boolean', role: 'indicator' },
  battery_percentage: { type: 'number', role: 'value.battery', unit: '%' },
  battery_minutes: { type: 'number', role: 'value', unit: 'min' },
  charging: { type: 'boolean', role: 'indicator.charge' },
  alert_paused_status: { type: 'number', role: 'value' },
  signal_strength: { type: 'number', role: 'value.signal' },
  sleep_state: { type: 'number', role: 'value' },
  oxygen_10_av: { type: 'number', role: 'value' },
  last_updated: { type: 'string', role: 'date' }
};

function sanitizeId(id) { return String(id).replace(/[^\w.-]+/g, '_'); }

function parseWorkerOutput(raw) {
  try { return JSON.parse(raw); }
  catch (_) {
    const lines = String(raw).trim().split('\n').reverse();
    for (const line of lines) { try { return JSON.parse(line.trim()); } catch {} }
    throw new Error('Worker output is not valid JSON');
  }
}

function coerceToType(val, targetType) {
  if (val === null || val === undefined) {
    if (targetType === 'string') return '';
    if (targetType === 'number') return null;
    return false;
  }
  switch (targetType) {
    case 'boolean': {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val !== 0;
      const s = String(val).trim().toLowerCase();
      return ['1','true','t','yes','y','on'].includes(s);
    }
    case 'number': {
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    }
    case 'string':
    default:
      return String(val);
  }
}

class OwletSmartSocks extends utils.Adapter {
  constructor(options = {}) {
    super({ ...options, name: 'owlet-smartsocks' });
    this.on('ready', this.onReady.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.pollTimer = null;
  }

  async onReady() {
    if (!this.config.email || !this.config.password) {
      this.log.error('Please configure email and password in the adapter settings.');
      return;
    }
    await this.setObjectNotExistsAsync('info.connection', { type:'state', common:{ name:'Connected', type:'boolean', role:'indicator.connected', read:true, write:false, def:false }, native:{} });
    await this.setObjectNotExistsAsync('info.devices', { type:'state', common:{ name:'Device count', type:'number', role:'value', read:true, write:false, def:0 }, native:{} });
    await this.setObjectNotExistsAsync('info.hasData', { type:'state', common:{ name:'Has data', type:'boolean', role:'indicator', read:true, write:false, def:false }, native:{} });
    await this.setObjectNotExistsAsync('info.lastPoll', { type:'state', common:{ name:'Last poll ISO time', type:'string', role:'date', read:true, write:false, def:'' }, native:{} });
    await this.setObjectNotExistsAsync('info.lastError', { type:'state', common:{ name:'Last error', type:'string', role:'text', read:true, write:false, def:'' }, native:{} });
    await this.setObjectNotExistsAsync('info.workerExitCode', { type:'state', common:{ name:'Worker exit code', type:'number', role:'value', read:true, write:false, def:0 }, native:{} });

    await this.setStateAsync('info.connection', false, true);

    const intSec = Math.max(5, Number(this.config.interval) || 10);
    await this.pollOnce();
    this.pollTimer = this.setInterval(() => this.pollOnce(), intSec * 1000);
  }

  onUnload(cb) {
    try { if (this.pollTimer) this.clearInterval(this.pollTimer); cb(); }
    catch { cb(); }
  }

  spawnWorker() {
    const script = path.join(__dirname, 'lib', 'owlet_worker.py');
    // Default: system python
    let pythonBin = this.config?.pythonBin || process.env.OWLET_PYTHON_BIN || 'python3';
    // Optional: venv override if requested
    if (this.config?.useVenv) {
      const venvPython = path.join(__dirname, 'venv', 'bin', 'python');
      if (fs.existsSync(venvPython)) {
        pythonBin = venvPython;
        this.log.info('Using local venv Python at ./venv/bin/python');
      } else {
        this.log.warn('useVenv enabled but ./venv/bin/python not found. Falling back to system python.');
      }
    }

    const args = [ script, '--email', this.config.email, '--password', this.config.password, '--region', (this.config.region || 'europe') ];
    if (this.config.debugWorker) args.push('--debug');

    this.log.info(`Using Python: ${pythonBin}`);
    this.log.debug(`Spawn worker: ${pythonBin} ${args.join(' ')}`);

    const child = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env, windowsHide: true });
    child.on('error', err => this.log.error(`Failed to spawn worker: ${err && err.message ? err.message : err}`));
    return child;
  }

  async pollOnce() {
    try {
      const nowIso = new Date().toISOString();
      await this.setStateAsync('info.lastPoll', nowIso, true);
      await this.setStateAsync('info.connection', false, true);

      const impl = (this.config.implementation || 'node').toLowerCase();
      let payload = null, code = 0, errMsg = '';

      if (impl === 'node') {
        try {
          const override = this.config.override || {};
          const client = new OwletClientNode(this.config.region || 'europe', this.config.email, this.config.password, override);
          const devicesResp = await client.getDevices([3,2]);
          const result = { devices: {} };
          for (const dev of devicesResp.response) {
            const info = dev.device || dev;
            const dsn = String(info.dsn || '').trim();
            const label = String(info.product_name || info.name || info.model || dsn);
            if (!dsn) continue;
            const propsResp = await client.getPropertiesRaw(dsn);
            const rawMap = propsResp.response || {};
            const norm = fromRaw(rawMap);
            result.devices[dsn] = { label, properties: norm };
          }
          payload = result;
        } catch (e) {
          code = 1; errMsg = e && e.message ? e.message : String(e);
        }
      } else {
        const child = this.spawnWorker();
        let out = '', err = '';
        child.stdout.on('data', d => { out += d.toString(); });
        child.stderr.on('data', d => { err += d.toString(); });
        code = await new Promise(resolve => child.on('close', resolve));
        try { if (out && out.trim()) payload = parseWorkerOutput(out); }
        catch (e) { errMsg = 'parse: ' + e.message; }
        if (err && err.trim()) errMsg = errMsg || err.slice(0, 1000);
      }

      await this.setStateAsync('info.workerExitCode', Number(code) || 0, true);
      if (errMsg) await this.setStateAsync('info.lastError', errMsg.slice(0, 1000), true);

      const devKeys = payload && payload.devices ? Object.keys(payload.devices) : [];
      await this.setStateAsync('info.devices', devKeys.length, true);
      await this.setStateAsync('info.connection', devKeys.length > 0, true);

      if (!payload || !payload.devices || devKeys.length === 0) {
        await this.setStateAsync('info.hasData', false, true);
        return;
      }

      await this.processPayload(payload);

      const hasValues = devKeys.some(dsn => {
        const d = payload.devices[dsn];
        return d && d.properties && Object.keys(d.properties).length > 0;
      });
      await this.setStateAsync('info.hasData', !!hasValues, true);
      if (hasValues) await this.setStateAsync('info.lastError', '', true);

    } catch (e) {
      this.log.error('pollOnce failed: ' + (e && e.stack ? e.stack : e));
      await this.setStateAsync('info.lastError', (e && e.message ? e.message : String(e)).slice(0, 1000), true);
      await this.setStateAsync('info.connection', false, true);
      await this.setStateAsync('info.hasData', false, true);
    }
  }

  async processPayload(data) {
    for (const [dsn, dev] of Object.entries(data.devices)) {
      const dsnId = sanitizeId(dsn);
      const base = `devices.${dsnId}`;

      await this.setObjectNotExistsAsync(base, {
        type:'channel',
        common:{ name: dev.label || String(dsn) },
        native:{ dsn: String(dsn) }
      });

      await this.setObjectNotExistsAsync(`${base}.label`, {
        type:'state',
        common:{ name:'Label', type:'string', role:'text', read:true, write:false },
        native:{}
      });
      await this.setStateAsync(`${base}.label`, dev.label || '', true);

      const props = dev.properties || {};
      for (const [key, val] of Object.entries(props)) {
        const id = `${base}.${key}`;
        const meta = (PROPERTY_META[key] || { type: (typeof val === 'number' ? 'number' : (typeof val === 'boolean' ? 'boolean' : 'string')), role: 'value' });

        const existingObj = await this.getObjectAsync(id);
        const targetType =
          (existingObj && existingObj.common && existingObj.common.type) ||
          (meta.type || (typeof val === 'number' ? 'number' : (typeof val === 'boolean' ? 'boolean' : 'string')));

        const obj = {
          type: 'state',
          common: { name: key, type: targetType, role: meta.role || 'value', read: true, write: false },
          native: {}
        };
        if (meta.unit) obj.common.unit = meta.unit;
        await this.setObjectNotExistsAsync(id, obj);
        if (existingObj && existingObj.common && existingObj.common.type !== targetType) {
          await this.extendObjectAsync(id, { common: { type: targetType } });
        }

        const coerced = coerceToType(val, targetType);
        if (!(targetType === 'number' && coerced === null)) {
          await this.setStateAsync(id, coerced, true);
        }

        if (targetType === 'number' && typeof coerced === 'number' && Number.isFinite(coerced)) {
          const mmBase = `${base}.meta.minmax.${key}`;
          await this.setObjectNotExistsAsync(`${base}.meta`, { type:'channel', common:{ name:'Meta' }, native:{} });
          await this.setObjectNotExistsAsync(`${base}.meta.minmax`, { type:'channel', common:{ name:'Min/Max learned' }, native:{} });
          await this.setObjectNotExistsAsync(mmBase + '.min', { type:'state', common:{ name:`${key} min`, type:'number', role:'value.min', read:true, write:false }, native:{} });
          await this.setObjectNotExistsAsync(mmBase + '.max', { type:'state', common:{ name:`${key} max`, type:'number', role:'value.max', read:true, write:false }, native:{} });

          const prevMin = await this.getStateAsync(mmBase + '.min');
          const prevMax = await this.getStateAsync(mmBase + '.max');
          const minVal = (prevMin && prevMin.val !== null && prevMin.val !== undefined)
            ? Math.min(Number(prevMin.val), coerced)
            : coerced;
          const maxVal = (prevMax && prevMax.val !== null && prevMax.val !== undefined)
            ? Math.max(Number(prevMax.val), coerced)
            : coerced;

          await this.setStateAsync(mmBase + '.min', minVal, true);
          await this.setStateAsync(mmBase + '.max', maxVal, true);
        }
      }
    }
  }
}

if (module && module.parent) {
  module.exports = (options) => new OwletSmartSocks(options);
} else {
  new OwletSmartSocks();
}
