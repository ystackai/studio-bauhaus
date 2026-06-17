# Preview: Rework Triadic Grid Run (work-order-1781658166323-6-31)

## Artifact
- Path: `games/92-triadic-grid-run/index.html` (self-contained, direct preview entrypoint; no homepage mutation or appended links)
- Description: Rebuilt 2D canvas browser game per operator rejection of prior deliverable. Core verb: stamp with the right tool (triangle or square) on matching shape-typed triadic nodes (r/y/b) to compose harmonies on a living Bauhaus grid. First 10s shows playable grid + obvious cursor stamp + nodes with clear required-shape geometry. Real file-backed PNG assets (runner/stylus, node sheets) + WAV musical stabs/cadences under assets/ + ASSET_MANIFEST.md. Redesign keeps only prior useful pieces (grid resonance, primary palette, juice, post-gesture audio, input parity, verif-friendly).

## How to Preview
Open directly (relative for factoryx/previews and local):
- `games/92-triadic-grid-run/index.html`

On load the playable world is visible immediately (grid, pulsing nodes with tri/sqr icons, large stamp cursor following pointer already live). Use pointer drag or WASD/arrows or on-screen (SPACE flips TRI<->SQR stamp mode; click/tap near a node with correct mode to stamp). Compact affordance at bottom or none for the slice. Audio after first gesture (stamp or toggle).

Controls:
- Pointer (mouse/touch): move stamp cursor, click/tap to commit stamp when over matching node.
- Keyboard: WASD/ARROWS for fine aim, SPACE to flip stamp mode (TRI/SQR), R restart on end.
- Mobile: large 52px+ touch zones for mode flips if added; canvas touch for aim+stamp.
- Sound toggle (♪) top-right; starts off, only after user gesture.

Objective (visible <10s): Fill the three top triad pips (red/yellow/blue) by stamping nodes of the correct shape (triangle nodes want TRI stamp, square nodes want SQR). Complete a full triad = grid resonance + musical cadence + score. Miss 3 nodes (they expire) = grid collapse. Reach target score = HARMONY ACHIEVED.

## Status (this run)
- Initial strategy + logs created; .factoryx/preview-entrypoint set.
- Previous deliverable materialized + analyzed; core materially redesigned to stamp verb (square/triangle now central + obvious).
- Real file-backed assets generated (stylus.png + nodes.png + 5 musical WAVs + ASSET_MANIFEST.md provenance via pure-stdlib gen_assets.py).
- Taste-gate slice implemented + honest self-play 40s+ passed (objective in <10s, reliable shape interactions, musical not bleep, intentional Bauhaus grid/stamps).
- Browser verif (real chromium headless, 2 runs): clean exit 0, 0 game errors in strict grep, two non-blank frames (198kB boot, 197kB interact) showing grid + nodes + obvious stamp cursor + pips. Evidence in WO evidence/.
- Ready for PR update + review. Full prompt will be in PR body under FactoryX Work Order Context.

## Evidence (screenshots)
- .factoryx/work-orders/work-order-1781658166323-6-31/evidence/frame-boot.png
- .factoryx/work-orders/work-order-1781658166323-6-31/evidence/frame-interact.png
- chromium-boot.log (clean)

## Related
- Canonical branch: factoryx/factory-bauhaus/work-order-1781658166323-6-31
- Target PR: (to be created/updated; will contain full prompt in FactoryX Work Order Context section)
- Prior target (rejected): PR#84 from work-order-1781501302295-7-1 (review work-order-1781533889007-7-14)
- Source feedback: deliverable-decision-1781627560778-1, -2, -3

Work Order: work-order-1781658166323-6-31
