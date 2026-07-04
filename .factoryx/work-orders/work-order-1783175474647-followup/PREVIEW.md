# Preview — Triadic Grid Run Loop Canary rework (work-order-1783175474647-followup)

## Preview root
games/92-triadic-grid-run/index.html  (direct; .factoryx/preview-entrypoint already points here)

## What changed for feedback
- Core loop materially reworked from static nodes to flowing "run the grid": nodes spawn right, vx-scroll left across a visible rail (player body marker follows cursor y).
- Timing matters: stamp near rail for bonus + "on the move" feel.
- Grid lines scroll horizontally with runScroll; speedlines + rail + flowing targets deliver "run" fantasy.
- Assets refreshed (stronger rims/ticks for motion legibility) + new manifest in WO context + game/assets/.
- Updated copy, hints, and comments to center the run verb.
- Real file-backed assets used in main loop (cursor + nodes + sfx on hits/triads).

## How to preview
Open `games/92-triadic-grid-run/index.html` directly (or via preview server).
- Pointer moves the stamp cursor (halo + large TRI/SQR tool).
- SPACE or mode buttons flip between TRI and SQR.
- Click/tap near a flowing node when mode matches its shape to stamp.
- Collect one of each color (R/Y/B) to complete triad for score + res.
- Nodes scroll; miss if they pass the rail un-stamped (3 misses = collapse).
- First 10s shows live scrolling grid + right-side incoming nodes + rail + stamp tool.

## Evidence captured
- Browser headless screenshot: .factoryx/work-orders/work-order-1783175474647-followup/evidence/frame-boot.png (live world at load: nodes, rail, cursor, speedlines visible).
- Asset binaries regenerated and ls-verified (PNG sig + sizes).
- No 4xx; self-contained.

See VERIFICATION.md for runtime/browser details and ASSET_MANIFEST.md.
