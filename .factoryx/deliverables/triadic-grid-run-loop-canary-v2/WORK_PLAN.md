# Triadic Grid Run Loop Canary v2 — Living Plan

**Deliverable:** `triadic-grid-run-loop-canary-v2`  
**Design/requirements:** `games/92-triadic-grid-run/index.html`  
**Current planner run:** work-order-1783123386406-7-1 (planner-1)  
**Base branch:** main  
**Latest review:** review-1783125480904-7-22 (changes_requested) — browser runtime verification failed for file:///.../.factoryx-runtime-check-7.html: vision rubric failed: Generic dark dashboard/HUD/node-route toys with no embodied player subject, vehicle, tool, creature, world, or tactical situation; only UI elements for shape manipulation appear as primary content, lacking a meaningful interactive subject to review.  
**Note:** Fresh validation canary (deliverable created_at_ms 1783123367221). Zero non-planner Work Orders attached to this deliverable id after the timestamp (grep for deliverable id across tree returned zero matches). Inherited assets/builds/game state on main remain PENDING until fresh attached non-planner evidence after the timestamp.

## What was learned (lightweight, no rediscovery)
- Canonical main HEAD: e19d169fb3 (from direct read of .git/refs/heads/main). Work order branch HEAD: 234d202 (from rev-parse). Latest on main remains a planner step.
- Latest accepted non-planner evidence for *this* deliverable id: none. No references to `triadic-grid-run-loop-canary-v2` in source; older work orders and commits (e.g. work-order-1781658166323-6-31) do not count as v2 completion proof.
- Concrete gaps (targeted reads of design file + plan + globs + exactly two allowed shells):
  - No `blocks_usage.md` next to index.html. .factoryx/foundry/blocks-2d/ sources absent from tree (multiple globs returned 0 files); verification harness expects the doc when blocks-2d provided.
  - Game still entirely custom: rAF + clamped dt loop, pointer aim + SPACE/R/click for stamp/mode, hand-written spawn/stamp/update/render + particles/speedLines/grid + triad state machine. Zero blocks module references.
  - Assets present (stylus.png, nodes.png, some sfx WAVs) but code falls back to vector draws; central subject is the cursor stamp (large TRI red / SQR blue) + prominent HUD (#hud, #mode-hud with TRI/SQR buttons, triad pips, score, lives, progress, hints).
  - No embodied player subject (character/creature/vehicle/world/tool body with posture/silhouette) or tactical situation separate from the floating shape primitives and dashboard UI. Primary visible content during play is the shape-manipulation tools and grid.
  - Matches the latest vision rubric exactly (and prior blocks + vector-primitive failures).
  - Used exactly the two allowed read-only shell commands (`git status --short --branch --untracked-files=no` + one combined rev-parse/log for HEADs) before this durable checkpoint. All other inspection via Read/Grep/Glob on contract paths and game symbols only. Did not read WO PREVIEW/VERIFICATION/FEEDBACK/ASSET_MANIFEST first.

## Adaptation
- Address the *latest* changes_requested (review-1783125480904-7-22) before unrelated polish: vision now explicitly flags "node-route toys", "no embodied player subject, vehicle, tool, creature, world, or tactical situation", and "only UI elements for shape manipulation appear as primary content, lacking a meaningful interactive subject to review".
- The blocks-2d documentation floor failure (from reviews on check-6) remains open.
- Do not assume main or prior WOs count for this deliverable. First non-planner work must produce fresh committed evidence under a WO whose payload deliverable_id exactly matches, after created_at_ms.
- Do not pre-schedule verification, PR creation, merge, build artifacts, or broad polish. Only the implementation steps that directly produce the missing doc or the core embodied playable slice are ready.
- Batch kept deliberately small (two independent targeted steps) so we can adapt right after the attached non-planner evidence and any new review state.
- No rediscovery or broad exploration commands. Followed all startup constraints (one combined orientation, <=2 read-only shells before checkpoint, did not broad-find or dump, did not read template notes first).

## Tickets (ready now; small batch)
```yaml
tickets:
  - id: blocks-usage-doc
    title: Add blocks_usage.md documenting foundry blocks-2d (non)use
    goal: >
      Create games/92-triadic-grid-run/blocks_usage.md placed next to index.html. Clearly state that zero blocks-2d modules were copied or called. Provide one line per area (game loop, input handling, particles, tweens, rng, scenes, timestep) explaining the deliberate choice of a minimal custom clamped-dt requestAnimationFrame loop + direct pointer/keyboard stamp input + hand-written update/render + triad state machine. The reasons: precise stamp timing and generous reliable hit radii, unmistakable inner-geometry telegraph for TRI vs SQR mode, immediate mode-flip feedback, and clean composition payoff without extra abstraction or load-order concerns for this single-verb taste-gate slice. Reference the catalog in .factoryx/foundry/blocks-2d/BLOCKS.md. This directly resolves the repeated blocks-2d quality floor changes_requested.
    profile: grok-build
    depends_on: []
  - id: embodied-player-core-slice
    title: Rework playable slice to feature embodied player subject + meaningful tactical situation per latest vision feedback
    goal: >
      Update games/92-triadic-grid-run/index.html (and supporting comments) to give the central experience a distinct embodied player subject (a character, creature, vehicle, courier, hand/tool body with posture/silhouette, or authored presence) rather than the floating stamp primitive (the red triangle or blue square) plus HUD dashboard as primary content. Add a one-sentence creative intent near the top of the script: "This should feel like [specific fantasy or tactical situation]". Keep the primary stamp-to-triad verb and responsive controls (pointer aim + SPACE mode flip) but perform the action through the embodied subject in one authored space/situation. Ensure active-play visuals keep the player presence and nearest nodes/objectives readable and separated from background grid, particles, and overlays. De-emphasize or integrate prominent mode HUD, pips, and shape-manipulation UI so they do not read as the main "dashboard" content. This is the targeted rework for the active vision rubric changes_requested (generic dark dashboard/HUD/node-route toys with no embodied player subject, vehicle, tool, creature, world, or tactical situation; only UI elements for shape manipulation appear as primary content, lacking a meaningful interactive subject to review). The result must remain a 30-60s browser-playable taste-gate slice.
    profile: grok-build
    depends_on: []
```

These two independent implementation steps directly target the open changes_requested items (latest vision rubric + prior blocks quality floor). A single non-planner work order may deliver one or both. After the ticket(s) produce committed evidence on the canonical work-order branch plus the WO's own PREVIEW.md/VERIFICATION.md, the next planner run must read the fresh attached non-planner evidence (and any new review state) before writing further tickets or marking progress.

Do not pre-emptively schedule verification, polish, asset generation, PR, or merge work in this plan.

## Exit criteria for this plan
- The tickets produce the durable `games/92-triadic-grid-run/blocks_usage.md` and a revised `games/92-triadic-grid-run/index.html` (with explicit embodied player subject providing primary visual/interactive content in a tactical/authored situation, plus the required creative-intent sentence) committed on the work-order branch.
- Next planner reads the new attached non-planner evidence (and updated review state from the deliverable) before scheduling more.
- The changes_requested feedback is cleared by the presence of the required blocks_usage.md plus visible meaningful embodied interactive subject (not UI shape-manipulation primitives or dashboard) in the active-play evidence.
