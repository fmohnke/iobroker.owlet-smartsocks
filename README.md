# ioBroker.owlet-smartsocks (0.3.4)
SPDX-License-Identifier: MIT

Dieser ioBroker-Adapter bindet Owlet Smart Socks über die Cloud an. Die Node.js-Variante kommt ohne Python aus; alternativ kann ein Python-Worker mit pyowletapi genutzt werden. Der Adapter authentifiziert gegen Owlet/Ayla (EU/World), liest Geräteeigenschaften und Vitaldaten (z. B. SpO₂, Herzfrequenz, Akku, Bewegung, Laden, Alarme), normalisiert die Werte in strukturierte States und lernt für numerische Metriken Min/Max-Grenzen aus Real-Daten. Lizenz: MIT.

## Installation
```bash
cd /opt/iobroker/node_modules
# aus GitHub clonen (empfohlen)
git clone https://github.com/fmohnke/iobroker.owlet-smartsocks.git iobroker.owlet-smartsocks
iobroker upload owlet-smartsocks
iobroker restart owlet-smartsocks.0
```

## Python-Worker (optional)
```bash
cd /opt/iobroker/node_modules/iobroker.owlet-smartsocks
python3 -m venv venv
./venv/bin/pip install --upgrade pip
PIP_EXTRA_INDEX_URL= ./venv/bin/pip install -i https://pypi.org/simple --no-cache-dir pyowletapi aiohttp
```
Instanz: Implementation **Python (Worker)**, Binary `/opt/iobroker/node_modules/iobroker.owlet-smartsocks/venv/bin/python`.

## Experimentelle Kamera-Erkennung
Aktiviere in der Instanz **„Experimentelle Kamera-Erkennung“**, damit der Adapter **alle Geräte** (nicht nur Socks) auflistet und deren Properties generisch erfasst.
- Für Geräte ohne Sock-Properties werden die Roh-Keys generisch normalisiert (`fromRawGeneric`); numerische Werte erhalten Min/Max-Lernen.
- Zusätzlich legt der Adapter unter `devices.<DSN>.raw` einen JSON-Dump der Roh-Properties ab, um ein Mapping zu verifizieren.
- Videostreams/Clips sind **nicht** Teil der Ayla-Properties und werden nicht unterstützt.

### 0.3.4
- Typ-Konvertierung vor `setState`: boolean/number/string werden passend zum Objekttyp geschrieben (verhindert Warnungen „received type X“).
- Min/Max nur noch für echte Zahlen aktualisiert.
