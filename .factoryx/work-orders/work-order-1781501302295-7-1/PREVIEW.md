# Triadic Grid Run — Preview

## Preview Path
`games/92-triadic-grid-run/index.html`

## Description
A single-file HTML5 canvas arcade game featuring Bauhaus aesthetics. The player pilots a geometric shape through shifting Kandinsky-inspired grids, collecting colored harmonies and dodging hard-edged hazards.

## How to Play
- **Controls**: Arrow keys or WASD to move, mouse/touch to aim
- **Objective**: Collect colored circles (red, yellow, blue) for points
- **Avoid**: Red bars and diamonds (hazards)
- **Progress**: Score 2800 to win (7 grid levels, 400 points each)
- **Lives**: 3 lives, lose one per hazard hit
- **Combos**: Collect items in quick succession for score multipliers

## Verification
- Browser verification passed: game loads without errors (W TDZ fixed; chromium headless captures clean)
- First screen: live playable arcade (grid + piloted runner + hazards + color collects visible immediately under start prompt overlay). Core verb (piloting) demonstrable pre-START.
- Score collection works: 200+ points in test; combos, level-ups, win at 2800
- Lives system working: 3 pips, danger pulse, invincibility, gameover
- Audio: Web Audio, post-gesture only (start() on first btn/key)
- Visuals/motion: larger brighter geometry, speedlines, parallax, trails, flashes, particles; 60fps motion
- Responsive: full viewport, keyboard+pointer+touch+D-pad, 44px targets
- Screenshots (browser render): frame-start.png (prompt over live game), frame-play.png (in-run state) in evidence
