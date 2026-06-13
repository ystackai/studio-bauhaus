# GAME_DESIGN.md — Brief 29: TEMPO

Every game Work Order chain starts with this document, judged BEFORE any code
is written. Fill every section; an empty or vague section fails the design
review. The design doc becomes the build contract and the verification spec.

## Title & one-liner

**Working title:** TEMPO

A flat, primary-colored geometric rhythm game where shapes descend on a Bauhaus grid — tap once to hit the beat, keep the composition in motion.

## Anchors

- **Gameplay like:** *Rhythm Heaven* — one tap, one decision per beat, repeated hundreds of times until muscle memory takes over. The tension lives in the gap between reading the pattern and executing it cleanly; a missed tap breaks the chain and the player must choose whether to push harder for the streak or reset to rebuild confidence.
- **Visuals like:** The Bauhaus Digital house style as defined in `.factoryx/FACTORY_CONTEXT.md` — flat 2D canvas with primary-color geometric primitives (circles, triangles, bars) on a visible grid. No gradients, no shadows, no perspective. Each shape's motion is the animation; there is no decorative animation. The grid extends into time so that the x-axis is position, the y-axis is the hit zone, and the vertical scroll is tempo.
- **Sounds like:** The foundry's parameterized generative music instrument (already built and judged as a working asset). The mix places a steady pulse track at a low volume as the metronome bed; the descending shapes produce short percussive tones when hit, pitched to match the track's key. Silence or off-beat taps produce a muted, dissonant click that is audible but not punishing.

## Core loop (the first 30 seconds, written as play)

1. **See** — A primary-colored circle drops from the top of a 5-column grid toward a single horizontal hit zone line near the bottom. A continuous pulse track plays at 120 BPM.
2. **Tap** — The player presses spacebar (or taps the canvas) when the circle overlaps the hit zone line. On the exact beat the shape flashes white and a percussive tone rings.
3. **Repeat** — A triangle follows the same path on the next measure, then a bar, then a second circle in blue. The pattern establishes itself over 16 beats. If the player misses, the shape passes through the hit zone as a thin black outline and the pulse track continues unchanged. The core loop is: see-shape-coming, tap-on-beat, see-feedback, repeat. Three verbs: see, tap, repeat.

## Interaction map

| Input | Action | Feedback (visual + audio) |
| --- | --- | --- |
| Spacebar / Canvas tap | Hit the current beat — trigger a timing check against the current descending shape | **Visual:** shape flashes white with a 120ms scale-burst (1.0→1.25→1.0) at the hit zone; **Audio:** short percussive tone pitched to the track's key; **Accuracy tier:** Perfect (±50ms) = white flash + tone; Good (±100ms) = yellow flash + lower tone; Miss (>100ms or early) = shape continues past hit zone as thin black outline, muted click sound |
| Spacebar held 500ms+ | Pause the game (pause overlay with a centered white circle on red background) | **Visual:** all shapes freeze mid-frame; a thick white border appears around the canvas; **Audio:** music stops, a low sine tone holds at -20dB |
| Arrow Left / Arrow Right | Change the hit zone position between two predefined vertical lanes (for later complexity) | **Visual:** the hit zone line shifts left/right with a 150ms eased slide; **Audio:** subtle sweep tone confirming the shift |
| R (while paused or after game ends) | Restart the current run from the beginning | **Visual:** canvas clears instantly; grid resets; first shape appears within 300ms; **Audio:** pulse track restarts from beat 1 |

## Win / Lose

**One run lasts 60–120 seconds** (roughly 4–8 measures at the starting BPM, escalating as described below).

- **Win condition:** Achieve a "perfect streak" of 50 consecutive perfect/timing hits on any difficulty. The screen fills with a slow-building yellow grid pattern (no animation beyond the pattern itself) and the pulse track plays a full resolved chord progression as celebration.
- **Lose condition:** Accumulate 10 misses (shapes passing through the hit zone without a tap within the acceptance window). On the 10th miss, the canvas flashes red for 200ms, then a black rectangle with white text appears: "Composition broken. Tap R to rebuild." The run ends; no game-over animation beyond the flash and the rect.

**Accessibility note:** The miss count is displayed as a small row of 10 red dots at the top-right corner of the canvas, one per miss. This is visible at all times.

## Session shape

- **First 10 seconds:** The player sees a red circle drop on the first beat with no text overlay. The grid lines are visible but subtle. A thick horizontal hit zone line is centered near the bottom. The first beat is slow enough (120 BPM, one shape per beat) that any player can tap it. The teaching happens through the situation — you see a shape, it reaches the line, the player taps, the shape flashes white and a tone plays. The connection between tap and feedback is immediate and visible. No instructions, no tutorial text.

- **First minute:** The BPM increases from 120 to 150 over the first 30 seconds. Shapes begin appearing in alternating columns (first left, then center, then right) within the single hit zone. By second 40, shapes appear at slightly irregular intervals (some beats have no shape, creating syncopation). By second 50, the first mini-streak of 5 consecutive perfect hits triggers a small visual celebration (a brief yellow flash of the grid). The player is now in the rhythm.

- **The replay hook:** The streak counter is the driver — the player remembers how close they came to 50 perfects, sees the pattern is the same each run (deterministic seed per difficulty level), and presses retry to chase a better streak. The short run length (under two minutes) makes retries feel cheap.

## Difficulty ramp

Difficulty escalates on three axes, all independent and additive:

1. **BPM (speed):** Increases by 5 BPM per measure (4 beats), starting at 120 BPM → 140 BPM → 160 BPM. Each BPM tier is a distinct "phase."
2. **Density (frequency):** Phase 1: one shape per beat. Phase 2: some beats are empty (syncopation). Phase 3: shapes appear in two columns, requiring the hit zone to move (see interaction map). Phase 4: overlapping shapes — two shapes on screen simultaneously, each on a different column.
3. **Precision window:** Starts at ±100ms (Good/Perfect split at ±50ms). Each phase tightens by 5ms, capping at ±70ms Good / ±35ms Perfect at maximum difficulty.

**What the player earns:** Each perfect hit awards +100 points; Good = +50; Miss = -25. Points are displayed as a large number at the top-left in black on white. The only "currency" is the streak counter, which has no cost — it purely measures persistence. No shop, no upgrades, no power-ups.

## Why it's fun (falsifiable hypothesis)

**Tension:** *Control vs. flow.* The game is fun because it sits at the edge of the player's timing ability — simple enough to learn in 10 seconds, hard enough to sustain for minutes as the BPM climbs. The player constantly negotiates between pushing for perfects (tight window, high risk) and accepting goods (wide window, safe, but streaks require perfects to reach 50).

**CONFIRM if:** Players visibly lean into the canvas and tap with increasing intensity as BPM rises past 140. Players who reach a streak of 30+ show reduced hesitation (tap latency from shape appearance to press drops from ~300ms to ~150ms). The replay rate (pressing R after a loss) is above 60%.

**REFUTE if:** Players tap randomly/continuously without waiting for shapes (indicating they are not reading the beat). The replay rate is below 30%, suggesting the run feels too short or too punishing. Tap latency remains above 400ms even after 5 runs, indicating the game feels disconnected rather than flowing.

## Scope budget — the OUT list

The following are explicitly **NOT** in v1:

- **3D or perspective** — only flat 2D canvas with primary-color geometric primitives
- **Multiple levels or stages** — one continuous run, one BPM curve, one pattern seed per difficulty
- **Narrative or story** — no characters, no plot, no text beyond "Composition broken" on loss and the streak/point counters
- **Network or multiplayer** — single-player only, no leaderboards in v1
- **User accounts or save/load** — streaks are per-session; no persistent progress
- **Power-ups or item pickups** — no collectible shapes, no boosters, no obstacles other than timing
- **Custom music or external audio** — the generative underscore is the only audio source
- **Soundtrack selection or music settings** — one generative track, one BPM curve
- **Complex combo systems** — no "chain multiplier," no "combo x5" — just a streak counter
- **Mobile app wrapper or native deployment** — browser canvas only
- **Accessibility beyond the visible hit zone indicator** — no colorblind modes, no haptic feedback, no alternative input maps beyond spacebar and tap
- **Editor or level designer** — no user-generated content tools

## Test API

The game must expose `window.__GAME` with the following interface so the critic can prove the loop works:

### State queries (read-only)

- `window.__GAME.getState()` — returns `{ bpm, streak, score, misses, phase, isPlaying, isPaused, shapesInPlay: number, hitZoneColumn }`
- `window.__GAME.getHitAccuracy()` — returns the last 50 hit results as an array of `{ timing: 'perfect'|'good'|'miss', beatNumber, latencyMs }`
- `window.__GAME.isWinConditionMet()` — returns `true` if streak >= 50
- `window.__GAME.isLoseConditionMet()` — returns `true` if misses >= 10

### Simulation hooks (write, for testing)

- `window.__GAME.simulateHit(beatNumber)` — simulates a tap on a given beat, returns the accuracy result (`{ timing, latencyMs }`). Allows testing of the timing logic without real-time input.
- `window.__GAME.setDifficulty(bpm, densityPhase, precisionMs)` — sets the game state to a specific difficulty configuration, useful for testing edge cases at high BPM.
- `window.__GAME.skipToBeat(beatNumber)` — jumps the game to a specific beat for testing; pauses the game while doing so.
- `window.__GAME.setMisses(count)` — sets the miss counter to a specific value to test lose condition at any point.
- `window.__GAME.setStreak(count)` — sets the streak counter to test win condition triggering.
- `window.__GAME.reset()` — full game reset; equivalent to pressing R after loss or start.
- `window.__GAME.pause()` / `window.__GAME.resume()` — pause and resume the game.

### Event listeners (for observability)

The game must dispatch custom events on `window` so the critic can observe transitions:

- `'game:start'` — game begins
- `'game:pause'` / `'game:resume'` — pause/resume
- `'game:win'` / `'game:lose'` — end-of-run conditions
- `'game:hit'` — fired on every tap, payload: `{ timing, beatNumber, latencyMs, scoreDelta }`
- `'game:streakChange'` — fired when streak changes, payload: `{ streak, wasPerfect }`

The `window.__GAME` object must be available from `window.__GAME.init()` returning a promise that resolves when the canvas and audio context are ready.
