# GAME_DESIGN.md — Klee (Brief 29)

A flat 2D generative composition toy where drag, tap, and hold bloom into living Kandinsky-and-Klee-style geometric compositions; a gentle resonance system rewards harmonic arrangements.

---

## Title & one-liner

**Working title:** Klee

Klee is a 2D composition toy: drag shapes onto a grid, tap to add planes, hold to pulse them into the composition — every arrangement yields a balanced Bauhaus-style piece, and a resonance score guides you toward richer, more alive compositions.

---

## Anchors

- **Gameplay like:** _Quarrel_ by Thomas Wang — a single screen, drag-to-place shapes to match target compositions, calm one-handed pacing, tension between freedom and fitting pieces together. The fun lives in the constraint: you can place anything, but harmony rewards restraint. Unlike _Quarrel_'s puzzle-solving, Klee has no targets — the player creates freely, and the resonance system gently steers toward beauty.

- **Visuals like:** The Bauhaus Digital house style as codified in the repo's `studio.json` — a strict primary palette (red `#E63228`, yellow `#F2D42E`, blue `#2D3D8D`, black `#1A1A1A`, white `#FAFAFA`). Flat primitives only: circles, squares, triangles, straight lines, crosses. No gradients, no shadows, no perspective — a line is a line, a plane is a plane. The grid is generous and visible: asymmetrical compositions built on an invisible 8×8 or 10×10 grid. Typography uses a geometric sans (Helvetica Neue / Helvetica). Anchor references: Kandinsky's _Composition VIII_ (rhythmic overlapping geometry) and Klee's _Twittering Machine_ / _Sunbird_ (playful, functional forms with tension and movement frozen in flat form).

- **Sounds like:** The foundry's parameterized generative underscore instrument (paths in `studio/audio/`). Each shape's color maps to a pitch: red = low register, yellow = mid, blue = high. A placed shape triggers a short tone; holding on a shape sustains and glides up in pitch as the hold deepens; releasing adds a soft decay tail. When the composition reaches resonance (see Win section), a gentle chord plays — the music is always underscore, never the focus, never competing with the visual composition.

---

## Core loop (the first 30 seconds, written as play)

**Verb 1: Drag.** The canvas opens — white background, faint gray grid lines, toolbar at the bottom with five draggable shapes: red circle, yellow square, blue triangle, black line, black cross. The player drags the red circle onto the grid. It snaps to the nearest cell with a spring-bounce settle. A low red-tone sounds instantly.

**Verb 2: Tap.** The player taps an empty grid cell. A single yellow color-plane fills that cell. A mid-range yellow-tone plays. The composition is two shapes, two colors — still quiet.

**Verb 3: Hold.** The player holds their finger on the yellow square for a half-second. It pulses — a subtle scale-up and a short visual flash. A sustained tone slides upward during the hold, then decays on release. The pulse also sends a faint "wave" (a white ring) outward that briefly highlights neighboring cells.

That is the entire loop: drag a shape in, tap to add planes, hold to pulse. The composition grows. After 30 seconds the player has built a small arrangement — nothing more, nothing less.

---

## Interaction map

| Input | Action | Feedback (visual + audio) |
|-------|--------|---------------------------|
| Drag shape from toolbar onto canvas | Place a geometric primitive at the snapped grid cell | Shape snaps into position with spring easing (scale bounces 1.0→1.15→1.0 in ~200ms). A color-matched tone plays on placement. |
| Tap empty grid cell | Place a single-color plane (one grid cell) at that location | Cell fills with a color chosen from a rotating palette cycle. Mid-tone plays; cell flashes white for 100ms. |
| Hold on any placed shape (≥400 ms) | Pulse the shape — it scales up briefly, sends an outward ring wave, and gains the "emphasized" flag | Shape interpolates to 1.3× scale over 200ms with spring easing. A sustained tone slides pitch up during hold. Release triggers a decaying tone. A white ring pulses outward, highlighting adjacent cells for 300ms. |
| Drag a placed shape to a new cell | Reposition the shape | Shape lifts (scale to 1.1 on pointer-down), slides to new cell, snaps with bounce easing. Tone replays at the new grid position. |
| Pinch two shapes on canvas (pointer distance decreases below threshold) | Merge them: both flash white, a composite shape replaces them with a higher resonance value | White flash + two-note chord. The composite shape uses both parent colors (blend: red+yellow = orange accent, earned only via merge). |
| Long-press empty canvas area (≥1 s, not on a shape) | Clear all shapes — reset to blank grid | All shapes shrink inward simultaneously (scale → 0 over 400ms with ease-out). A descending tone sweep plays across the palette. |
| Two-finger swipe / scroll on canvas | Pan the viewport across the infinite grid | Grid lines shift smoothly; no audio. The composition stays anchored to world space, viewport moves. |

Every interaction responds in under 100ms of input latency. Every state change is immediately visible. Every placement is reversible via clear.

---

## Win / Lose

**Win condition — "Composition is Alive":**
A composition earns the _alive_ status when it simultaneously satisfies:
1. **Three-color rule:** shapes of at least 3 distinct primary colors are present (red, yellow, blue).
2. **Spread rule:** shapes occupy cells whose bounding box spans at least 4 grid units in both axes (no tight clusters only).
3. **Pulse rule:** at least one shape has been pulsed (holds ≥400 ms).
4. **Merge rule:** at least one merge has occurred (two shapes combined into a composite).

When _alive_ triggers, the composition score increments by 10, a chord sounds, and the resonance meter fills by one tick. The score does not reset on clear — it accumulates across sessions as a session score.

**Lose condition — "Overloaded":**
The grid has a finite visible area (e.g., 12×12 cells). When more than 60% of visible cells are filled (density > 0.6), the composition enters _overloaded_ state: the grid border pulses red, a low dissonant tone plays, and the player cannot place new shapes until they clear (long-press empty area) or reduce density below 50% by removing shapes (a new mechanic introduced in later difficulty tiers — drag a shape off the canvas edge to remove it).

**Run length:** A typical run lasts 2–8 minutes — the player builds, clears, rebuilds, chasing higher resonance scores. There is no hard time limit or lives system.

---

## Session shape

- **First 10 seconds:** The canvas is blank with a visible grid. The toolbar at the bottom shows five shapes with no labels — the player discovers dragging by instinct (shapes are large, colored, obvious). The first drag produces a satisfying snap + tone. No text explains anything; the situation teaches.

- **First 30 seconds:** After the first shape, the player taps to add planes, holds to pulse. The first pulse feels rewarding — the shape grows, a wave radiates, a tone sustains. By 30 seconds the player has a small composition of 2–3 shapes.

- **First minute:** The player discovers merging (bringing two shapes close) and clearing (long-press empty space). The resonance score ticks up on the first _alive_ composition. The player wants to see the score climb again.

- **The replay hook:** Each clear is a fresh start. The score is persistent within a session. The player wants to reach "alive" faster, build more complex compositions, and see the score climb. There is no leaderboard — the score is personal, a measure of compositional richness.

---

## Difficulty ramp

This is a creative toy, not a competitive game. The difficulty curve is gentle and player-driven:

- **0–5 score:** Free exploration. Any placement is valid. The player learns the three verbs.
- **5–15 score:** The _overloaded_ threshold becomes active at 50% density instead of 60%. The player must learn to clear more strategically.
- **15–30 score:** Remove mechanic unlocked — dragging a shape to the canvas edge removes it (instead of clearing everything). This gives the player fine control over density.
- **30+ score:** No new mechanics. The challenge is purely creative: building larger, more resonant compositions without overloading.

The player "earns" the remove mechanic at score 15 — it is unlocked, not purchased. There is no economy, no currency, no upgrades. The only progression is compositional skill.

---

## Why it's fun (falsifiable hypothesis)

**The tension: Chaos vs. Harmony.**

The player can dump shapes anywhere and make anything — but a composition only becomes "alive" when it achieves color diversity, spatial spread, at least one pulse, and at least one merge. This creates a gentle creative tension: "I can make any mess, but the satisfying state is a balanced, resonant arrangement."

**What would CONFIRM this hypothesis:**
- Players spend more than 40% of session time adjusting positions (dragging shapes to new cells) rather than just placing new ones.
- Players deliberately spread shapes across the grid rather than clustering them, as the spread rule requires wide bounding boxes.
- After the first "alive" chord, the player continues composing for at least 2 more minutes (the reward loop works).

**What would REFUTE this hypothesis:**
- Players clear compositions within 30 seconds of starting (under 1 minute average session length) — the tension is not engaging.
- No player discovers or uses the hold-to-pulse mechanic — the emphasis system fails to communicate.
- Players cluster shapes tightly and never achieve "alive" — the spread rule is too difficult or invisible.

---

## Scope budget — the OUT list (v1)

The following are explicitly **OUT** for v1 and will not be implemented:

- **No 3D, no perspective, no WebGL, no pseudo-3D transforms.** Everything is flat 2D on a grid — canvas or SVG.
- **No photorealism.** Only geometric primitives: circle, square, triangle, straight line, cross.
- **No extra colors beyond the primary palette** (red, yellow, blue, black, white) plus the earned merge accent (orange) — no greens, purples, oranges (except the earned merge color), no gradients.
- **No narrative, no story, no text instructions.** No tutorial walls, no lore, no characters with dialogue.
- **No multiplayer, no sharing, no saving, no exporting compositions.** Each session is ephemeral; score is local and session-bound.
- **No power-ups, no lives, no timers, no countdowns, no lives system.**
- **No character sprites or avatars.** Shapes are abstract geometry.
- **No external network dependencies.** All assets self-contained; works offline after load.
- **No particle systems, no lighting, no shadows, no blur, no glow effects** (except a single white flash on merge and a white ring on pulse).
- **No drag-and-drop from outside the application.** All shapes originate within the toolbar.
- **No sound customization, no EQ, no volume sliders.** The music instrument parameters are fixed.
- **No mobile app packaging** (APK, IPA). Browser-only: Chrome, Firefox, Safari, desktop and mobile web.
- **No levels, no stages, no stages, no procedurally generated backgrounds.** The grid is the only stage.
- **No keyboard-only mode.** Input is pointer/touch/ mouse — no keyboard controls.

---

## Test API

The following `window.__GAME` interface must be exposed so the build's critic can verify the loop:

### State queries (read-only)

```javascript
window.__GAME.getState()
// Returns:
{
  score: number,             // accumulated resonance score
  shapes: Shape[],           // array of all placed shapes on the grid
  grid: { cols: number, rows: number },
  palette: string[],         // active colors in current composition (subset of red/yellow/blue)
  isAlive: boolean,          // true if composition meets all "alive" criteria
  density: number,           // 0.0–1.0, filled cells / total cells
  overLaden: boolean,        // true if density > 0.6
  mergedCount: number,       // total merges performed this session
  pulseCount: number         // total pulses performed this session
}
```

### Shape query

```javascript
window.__GAME.getShapes()
// Returns: [
//   { id: string, type: 'circle'|'square'|'triangle'|'line'|'cross',
//     color: 'red'|'yellow'|'blue'|'black', gridX: number, gridY: number,
//     emphasized: boolean, scale: number, isComposite: boolean }
// ]
```

### Simulation hooks (write / action)

```javascript
// Place a shape from toolbar at a grid position
window.__GAME.simulatePlace(type, color, gridX, gridY)

// Simulate a hold/pulse on a shape by id (duration in ms; ≥400 = pulse)
window.__GAME.simulateHold(shapeId, durationMs)

// Simulate a tap on an empty cell (screen pixels → grid conversion)
window.__GAME.simulateTap(screenX, screenY)

// Simulate dragging a shape from one cell to another
window.__GAME.simulateDrag(fromGridX, fromGridY, toGridX, toGridY)

// Simulate merging two shapes by id
window.__GAME.simulateMerge(shapeIdA, shapeIdB)

// Clear all shapes (long-press empty canvas)
window.__GAME.clearComposition()

// Check if composition is currently alive
window.__GAME.checkAlive()

// Get current session score
window.__GAME.getScore()

// Simulate removing a shape by dragging to edge
window.__GAME.simulateRemove(shapeId)

// Toggle debug overlay (shows grid, cell coordinates)
window.__GAME.toggleDebug()
```

### Verifiable contract assertions

The critic should verify:

1. **Win reachable:** Calling `simulatePlace` with shapes of 3+ colors, spread across 4+ grid units in both axes, with at least one `simulateHold` ≥400ms and one `simulateMerge`, results in `checkAlive()` returning `{ alive: true }`.

2. **Lose trigger:** Placing shapes until `density > 0.6` causes `getState().overLaden` to be `true` and prevents further `simulatePlace` calls (or returns `{ blocked: true }`).

3. **Every interaction responds:** Each `simulate*` call results in a detectable state change — `getState()` returns different values after the call.

4. **Score transitions:** After reaching alive state, `getScore()` is ≥ 10 and increases by 10 on each subsequent alive state. Score never decreases.

5. **Palette invariant:** `getState().palette` only ever contains `['red', 'yellow', 'blue']` (plus black for line/cross shapes). Merge accent 'orange' appears in shape color only.

6. **Reset is clean:** After `clearComposition()`, `getState().shapes` is an empty array, `getState().density` is 0, and `getState().isAlive` is false.

---

*This design is a living document. Revisions after playtest feedback are recorded here, not in code.*
