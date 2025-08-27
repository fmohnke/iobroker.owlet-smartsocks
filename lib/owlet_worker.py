#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
import sys, json, asyncio, argparse, logging
from typing import Any, Dict

try:
    from pyowletapi.api import OwletAPI
    from pyowletapi.sock import Sock
except Exception as e:
    sys.stderr.write(f"ERROR: pyowletapi import failed: {e}\n")
    sys.exit(2)

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

async def run(email: str, password: str, region: str, no_filter: bool, debug: bool) -> int:
    if debug:
        logging.getLogger().setLevel(logging.DEBUG)
    api = OwletAPI(region=region, user=email, password=password)
    try:
        await api.authenticate()
        resp = await api.get_devices([3,2] if not no_filter else [3,2])
        devices = resp.get("response", [])
        out: Dict[str, Any] = {"devices": {}}
        for d in devices:
            info = d.get("device", d)
            dsn = str(info.get("dsn", "")).strip()
            label = str(info.get("product_name") or info.get("model") or dsn)
            if not dsn:
                continue
            sock = Sock(api, info)
            props = await sock.update_properties()
            norm = props.get("properties", {})
            out["devices"][dsn] = {"label": label, "properties": norm}
        sys.stdout.write(json.dumps(out, ensure_ascii=False))
        return 0
    finally:
        await api.close()

def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--region", default="europe", choices=["europe","world","america","china"])
    p.add_argument("--no-filter", action="store_true", help="Do not filter by Sock version")
    p.add_argument("--debug", action="store_true")
    args = p.parse_args(argv)
    if args.region == "america":
        args.region = "world"
    try:
        return asyncio.run(run(args.email, args.password, args.region, args.no_filter, args.debug))
    except Exception as e:
        sys.stderr.write(f"ERROR: {e}\n")
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
