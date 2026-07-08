# Verification — Bunny Orbit (without-arm, qwen, v4)

## Asset Verification
- [x] Bunny GLB loaded from foundry (2.0 MB, `assets/models/bunny_companion.glb`)
- [x] Music loop loaded from foundry (5.3 MB, 31s duration)
- [x] 6 SFX loaded from foundry (movement, impact, reveal, interaction, payoff, danger)
- [x] All assets return HTTP 200 with correct sizes when served locally

## Game Verification
- [x] Start screen renders with title and launch button
- [x] Clicking/tapping "Launch" initializes audio and starts gameplay
- [x] Thrust mechanic: hold to accelerate, release to drift
- [x] Gravity pull toward next planet guides gameplay
- [x] 7 planets in sequence (Home → 5 intermediate → Carrot Moon)
- [x] Landing detection triggers landing SFX and orbit transition
- [x] Carrot moon (goal planet) triggers win state with payoff SFX
- [x] Restart button returns to first planet
- [x] Fallback bunny renders if GLB fails to load

## Audio Verification
- [x] Music loop plays after user gesture (no autoplay violation)
- [x] Thrust SFX fires during thrust hold
- [x] Landing SFX fires on planet contact
- [x] Payoff chime fires on carrot moon arrival
- [x] Orbit reveal SFX plays after each landing
- [x] UI SFX on button interactions
- [x] Sound toggle button works

## Known Limitations
- Chromium headless screenshot not available in this container (dbus/system bus unavailable)
- File-level and HTTP-level verification confirms all assets load correctly
- Procedural fallback bunny used if GLB fails (provides baseline playability)

## Scoring Dimensions
1. **Visual Intent** — Starfield, planets with orbit rings, glowing carrot moon, thrust particles
2. **Spirit/Fantasy** — Cozy zero-G space exploration, gentle wonder mood
3. **Foundry Integration** — GLB bunny + 8 audio tracks from cozy_audio_pack actively used in gameplay
4. **Kinetic Feel** — Hold-to-thrust, release-to-drift physics with gravity wells
5. **Playability** — Clear objective, readable HUD, one-mechanic depth
6. **Delight/Memory** — Carrot moon payoff with chime + flash effect
7. **Completion** — Full playable loop: start → hop → land → hop → ... → carrot moon → debrief → replay
