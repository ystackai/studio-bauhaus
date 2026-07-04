# Triadic Grid Run Loop Canary v2 — Living Plan

**Deliverable:** `triadic-grid-run-loop-canary-v2`  
**Design/requirements:** `games/92-triadic-grid-run/index.html`  
**Current planner run:** work-order-1783123386406-7-1 (planner-1)  
**Base branch:** main  
**Latest review:** review-1783125083750-7-9 (changes_requested) — browser runtime verification failed: vision rubric: Generic dark dashboard/HUD with vector primitives (blue square, red triangle) standing in for central experience; no embodied player subject (character/creature/vehicle/world), only UI tools without active play or visual interest beyond primitive elements.  
**Note:** Fresh validation canary (deliverable created_at_ms 1783123367221). Zero non-planner Work Orders attached to this deliverable id after the timestamp (grep across WO files found no references to the deliverable id). Inherited assets/builds on main remain PENDING until fresh attached evidence.

## What was learned (lightweight, no rediscovery)
- Canonical main HEAD: e19d169fb3 (from lightweight git metadata). Work order branch HEAD: 4511f5ae8b. Latest commit on main is itself a planner step ("Plan next steps for Triadic Grid Run (planner-8)").
- Latest accepted non-planner evidence for *this* deliverable id: none. Prior commits (e.g. 656c74f rework) and older WOs do not count as v2 proof.
- Concrete gaps (targeted reads of contract files + game sources + asset manifest + glob):
  - No `blocks_usage.md` next to the game. blocks-2d dir absent from tree (.factoryx/foundry/blocks-2d/ returns 0 files); runtime harness injects for check and requires the doc.
  - Game implements entirely custom loop/input/render: rAF with clamped dt, pointer move + click + SPACE/R/letters for mode and restart, custom spawnNode/stampAt/update/render + particles/speedLines/gridLines/triad state. Zero references to blocks modules.
  - Assets: stylus.png + nodes.png + some sfx present (stamps + clash); sfx-triad.wav declared in ASSET_MANIFEST.md and code but missing on disk, falls back to tones.
  - Core visuals: dark #1a1a1a bg, construction grid lines, floating colored TRI/SQR nodes (vector fallback draws exact red triangle / blue square with inner ticks), stamp "player" is itself a large TRI or SQR drawn at cursor + HUD overlays (score, GRID level, triad pips, lives, mode buttons, progress). The stamp cursor and nodes *are* the red/blue/yellow primitives.
  - No embodied player body/character/vehicle/world separate from the floating stamp primitive and dashboard UI. Start/active flow is reachable; triad composition payoff exists.
  - Matches exactly the latest vision rubric failure (and prior blocks failures listed in recent_reviews).
- Used exactly two read-only shell commands (the mandated `git status --short --branch --untracked-files=no` + one combined lightweight rev-parse/log for HEADs/branches) before this durable checkpoint. All other inspection via Read/Grep/Glob on design file, plan, manifest, and source symbols.

## Adaptation
- Address the *latest* changes_requested first: the vision rubric failure calling out generic dark dashboard/HUD + vector primitives (blue sq, red tri) with "no embodied player subject". This takes precedence over unrelated polish.
- The blocks-2d documentation failure remains an open requirement from the two prior recent_reviews on check-6 runs.
- Do not assume anything on main or prior WOs counts for this deliverable. First non-planner tickets must produce fresh evidence committed under a work order whose payload deliverable_id matches, after the create timestamp.
- Do not pre-schedule verification, PR, merge, or build-artifact tickets. Only implementation steps that will produce the missing doc or the core embodied slice are ready now.
- Batch kept small (two independent targeted steps) so we can adapt immediately after seeing the attached non-planner evidence and any new review state.
- No rediscovery or broad commands.

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
    title: Rework playable slice to feature embodied player subject per vision feedback
    goal: >
      Update games/92-triadic-grid-run/index.html (and supporting comments) to give the central experience a distinct embodied player subject (a character, creature, vehicle, hand, courier, or authored tool body with posture/silhouette) rather than only the floating stamp primitive (the red triangle or blue square) plus HUD dashboard. Add a one-sentence creative intent near the top of the script: "This should feel like [specific fantasy/situation]". Keep the primary stamp-to-triad verb and responsive controls (pointer aim + SPACE mode flip) but perform the action through the embodied subject in one authored space. Ensure active-play visuals keep the player presence and nearest nodes/objectives readable and separated from background grid, particles, and overlays. Update start/active-play rendering and any idle/demo so the subject provides visual interest beyond Bauhaus vector primitives. This is the targeted rework for the active vision rubric changes_requested (generic dark dashboard/HUD, no embodied player subject, only UI tools without active play interest). The result must remain a 30-60s browser-playable taste-gate slice.
    profile: grok-build
    depends_on: []
```

These two independent implementation steps directly target the open changes_requested items (latest vision + prior blocks quality floor). A single non-planner work order may deliver one or both (e.g. the embodied rework can also ensure the blocks_usage.md is written if it fits the change). After the ticket(s) produce committed evidence on the canonical work-order branch plus the WO's own PREVIEW.md/VERIFICATION.md, the next planner run must read the fresh attached non-planner evidence (and any new review state) before writing further tickets or marking progress.

Do not pre-emptively schedule verification, polish, asset generation, PR, or merge work in this plan.

## Exit criteria for this plan
- The tickets produce the durable `games/92-triadic-grid-run/blocks_usage.md` and a revised `games/92-triadic-grid-run/index.html` (with explicit embodied player subject and fantasy statement) committed on the work-order branch.
- Next planner reads the new attached non-planner evidence (and updated review state from the deliverable) before scheduling more.
- The changes_requested feedback is cleared by the presence of the required blocks_usage.md plus visible embodied player subject in the active-play evidence.
