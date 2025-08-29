# Changelog

## 0.3.4
- Cast/Coercion vor `setState` für bestehende Objekttypen (fix für `base_station_on`, `charging`, `alert_paused_status`).
- Min/Max-Tracking nur noch bei numerischen Endwerten.

## 0.3.3
- Node-Client: Fix `self is not defined` → `this.passwordVerification()` in `authenticate()`.
- Python-Worker: `--discover-cams` implementiert; generisches Mapping für Nicht-Sock-Geräte.
- Adapter: übergibt `--discover-cams` an den Worker bei aktivierter Kamera-Erkennung.

## 0.3.2
- Experimentelle „Cam Discovery“: listet alle Geräte, generisches Mapping für Nicht-Sock-Geräte; legt `devices.<DSN>.raw` mit Roh-JSON an.
- Admin: Checkbox „Experimentelle Kamera-Erkennung“.
- Node-Client: `getAllDevicesRaw()`.

## 0.3.1
- README überarbeitet, Min/Max-Lernen, movement/moving, charging(v3).

## 0.3.0
- Region-Konstanten gefixt, exaktes Mapping.
