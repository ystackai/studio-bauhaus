# blocks-2d Usage

Zero modules were copied or used from `.factoryx/foundry/blocks-2d/`.

Reference the catalog at `.factoryx/foundry/blocks-2d/BLOCKS.md`.

## Reasons (one line per relevant area)

- loop: the game uses a minimal custom clamped-dt rAF gameLoop to achieve precise control over stamp timing without adding abstraction or load order for this single-verb taste-gate slice.
- input: the game uses direct pointer stamp input to achieve generous hit radii without adding abstraction or load order for this single-verb taste-gate slice.
- render/update: the game uses hand-authored update/render + triad state machine to achieve TRI/SQR mode telegraph (inner geometry), mode-flip feedback, and composition payoff without adding abstraction or load order for this single-verb taste-gate slice.
- particles: none; the hand-authored loop and triad state machine provide the needed visual feedback directly.
- state/timing: the custom triad state machine provides the required precise stamp timing, mode telegraph, and payoff control without introducing blocks load order or abstractions.

This keeps the implementation minimal for the taste-gate slice while satisfying the blocks-2d quality floor by explicit documentation of the intentional non-use.