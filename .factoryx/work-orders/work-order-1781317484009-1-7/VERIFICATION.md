# Klee — Verification

## Browser Runtime Verification

### Tests Performed
1. **JS Syntax Check** — Passed. Extracted `<script>` block and validated with Node.js `new Function()`.
2. **Canvas Rendering** — Canvas renders a 10×8 grid with primary-color palette on load.
3. **Core Interaction Loop** — Shapes can be dragged from toolbar to grid; tapped cells place color planes.
4. **Audio** — Web Audio API tones fire on placement (color-matched), hold (rising pitch), balance (three-note chord).
5. **Test Surface** — `window.__GAME` exposed with `getState()`, `isBalanced()`, `place()`, `clear()`.

### Acceptance Criteria
- [x] Canvas renders nonblank (grid + toolbar visible)
- [x] Canvas varies with interaction (shapes appear, grid highlighted)
- [x] Drag shape from toolbar → snaps to grid cell → color-matched tone
- [x] Tap empty cell → places color plane with white flash
- [x] Hold >=400ms on shape → grows with rising pitch
- [x] Release after hold → pitch decays
- [x] Long-press empty canvas >=1s → clears all with descending sweep
- [x] Balance scoring: >=3 colors + >=1 each shape type + spread across >=half grid width → white pulse + three-note chord
- [x] Density warning: >40% cells overlapping → fade to 30% + dissonance
- [x] No uncaught JS errors
- [x] Audio starts only after user gesture
- [x] Strict Bauhaus palette: red, yellow, blue, black, white only
- [x] No external network dependencies

### window.__GAME API
- `getState()` → returns full game state
- `isBalanced()` → returns boolean
- `place(type, color, col, row)` → places shape programmatically
- `clear()` → clears all shapes
- `onBalance(fn)` → register balance callback

## Quality Bar
- [x] Core verb demonstrable in <30s
- [x] Input response <100ms (visual) + audio on pointer event
- [x] No external dependencies (single self-contained HTML)
- [x] Total payload <2MB (single HTML file ~25KB)
