# Execution Strategy: Rework Triadic Grid Run — make it fun after rejection

Work Order: work-order-1781658166323-6-31
Source decisions: deliverable-decision-1781627560778-1, deliverable-decision-1781627667555-2, deliverable-decision-1781627700560-3
Rejection summary (operator): boring, aesthetically uninteresting, bad bleep-bleep audio, broken/unclear square/triangle interactions.

## Guiding Constraints (from WORKFLOW + payload)
- Taste-gate slice FIRST: 30-60s playable of ONE verb in ONE space before any systems expansion. Browser playable evidence before more.
- If slice not interesting after honest play — pivot. Concrete acceptance over adjectives.
- Real file-backed assets + ASSET_MANIFEST.md provenance required for material art/audio (no in-code-only procedural satisfy contract v2).
- First 10s must communicate fun objective, square/triangle interactions reliable+obvious, real musical/audio direction (not throwaway beeps), Bauhaus visual language intentional (not flat).
- Keep only what is useful from prior; materially redesign core loop if needed.
- Game Feel 9-item checklist + Quality bar before review.
- grok-build profile; durable notes here; PR with FactoryX context section containing full prompt.
- Address stale Grok auth (previous) by using fresh token flows for any net ops; verify before model-heavy.

## Player Fantasy (revised for delight)
You are a Bauhaus compositor "running the grid." The grid is a living sheet of primary geometry. Your stylus can be a TRIANGLE or a SQUARE (the two tools that earned their place). Nodes of red/yellow/blue arrive as tri or sqr shapes. You stamp the matching tool on the node at the right time to "compose" — completing a red-yellow-blue triad triggers a visible grid resonance and a short, satisfying musical cadence. Wrong stamp clashes (recoverable). The joy is in the deliberate choice + precise timing of the right shape tool producing clean harmony out of the grid.

## Core Verb (the slice)
**Stamp matching shape (triangle or square) to triadic color nodes to complete harmonies.**

One space: the Triadic Grid (bold primary grid + pulsing nodes + your large obvious stylus cursor that shows current stamp mode).

## Why this addresses rejection directly
- Square/triangle: the entire point of play. Nodes clearly announce their required stamp (big inner geometry + color). Current mode is always visible at cursor + dedicated large toggle targets. Collision generous, feedback immediate and unmistakable (snap vs clash).
- Not boring: the verb has a clear "why" (build the visible triad pips) and rhythmic pressure (nodes pulse/expire). Every stamp is a small composition decision.
- Audio: real musical stabs and cadences authored as WAVs (additive + percussive geometric rhythms, not single-osc bleeps). Success advances a rising phrase; full triad resolves.
- Bauhaus intentional: strict primary palette, ruler-straight grid with weight hierarchy, honest flat fills + crisp strokes, construction marks on stamps/nodes, resonance on the grid itself as environmental reaction (no decoration).
- First 10s: on load the world is the playable grid with 2-3 obvious nodes + cursor already in motion following pointer. One node is TRI red, one SQR blue. A compact non-blocking affordance says "Stamp the matching shape (SPACE flips tool)". First click that hits produces instant "this is the game" pop + note.

## Slice Acceptance Criteria (taste gate)
- Load -> immediately see grid, stylus cursor with current stamp (large TRI or SQR silhouette), 2+ pulsing nodes with clear required-shape geometry.
- Move pointer or keys: cursor follows with <100ms perceived response + easing.
- Click/tap near a node with matching stamp mode: node snaps (scale pop + ring + color lock to top pip), musical stab plays (rich, not sine bleep), particles (line bursts).
- SPACE or large buttons: flips stamp mode with obvious cursor change + short confirmation tone.
- Wrong stamp on node: clash (node shakes, emits "crack" particles, short sour-but-musical dissonance that doesn't ruin flow).
- After 3 correct mixed stamps (a triad): grid lines pulse brighter in sequence, full short musical cadence (e.g. 3-voice resolving figure), pips clear or advance, floating "HARMONY" or +score.
- No giant menu blocking view of the action; a light start card or none for slice.
- 60fps, self contained, assets load from ./assets relative, total <2MB.
- Play for 30-45s feels rhythmic and intentional; you understand the objective without reading.

## Planned Redesign Scope (keep useful, change core)
Keep:
- Bauhaus primary palette + grid as foundation.
- Post-gesture audio only.
- Keyboard + pointer + touch + large targets.
- Eased motion, particles/juice on impact, floating text, flash, shake on key moments.
- Self-contained single index.html + assets/ dir + manifest.
- Score, combo-ish (streak), lives or miss limit, win condition, restart.
- Browser verif protocol + evidence in WO.

Material changes:
- Core verb from "pilot a morphing runner collecting orbs while dodging" -> "aim + choose stamp tool + time the strike on shape-typed nodes".
- Remove or de-emphasize auto-scrolling "runner" silhouette; the "run" is you keeping up with the arriving composition on the grid.
- Audio system: load real WAVs for stamp success (per color+shape), clash, and full triad cadence. Music direction via authored phrases that feel like "the grid is playing with you".
- Visual assets: new authored PNG sheets or individuals for stylus (tri mode, sqr mode), nodes (tri red/yellow/blue variants, sqr variants), perhaps grid accent tiles or resonance overlay. Make them crisp, with inner construction for "intentional" not flat.
- Interactions: explicit mode (TRI/SQR), reliable generous matching, clear telegraphing of what stamp a node wants.
- First-screen: the playable grid is the first thing; objective readable from watching 3-4 nodes arrive and one successful stamp.
- If taste gate slice fails honest playtest: pivot the verb (e.g. back to runner but with shape-gate phasing as the reliable interaction).

## Execution Order (risk-sized steps)
1. Create WO memory files + this strategy + initial WORKLOG entry. Set .factoryx/preview-entrypoint.
2. Taste-gate slice: minimal canvas + grid + moving cursor + 2 stamp modes + 2-3 hardcoded nodes + click-to-stamp with AV (no full spawn system, no score, no WAV yet, use WebAudio for quick cadence test). Play it. Screenshot. If dull, redesign verb here.
3. Author real assets: implement pure-py PNG writer + WAV synth for musical stamps/cadences (chords, short melodic resolve, rhythmic pulse). Write ASSET_MANIFEST.md with exact provenance (date, method, notes, palette, notes used).
4. Replace procedural fallbacks with file assets; wire decode/play for http/file preview contexts.
5. Expand slice to full loop (spawning nodes with timing, decay/expire, miss counting as "lives", scoring on triad complete, level up on X triads, win at N). Add input parity, easing everywhere, hit feedback.
6. Polish for game feel: stronger juice on correct stamp (grid resonance lines, cursor recoil, multi-ring pop), clearer telegraph (node "wants TRI" vs "wants SQR" via inner thick geometry + small label or icon if needed but prefer pure geom), audio only after gesture, <2MB, 60fps.
7. Browser verif runs (real chromium headless + any harness like prior .factoryx-runtime-check), capture frames + logs + strict error grep =0. Fix any pageerror/asset fail/blank first.
8. Update all memory (PREVIEW with how to open + summary, VERIFICATION with commands+results+checklist, WORKLOG with decisions + play notes, FEEDBACK if new playtests).
9. Commit on the WO branch, push origin HEAD:factoryx/... , refresh PR (or open if none) with full prompt in "FactoryX Work Order Context" section + preview path + evidence links + status.
10. If PR comments or checks arrive, treat as blocking input per instructions before more polish.

## Known Risks / Mitigations
- Asset gen without PIL: use stdlib zlib+struct for minimal PNG (indexed or RGB), test roundtrip load in canvas. For WAV use wave+math for additive synthesis.
- GH API for PR: tokens may be stale (prior issue); use git push + curl with fresh $(sh -c "$FACTORYX_GITHUB_TOKEN_COMMAND") for PR body updates if gh fails.
- Fun is subjective: enforce concrete slice criteria + honest self-playtest before expanding. Use crew (Paul Klee for playful tension, Oskar Schlemmer for stage/grid rhythm) if available via .codex.
- Scope: do not add inventory, saves, multiple scenes unless requested. One verb, one space.

Work Order: work-order-1781658166323-6-31
