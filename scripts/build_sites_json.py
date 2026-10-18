"""Fetch OHC /api/sites and write data/sites.json for the static app."""
from __future__ import annotations

import json
import re
import urllib.request

API = "https://openhousechicago.org/api/sites"
OUT = __file__.replace("scripts\\build_sites_json.py", "data\\sites.json").replace(
    "scripts/build_sites_json.py", "data/sites.json"
)


def parse_coords(raw: str | None) -> list[float] | None:
    if not raw:
        return None
    parts = [p.strip() for p in str(raw).split(",")]
    if len(parts) != 2:
        return None
    try:
        return [float(parts[0]), float(parts[1])]
    except ValueError:
        return None


def main():
    req = urllib.request.Request(API, headers={"User-Agent": "life-ops/chicago-build"})
    payload = json.loads(urllib.request.urlopen(req).read().decode())
    rows = []
    for item in payload["data"]:
        f = item["fields"]
        if f.get("Cancelled"):
            continue
        coords = parse_coords(f.get("Geocoordinates"))
        if not coords:
            continue
        addr = f.get("Site Address") or ""
        city = f.get("City") or "Chicago"
        state = f.get("State") or "IL"
        zipc = f.get("ZIP") or ""
        sat = (f.get("Saturday Hours") or "").strip()
        sun = (f.get("Sunday Hours") or "").strip()
        rows.append(
            {
                "id": item["id"],
                "name": f.get("Site") or "",
                "address": ", ".join(
                    x for x in [addr, f"{city}, {state} {zipc}".strip()] if x
                ),
                "note": (f.get("Visitor Experience") or f.get("Web Description") or "")
                .strip()[:1200],
                "siteType": f.get("Site Type") or "",
                "satHours": sat,
                "sunHours": sun,
                "hours": _hours_label(sat, sun),
                "url": f"https://openhousechicago.org/sites/{item['id']}",
                "coords": coords,
            }
        )
    rows.sort(key=lambda r: r["name"].lower())
    doc = {
        "meta": {
            "source": API,
            "count": len(rows),
            "syncedFrom": payload.get("meta", {}).get("syncedAt"),
        },
        "sites": rows,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2)
        fh.write("\n")
    print("wrote", OUT, "sites", len(rows))


def _hours_label(sat: str, sun: str) -> str:
    parts = []
    if sat:
        parts.append(f"Sat {sat}")
    else:
        parts.append("Sat Closed")
    if sun:
        parts.append(f"Sun {sun}")
    else:
        parts.append("Sun Closed")
    return "; ".join(parts)


if __name__ == "__main__":
    main()
