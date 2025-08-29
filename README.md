# ioBroker.owlet-smartsocks (0.3.5)
SPDX-License-Identifier: MIT

Dieser ioBroker-Adapter bindet **Owlet Smart Socks** über die Cloud an.
- **Node.js-Modus (ohne Python)** – Standard
- **Python-Worker (optional)** mit `pyowletapi`

Der Adapter authentifiziert gegen Owlet/Ayla (EU/World), liest Geräteeigenschaften und Vitaldaten (SpO₂, Herzfrequenz, Akku, Bewegung, Laden, Alarme), normalisiert die Werte in strukturierte States und lernt für numerische Metriken Min/Max-Grenzen aus Real-Daten.

> **Hinweis:** Die experimentelle Kamera-Erkennung wurde in **0.3.5 entfernt**. Nur Socken werden unterstützt.

## Installation
```bash
cd /opt/iobroker/node_modules
git clone https://github.com/fmohnke/iobroker.owlet-smartsocks.git iobroker.owlet-smartsocks
iobroker upload owlet-smartsocks
iobroker add iobroker.owlet-smartsocks
```

## Update
```bash
cd /opt/iobroker/node_modules
git clone https://github.com/fmohnke/iobroker.owlet-smartsocks.git iobroker.owlet-smartsocks
iobroker upload owlet-smartsocks
iobroker restart owlet-smartsocks.<x>
```

## Konfiguration
- **Email/Passwort** deines Owlet-Kontos
- **Region**: europe (Standard) oder world
- **Polling-Intervall** in Sekunden
- **Implementierung**: Node.js (ohne Python) **oder** Python (Worker)

## Python-Worker (optional)
Standardmäßig nutzt der Adapter im Python-Modus **das System-`python3`** (keine venv erforderlich).
Wenn das bei dir nicht zuverlässig funktioniert (z. B. falsche Libs/Pfade), kannst du optional eine lokale **venv** verwenden:

```bash
cd /opt/iobroker/node_modules/iobroker.owlet-smartsocks
python3 -m venv venv
./venv/bin/pip install --upgrade pip
PIP_EXTRA_INDEX_URL= ./venv/bin/pip install -i https://pypi.org/simple --no-cache-dir pyowletapi aiohttp
```

Anschließend in der Instanz:
- **„Stattdessen lokale venv unter ./venv verwenden“** aktivieren
- (Optional) **Python-Binary** leer lassen oder explizit `python3` bzw. den Pfad eintragen

## Troubleshooting
- **Credentials-Fehler bei „world“**: Dein Konto liegt sehr wahrscheinlich im EU-Cluster → Region **europe**.
- **Worker-Spawn ENOENT**: venv nicht vorhanden oder Binary-Feld falsch → entweder **venv ausschalten** (System-`python3`) oder venv wie oben anlegen.
- **„received type X“ Warnungen**: Ab 0.3.4 werden Werte vor `setState` auf den Zieltyp gecastet; bei Alt-Objekten ggf. Objekt einmal löschen.

## Changelog
Siehe `CHANGELOG.md`.
