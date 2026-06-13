# Verification — Bauhaus Construct (Design Phase)

## Deliverable
- ✅ `drops/bauhaus-1/design/GAME_DESIGN_construct.md` — complete design doc, all template sections filled
- ✅ `drops/bauhaus-1/design/preview.html` — rendered preview of the design doc
- ✅ `.factoryx/preview-entrypoint` — points to preview.html

## Template completeness check
- [x] Title & one-liner
- [x] Anchors (gameplay like, visuals like, sounds like)
- [x] Core loop (30 seconds, 3 verbs: select, move, snap)
- [x] Interaction map (8 rows, all implementable and verifiable)
- [x] Win / Lose (concrete conditions, run length 30–90s)
- [x] Session shape (10s teach, 1min escalate, replay hook)
- [x] Difficulty ramp (linear: pieces 3→10, rotations 1→4)
- [x] Why it's fun (precision-vs-greed, falsifiable with confirm/refute criteria)
- [x] OUT list (12 explicit exclusions: no 3D, no narrative, no power-ups, etc.)
- [x] Test API (window.__GAME contract with state queries + simulation hooks + critic scenarios)

## Isolation check
- No other design files in the repo or its branches were read or referenced.
- The design was written from scratch using original phrasing.
- Only existing judged assets referenced: PixelHunters (visuals), The Grain Snap (audio).

## Preview entrypoint
- File: `.factoryx/preview-entrypoint`
- Value: `drops/bauhaus-1/design/preview.html`
- Preview HTML is self-contained, renders the design doc with Bauhaus styling.
