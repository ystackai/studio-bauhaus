# Triadic Grid Run Loop Canary v2 — Living Plan

**Deliverable:** `triadic-grid-run-loop-canary-v2`  
**Design/requirements:** `games/92-triadic-grid-run/index.html`  
**Current planner run:** work-order-1783123386406-7-1 (planner-1)  
**Base branch:** main  
**Latest review:** review-1783123792351-7-12 (changes_requested) — browser runtime quality floor failed on blocks-2d documentation  
**Note:** Fresh validation canary (deliverable created_at_ms 1783123367221). Zero non-planner Work Orders attached to this deliverable id after the timestamp. Inherited assets/builds on main remain PENDING until fresh attached evidence.

## What was learned (lightweight, no rediscovery)
- Canonical main HEAD: e19d169fb307fb98736fa38a928f2ce3d5d7945e (matches prior plan record). Work order branch HEAD: 697afa0fb8204ef7eb22b6ddd01893c449aa15ec.
- Latest accepted non-planner evidence for *this* deliverable id: none. Prior rework (656c74f) and its verification are from older deliverable/wo and do not count as v2 proof.
- Concrete gaps still present on the branch (confirmed via targeted file metadata):
  - `sfx-triad.wav` missing from `games/92-triadic-grid-run/assets/` (gen_assets.py + ASSET_MANIFEST.md + index.html declare it; only 4 WAVs + 2 PNGs exist; triad falls back to oscillator tones).
  - No `blocks_usage.md` next to the game.
- blocks-2d: no files under .factoryx/foundry/blocks-2d/ visible in source, but the runtime verification harness provides the blocks and enforces the workflow rule ("foundry blocks-2d was provided, but no blocks_usage.md documents what was used (or why none were)").
- Game implements its own clamped-dt rAF loop, update/render, pointer+keyboard input, particles, spawn, grid, stamp logic, and triad state (see gameLoop, update, stampAt, draw*). No references to blocks modules.
- Core verb (stamp matching TRI/SQR to complete color triad) is present and the start screen + active play is directly reachable.
- The changes_requested review blocks acceptance of the preview until the blocks doc is supplied.

## Adaptation
- Address the exact review feedback ("changes_requested") before unrelated polish or larger steps: the immediate required change is the blocks_usage.md.
- Audio asset gap remains a real violation of asset checkpoint and "real file-backed" rule; it must be resolved before a verification can claim the full asset kit passes.
- Do not assume prior evidence or "on main" files count. First non-planner tickets must produce attached evidence (committed artifacts + PREVIEW/VERIFICATION under a wo context for this deliverable id).
- Drop any pre-scheduling of PR/merge/build until a verification ticket produces passing attached evidence.
- Batch kept to two small ready steps (blocks doc + audio repair) so the next planner can read fresh evidence and adapt. Verification follows once these are in.
- No broad re-exploration; used one exact status, one lightweight HEAD+metadata shell, then direct file reads for the contract files (index.html, plan, assets dir listing, manifest).

## Tickets (ready now; small batch)
```yaml
tickets:
  - id: blocks-usage-doc-for-review
    title: Add blocks_usage.md to satisfy blocks-2d quality floor and review feedback
    goal: >
      Create games/92-triadic-grid-run/blocks_usage.md documenting the foundry blocks-2d that were provided during browser runtime check. State clearly that zero modules were copied or used. Explain the reason in one line per relevant area: the game uses a minimal custom clamped-dt rAF gameLoop + direct pointer stamp input + hand-authored update/render + triad state machine to achieve precise control over stamp timing, generous hit radii, TRI/SQR mode telegraph (inner geometry), mode-flip feedback, and composition payoff without adding abstraction or load order for this single-verb taste-gate slice. Reference the catalog at .factoryx/foundry/blocks-2d/BLOCKS.md. Place the file next to index.html so the verifier finds it. This is the targeted rework requested by changes_requested before any other changes.
    profile: grok-build
    depends_on: []
  - id: repair-triad-audio-asset
    title: Repair missing sfx-triad.wav so the committed asset kit is complete and real-file
    goal: >
      Produce or restore sfx-triad.wav (the ~0.9s 3-voice harmony resolve cadence described in the existing manifest) under games/92-triadic-grid-run/assets/ by running the pinned gen_assets.py (or an equivalent minimal stdlib generator matching the documented provenance). The file must be loadable as a real buffer by index.html (no tone fallback for the triadDone path). Update ASSET_MANIFEST.md with the producing work-order id, method, sizes, and integration point. Commit the wav + manifest change. This unblocks any verification claim that the "asset kit loads and matters" and that musical direction (not bleep fallback) is satisfied.
    profile: grok-build
    depends_on: []
```

After these two produce committed evidence, the next planner run (reading the attached non-planner WO evidence) can schedule a fresh browser verification ticket that exercises the real preview URL, captures boot + active-play frames, confirms zero runtime errors + all 5 WAVs + PNGs load from disk and are exercised in the loop, fills the Game Feel Checklist explicitly, and records PREVIEW.md/VERIFICATION.md under that WO context. Only after attached verification evidence passes the quality bar (including blocks doc and real assets) should closeout tickets (PR body update, etc.) be scheduled.

Do not pre-emptively schedule verification, polish, or merge work in this plan.

## Exit criteria for this plan
- The two tickets produce durable committed files (blocks_usage.md + sfx-triad.wav + updated manifest) on the canonical work-order branch.
- Next planner reads the new attached non-planner evidence (and any new review state) before writing further tickets.
- The changes_requested feedback is cleared by the presence of the required blocks_usage.md (and subsequent verification that references it).
