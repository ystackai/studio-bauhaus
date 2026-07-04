# Preview — Triadic Grid Run Loop Canary v2 (embodied-player-core-slice)

**Artifact:** `games/92-triadic-grid-run/index.html`
**Direct open:** `games/92-triadic-grid-run/`
**Entry:** `.factoryx/preview-entrypoint` → `games/92-triadic-grid-run/index.html` (confirmed)

## Creative Intent (per spec)
This should feel like a courier racing a living geometric grid to lock triads with a held precision stamp before the lattice frays.

## Changes for embodied player subject (recovery pass)
- Authored courier: geometric bauhaus body (legs+boots stride, torso+accent+satchel strap, head+visor), holds small stamp tool; posture via lean/bob/legPhase/thrust.
- Action through subject (arm extends on stamp); pointer aims courier+tool, SPACE flips mode (visible on band).
- Vignette drawn before player (0.22 end alpha) + stronger limb strokes + boots/strap/visor so subject + nearest nodes stay high-contrast vs grid/particles during motion.
- Demo idle and ?autostart playing both exercise live embodied presence (not placeholder rect only).
- De-emphasized HUD; primary visual interest is the courier in the authored grid-run fantasy.

## Browser evidence (real chromium headless, served http URL)
- boot: frame-boot.png (155kB) — http://127.0.0.1:17555/... start card + live grid + courier (with boots/satchel/visor) in idle demo.
- interact: frame-interact.png (78kB) — ?autostart=1 playing state, courier body + held tool near nodes, readable separation.
- 0 game errors after filtering dbus noise; assets served (png + wavs); no 4xx for game files.
- Used real python http.server + chromium on http:// (not file://) per verification contract.

## Game feel checklist (this pass)
- [x] Core verb in first 30s via embodied subject (move courier, space flip tool, click to thrust stamp).
- [x] Input <100ms response, easing on body follow and tool.
- [x] Player presence + nearest objectives separated/readable in motion.
- [x] No placeholder vectors as focal; subject has posture/silhouette beyond primitives.
- Remains 30-60s self-contained taste-gate slice.

Work Order: work-order-1783125296103-7-18
Deliverable node: embodied-player-core-slice
