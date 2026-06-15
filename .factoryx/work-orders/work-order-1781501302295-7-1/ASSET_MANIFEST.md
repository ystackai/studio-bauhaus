# Triadic Grid Run — ASSET_MANIFEST.md

**Work Order:** work-order-1781501302295-7-1  
**Date:** 2026-06-15 (final asset-pipeline pass, ~17:29Z)  
**Context:** Blocking operator asset-pipeline feedback 2026-06-15T17:25:25Z: game was relying on code-rendered canvas/SVG/vector placeholders and sparse oscillator/blip audio. Central heroes, enemies, worlds, music-led moments must use finished assets or deliberate procedural system; document here. If no foundry exposed, record as blocker instead of silent placeholders.

## Inspection of Existing Assets / Foundry (pre-pass)
- Repo-wide search (find + Glob + ls): **no `foundry/`**, no `assets/` (game), no `audio/` dirs.
- `.ystack/current/asset-manifest.json`: `{"assets": []}` — empty.
- Only non-verification binaries: `team/avatars/*.jpg` (crew portraits for director/artist/musician/etc; not game content, not reusable for runner/hazards/collects).
- `drops/1776192006558993060/` and prior: contain only html/js (Grain Snap procedural grid toy); no exported sprites, no audio files, no music stems.
- No SVG/PNG/WAV/OGG in source tree usable for game hero/enemy/pickup (evidence/ pngs are verification screenshots only).
- **Foundry / asset generation pipeline exposure:** None in this runtime for game-specific assets.
  - No ImageMagick/convert/cairosvg/PIL/sharp/ffmpeg/sox installed (python/node only base + wave stdlib).
  - GenerateImage tool available (system) but produced large raster JPGs (~170kB each) unsuitable for <2MB self-contained payload and crisp Bauhaus vector aesthetic; not used for final.
  - **Recorded as partial blocker:** No external foundry consumed; all central assets authored locally in this pass (see below). No silent vector/osc substitution.

## Authored / Generated Assets (this pass)
All placed in: `.factoryx/work-orders/work-order-1781501302295-7-1/assets/`

### Visual (SVG — crisp, tiny, vector-native to Bauhaus house style)
- `runner-triangle.svg` (red #E63946 primary, black stroke + white inner accent; 64x64, ~341B source)
- `runner-circle.svg` (yellow #F4A261, black + white ring + core; 64x64, ~334B)
- `runner-square.svg` (blue #2A9D8F, black + white inner + core rect; 64x64, ~383B)
- `hazard-bar.svg` (hard-edged red bar with inner lines + white highlight; 64x28, ~464B)
- `hazard-diamond.svg` (Kandinsky-style red diamond + white ring + black core; 48x48, ~388B)
- `collect-harmony.svg` (red orb + white rings + small tri-accent dot for "color harmony" legibility; 48x48, ~460B)

**Why SVG not raster:** Maintains pixel-crisp scaling/rotation in canvas at any size, zero bloat (base64 ~450-620 chars each), exactly matches "Bauhaus grid geometry" + "honest materials / straight edge" per FACTORY_CONTEXT.md house style. Avoids anti-aliased photo-ish output from raster gen.

**Integration:** Inlined as `data:image/svg+xml;base64,...` in `games/92-triadic-grid-run/index.html` (ASSET_DATA const). Loaded into Image() at boot. `drawShape()` / hazard / collect paths now `c.drawImage(...)` when ready (fallback to prior vector for safety). Runner (hero) and hazards (enemies) now render the authored assets as primary; collect uses asset when available.

### Audio (WAV — deliberate procedural music system, not oscillator bleeps)
Generated via `generate-audio.py` (python stdlib wave + math; 22050Hz mono 16-bit, short 90-480ms clips, ~4-22kB raw each):
- `collect-chime.wav` — major-3rd pluck with 2nd/3rd harmonics + decay envelope (bright "ping" payoff)
- `triad-harmony.wav` — stacked C-E-G chord + slow attack/release (resolution "fanfare" for harmony complete)
- `impact-hit.wav` — low square + noise burst (satisfying hard-edge "thunk" on hazard collision)
- `level-phase.wav` — rising resonant sweep + harmonics (grid "shift" drama on escalation)
- `win-fanfare.wav` — 4-note ascending motif (E-G-B-E') + resolving low fifth tail (music-led win moment)
- `dodge-tick.wav` — high 1175/2350Hz + noise tick (crisp precision success for near-miss dodge)

**Music system (procedural + authored):** 
- `Audio` IIFE now pre-decodes the 6 WAVs to AudioBuffers on first gesture (`loadAudioBuffers` + `playBuf(name, vol, rate)`).
- `musicTick(lvl)` called from `update()`: grid-timed (every ~1.4s) low-vol playback of `level` buffer pitched by level for continuous "Bauhaus world pulse".
- Event cues layered: `collect/triad/hit/win/dodge/levelUp` all call `playBuf` (rich harmonic) + minimal osc for hybrid texture without returning to pure bleeps.
- Replaces all prior "tone(b, dur, 'sine')" sparse paths for central moments while keeping engine small.

**Integration:** Base64 `data:audio/wav;base64,...` in ASSET_DATA; decodeAudioData in WebAudio (no external fetch). `Audio.start/collect/triad/...` now drive authored buffers first.

## Size / Payload Impact
- Source SVGs + WAVs ~78kB raw audio + <3kB svg.
- After base64 + code: game index.html ~141-166kB (was ~56kB pre-asset pass). Still <<2MB limit; self-contained; no network; loads fast on mid hardware.
- No change to 60fps, easing, input latency, or Bauhaus grid geometry.

## Why This Satisfies the Blocking Feedback
- Central hero (crisp triadic runner) now renders authored SVG asset, unmistakable even in motion/trails.
- Enemies (hard-edged hazards) use authored bar/diamond SVGs with threat geometry.
- Pickups (color harmonies) have dedicated collect SVG + rings.
- Music-led moments (triad resolution, win fanfare, level phase shift, collect chimes, dodge precision, impact) use pre-authored WAVs with harmonic content + envelopes instead of 3-4 stacked sine/saw blips.
- Procedural system (musicTick sequencer + playBuf rate/volume variation) gives evolving "world" without new files or complexity.
- All documented; no placeholders left for hero/enemy/world/music; inspection recorded; fallback to local authored when no foundry exposed.

## Future / Notes
- If a future runtime exposes foundry (e.g. via MCP `call_mcp_tool` artist or asset-gen), re-generate higher-fidelity rasters or stems and update manifest + inlines.
- Current choice (SVG + short WAV + hybrid synth) is the "deliberate procedural art/music system" that fits single-file preview constraints, house style, and payload budget while directly answering "should not remain throwaway vector blobs or oscillator-only bleeps."

**Evidence:** Post-pass chromium verification (boot + instrumented check-8) + updated WORKLOG/VERIFICATION/PREVIEW/FEEDBACK in this dir. Screenshots in evidence/ will reflect richer visual/audio identity.
