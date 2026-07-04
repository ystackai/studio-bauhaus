# PREVIEW — Triadic Grid Run Loop Canary v3

**Entrypoint:** games/92-triadic-grid-run/index.html (confirmed via .factoryx/preview-entrypoint)

**Local smoke URL (exact served emulation used for verification):**  
http://localhost:18481/games/92-triadic-grid-run/index.html?verif=1 (or 18476 in prior run; path /games/... matches preview deploy; port varied only for container TIME_WAIT)  
- Active play captured via harness auto start+TRI/SQR stamps+triad.

**Production preview (after deploy):**  
https://www.ystackai.com/factoryx/bauhaus/previews/work-order-1783129017720-7-14/  
(redirects to /games/92-triadic-grid-run/ per standard CI/preview logic)

**Active play evidence captured during verification:**  
- active-play-screenshot.png (129kB post start + stamps + triad + motion; cursor, nodes, feedback visible/separated)
- See VERIFICATION.md for checklist + logs (fresh run 2026-07-04)

See VERIFICATION.md for runtime checklist, logs, pass/fail per criterion, and asset load confirmation.

No homepage mutation or new redirect added; the artifact index.html is the direct preview root.
