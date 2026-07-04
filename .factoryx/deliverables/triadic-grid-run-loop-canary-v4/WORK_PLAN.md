# Triadic Grid Run Loop Canary v4 — Living Plan

**Deliverable:** `triadic-grid-run-loop-canary-v4`  
**Design/requirements:** `games/92-triadic-grid-run/index.html`  
**Plan ref / integration branch:** `0e5ab8ebe04ce993d96589a8ffc45e0c054ec4e0` (v3-era chore(plan) commit)  
**Current WO branch HEAD:** `656c74f5e06654c490e90ae90ac5e983828b3a15` ("Rework Triadic Grid Run - make it fun after rejection (#86)")  
**WO context:** `.factoryx/work-orders/work-order-1783131903906-7-1`

## Assessment (no rediscovery; one combined orientation + file reads)

- v3 completed (per git log on plan branch): scheduled verification, addressed CHANGES_REQUESTED with "embodied subject (operative+probe silhouette) + tactical lattice world", produced fresh verification evidence, then marked complete by later planners.
- This v4 canary was created after v3 close and reset to the 656c74f fun-rework commit (which appears in ancestry of 0e5ab8e; the embodied rework commit 2c6e49f occurred in v3 timeline after 0e5).
- Game state in current tree (656c74f): self-contained browser slice with primary verb "stamp matching TRI/SQR shapes on colored nodes to compose 3-color triad". Real committed assets (stylus.png, nodes.png, 5 WAVs), pointer+touch+kb input, lives (misses), levels, progress, win ("HARMONY ACHIEVED") / lose ("GRID COLLAPSED"), post-gesture audio, easing, particles, flash, high score. Preview entrypoint already correct. No `blocks_usage.md` next to index.html.
- No strings or files for `triadic-grid-run-loop-canary-v4` exist yet; zero non-planner Work Orders attached to v4 after deliverable created_at_ms. All criteria are PENDING for this validation run. Inherited files and prior v3 evidence do not count as v4 proof.
- 0e5ab8e (plan ref) predates the final v3 verification commits and embodied changes that landed on v3 branches. Any accepted evidence from v3 lives only on work-order branches or later commits, not at the named integration ref.
- Game feel / quality bar items appear addressed in the fun rework (core verb visible immediately, assets integrated and used in loop, readable during motion, audio gated), but this is not review evidence for v4 — a fresh attached verification must produce it on the v4 path.
- Blocks-2d not present in tree; game uses custom RAF + dt + easing (no evidence it was copied/adapted from foundry blocks). Prior canaries repeatedly produced blocks_usage.md to satisfy review floor.

## Adaptation

- Do not carry forward v3 tickets or assume prior verification/embodied work satisfies v4.
- First action must produce v4-attached non-planner evidence (verification) before any polish, PR, or build-artifact steps.
- Keep batch tiny (2 independent tickets) so we can adapt after seeing fresh results on this canary.
- The verify ticket is the root; it must exercise the real served URL, capture post-interaction state, and write reviewable notes/evidence.
- The blocks-usage ticket is independent (lightweight doc step that prior reviews surfaced) and can run in parallel; it records reality for this tree state without assuming blocks were provided.

## Next tickets

```yaml
tickets:
  - id: verify-triadic-v4-playable-slice
    title: Fresh browser verification of Triadic Grid Run playable slice for canary v4
    goal: >
      Exercise the exact game at games/92-triadic-grid-run/index.html (honor .factoryx/preview-entrypoint).
      Start from title, perform primary stamp action within 30s, reach at least one triad complete + visible progress or level change, and capture active-play screenshot(s) showing: embodied cursor/stamp presence, nearest nodes, triad pips, score/lives HUD, and separation from background.
      Verify: no page errors or 4xx asset loads, assets (png sprites + WAVs) load and are used inside the main play loop (not only title), input latency feels immediate with feedback, win/lose copy matches actual state, audio only after gesture.
      Write/append concrete evidence, logs, and screenshots into the current Work Order's PREVIEW.md and VERIFICATION.md (with direct paths or copied artifacts under the WO context).
      If any game-feel checklist item or quality bar item fails visibly, record the exact gap as a blocker and stop rather than forcing a pass.
      Re-confirm .factoryx/preview-entrypoint still targets this artifact.
    profile: grok-build
    depends_on: []
  - id: document-blocks-usage-v4
    title: Add blocks_usage.md documenting foundry blocks (non)use for v4
    goal: >
      Write games/92-triadic-grid-run/blocks_usage.md (one line per key module or "none").
      State that .factoryx/foundry/blocks-2d/ is absent from this canary tree; the implementation uses a direct requestAnimationFrame loop with min-dt clamp, cursor easing, particle system, and pointer-buffered stamping written for the taste-gate slice.
      Note any conceptual reuse (e.g., particles, flash timing, spawn pacing) vs. direct copy and the reason (post-rejection fun rework favored minimal direct code over pulling unshipped blocks).
      This satisfies the workflow check that verification performs when blocks context was supplied historically.
    profile: grok-build
    depends_on: []
```

If the verify ticket produces passing attached evidence for v4, a follow-up planner run can then consider polish or the github_pr artifact. Do not schedule PR/merge work in this plan.

If the slice at this commit still fails taste after fresh verification, the next plan iteration must pivot the verb/space before expanding.
