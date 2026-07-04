# Verification — Triadic Grid Run (embodied player core slice)

Work Order: work-order-1783125296103-7-18
Node: embodied-player-core-slice
Intent: Rework to feature distinct embodied player subject (courier) per vision rubric changes_requested.

## Commands executed (real browser runtime, no npm/puppeteer installs)
- chromium --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --virtual-time-budget=5500 --window-size=1024,640 --screenshot=.../frame-boot.png "file://.../games/92-triadic-grid-run/index.html"
- chromium ... --virtual-time-budget=9000 ... --screenshot=.../frame-interact.png ...
- Strict grep on logs for game errors.

## Results
- Exit codes: 0 / 0
- PNGs: non-blank (158kB boot, 87kB interact)
- PNG signatures valid; dims match window.
- Game error patterns (uncaught|ReferenceError|TypeError|SyntaxError|pageerror|failed to (fetch|load|decode|...)) : 0 matches in either log (dbus noise only, as prior).
- Canvas rendered; rAF loop; assets load relative (stylus.png, nodes.png).
- Post-interaction state exercised: embodied courier, nodes, stamp tool held, triad pips, score visible.
- No 4xx; no blank canvas; player subject + nearest nodes identifiable vs bg.

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
Status: verification clean, no blockers. Ready for human review of the embodied rework.
