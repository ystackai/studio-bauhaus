# Asset Manifest — work-order-1783125296103-7-18

Deliverable: triadic-grid-run-loop-canary-v2
Node: embodied-player-core-slice

This rework did not require new binary assets (no Asset Foundry job mandated by brief; prior stylus/nodes/sfx sufficient and preserved).

## Embodied Subject
- Implemented as authored canvas figure (drawEmbodiedPlayer) in index.html: geometric courier with legs (stride posture), torso+accent band (mode), head (bauhaus mask silhouette), arm dynamics, shadow, held tool (reuses drawStamp at reduced scale).
- Not a vector primitive replacement only; subject provides distinct body presence, lean, bob, thrust action.
- Integrated in main loop, idle demo, active play; exercised in chromium screenshots.
- No new files under assets/; no edits to gen_assets.py or ASSET_MANIFEST in games/... (no provenance change).

## Existing Assets (unchanged, still used)
- games/92-triadic-grid-run/assets/stylus.png — now used exclusively as held tool (not floating primary subject)
- games/92-triadic-grid-run/assets/nodes.png — unchanged
- sfx WAVs — unchanged (post-gesture)

## Evidence
- See updated PREVIEW.md + VERIFICATION.md (served http smoke) for fresh proof shots of enhanced courier (boots/satchel/visor) as focal readable subject.
- No foundry submission (healthz reachable via blender provider; this code polish of embodied subject used in-canvas authored figure only; existing stylus/nodes/sfx preserved).
- If future requires sprite, record job+outputs here. Recovery: no new binary assets.

Work Order: work-order-1783125296103-7-18
No blockers on asset side for this ticket.
