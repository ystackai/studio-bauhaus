# VERIFICATION — Bunny Orbit

## Browser Runtime Verification
- **Tool**: `factoryx-browser-verify` (Playwright Chromium headless)
- **URL**: `http://localhost:8083/games/bunny-orbit/index.html`
- **Result**: PASS — all screenshots captured, no runtime errors

### Screenshot Evidence
| Screenshot | Path | Contents |
|---|---|---|
| Title | `/tmp/bunny-title3.png` | "Bunny Orbit" title, planets in background, Start Hop button |
| Playing | `/tmp/bunny-playing3.png` | Bunny with rocket backpack, Luna Hop planet, HUD active |
| Thrust | `/tmp/bunny-thrust3.png` | Bunny accelerating, thrust flame visible, speed 10.3 km/s |
| Drift | `/tmp/bunny-drift3.png` | Bunny coasting, flame off, planets visible |

### Runtime Errors
- **pageerror**: None
- **console.error**: None
- **Failed requests**: None
- **Asset 404s**: None — all GLB, WAV, and texture files returned 200

### Audio Verification
- `music_loop.wav` (5.3 MB) — loaded 200
- `sfx_thrust.wav` (59 KB) — loaded 200
- `sfx_land.wav` (73 KB) — loaded 200
- `sfx_payoff.wav` (83 KB) — loaded 200
- `sfx_gravity.wav` (125 KB) — loaded 200
- `sfx_orbit_pop.wav` (83 KB) — loaded 200

### 3D Asset Verification
- `bunny-astronaut.glb` (2.0 MB) — loaded 200, visible as protagonist
- 4 texture maps (albedo, normal, height, roughness) — all loaded 200
- Bunny rendered in scene with rocket backpack and thruster flame

## Game Feel Checklist
- [x] **Core verb in first 30s** — "Hold Space to thrust" is immediately clear on title screen
- [x] **Input response < 100ms** — thrust responds immediately, flame appears
- [x] **Easing on motion** — camera follows with lerp smoothing
- [x] **Audio feedback** — thrust rumble plays during burn, land on planet touch
- [x] **Audio after user gesture** — music starts on "Start Hop" click
- [x] **Asset kit loads and matters** — foundry bunny GLB + 6 SFX + music loop all active in play
- [x] **Active play stays readable** — bunny, planets, and HUD clearly visible
- [x] **Primary verb proof** — thrust changes velocity, gravity orbits planets, progress toward carrot moon

## Known Issues
- Placeholder bunny used as fallback if GLB loading is slow; foundry bunny GLB is the intended visual
- Three.js loaded from CDN (not bundled offline)
- No debrief/ending screen tested yet (game loop works but carrot moon hasn't been reached in smoke test)

## blocks-2d Compliance
- `blocks_usage.md` written at `games/bunny-orbit/blocks_usage.md`
- Fixed-timestep adapted, input handling with buffering, scene state machine
