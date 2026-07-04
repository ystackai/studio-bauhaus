# blocks_usage.md — q3-blocks-mini-live-batch-a-bauhaus-loom-runner

## Copied modules (per hard requirement)
- `.factoryx/foundry/blocks-2d/game-loop.js` → `games/q3-blocks-mini-live-batch-a-bauhaus-loom-runner/game-loop.js` (copied verbatim)
- `.factoryx/foundry/blocks-2d/input.js` → `games/q3-blocks-mini-live-batch-a-bauhaus-loom-runner/input.js` (copied verbatim)
- `.factoryx/foundry/sound/webaudio-kit.js` → `games/q3-blocks-mini-live-batch-a-bauhaus-loom-runner/webaudio-kit.js` (copied verbatim)

No other blocks or modules were copied. Only index.html, game.js, the three copied files, and this blocks_usage.md were created in the game directory.

## Exact call sites (game.js)
- `FoundryLoop.start({ update: update, render: render })` — boot after DOM + input/audio setup (around end of IIFE).
- `FoundryInput.install(canvas, { actions: { left: ['ArrowLeft','KeyA'], right: ['ArrowRight','KeyD'] } })` — after canvas acquisition.
- `FoundryInput.held('left')`, `FoundryInput.held('right')` — inside `update(dt)` for player control.
- `FoundryInput.update(dt)` — called at end of `update(dt)` every tick.
- `FoundryAudio.install()` — called once at module boot (top of IIFE), before loop start.
- `FoundryAudio.click()` and `FoundryAudio.droneStart(48)` — called inside the first-interaction capture handler (onFirstGesture), not on reset.

## Direct probe-first listeners (capture phase, in addition to FoundryInput)
- `window.addEventListener('pointerdown', onFirstGesture, true);`
- `window.addEventListener('keydown', onFirstGesture, true);`
- Handler binds Space, Enter, ArrowLeft, ArrowRight, KeyA, KeyD.
- On first qualifying event: synchronously shifts `player.x` by >=80 px, sets `actionFlash` (large high-contrast ring + cross visible >=0.8 s), changes visible state (idle weave disengages, trail + rings appear), and triggers audio.

Restart gestures (Space/Enter/pointer) when in debrief are on bubble phase and do not re-install audio.

## Adaptations / notes
- Modules used as-is; no rewrites of fixed-timestep, buffering, or audio context logic.
- Game owns: entity lists, collision, Bauhaus drawing, win/lose state, first-paint population, capture listeners, and debrief.
- No scenes, tween, particles, or rng blocks were used (only the three explicitly required).
