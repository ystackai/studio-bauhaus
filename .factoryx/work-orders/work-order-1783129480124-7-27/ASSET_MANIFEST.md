# ASSET_MANIFEST — work-order-1783129480124-7-27 (rework-embodied-subject-triadic)

Work Order: Targeted rework to give Triadic Grid Run a primary embodied subject and tactical world
Deliverable node: triadic-grid-run-loop-canary-v3 / rework-embodied-subject-triadic
Date: 2026-07-04

## Creative Intent (pre-code)
This should feel like a conduit saboteur racing the contraction of a living defense lattice, planting phase-locked probes into resonant nodes to carve an exit before the grid collapses around you.

## Changes
- Reworked games/92-triadic-grid-run/index.html (the preview entrypoint)
- Primary embodied subject: operative figure (hooded head, torso+pack, legs in stance, arm) drawn in canvas; trails the probe tip (stylus) for readable posture and motion silhouette during aim/move/stamp.
- Stamp affordance preserved at the tip (draws stylus asset + mode shape); hit test + input unchanged.
- Tactical world context: 
  - layered floor plane under subject
  - containment ribs + edge struts framing the space (feels like inside a structure, not open void)
  - grid lines + diagonals as lattice
  - environmental response: red "surge arcs" spawned on node expiry (threat read from lattice), small gridRes pulse; success triad still does white flash + gridRes
  - subject shadow + layering keeps player visually separated from bg and nearest nodes
- Texts updated (start subtitle, instr, level labels "LATTICE", win/loss: "LATTICE BREACHED" / "The anchors hold. You slipped through.", "LATTICE SEALED") to reinforce fantasy. No mechanics/levels added.
- All preserved: TRI/SQR stamp verb on nodes for triad colors, pointer aim+click/tap+SPACE+onscreen, 3-miss lives, score/level gates, particles, easing, post-gesture audio, stylus+nodes assets, offline, sub-2s verb demo, large targets, kb+touch.

## Evidence (reviewable)
- games/92-triadic-grid-run/index.html (the changed artifact)
- .factoryx/work-orders/work-order-1783129480124-7-27/evidence/boot-subject.png — initial load (subject + nodes visible even under overlay)
- .factoryx/work-orders/work-order-1783129480124-7-27/evidence/active-play-subject.png — canvas-only active view (operative body with brighter high-contrast silhouette + hood/visor/legs/pack, arm+stylus tip, 3 nearest nodes with shapes/colors, lattice ribs+floor+struts framing, red surge cues on lattice)

## Assets Used (no new foundry; preserved per contract)
- assets/stylus.png — still used for the probe tip (TRI left / SQR right tile)
- assets/nodes.png — still used for the anchor markers
- sfx-*.wav — unchanged, post-gesture only
- All other logic, easing, input, loop, scoring identical in behavior.

## Verification Notes
- First 30-60s demonstrates the stamp verb inside the authored lattice-saboteur fantasy: pilot body+probe, aim at nearest telegraph nodes (TRI/SQR + color), seat to collect, watch lattice react on expiry vs success.
- Active play focal: subject silhouette + nearest anchors readable, not abstract buttons on field.
- Syntax checked (node --check on script extract).
- No new systems; minimal targeted patches after initial text+intent.

## Prior Failed Attempt
- work-order-1783129282286-7-22 (cancelled; evidence files absent at startup, fallback not applicable to browser deliverable).

Source of truth: Work Order description. No broad re-audit. Durable checkpoint: edits + evidence pngs + this manifest.
