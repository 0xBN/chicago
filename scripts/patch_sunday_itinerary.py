"""One-off: rebuild Sunday in data/itinerary.json from sites.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sites = {s["id"]: s for s in json.loads((ROOT / "data/sites.json").read_text())["sites"]}


def pick(site_id: str, time: str, duration: str, note: str, priority: str):
    s = sites[site_id]
    return {
        "name": s["name"],
        "time": time,
        "duration": duration,
        "note": note,
        "priority": priority,
        "address": s["address"],
        "hours": s["hours"],
        "url": s["url"],
        "coords": s["coords"],
    }


def backup(site_id: str, time: str, duration: str, note: str):
    return pick(site_id, time, duration, note, "backup")


itin = json.loads((ROOT / "data/itinerary.json").read_text())

itin["days"]["sun"] = [
    pick(
        "rec1I6bfnNiP1gQOL",
        "10:00",
        "50 min",
        "Tour four floors of forging, metalcasting, CNC, and woodworking at your own pace. "
        "Parking behind the building via the loading dock. Closes 3 PM.",
        "anchor",
    ),
    pick(
        "rectSaGCGUV1evJXU",
        "11:10",
        "50 min",
        "Mandatory guided tour: courtyard, recreation rooms, corridors, and pool. "
        "Main queue risk for the day — if 45+ min, skip and hit Park Castles + protect DANK (3 PM).",
        "anchor",
    ),
    pick(
        "recvykdc4aPNgBlCB",
        "12:10",
        "30 min",
        "Remarkable residential pool and courtyards. Quick but distinctive.",
        "optional",
    ),
    {
        "type": "break",
        "time": "12:40",
        "duration": "60 min",
        "name": "Lunch + travel",
        "note": "Rogers Park / West Ridge or southbound drive. Tight for sit-down + driving — expect slippage.",
    },
    pick(
        "recRTErBO34VwTpZr",
        "13:50",
        "45 min",
        "Six floors, ballroom, roof terrace. Self-guided — no tour wait. Closes 3 PM — protect this.",
        "anchor",
    ),
    pick(
        "recOfIZeOjVTrjy23",
        "14:40",
        "35 min",
        "Live etching, lithography, screen-printing, relief demos. Walk from DANK Haus. Cut first if running late.",
        "optional",
    ),
    pick(
        "recg3XX9UzLKZH4Dr",
        "15:25",
        "35 min",
        "Working letterpress studio; free souvenir print. Top four to protect with CIADC, Casa Bonita, DANK.",
        "anchor",
    ),
    pick(
        "recWw32RMrQpzvCyw",
        "16:10",
        "35 min",
        "Historic wood-frame church; bell ringing on the hour — aim for 5 PM close if offered. Sun 1–5 PM.",
        "optional",
    ),
]

itin["backupByDay"]["sun"] = [
    backup(
        "rec4N0I4hUmSYLuvY",
        "Flexible",
        "25–40 min",
        "Theater spaces without Uptown’s queue — swap for Printmakers or All Saints if you want another stage fix.",
    ),
    backup(
        "recVzrEJFpZCm04uH",
        "Flexible",
        "90+ min",
        "Spectacular auditorium but Saturday-style 2h+ queues reported — not on today’s plan unless you choose the wait.",
    ),
    backup(
        "recE9khuvRUUvo9Ai",
        "Flexible",
        "60–90 min",
        "Recording studio tours; substantial queues. Old Sunday route — only if you bail on the north-side craft loop.",
    ),
    backup(
        "recGNGNzLflAqzsPR",
        "Before 15:00",
        "30–60 min",
        "Vinyl pressing; closes 3 PM Sunday.",
    ),
    backup(
        "recqOmiiWAZOgKwKd",
        "Before 17:00",
        "30–50 min",
        "18th-floor hydroponic grow room downtown — big detour from this route.",
    ),
]

(ROOT / "data/itinerary.json").write_text(json.dumps(itin, indent=2) + "\n", encoding="utf-8")
print("updated sun", len(itin["days"]["sun"]), "stops; backups", len(itin["backupByDay"]["sun"]))
