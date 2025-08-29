/* SPDX-License-Identifier: MIT */
'use strict';

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (['1','true','t','yes','y','on'].includes(s)) return true;
  if (['0','false','f','no','n','off'].includes(s)) return false;
  const n = Number(v);
  if (Number.isFinite(n)) return n !== 0;
  return null;
}
function toInt(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toFloat(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function makeCaseIndex(raw) {
  const idx = Object.create(null);
  if (!raw || typeof raw !== 'object') return idx;
  for (const k of Object.keys(raw)) idx[k.toUpperCase()] = k;
  return idx;
}
function getRawValCI(raw, idx, nameUpper) {
  const k = idx[nameUpper];
  const o = k ? raw[k] : undefined;
  return o && Object.prototype.hasOwnProperty.call(o, 'value') ? o.value : undefined;
}
function getRawObjCI(raw, idx, nameUpper) {
  const k = idx[nameUpper];
  return k ? raw[k] : undefined;
}

function fromRTV(value, updatedAt) {
  const out = {};
  if (typeof value === 'string') {
    try {
      const v = JSON.parse(value);
      if (v.ox !== undefined)   out.oxygen_saturation = toFloat(v.ox);
      if (v.hr !== undefined)   out.heart_rate = toFloat(v.hr);
      if (v.bat !== undefined)  out.battery_percentage = toFloat(v.bat);
      if (v.btt !== undefined)  out.battery_minutes = toFloat(v.btt);
      if (v.rsi !== undefined)  out.signal_strength = toFloat(v.rsi);
      if (v.oxta !== undefined) out.oxygen_10_av = toFloat(v.oxta);
      if (v.bso !== undefined)  out.base_station_on = toBool(v.bso);
      if (v.sc !== undefined)   out.sock_connection = toInt(v.sc);
      if (v.st !== undefined)   out.skin_temperature = toInt(v.st);
      if (v.ss !== undefined)   out.sleep_state = toInt(v.ss);
      if (v.mv !== undefined)   { out.movement = toInt(v.mv); out.moving = toBool(v.mv); }
      if (v.aps !== undefined)  out.alert_paused_status = toInt(v.aps);
      if (v.chg !== undefined)  out.charging = toBool(v.chg);
      if (v.alrt !== undefined) out.alerts_mask = toInt(v.alrt);
      if (v.ota !== undefined)  out.update_status = toInt(v.ota);
      if (v.srf !== undefined)  out.readings_flag = toInt(v.srf);
      if (v.sb !== undefined)   out.brick_status = toInt(v.sb);
      if (v.mvb !== undefined)  out.movement_bucket = toInt(v.mvb);
      if (v.onm !== undefined)  out.wellness_alert = toInt(v.onm);
      if (v.mst !== undefined)  out.monitoring_start_time = toInt(v.mst);
      if (v.bsb !== undefined)  out.base_battery_status = toInt(v.bsb);
      if (v.hw !== undefined)   out.hardware_version = String(v.hw);
    } catch {}
  }
  if (updatedAt) out.last_updated = String(updatedAt);
  return out;
}

function fromRaw(raw) {
  const out = {};
  const idx = makeCaseIndex(raw);

  const appActive = getRawValCI(raw, idx, 'APP_ACTIVE');
  if (appActive !== undefined) out.app_active = toBool(appActive);

  const BOOL_MAP = {
    high_oxygen_alert:        'HIGH_OX_ALRT',
    low_battery_alert:        'LOW_BATT_ALRT',
    low_heart_rate_alert:     'LOW_HR_ALRT',
    high_heart_rate_alert:    'HIGH_HR_ALRT',
    low_oxygen_alert:         'LOW_OX_ALRT',
    ppg_log_file:             'PPG_LOG_FILE',
    firmware_update_available:'FW_UPDATE_STATUS',
    lost_power_alert:         'LOST_POWER_ALRT',
    sock_disconnected:        'SOCK_DISCON_ALRT',
    sock_off:                 'SOCK_OFF',
    critical_battery_alert:   'CRIT_BATT_ALRT',
    critical_oxygen_alert:    'CRIT_OX_ALRT'
  };
  for (const [dst, srcU] of Object.entries(BOOL_MAP)) {
    const v = getRawValCI(raw, idx, srcU);
    if (v !== undefined) out[dst] = toBool(v);
  }

  const rtvObj = getRawObjCI(raw, idx, 'REAL_TIME_VITALS');
  if (rtvObj && typeof rtvObj.value === 'string') {
    Object.assign(out, fromRTV(rtvObj.value, rtvObj.data_updated_at));
  }

  if (out.signal_strength === undefined) {
    const v = getRawValCI(raw, idx, 'BLE_RSSI'); if (v !== undefined) out.signal_strength = toFloat(v);
  }
  if (out.base_station_on === undefined) {
    const v = getRawValCI(raw, idx, 'BASE_STATION_ON'); if (v !== undefined) out.base_station_on = toBool(v);
  }
  if (out.sock_connection === undefined) {
    const v = getRawValCI(raw, idx, 'SOCK_CONNECTION'); if (v !== undefined) out.sock_connection = toInt(v);
  }
  if (out.oxygen_saturation === undefined) {
    const v = getRawValCI(raw, idx, 'OXYGEN_LEVEL'); if (v !== undefined) out.oxygen_saturation = toInt(v);
  }
  if (out.heart_rate === undefined) {
    const v = getRawValCI(raw, idx, 'HEART_RATE'); if (v !== undefined) out.heart_rate = toInt(v);
  }
  if (out.battery_percentage === undefined) {
    const v = getRawValCI(raw, idx, 'BATT_LEVEL'); if (v !== undefined) out.battery_percentage = toInt(v);
  }
  if (out.movement === undefined) {
    const v = getRawValCI(raw, idx, 'MOVEMENT'); if (v !== undefined) { out.movement = toInt(v); out.moving = toBool(v); }
  }
  if (out.charging === undefined) {
    const v = getRawValCI(raw, idx, 'CHARGE_STATUS'); if (v !== undefined) out.charging = toBool(v);
  }
  if (out.update_status === undefined) {
    const v = getRawValCI(raw, idx, 'OTA_STATUS'); if (v !== undefined) out.update_status = toInt(v);
  }
  if (out.hardware_version === undefined) {
    const v = getRawValCI(raw, idx, 'OEM_SOCK_VERSION'); if (v !== undefined) out.hardware_version = String(v);
  }

  return out;
}

module.exports = { fromRaw };
