# ASSET_MANIFEST.md — Triadic Grid Run Loop Canary follow-up (work-order-1783175474647-followup)

Operator feedback rework: strengthen the "run" in the core loop.
- Redesigned interaction: nodes now spawn on right and scroll left across a visible "rail" (run plane at ~22% width).
- Timing bonus for stamping near rail; speed and spawn rate scale with level.
- Grid verticals now scroll with runScroll accumulator; speedlines + rail give embodied forward motion.
- Cursor y pilots the "body" presence on the rail while you intercept flowing targets.
- Updated start/win copy, hints, and header to match "run the grid" fantasy.

## Generated/Authored Assets (file-backed, committed)
Source: games/92-triadic-grid-run/assets/ (refreshed for this WO)
- stylus.png, nodes.png : rebuilt with thicker outer rings + tick contrast for motion readability during scroll.
- sfx-*.wav : 5 short musical stems (stamp per color, clash, full triad cadence). Regenerated with follow-up seed.
- gen_assets.py : updated header, seed=1783175474647, stronger rim calcs in node_*_draw, manifest text.

## Integration
- index.html loads `assets/stylus.png`, `assets/nodes.png` relative (works for file:// and preview trees).
- drawImage slices for 32x32 tiles; draw fallback vector when images not ready.
- Audio: WebAudio decode + play with rate/gain life; started only on user gesture (start, stamp, restart).
- All assets listed + described in games/92-triadic-grid-run/assets/ASSET_MANIFEST.md

## Browser verification notes
- Used for active-play evidence (see VERIFICATION.md).
- No external net deps; self-contained after load.
- Post-interaction state: nodes flowing, rail visible, stamp cursor with halo, particles on hits.

Work Order: work-order-1783175474647-followup
Deliverable: triadic-grid-run-loop-canary
Date: 2026-07-04
