# PREVIEW — l3-recovery-block-browser-smoke-canary

Game: games/recovery-canary/index.html
Entry: .factoryx/preview-entrypoint set to the canary.

## How to preview
- Open games/recovery-canary/index.html directly (or via the worker preview root).
- Click "ENTER THE PLAZA"
- Use arrow keys / WASD to move the diamond herald.
- Move near a gray pylon and press SPACE (or click/tap near it) to strike.
- 3 strikes resolve the chord, open the gate, herald crosses → end screen.

## Recovery Block
Browser smoke run executed (chromium headless + interaction + screenshot + log). See VERIFICATION.md for full evidence and the exact recovery block usage.

## Assets
- Real foundry audio via cozy_audio_pack job asset-1783135084677-85672b24
- Music + 3 sfx loaded from asset files after gesture.
- Visuals: crisp Bauhaus geometric (herald body, colored pylons, gate) drawn live.

## Evidence
- Browser smoke screenshot after interaction: .factoryx/work-orders/work-order-1783134934033-6-1/evidence/frame-interact.png
- Clean log, zero page/console/request errors for game code.
