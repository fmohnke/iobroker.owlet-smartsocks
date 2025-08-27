# Changelog

## 0.3.1
- README überarbeitet: klare Anleitung für Node **und** Python-Worker.
- Live-Min/Max-Lernen für numerische Werte (`devices.<DSN>.meta.minmax.*`).
- `movement` (int) und `moving` (bool) als Alias ergänzt.
- `charging` in v3 als bool gemappt.

## 0.3.0
- Region-Konstanten (Europe/World) fest integriert (`lib/region_info.js`).
- Exaktes Mapping gemäß `PROPERTIES`, `VITALS_3`, `VITALS_2`, `VITALS_3_OTHER`.

## 0.2.1
- MIT-Lizenz + SPDX-Header hinzugefügt.
- Third-Party Notices für pyowletapi (MIT).

## 0.2.0
- Erste Node-only-Variante (ohne Python) + optionaler Python-Worker-Fallback.
