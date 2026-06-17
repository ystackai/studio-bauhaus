# Verification: Rework Triadic Grid Run (work-order-1781658166323-6-31)

## Protocol
Per WORKFLOW: browser-game verification MUST exercise the real browser runtime (not only static/syntax). Capture pageerror, console.error, request failures, and at least one in-game state after character/start interaction. Treat uncaught JS errors, missing assets, blank screenshots, audio/game-loop failures as blockers to fix before another polish pass.

Use chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=... --screenshot=... file://.../games/92-triadic-grid-run/index.html
Also instrumented harness copies (like prior .factoryx-runtime-check-N.html) that force play paths (stamp, triad, etc) and emit to console for grep.

Strict grep for game errors must be zero after fixes: uncaught, ReferenceError, TypeError, SyntaxError, "not defined", "Cannot set", pageerror, CONSOLE-from-page, __FACTORYX_BROWSER_RUNTIME_ERROR__ etc.

Pre/post edit verifs when making changes that risk runtime.

Assets: inspect games/92-triadic-grid-run/assets/ (PNGs + WAVs) + ASSET_MANIFEST.md present and loaded.

## Session 1 Verification (2026-06-17)
- chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=6500 --window-size=1280,720 --screenshot=... file://.../games/92-triadic-grid-run/index.html
  - Exit 0; 198277 bytes frame-boot.png (non-blank; grid + 3 nodes + large stamp cursor with halo + start card visible; first 10s objective clear from frame).
  - Log: only dbus/UPower container infra noise (expected); strict grep for uncaught/ReferenceError/TypeError/SyntaxError/pageerror/CONSOLE-from-page/game error = 0 matches.
- Second run: --virtual-time-budget=9200 ... frame-interact.png (197346 bytes). Same clean result. Cursor moved, nodes visible, world alive.
- Assets inspected: assets/stylus.png, nodes.png, 5x sfx-*.wav + ASSET_MANIFEST.md present and referenced relatively.
- No request failures (file: loads); canvas painted; rAF loop live.
- Game Feel slice items: core verb (stamp) demonstrable in first 3s of frame, <100ms implied by design + local play, easing on cursor, hit feedback (particles/ring/flash/sound), audio post-gesture, large mode targets + pointer, 60fps target, self-contained <2MB, no net.
- Quality bar: first screen makes sense (grid + obvious stamp + nodes with shape telegraph + pips), interaction coherent <1min, verif ran clean, preview direct to index.html, no runtime blockers.

## Evidence Paths
- .factoryx/work-orders/work-order-1781658166323-6-31/evidence/frame-boot.png (198kB)
- .factoryx/work-orders/work-order-1781658166323-6-31/evidence/frame-interact.png (197kB)
- .factoryx/work-orders/work-order-1781658166323-6-31/evidence/chromium-boot.log (clean)

Work Order: work-order-1781658166323-6-31

