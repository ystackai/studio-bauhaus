# Preview — Triadic Grid Run Loop Canary v2 (embodied-player-core-slice)

**Artifact:** `games/92-triadic-grid-run/index.html`
**Direct open:** `games/92-triadic-grid-run/`
**Entry:** `.factoryx/preview-entrypoint` → `games/92-triadic-grid-run/index.html` (confirmed)

## Creative Intent (per spec)
This should feel like a courier racing a living geometric grid to lock triads with a held precision stamp before the lattice frays.

## Changes for embodied player subject
- Replaced floating stamp primitive (red TRI / blue SQR as sole cursor) with authored courier figure: geometric bauhaus silhouette (head/torso/legs with stride posture, accent band), holding the stamp tool at aim point.
- Player body lags pointer slightly for physical presence; lean + legPhase + bob for run motion; thrust pose on stamp/clash via actionT.
- Stamp action performed *through* the subject (arm extends, body engages) while retaining pointer-aim + SPACE flip controls.
- Idle/demo start screen now shows courier practicing movement and posture (not static vector blob).
- De-emphasized mode HUD: moved to subtle top-right, reduced size/opacity; mode visible on courier torso band + held tool.
- Player + nearest nodes kept readable: dedicated shadow, high-contrast strokes/fills, drawn after particles/nodes, body offset from tool tip.
- Active-play visuals separate subject from grid lines, speedlines, particles, vignette, DOM overlays.

## Browser evidence (real chromium headless)
- boot: frame-boot.png (158kB) — start card + live grid + courier figure visible in idle demo drift/stride.
- interact: frame-interact.png (87kB) — forced active state for evidence, shows courier body, held tool at nodes, triad progress, grid.
- 0 game errors (pageerror/uncaught/TypeError/Reference/Syntax/asset-fail) in logs.
- Same served URL pattern as prior (file:// absolute for harness).

## Game feel checklist (this pass)
- [x] Core verb in first 30s via embodied subject (move courier, space flip tool, click to thrust stamp).
- [x] Input <100ms response, easing on body follow and tool.
- [x] Player presence + nearest objectives separated/readable in motion.
- [x] No placeholder vectors as focal; subject has posture/silhouette beyond primitives.
- Remains 30-60s self-contained taste-gate slice.

Work Order: work-order-1783125296103-7-18
Deliverable node: embodied-player-core-slice
