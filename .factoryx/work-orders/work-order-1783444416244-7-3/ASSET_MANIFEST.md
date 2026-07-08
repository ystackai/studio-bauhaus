# ASSET MANIFEST — Bunny Orbit

## Creative Intent
"This should feel like a gentle space adventure — a small bunny in a tiny rocket ship hopping between colorful planets, with soft wonder music and satisfying thrusters, until the magical carrot moon is finally reached."

## Foundry Jobs

### bunny_companion (3D bunny astronaut)
- **Job ID**: `asset-1783522201463-8bc2df26`
- **Recipe**: `bunny_companion`
- **State**: completed
- **Request**: `{"recipe":"bunny_companion","asset_name":"bunny-astronaut","prompt":"A cute white bunny astronaut in a translucent bubble-space helmet...","style":"cute-stylized-pbr"}`

**Copied outputs → game integration:**
| Foundry output | Copied to | Used as |
|---|---|---|
| `bunny_companion.glb` | `games/bunny-orbit/assets/models/bunny-astronaut.glb` (2.0 MB) | Hero character — loaded via GLTFLoader in Three.js |
| `textures/bunny_fur_albedo.png` | `assets/models/textures/albedo.png` (363 KB) | Bunny fur color map |
| `textures/bunny_fur_normal.png` | `assets/models/textures/normal.png` (997 KB) | Bunny fur normal map |
| `textures/bunny_fur_height.png` | `assets/models/textures/height.png` (232 KB) | Bunny fur displacement |
| `textures/bunny_fur_roughness.png` | `assets/models/textures/roughness.png` (62 KB) | Bunny material roughness |
| `bunny_companion_poster.png` | `assets/models/poster.png` (345 KB) | Reference art |
| `bunny_companion_contact_sheet.png` | `assets/models/contact_sheet.png` (437 KB) | Review evidence |
| `bunny_companion_turntable.gif` | `assets/models/turntable.gif` (2.5 MB) | Review evidence |

**Integration**: The bunny GLB is the visible protagonist in the game, loaded via Three.js GLTFLoader. A procedural placeholder bunny is used as fallback if GLB loading fails or takes too long. The bunny has a rocket backpack and thruster flame for active play.

### cozy_audio_pack (Music + SFX)
- **Job ID**: `asset-1783522214508-387c30da`
- **Recipe**: `cozy_audio_pack`
- **State**: completed
- **Music Duration**: 30.97s
- **SFX Count**: 11 sounds generated

**Copied outputs → game integration:**
| Foundry output | Copied to | Game use |
|---|---|---|
| `music_v2/foundry_music_loop.wav` | `assets/audio/music_loop.wav` (5.3 MB) | Background music loop (starts on user gesture) |
| `sfx_v2/sfx_movement.wav` | `assets/audio/sfx_thrust.wav` (59 KB) | Thrust rumble — plays while burning |
| `sfx_v2/soft_impact_puff.wav` | `assets/audio/sfx_land.wav` (73 KB) | Cushioned landing on planet |
| `sfx_v2/sfx_payoff.wav` | `assets/audio/sfx_payoff.wav` (83 KB) | Payoff chime when reaching carrot moon |
| `sfx_v2/sfx_reveal.wav` | `assets/audio/sfx_gravity.wav` (125 KB) | Gravity well whoosh |
| `sfx_v2/ui_confirm_glass.wav` | `assets/audio/sfx_orbit_pop.wav` (83 KB) | Orbit transition pop |

**Integration**: All audio loaded via Web Audio API after user clicks "Start Hop". Music loops at 0.3 volume; SFX triggered on events (thrust, land, orbit hop, reach carrot moon).

## Asset Summary

### Visual Assets (Foundry)
- 1× bunny astronaut GLB with 4 texture maps
- Procedural planets with atmosphere glow
- Procedural carrot moon with leafy top
- Starfield particle system (2000 stars)

### Audio Assets (Foundry)
- 1× music loop (31s, warm pads + music box)
- 6× SFX (thrust, land, payoff, gravity, orbit pop)

### Payload
- Total game assets: ~14 MB (GLB + textures + audio)
- Three.js: loaded from CDN (not bundled)

## Browser Verification
- **Tool**: `factoryx-browser-verify` (Playwright/Chromium headless)
- **Result**: All 4 screenshots captured successfully
  - Title screen: bunny orbit title, planets in background
  - Active play: bunny with rocket backpack, planet nearby, HUD visible
  - Thrust: bunny accelerating with flame visible
  - Drift: bunny coasting after releasing thrust
- **No pageerrors, no console errors, no failed asset requests**
- **Audio files**: All 6 audio files loaded (200 status)
- **GLB model**: Loaded successfully (200 status)

## blocks-2d Usage
See `games/bunny-orbit/blocks_usage.md` for details.
- Fixed-timestep pattern adapted for Three.js
- Input handling: keyboard + pointer + touch
- Scene state machine: title → playing → landed → debrief
