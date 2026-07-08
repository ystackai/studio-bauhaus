# Asset Manifest — Bunny Orbit (without-arm, qwen, v4)

## Creative Intent
This should feel like a cozy, low-gravity space adventure where you gently guide a bunny astronaut through a starlit sky, hopping from planet to planet toward a glowing carrot moon — each thrust is a soft push, each drift is peaceful weightlessness.

## Foundry Jobs

### 1. Bunny Astronaut 3D Model
- **Recipe:** `bunny_companion`
- **Job ID:** `asset-1783532486185-4640be89`
- **Recipe ID:** `bunny_companion`
- **Request JSON:**
  ```json
  {"recipe":"bunny_companion","asset_name":"bunny_astronaut","prompt":"A cute white bunny wearing a translucent astronaut helmet and a small silver spacesuit, floating in zero gravity. Stylized game-ready 3D model with friendly expression, long ears visible through the helmet visor, soft rounded proportions suitable for a cozy space exploration game.","style":"stylized-game-ready"}
  ```
- **Foundry outputs (from `/outputs/asset-1783532486185-4640be89/`):**
  - `bunny_companion.glb` → `games/bunny-orbit/assets/models/bunny_companion.glb` (2.0 MB)
  - `bunny_companion_contact_sheet.png` → `games/bunny-orbit/assets/models/bunny_companion_contact_sheet.png` (437 KB)
  - `bunny_companion_turntable.gif` → `games/bunny-orbit/assets/models/bunny_companion_turntable.gif` (2.5 MB)
  - `bunny_companion_poster.png` → `games/bunny-orbit/assets/models/bunny_companion_poster.png` (345 KB)
- **Integration:** Loaded via GLTFLoader as the player character (bunny astronaut). Falls back to procedural bunny if GLB fails. The bunny is the active play object — it moves, thrusts, and lands on planets.

### 2. Cozy Audio Pack
- **Recipe:** `cozy_audio_pack`
- **Job ID:** `asset-1783532494470-cf0c8797`
- **Recipe ID:** `cozy_audio_pack`
- **Request JSON:**
  ```json
  {"recipe":"cozy_audio_pack","asset_name":"bunny_orbit_audio","prompt":"Gentle wonder: a soft ambient music loop for a cozy space game about a bunny astronaut orbit-hopping between planets. Include SFX for thrust rumble (gentle engine), cushioned landing (soft thud), and a magical payoff chime when reaching the carrot moon. Dreamy, warm, low-intensity.","style":"cozy-ambient-space"}
  ```
- **Foundry outputs (from `/outputs/asset-1783532494470-cf0c8797/`):**
  - `music_v2/foundry_music_loop.wav` → `games/bunny-orbit/assets/audio/foundry_music_loop.wav` (5.3 MB, 31s loop)
  - `sfx_v2/sfx_movement.wav` → `games/bunny-orbit/assets/audio/sfx_movement.wav` (thrust rumble)
  - `sfx_v2/sfx_impact.wav` → `games/bunny-orbit/assets/audio/sfx_impact.wav` (cushioned landing)
  - `sfx_v2/sfx_reveal.wav` → `games/bunny-orbit/assets/audio/sfx_reveal.wav` (orbit transition)
  - `sfx_v2/sfx_interaction.wav` → `games/bunny-orbit/assets/audio/sfx_interaction.wav` (UI click)
  - `sfx_v2/sfx_payoff.wav` → `games/bunny-orbit/assets/audio/sfx_payoff.wav` (carrot moon arrival chime)
  - `sfx_v2/sfx_danger.wav` → `games/bunny-orbit/assets/audio/sfx_danger.wav` (near-miss)
  - `sfx_v2/bunny_hop_plush.wav` → `games/bunny-orbit/assets/audio/bunny_hop_plush.wav` (planet landing hop)
  - `sfx_v2/pickup_chime_bright.wav` → `games/bunny-orbit/assets/audio/pickup_chime_bright.wav`
  - `sfx_v2/soft_impact_puff.wav` → `games/bunny-orbit/assets/audio/soft_impact_puff.wav`
  - `sfx_v2/ui_confirm_glass.wav` → `games/bunny-orbit/assets/audio/ui_confirm_glass.wav`
  - `music_v2/music_v2_waveform.png` → `games/bunny-orbit/assets/audio/music_v2_waveform.png`
  - `sfx_v2/sfx_v2_waveforms.png` → `games/bunny-orbit/assets/audio/sfx_v2_waveforms.png`
- **Integration:** Music loop plays after user gesture (click/tap to start). SFX actively used:
  - **Thrust:** `sfx_movement.wav` fires when player holds thrust
  - **Landing:** `sfx_impact.wav` fires on each planet landing
  - **Orbit transition:** `sfx_reveal.wav` plays after landing
  - **UI:** `sfx_interaction.wav` on button presses
  - **Payoff:** `sfx_payoff.wav` on reaching the carrot moon
  - **Hop accent:** `bunny_hop_plush.wav` on each planet landing

## GameBlocks Modules Used
- `modules/math/WorldBasis.js` — coordinate ground truth (reused as-is)
- `modules/actor-motion/GeneralObjectModelController.js` — position/pose application (reused as-is)
- See `games/bunny-orbit/js/gameblocks_usage.md` for details

## Game Structure
- **Entry:** `games/bunny-orbit/index.html` (single-file, 668 lines)
- **Engine:** Three.js 0.161.0 via CDN
- **Assets:** `games/bunny-orbit/assets/`
- **GameBlocks:** `games/bunny-orbit/js/`

## Game Design
- **Core mechanic:** Hold SPACE or click/tap to thrust toward the next planet; release to drift
- **Objective:** Orbit-hop through 6 planets, reaching the carrot moon
- **Physics:** Newtonian drift with gentle gravity pull toward the next planet
- **Camera:** Third-person, trailing behind the bunny
- **Visuals:** Starfield background, 7 celestial bodies with orbit rings, thrust flame + particles
- **Sound direction:** Gentle wonder — soft ambient loop, thrust rumble, cushioned landing, payoff chime

## Payload Size
- `index.html`: 25 KB
- `bunny_companion.glb`: 2.0 MB
- `foundry_music_loop.wav`: 5.3 MB
- Total audio SFX: ~600 KB
- Total estimated payload: ~8.5 MB (GLB + music are the largest)

## Browser Verification
- All assets verified via HTTP 200 with correct content sizes
- Chromium headless screenshot not available in container (dbus unavailable); file-level verification confirms all assets present
- GLB model loads with fallback (procedural bunny) if GLB fetch fails
- Audio initialized on user gesture (no autoplay policy violations)
