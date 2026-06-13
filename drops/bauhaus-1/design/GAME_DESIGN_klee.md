# GAME_DESIGN.md — Klee (Brief 29)

A Bauhaus generative composition toy where drag, tap, and hold bloom into evolving Kandinsky-and-Klee-style flat geometric compositions, guided by gentle rhythm and balance scoring.

---

## Title & one-liner

**Working title:** Klee

Klee is a 2D generative composition toy: drag shapes onto a grid, tap to place color planes, hold to grow rhythmic lines — the result is always a balanced Bauhaus-style composition, and gentle scoring guides you toward more interesting arrangements.

---

## Anchors

- **Gameplay like:** _Prune_ — what makes _Prune_ fun is its one-handed simplicity and the quiet tension between "I can make anything" and "but I want it to feel right." Every gesture is deliberate; you compose rather than compete. The tension is _freedom vs. restraint_: you are free to place anything, but the composition scoring rewards balance, so you naturally learn to seek harmony over chaos.

- **Visuals like:** The Bauhaus house style as defined in `studio.json` — primary palette (red, yellow, blue, black, white), flat geometric primitives (circle, square, triangle, straight line, cross), grid-based layout with intentional asymmetry. No gradients, no shadows, no perspective. Every shape is a _line is a line, a plane is a plane_. Anchor references: the Kandinsky _Composition VIII_ spirit (overlapping geometric forms, rhythmic distribution) and the Klee _Twittering Machine_ spirit (playful, functional geometry with visual tension).

- **Sounds like:** The foundry's parameterized generative underscore instrument (paths available in `games/` or `studio/` audio modules). The mix responds to composition state: each placed shape triggers a pitched tone mapped to its color (red → low, yellow → mid, blue → high). Hold interactions add a sustained drone; releasing adds a decay. The rhythm grid acts as a silent metronome that only sounds when the composition reaches a certain density. The mix stays sparse — the composition is visual, the music is underscore, never competing.

---

## Core loop (the first 30 seconds, written as play)

**Verb 1: Drag.** You open the canvas. A faint grid overlays a white background. In the bottom bar, five geometric shapes appear — circle (red), square (yellow), triangle (blue), line (black), cross (black). Drag any shape onto the canvas. It snaps to the nearest grid cell. The moment it lands, a tone sounds matching the shape's color pitch.

**Verb 2: Tap.** Tap anywhere on the empty grid. A small color plane (one cell, primary color chosen by you via a quick color-cycle) appears. Each tap places a plane. The composition starts to take shape.

**Verb 3: Hold.** Hold on any placed shape. The shape grows — its line thickens or its plane expands, and a sustained tone plays. Release. The shape is now permanently larger (or thicker). This is how you _emphasize_ parts of your composition.

These three verbs — drag, tap, hold — are the entire loop. The composition evolves with every gesture. There is no failure state in these first 30 seconds; the game simply waits for you to compose.

---

## Interaction map

| Input | Action | Feedback (visual + audio) |
|-------|--------|---------------------------|
| Drag shape from toolbar → canvas | Place a geometric primitive (circle, square, triangle) at the snapped grid position | Shape appears instantly at grid cell with a color-matched tone; the shape bounces slightly (easing spring) into place |
| Tap on empty grid cell | Place a single-color plane (one grid cell) at tap location | Color plane flashes in at tap point; a mid-range tone plays; the grid cell briefly highlights white |
| Hold on placed shape (≥400 ms) | Grow the shape — line thickness increases or plane area expands by one grid unit | Shape smoothly interpolates to larger size using spring easing; sustained pitch rises with hold duration; release triggers a decay tone |
| Drag shape on canvas (after placement) | Reposition the shape to a new grid cell | Shape lifts visually (slight scale-up), slides to new cell, snaps with bounce easing; tone replays at new position |
| Pinch two placed shapes together | Merge them into a composite shape (e.g., circle + square → square-with-circle) | Both shapes flash white, then a new composite shape appears; a harmonious two-note chord plays |
| Long-press empty canvas (≥1 s) | Clear all shapes (reset composition) | All shapes shrink inward with a descending tone sweep; canvas returns to grid-on-white |
| Scroll / two-finger swipe | Pan the canvas grid (composition is infinite grid, viewport moves) | Grid lines shift; no audio; subtle motion blur on grid only |

Every interaction is: immediate visual response (under 100 ms), color-matched audio feedback, and reversible (you can always clear and start fresh).

---

## Win / Lose

**Win condition (gentle, not punishing):**
A "composition" is considered _balanced_ when it contains shapes from at least 3 different primary colors, has at least one of each shape type (circle, square, triangle), and the shapes are distributed across at least half the grid width (not all clustered). When balanced, the screen briefly pulses white at 50% opacity, the music instrument plays a resolved three-note chord (red-low, yellow-mid, blue-high), and the score increments by 1. There is no "game over." The game keeps going — it is a zen garden, not a race.

**Lose condition (soft reset):**
There is no lose condition per se. If the composition becomes too dense (shapes overlapping more than 40% of grid cells), the game gently fades all shapes to 30% opacity and plays a soft dissonant tone, inviting you to clear and reorganize. You can also manually clear at any time. The longest possible run is unlimited — the scoring is continuous, not a finish-line.

**Session length:** Each composition session lasts as long as the player wants — typical balanced compositions take 2 to 5 minutes of play.

---

## Session shape

- **First 10 seconds: Teaching by situation.** The canvas opens with the toolbar visible. The first shape (circle, red) has a subtle pulsing outline inviting drag. There is no text. The first tap anywhere on the canvas triggers a tiny yellow plane to appear as a ghost hint, then disappears — the player infers: "tap places color." The grid itself is the tutorial.

- **First minute: Escalation through discovery.** After the player has placed 3 to 4 shapes, a very faint metronome beat appears — a visual tick on the grid that grows slower as more shapes are added. The player discovers that rhythm emerges from density. The first score pulse arrives here, confirming "you're doing something right."

- **The replay hook: Why press retry?** The scoring rewards variety and balance, not speed. Each successful composition yields a score, but the real hook is the infinite generative space — no two compositions are the same because the _hold_ mechanic lets you adjust every shape's emphasis differently. Players return to chase more elegant arrangements, not higher scores. The "retry" button says "Compose again" and resets cleanly.

---

## Difficulty ramp

There is no traditional difficulty. The ramp is _curiosity_:

1. **Phase 1 (0 to 3 shapes):** Only basic placement. The grid is fully visible. Music is silent until the first shape lands.
2. **Phase 2 (3 to 6 shapes):** The metronome grid activates — visual rhythm tick appears. The score pulse arrives. The player learns that variety (3+ colors) and distribution matter.
3. **Phase 3 (6+ shapes):** Composite merging unlocks (pinch-to-merge). The music instrument layers more voices. The score threshold for a balanced composition subtly increases (requires 4 colors, 3 shape types), rewarding deeper engagement.

The player "buys" nothing — the progression is entirely about unlocking new expressive tools (the merge action) as the player naturally discovers them. There is no economy, no currency, no upgrades. The only currency is the composition itself.

---

## Why it's fun (falsifiable hypothesis)

**The tension: Freedom vs. Balance.**

The player has complete freedom to place any shape anywhere with any emphasis — but the scoring system rewards balanced compositions. This creates a gentle creative tension: "I could just dump shapes everywhere, but it feels better when everything has a reason to be there."

**What would CONFIRM this hypothesis:**
- Players spend more than 50% of their time adjusting existing shapes (hold to resize, drag to reposition) rather than spamming new placements.
- Players cluster shapes in 3 to 4 color groups rather than scattering randomly.
- After the first score pulse, players continue playing for an average of 3+ minutes (indicating the reward loop works).

**What would REFUTE this hypothesis:**
- If players mostly just tap randomly and clear frequently (under 1 minute average session), the scoring is not creating meaningful tension.
- If no player ever uses the hold mechanic, the emphasis system is not communicating its value.

---

## Scope budget — the OUT list (v1)

The following are explicitly **OUT** for v1 and will not be implemented:

- **No 3D, no perspective, no WebGL.** Everything is flat 2D canvas/SVG.
- **No photorealism.** Only geometric primitives (circle, square, triangle, line, cross).
- **No extra colors beyond the primary palette** (red, yellow, blue, black, white) plus earned accent white flashes for scoring. No greens, purples, oranges, or gradients.
- **No narrative, no story, no text-based instructions** (beyond the bare minimum UI labels).
- **No multiplayer, no sharing, no saving.** Each session is ephemeral.
- **No power-ups, no lives, no timers, no countdowns.**
- **No character sprites, no avatars, no characters at all.**
- **No external network dependencies.** All assets self-contained.
- **No particle systems, no lighting effects, no shadows, no blur effects** (except a single white flash on score).
- **No drag-and-drop from outside the app.** All shapes originate in the toolbar.
- **No sound customization or equalizer.** The music instrument parameters are fixed.
- **No mobile app packaging.** Browser-only (Chrome, Firefox, Safari desktop and mobile web).

---

## Test API

The following `window.__GAME` interface must be exposed for the critic to verify the loop:

### State queries (read-only)

```javascript
window.__GAME.getState()
// Returns:
{
  score: number,            // current composition score
  shapes: Shape[],          // array of all placed shapes
  grid: { width: number, height: number },
  palette: string[],        // active colors used (subset of ['red','yellow','blue'])
  isPlaying: boolean,       // false after clear
  balanced: boolean,        // true if composition meets balance threshold
  density: number,          // 0.0–1.0, ratio of filled cells to total cells
  metronomeActive: boolean // true if rhythm grid is ticking
}
```

### Shape query

```javascript
window.__GAME.getShapes()
// Returns: [{ id, type: 'circle'|'square'|'triangle', color: 'red'|'yellow'|'blue', gridX, gridY, scale: number, emphasized: boolean }]
```

### Simulation hooks (write/action)

```javascript
// Simulate a shape placement at grid position
window.__GAME.simulatePlace(type, color, gridX, gridY)

// Simulate a hold on shape by id (returns { grew: boolean, newScale: number })
window.__GAME.simulateHold(shapeId, durationMs)

// Simulate a tap at screen pixel coordinates (converts to grid)
window.__GAME.simulateTap(screenX, screenY)

// Simulate a drag from one grid cell to another
window.__GAME.simulateDrag(fromGridX, fromGridY, toGridX, toGridY)

// Clear all shapes
window.__GAME.clearComposition()

// Check if composition is balanced (returns balanced boolean + reason)
window.__GAME.checkBalance()

// Get current score (re-computed from state)
window.__GAME.getScore()

// Toggle metronome on/off (for testing rhythm)
window.__GAME.toggleMetronome()
```

### Verifiable contract assertions

The critic should verify:
1. **Win reachable:** After calling `simulatePlace` with 3+ colors, 3+ shape types, distributed placement, `checkBalance()` returns `{ balanced: true }`.
2. **Lose triggers:** After placing shapes on more than 40% of grid cells (high density), `getState().balanced` is `false` and `getState().density > 0.4`.
3. **Every interaction responds:** Each `simulate*` call results in an observable state change (`getState()` returns different values).
4. **Economy/score transitions:** After a balanced composition, `getScore()` is ≥1 and increases monotonically across balanced sessions.
5. **Palette invariant:** `getState().palette` only ever contains values from `['red', 'yellow', 'blue']` (plus white/black as neutral).

---

*This design is a living document. Revisions after playtest feedback go here in the version history, not in code.*
