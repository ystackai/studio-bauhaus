# blocks-2d Usage for Bunny Orbit

## Modules Used
| Module | Status | Notes |
|---|---|---|
| `game-loop.js` | adapted | Fixed-timestep pattern used via THREE.Clock with capped dt (0.05s max) |
| `input.js` | adapted | Action-mapped keyboard + pointer with touch support; thrust is single verb |
| `scenes.js` | concept reused | Title → playing → landed → debrief state machine |
| `tween.js` | concept reused | Camera lerp uses THREE.Vector3.lerp for smooth following |
| `particles.js` | not used | No particle system needed for this gentle space game |
| `screen-shake.js` | not used | Gentle wonder aesthetic doesn't call for shake |
| `rng.js` | not used | No procedural randomness needed |

## Key Changes
- 3D game uses Three.js instead of 2D canvas
- Fixed timestep via `THREE.Clock.getDelta()` capped at 0.05s
- Input handles keyboard (Space/ArrowUp), mouse, and touch
- Scene state machine: title → playing → landed → debrief
- Camera follows bunny with lerp smoothing

## Foundry Assets
- bunny_companion recipe → bunny-astronaut GLB (loaded as protagonist)
- cozy_audio_pack recipe → music loop + 6 SFX (thrust, land, payoff, gravity, orbit pop, UI confirm)
