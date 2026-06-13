# GAME_DESIGN.md — Brief 29: TEMPO

## Title & one-liner

**TEMPO** — a one-button rhythm game where Bauhaus geometric shapes slide across a grid in time with a generated pulse; tap to snap them onto the beat.

## Anchors

- **Gameplay like:** *Rhythm Heaven* — a tight one-button loop that rewards micro-timing. You watch shapes glide along horizontal lanes on a grid, and when a shape reaches its target zone you tap. The tension lives in holding a steady internal pulse while the tempo accelerates and lanes multiply; you either lock in or fall out.
- **Visuals like:** Studio assets at `dust/` (the Bauhaus geometric primitive library: circles, triangles, bars in primary colors), `tempo-preview.html` (the existing design doc preview rendered in house style). No external references — all visuals are generated from flat SVG/Canvas primitives on a strict grid.
- **Sounds like:** The foundry's parameterized generative underscore (`audio/engine/` — `cueBeat`, `cuePulse`, `cueHit` helpers exported by `AudioEngine`). The mix layers a steady kick on every quarter note, a muted hi-hat on eighths, and a sparse bass tone that shifts with difficulty. A clean hit sound plays when you land on-beat; a muted thud plays on misses.

## Core loop (the first 30 seconds, written as play)

1. **SEE** — The grid appears: white background, a blue 4×4 grid drawn with black lines. A red circle and a yellow triangle sit on the top lane; a blue bar on the second lane. All shapes sit motionless for two seconds while a kick drum counts "1, 2, 3, 4" via the generative underscore.

2. **TAP** — The shapes begin sliding left-to-right on their lanes at a slow, steady BPM. A yellow target bar (15% of the screen width) drops onto the grid at a fixed position. When any shape's center crosses that bar, the player taps the spacebar or any screen location. If the shape is within the bar, a clean chime plays, the shape flashes white for 120 ms, and a small score counter ticks up. If the shape passes the bar without a tap, nothing plays and the shape exits off the right edge.

3. **REPEAT** — A new shape appears from the left every 2 seconds. The kick drum continues at the same BPM. By second 30, the player has performed approximately 15 taps and experienced the core feel: watch, time, tap.

Verbs: **see** → **tap** → **repeat**.

## Interaction map

| Input | Action | Feedback (visual + audio) |
|-------|--------|---------------------------|
| Spacebar / any mouse click / any touch on canvas | Snap-check: if a shape's center is within the target zone, register a "hit"; otherwise register a "miss" | **Hit**: shape flashes white for 120 ms; score counter increments; a bright chime (generated sine wave, ~880 Hz, 200 ms decay) plays. **Miss**: shape exits right without visual emphasis; a muted thud (low sine, ~120 Hz, 300 ms decay) plays. |
| Hold spacebar / hold any mouse button | Pause the game: all shapes freeze, grid pulses once in yellow | Visual: shapes halt mid-slide; a thin yellow line draws across the center as a pause indicator. Audio: generative music pauses instantly. |
| Press `R` or double-tap anywhere | Restart the current run from BPM 60, score 0 | Visual: grid clears instantly; shapes re-spawn from left edge. Audio: kick drum restarts from beat 1. |

## Win / Lose

- **Run length:** 60 seconds (at BPM 60, this is 240 quarter-note beats).
- **Win condition:** Achieve a hit accuracy of 70% or higher. The score display shows hits / total shapes encountered. On a win, a white rectangle fills the center of the grid for 2 seconds, then the game returns to the start.
- **Lose condition:** Miss 10 shapes total. The miss counter is always visible in the top-right corner. On a loss, a black rectangle sweeps across the grid from left to right, then the game returns to the start.
- Both outcomes are reachable on every run regardless of skill: early BPM is slow enough that a careful player can consistently hit 70%+, and the miss counter ensures the game is always finite.

## Session shape

- **First 10 seconds:** The grid and shapes appear without any text overlay. The kick drum counts "1, 2, 3, 4" while shapes sit idle. On beat 5, the first shape begins sliding and a yellow target bar appears. The player can tap along and learn by doing. A subtle pulsing animation on the target bar signals "tap when the shape reaches me."
- **First minute:** The BPM increases by 5 BPM every 15 seconds (so BPM 60 → 80 over one run). Lanes multiply: new lanes appear from below, each with a different geometric shape. At BPM 70+ shapes move faster. At BPM 75+ two shapes may occupy lanes simultaneously, requiring the player to tap once for whichever shape reaches the bar first. At BPM 80+ the target bar narrows slightly (from 15% to 12% of grid width), demanding tighter timing.
- **The replay hook:** Each run is exactly 60 seconds and the BPM curve is deterministic. The player's only variable is timing precision. A "best accuracy" percentage is shown between runs, creating a clear metric to improve. The geometry and colors stay fresh because lane count and BPM combine to produce novel visual rhythms each time.

## Difficulty ramp

What escalates (linear curve):

| BPM range | Change | Effect on player |
|-----------|--------|------------------|
| 60–64 | Base speed | Shapes move slowly; wide target bar (15%). Easy to learn. |
| 65–69 | +5 BPM | Shapes move 8% faster; target bar unchanged. |
| 70–74 | +10 BPM total | Second lane opens. Player taps for the nearest shape first. |
| 75–79 | +15 BPM total | Target bar narrows to 12%. Third lane opens. |
| 80–84 | +20 BPM total | Fourth lane opens. Target bar narrows further to 10%. Max speed. |

The player earns no items to buy — the only "resource" is accuracy percentage, which serves as a personal scoreboard. There is no economy, no power-ups, no extra colors beyond the primary palette.

## Why it's fun (falsifiable hypothesis)

**Tension:** *internal pulse vs. visual distraction.* The game is fun because the player's own sense of rhythm is the instrument, while the moving geometric forms are a visual metronome that sometimes aids and sometimes competes with that internal pulse.

- **CONFIRM:** If players naturally start humming or tapping a foot while playing, and they report "losing themselves in the rhythm" after repeated runs, the hypothesis is confirmed.
- **REFUTE:** If players describe the game as "a reaction test" or "just clicking on shapes when they cross a line," or if accuracy scores cluster around 50% (random guessing) rather than showing a right-skewed distribution centered above 60%, the hypothesis is refuted — the game would be a timing-reaction game, not a rhythm game.

## Scope budget — the OUT list

This game v1 does **NOT** have:

1. Multiple buttons or multi-input controls — only tap/hold/double-tap.
2. 3D graphics, perspective, gradients, shadows, or any non-flat rendering.
3. Pre-existing audio tracks — all music is generative.
4. Narrative, story, or characters.
5. Multiple levels, stages, or theme changes.
6. Score multipliers, combos, or chain bonuses.
7. High-score persistence or leaderboards.
8. Touch gestures beyond tap, hold, and double-tap (no swipe, pinch, or drag).
9. Adjustable difficulty sliders — difficulty escalates automatically via the BPM curve.
10. Extra colors beyond red, yellow, blue, black, and white.
11. Networking, multiplayer, or social features.
12. Save/load state between runs.

## Test API

`window.__GAME` must expose the following for the critic to prove the loop works:

### State queries (synchronous getters)

| Property | Type | Description |
|----------|------|-------------|
| `__GAME.bpm` | `number` | Current BPM (60–84). |
| `__GAME.accuracy` | `number` | Hit accuracy as percentage 0–100. |
| `__GAME.hits` | `number` | Total successful taps. |
| `__GAME.misses` | `number` | Total missed shapes. |
| `__GAME.laneCount` | `number` | Active number of lanes (1–4). |
| `__GAME.targetWidthPct` | `number` | Current target bar width as % of grid width (10–15). |
| `__GAME.timeElapsed` | `number` | Seconds since run start. |
| `__GAME.isRunning` | `boolean` | `true` while shapes are sliding, `false` on pause/start screen. |
| `__GAME.isPaused` | `boolean` | `true` when spacebar/hold-pause is active. |
| `__GAME.hasWon` | `boolean` | `true` after a win condition is reached. |
| `__GAME.hasLost` | `boolean` | `true` after a loss condition is reached (10 misses). |
| `__GAME.totalShapes` | `number` | Total shapes encountered in this run (hits + misses). |

### Simulation hooks

| Method | Params | Effect |
|--------|--------|--------|
| `__GAME.simulateHit()` | none | Registers a hit at the current position of the nearest shape to the target bar. Returns `true` if a shape was within 20% of the bar center. |
| `__GAME.simulateMiss()` | none | Registers a miss for the nearest shape. Returns `true` always. |
| `__GAME.setBPM(bpm)` | `number` | Jumps BPM instantly to value (60–84). Useful for testing difficulty tiers. |
| `__GAME.forceWin()` | none | Sets accuracy to 80% and triggers win condition. |
| `__GAME.forceLose()` | none | Sets miss count to 10 and triggers lose condition. |
| `__GAME.restart()` | none | Resets all state: BPM 60, score 0, lanes 1, target bar 15%. |

### Event listeners

The critic may subscribe to:

| Event name | Payload | Fires when |
|------------|---------|------------|
| `game:hit` | `{ bpm, accuracy, lane }` | A tap lands on a shape within the target zone. |
| `game:miss` | `{ bpm, lane }` | A shape passes the target zone without a tap. |
| `game:win` | `{ accuracy, totalShapes }` | Hit accuracy reaches 70%. |
| `game:lose` | `{ misses, totalShapes }` | Miss count reaches 10. |
| `game:bpmChange` | `{ from, to }` | BPM increases during the difficulty ramp. |
| `game:laneChange` | `{ from, to }` | A new lane opens. |

All event names are prefixed with `game:` and fire via `window.dispatchEvent(new CustomEvent(name, { detail: payload }))`.
