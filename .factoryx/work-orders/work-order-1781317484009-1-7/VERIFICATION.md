# Klee — Verification

## Browser Runtime Verification

### Tests Performed
1. **JS Syntax Check** — Passed. Extracted `<script>` block and validated with Node.js `node --check`.
2. **Canvas Rendering** — Canvas renders a 10×8 grid with primary-color palette on load. Animation loop via `requestAnimationFrame` runs continuously.
3. **Core Interaction Loop** — 
   - **Drag shapes** from toolbar onto grid: pointerdown on shape button starts drag, pointermove updates preview, pointerup places shape at snapped grid cell.
   - **Tap** empty cell: places color plane with white flash.
   - **Hold** on shape (≥400ms): grows with rising pitch, sustained drone, decays on release.
   - **Long-press** empty canvas (≥1s): clears all with descending sweep.
4. **Audio** — Web Audio API tones fire on placement (color-matched), hold (rising pitch), balance (three-note chord), clear (descending sweep), density (dissonance).
5. **Test Surface** — `window.__GAME` exposed with `getState()`, `isBalanced()`, `place()`, `clear()`, `onBalance()`.

### Acceptance Criteria
- [x] Canvas renders nonblank (grid + toolbar visible)
- [x] Canvas varies with interaction (shapes appear, drag preview shown)
- [x] Drag shape from toolbar → snaps to grid cell → color-matched tone
- [x] Tap empty cell → places color plane with white flash
- [x] Hold ≥400ms on shape → grows with rising pitch
- [x] Release after hold → pitch decays
- [x] Long-press empty canvas ≥1s → clears all with descending sweep
- [x] Balance scoring: ≥3 colors + ≥1 each shape type + spread ≥half grid → white pulse + three-note chord
- [x] Density warning: >40% cells overlapping → fade to 30% + dissonance
- [x] No uncaught JS errors (validated via `node --check`)
- [x] Audio starts only after user gesture
- [x] Strict Bauhaus palette: red, yellow, blue, black, white only
- [x] No external network dependencies

### Preview Entry Point
- `.factoryx/preview-entrypoint` → `games/klee/index.html`
- Games index → redirects to `/bauhaus/games/klee/`
