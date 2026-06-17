# Technical System Design: Rework Triadic Grid Run

Work Order: work-order-1781658166323-6-31

## High Level
- Single self-contained `games/92-triadic-grid-run/index.html` (per playbook + prior convention for preview trees).
- Assets live in `games/92-triadic-grid-run/assets/` (PNG sheets or individuals + WAVs) and loaded relative so file:// and /factoryx/previews/... trees work identically.
- ASSET_MANIFEST.md committed alongside for provenance (required by asset_contract_v2).
- Canvas 2D, rAF loop, no external deps.
- State machine: start (demo-pilotable), playing, gameover, win.
- All motion eased; no linear teleports.

## Input
- Pointer (mouse/touch drag on canvas sets cursor target with easing).
- Keyboard (WASD/arrows for delta aim; SPACE for stamp-mode flip; SPACE/R for start/restart on end states).
- Touch d-pad or large mode buttons (TRI / SQR) if needed for thumb reach (>=44px).
- All paths parity-tested; touch-action none, passive:false where needed.

## Core Objects (slice then expand)
- Grid: array of line defs (v/h + pulsing diag accents in primary); offset for "run" feel or static with node motion.
- StampCursor: x/y target + eased pos, currentMode (0=TRI, 2=SQR), wobble for life, trail optional.
- Node: {x,y, type:0/1/2 (color), shapeReq:0/2 (TRI or SQR), pulse, life/expiry, spawnedAt}.
- Particles, floating text, speed/impact lines for juice.
- Triad progress: array or bitset of collected colors; on full set -> resonance + cadence + clear.

## Collision / Interaction (reliable square/triangle)
- On stamp commit (pointer up or key equiv near node): compute dist to node center vs (node.size + cursor.size * 0.8).
- Generous: use 1.4-1.6x visual radius for hit feel (precision still rewarded by timing/pulse window).
- Match = node.shapeReq === currentMode ? success : clash.
- Success: remove node, push color to triad, spawn snap particles + ring, play stamp WAV, update pips, check for full triad.
- Clash: node.shakeT = 0.4, spawn crack particles, play clash WAV (short, musical not noise), no color advance (recoverable).
- Nodes have expiry: if life <0 and not stamped -> miss++, remove, if misses >=3 -> gameover. Telegraph expiry with alpha/fade + crack lines.

## Audio (real direction, file-backed)
- AudioContext created on first user gesture (stamp or mode flip or start).
- Load 4-6 WAVs via fetch (or XHR for broader) + decodeAudioData into buffers.
  - stamp-tri-red.wav, stamp-sqr-blue.wav etc or unified stamp with param.
  - clash.wav (dissonant but short resolve).
  - triad-cadence.wav (composed 1-2s resolving figure using the primaries).
  - Optional: grid-pulse-bed.wav (sparse rhythmic, level-reactive).
- playBuf(key, rate=1, gain=0.7) for musical control (slight rate variation for life).
- No autoplay; mute toggle after gesture.
- Fallback only for file: verif edge cases if decode fails in headless (documented).

## Assets & Generation
- PNG: 1-2 sheets or separate (stylus-tri, stylus-sqr, node-tri-r/y/b, node-sqr-r/y/b, optional hazard or accent).
- Generated via pure stdlib (zlib + struct PNG writer + math for crisp lines/arcs/fills in primary palette + inner construction marks for "ruler" intentionality).
- WAV: python wave + math (additive: 2-3 partials + envelope + slight noise for attack; or square+ sine mix for honest "constructed" tone). Notes chosen for triadic harmony (e.g. 130.81, 164.81, 196 for red; analogous for others; cadence C-E-G-C or similar just intervals).
- All files committed + ASSET_MANIFEST.md lists each with: purpose, author/method/date, source notes (e.g. "generated 2026-06-17 via gen_assets.py using stdlib; tri has 3 inner ticks at 120deg, sq has 2x2 sub squares; cadence is 4-note I-V-I with 3 voices at 0/0.18/0.42s").

## Rendering
- drawGrid(): varying alpha/weight v/h + red diag accents that brighten on gridResonanceT.
- drawStamp(x,y,mode,size,alpha,rot): prefers loaded PNG slice, else vector with construction (for tri: 3 ticks; for sq: cross or 4 small).
- drawNode: prefers PNG, else vector with thick inner tri or sqr (the telegraph), outer rings for pulse, core dot, expiry cracks.
- Trail, particles (small lines or mini shapes), flash, shake, level announce, pips, progress.
- Always draw world first so even start state reads as live playable (no overlay hiding the verb).

## Performance / Payload
- Target 60fps on mid laptop (profile with simple counters if drops).
- <2MB total (current prior was ~56kB + assets; new assets will be larger for intentional detail but compressed by nature of geometric PNG + short WAVs).
- No net after load.

## Browser Verif Surface
- Boot: first rAF paint shows grid + cursor + nodes (no wait for start button).
- Interact: force a few stamps (correct + wrong), a triad complete, expiry miss, end state.
- Assert: 0 strict game errors in log; screenshots non-blank with visible elements; assets decoded/used (canary pixels or buffer presence).

Work Order: work-order-1781658166323-6-31
