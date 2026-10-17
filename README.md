# Open House Chicago 2026

Weekend itinerary for Open House Chicago (Oct 17–18, 2026): Saturday downtown loop, Sunday north-side clusters, backup stops, Maps directions, and per-site **Visited** checkmarks.

**Live:** [https://0xbn.github.io/chicago/](https://0xbn.github.io/chicago/)

## Local

Static files only — open `index.html` via a local server (fetch needs HTTP):

```bash
python -m http.server 8765
```

Then visit `http://localhost:8765/`.

## Data

- `data/itinerary.json` — stops, times, notes, OHC site URLs.
- Checkmarks: `localStorage` keys `ohc26:<site name>` (per browser; no sync).

## Deploy

GitHub Pages from `main` (project site → `0xbn.github.io/chicago/`). Push to `main` to update.
