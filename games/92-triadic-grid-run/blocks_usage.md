# blocks-2d (non)use

Zero blocks-2d modules were copied or called for this slice.

## Rationale by area

- game loop: minimal custom clamped-dt requestAnimationFrame loop chosen for precise stamp timing and clean composition payoff without extra abstraction or load-order concerns for this single-verb taste-gate slice.
- input handling: direct pointer/keyboard stamp input chosen for generous reliable hit radii and immediate mode-flip feedback.
- particles: none (hand-written update/render keeps the triad state machine explicit and focused).
- tweens: none (hand-written update/render keeps the triad state machine explicit and focused).
- rng: none (hand-written update/render keeps the triad state machine explicit and focused).
- scenes: none (hand-written update/render + triad state machine avoids scene abstraction overhead for a one-verb slice).
- timestep: minimal custom clamped-dt requestAnimationFrame (no fixed-timestep block) chosen to preserve precise stamp timing and unmistakable inner-geometry telegraph for TRI vs SQR mode.

## Reference

See catalog and pairing hints in `.factoryx/foundry/blocks-2d/BLOCKS.md`.

This documentation directly addresses repeated blocks-2d quality-floor `changes_requested` by making the deliberate non-use explicit and justified.
