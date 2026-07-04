# Triadic Grid Run Loop Canary v2 — Living Plan

**Deliverable:** `triadic-grid-run-loop-canary-v2`  
**Design/requirements:** `games/92-triadic-grid-run/index.html`  
**Current planner run:** work-order-1783123386406-7-1 (planner-1)  
**Base branch:** main  
**Latest review:** review-1783124223423-7-26 (changes_requested) — browser runtime quality floor failed on blocks-2d documentation  
**Note:** Fresh validation canary (deliverable created_at_ms 1783123367221). Zero non-planner Work Orders attached to this deliverable id after the timestamp. Inherited assets/builds on main remain PENDING until fresh attached evidence.

## What was learned (lightweight, no rediscovery)
- Canonical main HEAD: e19d169fb307fb98736fa38a928f2ce3d5d7945e (from git metadata). No non-planner Work Orders with deliverable payload for triadic-grid-run-loop-canary-v2 found attached after the create timestamp.
- Latest accepted non-planner evidence for *this* deliverable id: none. Prior commits on main (e.g. 656c74f rework) and older deliverable WOs do not count as v2 proof.
- Concrete gaps on the branch (via targeted reads of contract files):
  - No `blocks_usage.md` next to the game (or repo-wide). This is the direct repeated cause of changes_requested.
  - `sfx-triad.wav` declared in assets/ASSET_MANIFEST.md and loaded by index.html but the file does not exist in assets/ (stamps + clash + pngs only); triadDone falls back to tones.
- blocks-2d: .factoryx/foundry/blocks-2d/ not present in tree; runtime harness provides the blocks during browser check and requires the usage doc.
- Game implements its own loop and systems: `gameLoop` does `const dt = Math.min(0.06, (ts-lastT)/1000 || 0.016)`, calls custom `update(dt)` + `render()`. Inline particles, spawn, grid, stampAt, pointer+keyboard (SPACE mode), triad state. Zero references to blocks modules or their APIs.
- Core verb (stamp TRI/SQR nodes to complete color triad) and start/active-play flow are directly reachable.
- The changes_requested blocks acceptance until blocks_usage.md is supplied.

## Adaptation
- Address the exact review feedback ("foundry blocks-2d was provided, but no blocks_usage.md documents what was used (or why none were) — see .factoryx/foundry/blocks-2d/BLOCKS.md") before any unrelated polish.
- Do not assume anything on main counts for this v2 canary. First non-planner tickets must commit fresh evidence attached to the deliverable (via WO context after created_at_ms).
- Do not pre-schedule verification, PR, merge, or build-artifact work. Only implementation that produces the required doc (or a verification when evidence already reviewable) is ready.
- Batch kept to the single smallest ready step that directly clears the blocker.
- No broad re-exploration; used exactly one `git status --short --branch --untracked-files=no`, one lightweight git metadata shell, then direct targeted file reads and symbol searches on the design file, plan, asset manifest, and game sources.

## Tickets (ready now; small batch)
```yaml
tickets:
  - id: blocks-usage-doc-for-review
    title: Add blocks_usage.md to satisfy blocks-2d quality floor and review feedback
    goal: >
      Create games/92-triadic-grid-run/blocks_usage.md documenting the foundry blocks-2d that were provided during browser runtime check. State clearly that zero modules were copied or used. Explain the reason in one line per relevant area (loop, input, particles, etc.): the game uses a minimal custom clamped-dt rAF gameLoop + direct pointer stamp input + hand-authored update/render + triad state machine to achieve precise control over stamp timing, generous hit radii, TRI/SQR mode telegraph (inner geometry), mode-flip feedback, and composition payoff without adding abstraction or load order for this single-verb taste-gate slice. Reference the catalog at .factoryx/foundry/blocks-2d/BLOCKS.md. Place the file next to index.html so the verifier finds it. This is the targeted rework requested by changes_requested before any other changes.
    profile: grok-build
    depends_on: []
```

After this ticket produces committed evidence (the blocks_usage.md plus its WO's PREVIEW.md/VERIFICATION.md under a non-planner work order attached to the deliverable), the next planner run can read the fresh attached evidence and any updated review state, then decide the minimal next (e.g. audio repair if still needed for asset kit, or a verification ticket that exercises the live preview URL, confirms zero errors, active-play readability, the blocks doc presence, and fills the Game Feel Checklist).

Do not pre-emptively schedule verification, polish, or merge work in this plan.

## Exit criteria for this plan
- The ticket produces the durable `games/92-triadic-grid-run/blocks_usage.md` committed on the canonical work-order branch.
- Next planner reads the new attached non-planner evidence (and any new review state) before writing further tickets.
- The changes_requested feedback is cleared by the presence of the required blocks_usage.md (and subsequent verification that references it).
