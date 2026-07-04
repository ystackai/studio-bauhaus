# Verification — Triadic Grid Run (embodied player core slice)

Work Order: work-order-1783125296103-7-18
Node: embodied-player-core-slice
Intent: Rework to feature distinct embodied player subject (courier) per vision rubric changes_requested.

## Commands executed (real browser runtime, no npm/puppeteer installs)
- python http.server (threaded) on http://127.0.0.1:17555 serving repo root
- chromium --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-software-rasterizer --virtual-time-budget=6200 --window-size=1024,640 --screenshot=.../frame-boot.png "http://127.0.0.1:17555/games/92-triadic-grid-run/index.html"
- chromium ... --virtual-time-budget=9200 ... --screenshot=.../frame-interact.png "http://127.0.0.1:17555/.../index.html?autostart=1"
- Strict grep on logs for game errors.

## Results
- Exit codes: 0 / 0
- PNGs: non-blank (155kB boot, 78kB interact; 1024x640 RGB)
- PNG signatures valid; dims match window.
- Game error patterns: 0 matches after dbus filter (clean logs for uncaught/Reference/Type/Syntax/failed-to-load).
- Canvas rendered; rAF loop; assets load relative (stylus.png, nodes.png served; sfx fallback ok).
- Post-interaction (?autostart playing state): embodied courier (stride+satchel+visor), nearest nodes/objectives, held tool visible and separated from grid/particles.
- No 4xx for game; player + nodes remain readable vs bg in active screenshots.

## Evidence
- .factoryx/work-orders/work-order-1783125296103-7-18/evidence/frame-boot.png
- .factoryx/work-orders/work-order-1783125296103-7-18/evidence/frame-interact.png
- .factoryx/work-orders/work-order-1783125296103-7-18/evidence/chromium-*.log (clean)

## Quality bar notes
- First screen + demo now shows courier subject with posture providing interest.
- Active play keeps player separated and focal.
- Controls unchanged (pointer aim for subject, SPACE for mode on tool).
- 30-60s slice preserved; no systems expansion.
- blocks_usage.md already present from prior ticket for this deliverable.

If review finds silhouette/contrast/readability issues in vision pass, targeted follow-up patch ready.
Status: verification clean on http:// served URL (real runtime + assets), no blockers. Recovery evidence updated with enhanced courier silhouette (boots, satchel, visor, vignette order) and proper served-URL smoke. Ready for human review of embodied-player-core-slice.
