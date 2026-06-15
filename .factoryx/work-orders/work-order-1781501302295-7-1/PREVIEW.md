# Triadic Grid Run — Preview

## Preview Path
`games/92-triadic-grid-run/index.html`

## Description
A single-file HTML5 canvas arcade game featuring Bauhaus aesthetics. The player pilots a geometric shape through shifting Kandinsky-inspired grids, collecting colored harmonies and dodging hard-edged hazards.

## How to Play
- **Controls**: Arrow keys or WASD to move, mouse/touch to aim (D-pad on mobile)
- **Objective**: Collect red/yellow/blue harmonies for points; complete a full triad (one of each) for +150 TRIAD bonus + special tone
- **Avoid**: Red bars and diamonds (early levels); later weave/zigzag hazards
- **Progress**: Score 2800 to win (7 grid levels, 400 points each). Level 3+ escalates speed, hazards, drone pitch
- **Lives**: 3 lives, lose one per hazard hit (triad streak breaks on hit)
- **Combos**: Collect items in quick succession for score multipliers; audible/visual on every collect/hit/triad/level/win

## Verification
- Browser verification passed: game loads without errors (W TDZ fixed previously; speedline boot crash "Cannot set ... 'x'" fixed in targeted rework; chromium headless captures clean with 0 uncaught/TypeError)
- First screen: live playable arcade (grid + piloted runner + hazards + color collects visible immediately under start prompt overlay). Core verb (piloting) demonstrable pre-START.
- Score collection works: 200+ points in test; combos, level-ups, win at 2800; TRIAD +150 bonus on full r/y/b set (with tone/label/particles)
- Lives system working: 3 pips, danger pulse, invincibility, gameover
- Audio: Web Audio, post-gesture only (start() on first btn/key); ambient drone escalates with level
- Visuals/motion: larger brighter geometry, speedlines, parallax, trails, flashes, particles; 60fps motion; win state keeps scrolling + triad particles under overlay
- Responsive: full viewport, keyboard+pointer+touch+D-pad, 44px targets
- Screenshots (browser render): frame-start.png / frame-boot.png (prompt over live game), frame-play.png (in-run state), frame-postpolish.png in evidence + work order evidence/ dir
- Runtime evidence: full chromium log from headless load shows no game JS errors post-fix (see VERIFICATION.md + WORKLOG); re-verified clean after harmony/escalation polish (~09:44)
- Payload ~45.6kB; early levels simpler geometry, later escalate hazards + drone + runner shape cycle
