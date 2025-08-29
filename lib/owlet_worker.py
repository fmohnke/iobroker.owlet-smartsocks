#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
import sys, json, asyncio, argparse, logging, re
from typing import Any, Dict

try:
    from pyowletapi.api import OwletAPI
    from pyowletapi.sock import Sock
except Exception as e:
    sys.stderr.write(f"ERROR: pyowletapi import failed: {e}\n")
    sys.exit(2)

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

def norm_key(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', (name or '').lower()).strip('_')

def parse_maybe(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (int, float, bool)):
        return v
    s = str(v).strip()
    if not s:
        return ""
    # try JSON scalar
    try:
        j = json.loads(s)
        if isinstance(j, (int, float, bool, str)):
            return j
    except Exception:
        pass
    # number?
    try:
        n = float(s)
        if n.is_integer():
            return int(n)
        return n
    except Exception:
        pass
    sl = s.lower()
    if sl in ("true","t","yes","y","on","1"):
        return True
    if sl in ("false","f","no","n","off","0"):
        return False
    return s

def from_raw_generic(raw: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if not isinstance(raw, dict):
        return out
    for k, obj in raw.items():
        key = norm_key(k)
        val = obj.get("value") if isinstance(obj, dict) else None
        out[key] = parse_maybe(val)
        if isinstance(obj, dict) and obj.get("data_updated_at"):
            out[key + "_updated_at"] = str(obj["data_updated_at"])
    return out

async def run(email: str, password: str, region: str, discover_cams: bool, debug: bool) -> int:
    if debug:
        logging.getLogger().setLevel(logging.DEBUG)
    api = OwletAPI(region=region, user=email, password=password)
    try:
        await api.authenticate()

        devices_list = []
        if discover_cams:
            api_response = await api._request("GET", "/devices.json")
            if isinstance(api_response, list):
                devices_list = api_response
        else:
            resp = await api.get_devices([3,2])
            devices_list = resp.get("response", [])

        out: Dict[str, Any] = {"devices": {}}
        for d in devices_list:
            info = d.get("device", d) if isinstance(d, dict) else {}
            dsn = str(info.get("dsn", "")).strip()
            label = str(info.get("product_name") or info.get("model") or dsn)
            if not dsn:
                continue

            try:
                props_resp = await api.get_properties(dsn)
                raw_map = props_resp.get("response", {})
            except Exception as e:
                sys.stderr.write(f"ERROR: get_properties failed for {dsn}: {e}\n")
                raw_map = {}

            is_sock = isinstance(raw_map, dict) and ("REAL_TIME_VITALS" in raw_map or "CHARGE_STATUS" in raw_map)
            if is_sock and not discover_cams:
                try:
                    sock = Sock(api, info)
                    props = await sock.update_properties()
                    norm = props.get("properties", {})
                except Exception as e:
                    sys.stderr.write(f"ERROR: sock.update_properties failed for {dsn}: {e}\n")
                    norm = from_raw_generic(raw_map)
            else:
                norm = from_raw_generic(raw_map)

            out["devices"][dsn] = {"label": label, "properties": norm, "kind": "sock" if is_sock else "other"}
            if not is_sock:
                out["devices"][dsn]["raw"] = raw_map

        sys.stdout.write(json.dumps(out, ensure_ascii=False))
        return 0
    finally:
        await api.close()

def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--region", default="europe", choices=["europe","world","america","china"])
    p.add_argument("--discover-cams", action="store_true", help="List and normalize all devices (generic for non-sock devices)")
    p.add_argument("--debug", action="store_true")
    args = p.parse_args(argv)
    if args.region == "america":
        args.region = "world"
    try:
        return asyncio.run(run(args.email, args.password, args.region, args.discover_cams, args.debug))
    except Exception as e:
        sys.stderr.write(f"ERROR: {e}\n")
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
