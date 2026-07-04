# Triadic Grid Run Loop Canary v2 — Living Plan

**Deliverable:** `triadic-grid-run-loop-canary-v2`  
**Design/requirements:** `games/92-triadic-grid-run/index.html`  
**Current planner run:** work-order-1783123386406-7-1 (planner-1)  
**Base branch:** main  
**Note:** This is a fresh validation canary (deliverable created_at_ms 1783123367221). Zero non-planner Work Orders attached to this exact deliverable id after creation timestamp.

## What was learned (lightweight, no rediscovery)
- Canonical main HEAD: e19d169fb307fb98736fa38a928f2ce3d5d7945e. Last change that touched the game: 656c74f "Rework Triadic Grid Run - make it fun after rejection (#86)" (present on main).
- Prior rejection (from older work-order-1781658166323-6-31 FEEDBACK): "boring, aesthetically uninteresting, with bad bleep-bleep audio and broken/unclear square/triangle interactions."
- The rework addressed telegraph (inner geometry on nodes for TRI vs SQR), generous hits, mode UI, particles, progress, real WAV direction + PNG sprites, post-gesture audio.
- Old verification (attached to prior WO, not this deliverable): chromium headless smoke clean (0 errors, non-blank frames with grid+nodes+cursor visible), assets (claimed 5 WAVs), game-feel checklist items claimed passing at that time.
- For v2 canary: per rules 7-9, inherited files on main (even after rework merge) count as PENDING. No completion proof until fresh non-planner WO(s) attached to `triadic-grid-run-loop-canary-v2` commit/verify evidence on main.
- Concrete gap (from repo text + file metadata): `sfx-triad.wav` is declared in `gen_assets.py`, `ASSET_MANIFEST.md`, and `index.html` load list, but the file is absent from `games/92-triadic-grid-run/assets/` (only stamp-*.wav + clash.wav present). Code path falls back to tones for triad completion. This violates "real file-backed assets", "musical WAV direction (no bleep fallback as primary)", and asset production checkpoint. Preview entrypoint correctly targets the game.
- No `.factoryx/foundry/blocks-2d/` modules or references found; game implements custom loop/input/render (clamped dt rAF, own spawn/particle/grid). Workflow guidance to copy blocks was not followed in prior pass.
- Game core verb (stamp TRI/SQR to compose 3-color triad) + one space + pointer-primary control is present and directly playable. No save/load/inventory bloat.

## Adaptation
Dropped any assumption that prior rework evidence or assets automatically satisfy v2. Prior verification evidence is not attached to this deliverable id. Asset file gap must be treated as real (not "already on main"). No PR/merge/build tickets until a fresh verification-style ticket produces attached evidence. Batch kept to 2 small independent steps so we can adapt after seeing results. No broad history re-read.

## Tickets (ready now; small batch)
```yaml
tickets:
  - id: repair-triad-audio-asset
    title: Repair missing sfx-triad.wav so asset kit is complete and real-file
    goal: >
      Produce or restore sfx-triad.wav (the ~0.9s 3-voice harmony resolve cadence) under games/92-triadic-grid-run/assets/ using the existing gen_assets.py (or minimal equivalent) with the same provenance. Commit the wav + any ASSET_MANIFEST.md refresh that records the job/WO id, method, and integration (loaded+played in index.html for triadDone). Confirm via load check that the buffer is present (no oscillator fallback for harmony). This is the minimal step to satisfy "asset kit loads and matters" and "musical not bleep" before any verification claim. Save evidence files and a short note.
    profile: grok-build
    depends_on: []
  - id: fresh-browser-taste-gate-verification-v2
    title: Fresh browser runtime + taste-gate + game-feel evidence attached to v2
    goal: >
      Execute browser verification against the actual preview URL for games/92-triadic-grid-run/index.html (chromium headless or runtime equivalent; exercise real file loads). Capture: boot frame (grid + seeded nodes + stamp cursor visible), active-play frame after start + multiple stamps (cursor, nearest nodes, triad pips, feedback visible and separated). Grep logs for zero uncaught/JS errors/pageerror/asset failures. Confirm full asset kit (PNGs + all 5 WAVs including triad) load from disk and are used in main loop (stamp, clash, triad). Run through core verb to at least one triad completion + level feel or win. Explicitly fill the Game Feel Checklist and Workflow.md quality bar with concrete pass/fail + notes. If the slice still reads as boring/unclear or assets fall back, record the exact failure + next minimal fix instead of green. Write PREVIEW.md/VERIFICATION.md + evidence (screenshots, logs, checklist) under the executing work-order context. This is the first required non-planner evidence attachment for the v2 deliverable.
    profile: grok-build
    depends_on: [repair-triad-audio-asset]
```

If after the verification ticket the slice passes taste + feel + asset gates with attached evidence, a subsequent planner can then schedule closeout (PR update, etc.). Do not pre-schedule polish or merge.

## Exit criteria for this plan
- The two tickets above produce durable committed evidence on main under this deliverable.
- Next planner run will read the new attached non-planner evidence before writing further tickets.
