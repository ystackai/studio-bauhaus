# WORK_PLAN — Triadic Grid Run

**Deliverable:** triadic-grid-run  
**Branch:** main (HEAD 656c74f5e06654c490e90ae90ac5e983828b3a15)  
**Last non-planner evidence:** work-order-1781658166323-6-31 (state=done, PR #86) — "Rework Triadic Grid Run - make it fun after rejection"

**DB note:** prior planner-2 run failed on auth timeout; no other attached non-planner WOs listed after deliverable creation timestamp.

**Assessment of current main:**  
The game at `games/92-triadic-grid-run/index.html` implements a complete taste-gate slice per the attached WORKFLOW: one primary verb (stamp matching TRI/SQR shape on nodes to compose color triad), one space, real file assets (PNG/WAV from gen_assets.py), pointer+touch+keyboard, audio only after gesture, levels via score, particles/feedback, win/gameover with coherent copy. House style (primaries, construction geometry, grid) followed. Preview entrypoint targets it. No blocks-2d/ foundry modules present in tree.

The prior rework addressed a rejection and was operator-accepted. No visible TODOs or failure markers in source. Inherited assets+code are not auto-proof for this validation pass.

**What was learned / unblocked:** Auth failure did not alter committed state; the accepted slice is on main. Per rules, old manifests/PRs do not count as fresh completion proof for the deliverable — a new attached non-planner WO must produce or re-verify runtime evidence.

**Next lowest-waste action:** Schedule a single small independent verification ticket (no impl changes) so the loop can produce fresh browser evidence and close the gate if clean. Batch kept to 1 ticket for fast feedback/adapt. If verification passes cleanly, a follow-up planner can mark done.

```yaml
tickets:
  - id: verify-triadic-grid-run
    title: Fresh browser verification of Triadic Grid Run slice
    goal: >
      Exercise the current main artifact (games/92-triadic-grid-run/index.html or the .factoryx/preview-entrypoint target) using the worker's browser verification path. Trigger start, perform pointer/touch/keyboard interactions including at least one successful stamp and one mode flip, reach a state change (score/triad advance or end screen). Capture active-play screenshot after motion begins (player stamp + nearest nodes must be readable and separated). Assert no pageerror, no 4xx asset requests, non-blank canvas post-interaction, and that outcome copy matches actual result. Record pass/fail + artifact links in the Work Order's VERIFICATION.md (and PREVIEW.md if new captures). Provide the fresh attached evidence required for deliverable completion rules. Do not rewrite game code.
    profile: grok-build
    depends_on: []
```

## Notes for future planners
- If verification fails, next plan should include a targeted fix ticket (small patch only) + re-verify.
- Do not expand the slice (no new levels, saves, or systems) unless a new requirements path is supplied.
- When blocks-2d modules appear in tree, a future narrow ticket can audit for reuse without full rewrite.
