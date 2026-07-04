# ASSET_MANIFEST.md — Triadic Grid Run (work-order-1783175474647-followup)

Generated: 2026-07-04 by gen_assets.py (pure stdlib: zlib/struct for PNG, wave/math for WAV).
Follow-up rework for run-loop canary feedback. Nodes now scroll; assets refreshed with stronger rims/ticks for readability in motion.

No external images or samples. All committed files are reviewable binaries.

## Visuals
- stylus.png (64x32 sheet)
  Left 32x32: TRIANGLE stamp, red accent (#E63946), white construction rim + 3 inner radial ticks at 120deg + thin inner tri line. "Ruler" geometry. (rims tuned for scrolling visibility)
  Right 32x32: SQUARE stamp, blue accent (#4361EE), white rim + 2x2 sub-square cross construction.
  Purpose: current tool cursor (large, obvious, mode-dependent). Loaded as Image, drawn via drawImage slices.
- nodes.png (96x32 sheet)
  Cols 0-2: TRIANGLE nodes (red, yellow, blue) — thicker outer white ring, inner tri construction ticks, core fill.
  Cols 3-5: SQUARE nodes (red, yellow, blue) — outer ring, 2x2 inner construction, cross.
  Purpose: the things you stamp. Inner geometry telegraphs required stamp mode (TRI vs SQR) at a glance; color for triad pips.
  All use Bauhaus primary + black/white only. Flat, high-contrast, precise. No gradients. Rims boosted for run motion.

## Audio (musical direction, not bleeps)
- sfx-stamp-0.wav (red, ~0.38s): low C-area + 1.5 + 2.0 partials + light square edge + envelope. Success for TRI or color-0.
- sfx-stamp-1.wav (yellow, ~0.38s): mid + detune life + same structure.
- sfx-stamp-2.wav (blue, ~0.38s): higher G-ish.
- sfx-clash.wav (~0.21s): Eb/Bb tritone stab + beat + fast release. Wrong stamp (recoverable, not death).
- sfx-triad.wav (~0.92s): 3-voice I-V-I resolve (C/E/G + tail high C) with light perc attack on downbeat. Full harmony cadence; grid resonance visual syncs to it.
All post-gesture only. Slight rate/gain variation in player for life. Authored to feel like "the grid is playing with you" when you stamp correctly in sequence.

## Provenance & Contract
- Method: pure Python 3 stdlib (no Pillow, no external assets, no base64 in game).
- Intent per house style + rejection: intentional (construction marks, weight hierarchy, primary tension), not flat.
- Used by: index.html relative fetch/decode + drawImage/playBuffer.
- Repro: run `python3 gen_assets.py` (seed pinned to WO id).
- Size target: small geometric PNGs + short musical WAVs keep payload <<2MB.

Work Order: work-order-1783175474647-followup
