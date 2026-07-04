# blocks_usage.md — Triadic Grid Run

No .factoryx/foundry/blocks-2d/ present in this workspace for the rework.

- Used: custom fixed-dt RAF loop (dt = min(0.06, ...)), pointer buffered by easing, particles, speedlines (ad-hoc), seeded-ish random via Math.
- Reason none: environment did not surface the vetted blocks modules; prior implementation used direct canvas for minimal payload.
- Key shapes preserved from house style where known: easing on cursor, trauma-like flash/gridRes, life-based alpha, post-gesture audio.
- If blocks become available, next pass can copy fixed-timestep + input buffer + particle system.

Game loop and input kept intentionally small and self-contained per browser-game playbook.
