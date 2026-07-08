# Preview — Bunny Orbit

## Creative Intent
"This should feel like a gentle space adventure — a small bunny in a tiny rocket ship hopping between colorful planets, with soft wonder music and satisfying thrusters, until the magical carrot moon is finally reached."

## Preview URL
`games/bunny-orbit/index.html`

## Play Instructions
1. Click "Start Hop" on the title screen
2. **Hold SPACE or CLICK** to thrust forward
3. **Release** to drift through space
4. Let planet gravity pull you into orbit
5. Hop from planet to planet until you reach the 🥕 Carrot Moon

## What to Expect
- **Title Screen**: "Bunny Orbit" with planets visible in the background
- **Active Play**: Bunny with rocket backpack floating between colorful planets
- **HUD**: Planet counter, speed display, fuel bar
- **Music**: Soft ambient loop (cozy_audio_pack foundry asset)
- **SFX**: Thrust rumble, landing thud, orbit pop, gravity whoosh, payoff chime

## Technical Details
- **Engine**: Three.js (CDN)
- **Bunny Model**: Foundry `bunny_companion` recipe (GLB + textures)
- **Audio**: Foundry `cozy_audio_pack` recipe (music + 6 SFX)
- **Mechanic**: Hold to burn, release to drift — one verb, one screen
- **Physics**: Gravity wells, drag, thrust acceleration
