# Changelog

## 0.3.5
- Experimentelle Kamera-Erkennung entfernt (nur Socken).
- Python-Worker nutzt standardmäßig **System-`python3`**; venv ist optional (per Checkbox).
- Normalisierung: **case-insensitiv** für Sock-Properties inkl. `real_time_vitals`.
- README aktualisiert (venv als Fallback).

## 0.3.4
- Cast/Coercion vor `setState` für bestehende Objekttypen (Fix für Typ-Warnungen).
- Min/Max-Tracking nur noch bei numerischen Endwerten.
