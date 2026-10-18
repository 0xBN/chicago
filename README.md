# Open House Chicago 2026

Weekend itinerary for Open House Chicago (Oct 17–18, 2026): Saturday downtown loop, Sunday north-side clusters, backup stops, Maps directions, and per-site **Visited** checkmarks.

**Live:** [https://0xbn.github.io/chicago/](https://0xbn.github.io/chicago/)

## Local (dev)

ES modules + `fetch` need HTTP:

```bash
npm run dev
```

Open `http://localhost:8765/` (dev banner + map). Regenerate the site directory:

```bash
npm run build:sites
```

**Branch:** active work on `dev`; `main` is what GitHub Pages serves until you merge.

## Data

- `data/itinerary.json` — your scheduled route + hand-picked backup cards.
- `data/sites.json` — full OHC directory (~200 sites, from `/api/sites`) for **nearby** suggestions.
- **localStorage** (this browser only):
  - `ohc26:<site name>` — visited (`1` / `0`)
  - `ohc26:day` — last tab (`sat` / `sun`)
  - `ohc26:theme` — `system` (default) | `light` | `dark`
  - `ohc26:onlyOpenDay` — nearby respects Sat/Sun hours (`0` = off)
  - `ohc26:openNow` — nearby also requires open-now on OHC weekend
  - `ohc26:includeVisited` — nearby list includes visited sites when `1`
- Geolocation is not persisted; only used in-memory for distance + nearby ranking.

## Deploy

GitHub Pages from `main` (project site → `0xbn.github.io/chicago/`). Push to `main` to update.
