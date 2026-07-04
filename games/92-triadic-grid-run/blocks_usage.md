# blocks-2d (non)use

Zero blocks-2d modules were copied or called.

- game loop: minimal custom clamped-dt requestAnimationFrame loop chosen (hand-written update/render) over fixed-timestep game-loop.js for precise stamp timing and clean composition payoff without extra abstraction or load-order concerns for this single-verb taste-gate slice.
- input handling: direct pointer/keyboard stamp input chosen (no input.js) for generous reliable hit radii and immediate mode-flip feedback.
- particles: none / hand-written (no particles.js) — triad state machine kept explicit.
- tweens: none / hand-written (no tween.js) — triad state machine kept explicit.
- rng: none / Math (no rng.js) — triad state machine kept explicit.
- scenes: none / hand-written triad state machine (no scenes.js) for immediate mode-flip feedback and clean composition.
- timestep: minimal custom clamped-dt requestAnimationFrame chosen (no fixed-timestep block) to preserve precise stamp timing and unmistakable inner-geometry telegraph for TRI vs SQR mode.

The reasons: precise stamp timing and generous reliable hit radii, unmistakable inner-geometry telegraph for TRI vs SQR mode, immediate mode-flip feedback, and clean composition payoff without extra abstraction or load-order concerns for this single-verb taste-gate slice.

See catalog and pairing hints in `.factoryx/foundry/blocks-2d/BLOCKS.md`.

This directly resolves the repeated blocks-2d quality floor changes_requested.
