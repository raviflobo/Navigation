# VECV Route Authoring POC

Internal mobile web app to **create route / map data** (geolocations, waypoints, destinations, directions) and **Preview as user**. Runs in **Android Chrome** and **iOS Safari**. Data autosaves to **IndexedDB** and can be **exported as JSON** for further development.

Not the production visitor navigator — authoring + user-experience preview only.

## Features

- Add **geolocation** spawn clusters (start / waypoint_cluster / destination)
- **Survey**: walk and drop waypoints with optional text and 1–2 photos
- **Directions**: order geolocations (destination last)
- **Data preview**: 2D MapLibre map + 3D three.js path
- **User Preview**: destination pick, 2D map, 3D arrow, GPS or simulate walk  
  Navigate path = **destination waypoints only**; other geos = sync anchors
- **Export / Import** JSON; IndexedDB autosave

## Develop locally

```bash
npm install
npm run dev:root          # base=/ for laptop
```

Open the printed URL. For phone GPS you need **HTTPS** — use GitHub Pages (below) after deploy.

## GitHub Pages (phone testing)

1. Push this repo to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow).
4. Open `https://<user>.github.io/<repo>/` on Android Chrome / iOS Safari.

The workflow sets `VITE_BASE` from the repository name. If you rename the repo, rebuild so assets match.

**IndexedDB is per-origin:** data on `localhost` ≠ Pages. Use **Export → Import** to move surveys.

## Author flow

1. **Geos** — add geolocations; **Set spawn from GPS**
2. **Survey** — select cluster; **Drop waypoint**; optional text/photos
3. **Dirs** — create “To Home” / “To Garden”; destination last
4. **Data** — inspect 2D/3D
5. **As user** — Start → pick direction → navigate (or Simulate walk)
6. **Export** — download `route-data-….json` for later development

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev:root` | Dev server with `base=/` |
| `npm run build` | Production build (default base `/Navigation/`) |
| `npm run preview:root` | Preview build locally with `base=/` |

Override base: `VITE_BASE=/my-repo/ npm run build`
