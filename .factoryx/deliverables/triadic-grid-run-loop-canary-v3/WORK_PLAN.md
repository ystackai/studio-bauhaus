# WORK_PLAN.md — triadic-grid-run-loop-canary-v3

**Deliverable**: Triadic Grid Run Loop Canary v3  
**Branch**: factoryx/factory-bauhaus/triadic-grid-run-loop-canary-v3-planner-1 (HEAD 0e5ab8e)  
**Base**: main  
**Design**: games/92-triadic-grid-run/index.html  
**Created**: planner run after deliverable record 1783128581268; updated after changes_requested

## What was learned (lightweight read only)
- Current canonical branch HEAD is 0e5ab8e (planner commit "chore(plan): schedule next verification...").
- The immediately prior non-planner verification work order executed browser runtime verification against the served preview, captured post-interaction screenshot, and triggered review.
- Reviewer-default returned `changes_requested` with this summary: browser runtime verification failed for file:///workspaces/factory-bauhaus/worker-1/ystackai_studio-bauhaus/checkout/games/92-triadic-grid-run/.factoryx-runtime-check-7.html: vision rubric failed: Generic dark grid-based interface with UI elements (TRI/SQR buttons, red circle, blue/yellow icons) lacking embodied player subject, creature, or tactical world. Represents node-route toys rather than visual interactive piece with active play and primary subject. requesting targeted rework before accepting this preview. Verification screenshot: /object-store/runs/run-1783128851909-7-10/browser-runtime-post.png
- Game on disk (post "rework make it fun" and prior verification): single-file canvas implementing stamp-TRI/SQR on color nodes to collect 3-color triads. Player presence = stylus cursor (img + vector fallback) with halo/ring; nodes carry color+shape-req that expire; speedlines + grid + particles; mode toggle; lives from misses; score/level/progress; post-gesture sfx (real wavs for stamp/clash, triad fallback); start + gameover + win screens. All self-contained, no net, responsive targets, easing present.
- The stylus + "run" speedlines and grid-res feedback do not suffice for the rubric; the overall read (dark field, icon buttons, pips, abstract nodes, construction geometry, "feel the grid" tagline) is judged generic node UI / toy rather than authored active-play scene with primary subject.
- Creative intent expressed in UI and copy ("Stamp the right shape · Compose the triad · Feel the grid") triggered the "node-route toys" judgment.
- Attached non-planner Work Order evidence exists for this deliverable (the verification run after created_at_ms) but the gate failed; inherited main assets and prior PRs do not count as v3 completion proof.
- No other deliverable-specific reviewer comments or FEEDBACK.md entries visible beyond the review_context payload. No missing dep evidence on main requiring consolidation first.
- .factoryx/foundry/blocks-2d not present for this game; custom loop in use.

## Assessment / adaptation
The prior plan's single verification ticket executed and correctly surfaced the core authored-experience failure. The slice is mechanically coherent and game-feel items (easing, input response, feedback, audio-on-gesture, readable canvas) are in place, but the presentation fails the "embodied player subject, creature, or tactical world" + "visual interactive piece with active play and primary subject" bar.

Per review instruction: "If latest_review.state is changes_requested, address that feedback before unrelated polish."

Per deliverable rules 8/9 and quality bar: because the vision/active-play gate failed, do not schedule PR, merge, build-artifact, or closeout tickets yet. First ready work must be targeted implementation that produces fresh playable evidence of a primary subject in an authored space; a dependent fresh verification (visual-gate analog) must then run to attach new non-planner evidence before any promotion steps.

Dropped: any further verification-only, UI button polish, scoring tweaks, particle tuning, or audio work until the subject/world framing passes a verification that explicitly addresses the rejection language. Kept batch to two small, dependent tickets (rework then verify) so results are visible quickly and the plan can adapt.

The single lowest-waste follow-up after this plan: execute the rework implementation ticket.

## Next tickets (small batch)

```yaml
tickets:
  - id: rework-embodied-subject-triadic
    title: Targeted rework to give Triadic Grid Run a primary embodied subject and tactical world
    goal: >
      Address the changes_requested review directly: rework games/92-triadic-grid-run/index.html (the .factoryx/preview-entrypoint) so the next browser runtime verification can pass the vision rubric instead of being called "Generic dark grid-based interface ... lacking embodied player subject, creature, or tactical world" / "node-route toys". Before touching code, articulate one-sentence creative intent of the form "This should feel like [specific authored fantasy/situation]" that is not a UI description or node graph. Implement a primary subject (amplify or evolve the stylus cursor into a clearly embodied player body/creature/tool-in-hand/operative/vehicle with readable posture or motion silhouette during play; keep the stamp affordance). Add just enough world/tactical context (layered or reactive environment, grid as traversable or threatening space, environmental response to stamps or node expiry, framing that separates subject from background) so that active-play screenshots show the subject + nearest nodes/hazards/objectives as the focal readable elements rather than abstract buttons/icons on a field. Update start subtitle, level announcements, win/loss copy, and any telegraph text to reinforce the fantasy without adding mechanics, levels, or systems. Preserve every existing functional requirement: the TRI/SQR stamp-on-node triad collection verb, pointer aim + click/tap + SPACE flip + onscreen mode controls, lives (3 misses), score, level gates, progress, particles/flash/grid-res, post-gesture audio start, asset usage (stylus/nodes + sfx), easing on all motion, large touch targets, keyboard support, self-contained offline operation, and sub-2s first verb demo. After changes, ensure first 30-60s of play demonstrates the verb inside the new fantasy. Do not schedule or perform PR/merge/closeout work in this ticket. Commit the changed index.html plus any minimal manifest notes on the canonical work-order branch. This is the implementation step required before the deliverable can pass a fresh visual-gate verification.
    profile: grok-build
    depends_on: []
  - id: verify-reworked-embodied-triadic-canary-v3
    title: Fresh browser runtime verification after embodied-subject rework for triadic-grid-run-loop-canary-v3
    goal: >
      After rework-embodied-subject-triadic completes, run a fresh verification Work Order for deliverable triadic-grid-run-loop-canary-v3. Load the exact current served preview URL for games/92-triadic-grid-run/index.html (or its .factoryx/preview-entrypoint) with available browser runtime tooling; do not use stale check files or mismatched ports. Execute start gesture, aim the primary subject, stamp in both TRI and SQR modes on multiple nodes, complete at least one full triad (observing score, flash, audio, grid res, pip updates), trigger a miss, reach a terminal state (win or gameover). Capture at least one active-play screenshot after motion has begun in which the primary subject/creature is visually identifiable and separated from background, with nearest nodes/hazards/objectives also readable. Verify zero pageerror or console.error during interaction, all referenced assets load and participate in the main loop, audio only after gesture, input latency with visible feedback, easing on motion, hit/clash/triad feedback present, outcome copy coherent with actual score/state, large targets + keyboard, and stable frame pacing. Explicitly evaluate against the prior rejection: does the captured play state still read as generic dark grid UI with TRI/SQR buttons, or as a visual interactive piece with active play and primary subject in a tactical world? Cross-check the full WORKFLOW.md game-feel checklist and authored-experience bar. Write concrete pass/fail per criterion, paths to the new screenshot(s) and logs, and any remaining blockers into the work order's VERIFICATION.md (and PREVIEW.md). Commit those evidence files plus git status notes on the canonical work-order branch. This verification run attaches the next required non-planner evidence to the deliverable after the quality-gate failure.
    profile: grok-build
    depends_on: [rework-embodied-subject-triadic]
```

## Follow-up note
After the verification ticket finishes and pushes its evidence, the next planner run will have concrete fresh screenshot + rubric results to judge. If it passes, the plan can then schedule closeout (PR body update, merge readiness, etc.). If it still fails the subject/world bar, schedule one more narrow targeted fix. The batch is deliberately two tickets so we can stop or adapt immediately after seeing the reworked active-play evidence. Do not perform the verification or any polish until the rework ticket has landed on the branch.
