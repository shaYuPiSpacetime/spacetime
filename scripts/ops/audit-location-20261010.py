"""Read-only map configuration audit; never output keys, URLs or user locations."""
import json
import os
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone


def probe(key):
    if not key:
        return {"configured": False}
    # Public Shanghai fixture, identical to the existing location unit test.
    url = "https://apis.map.qq.com/ws/geocoder/v1/?" + urllib.parse.urlencode(
        {"location": "31.2304,121.4737", "key": key}
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.load(response)
        address = data.get("result", {}).get("address_component", {})
        return {"configured": True, "provider_status": data.get("status"),
                "fixture_city_matches": address.get("city") == "上海市"}
    except Exception:
        return {"configured": True, "request_failed": True}


try:
    inspected = subprocess.run(
        ["docker", "inspect", "spacetime-backend-prod"],
        capture_output=True, text=True, check=True,
    )
    values = json.loads(inspected.stdout)[0]["Config"]["Env"]
    runtime = dict(item.split("=", 1) for item in values if "=" in item)
    source_key = os.environ.get("TENCENT_MAP_KEY", "").strip()
    runtime_key = runtime.get("TENCENT_MAP_KEY", "").strip()
    source_result = probe(source_key)
    # Confirm consistency after provider-side quota changes, within the 5 QPS allowance.
    runtime_checks = [probe(runtime_key) for _ in range(3)]
    print(json.dumps({"checked_at_utc": datetime.now(timezone.utc).isoformat(),
                      "source": source_result, "runtime": runtime_checks[0],
                      "runtime_checks": runtime_checks,
                      "source_matches_runtime": bool(source_key) and source_key == runtime_key}))
except Exception:
    print(json.dumps({"audit_failed": True}))
    raise SystemExit(1)
