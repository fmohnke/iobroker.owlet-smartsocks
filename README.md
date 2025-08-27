# ioBroker.owlet-smartsocks (0.3.1)
SPDX-License-Identifier: MIT

## Varianten
- **Node.js (empfohlen):** läuft ohne Python/pyowletapi.
- **Python-Worker (optional):** nutzt pyowletapi.

## Installation
```bash
cd /opt/iobroker/node_modules
unzip -o ~/Downloads/iobroker.owlet-smartsocks-0.3.1-repo.zip
iobroker upload owlet-smartsocks
iobroker restart owlet-smartsocks.0
```

## Konfiguration
- **Implementation:** `Node.js (ohne Python)` oder `Python (Worker)`
- **Region:** `europe` oder `world`
- **E-Mail / Passwort**

### Node.js Regionen
`lib/region_info.js` enthält fertige Werte für `europe` und `world`. Overrides sind optional.

## Python-Variante
```bash
cd /opt/iobroker/node_modules/iobroker.owlet-smartsocks
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -i https://pypi.org/simple --no-cache-dir pyowletapi aiohttp
# notfalls aus GitHub:
# ./venv/bin/pip install --no-cache-dir git+https://github.com/ryanbdclark/pyowletapi.git
```
In der Instanz:
- Implementation = **Python (Worker)**
- Python-Binary = `/opt/iobroker/node_modules/iobroker.owlet-smartsocks/venv/bin/python`

Optionaler Test:
```bash
/opt/iobroker/node_modules/iobroker.owlet-smartsocks/venv/bin/python   /opt/iobroker/node_modules/iobroker.owlet-smartsocks/lib/owlet_worker.py   --email "<mail>" --password "<pass>" --region europe --debug
```

## States
`devices.<DSN>.*` enthält normalisierte Eigenschaften inkl. Min/Max-Lernen unter `devices.<DSN>.meta.minmax.*`.

## Lizenz
MIT. Drittkomponentenhinweise siehe `THIRD_PARTY_NOTICES.md`.
