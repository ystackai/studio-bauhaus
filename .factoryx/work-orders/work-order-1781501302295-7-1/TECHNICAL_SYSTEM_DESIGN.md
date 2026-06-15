# Triadic Grid Run — Technical System Design

## Architecture
Single self-contained HTML file (24KB) with embedded CSS and JavaScript. No external dependencies.

## Core Systems

### Game Loop
- `requestAnimationFrame` based loop at ~60fps
- Delta-time based updates for consistent physics
- Max dt capped at 50ms to prevent spiral of death

### Rendering Pipeline
1. Clear canvas with dark background (#1a1a1a)
2. Draw scrolling grid (vertical, horizontal, diagonal lines)
3. Draw background Kandinsky-style shapes (parallax scrolling)
4. Draw player trail (last 12 positions, fading alpha)
5. Draw player shape (triangle, circle, or square)
6. Draw hazards (red bars and diamonds, rotating)
7. Draw collectibles (colored circles, pulsing, with glow ring)
8. Draw particles (burst on collection)
9. Apply screen shake offset
10. Apply flash overlay (collection/damage feedback)

### Input System
- Keyboard: Arrow keys and WASD for movement
- Mouse: Click and drag to aim (sets target position)
- Touch: Touch and drag (mobile support)
- All inputs set `targetX`/`targetY`; player position eases toward target

### Collision System
- Hazards: Circle-to-rectangle (bars) and circle-to-circle (diamonds)
- Collectibles: Circle-to-circle with expanded hitbox (+12px)
- Invincibility: 1.2s flash/blink on hit, prevents double-hit

### Audio System
- Web Audio API oscillator-based sounds
- No external audio files
- Types: collection (ascending pitch), hit (low dissonance), level-up (arpeggio), win (crescendo)
- Audio starts only after user gesture (browser policy compliant)

### Progression
- Score threshold: 400 points per level
- 7 levels total, win at 2800
- Speed increases per level (BASE_SPEED + (level-1)*0.5)
- Hazard spawn rate increases with level
- Collectible spawn rate slightly decreases with level
- Grid diagonal lines increase with level
