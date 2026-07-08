# Preview — Bunny Orbit

## How to Play
1. Open `games/bunny-orbit/index.html` in a browser (serve via any static server)
2. Click **Launch** to start
3. **Hold SPACE or click/tap** to thrust the bunny astronaut toward the next planet
4. **Release** to drift — the bunny coasts through space with gentle gravity toward the next planet
5. Land on all 6 planets to reach the 🥕 Carrot Moon

## Preview URL
- Relative: `games/bunny-orbit/index.html`
- Local server: `http://localhost:8765/` (Python http.server)

## Controls
- **Thrust:** Hold SPACE or click/tap on canvas
- **Aim:** Move mouse/finger to set thrust direction
- **Restart:** Click "Hop Again" or press R on debrief screen

## Technical
- Single-file HTML (no build step required)
- Three.js 0.161.0 via CDN
- GLB model loaded from `assets/models/bunny_companion.glb`
- Audio loaded from `assets/audio/` (foundry-generated WAVs)
- Fallback: procedural bunny if GLB fails to load
