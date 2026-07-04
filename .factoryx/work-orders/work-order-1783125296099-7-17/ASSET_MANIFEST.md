# ASSET_MANIFEST.md

Work Order: work-order-1783125296099-7-17
Node: blocks-usage-doc
Deliverable: triadic-grid-run-loop-canary-v2

## Generated / Updated Files

- `games/92-triadic-grid-run/blocks_usage.md`
  - Type: documentation
  - Description: Explicitly documents that zero blocks-2d modules were copied or called. Provides per-area rationale for the custom minimal game loop, direct input, hand-written update/render, and triad state machine.
  - Reason for non-use: precise stamp timing + generous reliable hit radii, unmistakable inner-geometry telegraph for TRI vs SQR mode, immediate mode-flip feedback, clean composition payoff without extra abstraction or load-order concerns for this single-verb taste-gate slice.
  - References: `.factoryx/foundry/blocks-2d/BLOCKS.md`
  - Placement: next to `index.html`
  - Verification: resolves repeated `changes_requested` on blocks-2d quality floor by making non-use intentional and reviewable.

## Integration Notes
- The file is committed alongside the game sources.
- No blocks-2d modules from foundry were used or adapted (see blocks_usage.md for details).
- This change is documentation-only for the existing Triadic Grid Run Loop Canary v2 slice.

## Evidence
- File created on branch `factoryx/factory-bauhaus/work-order-1783125296099-7-17`
- See also games/92-triadic-grid-run/blocks_usage.md for the authoritative statement.
