# blocks_usage — recovery-canary

Modules copied from .factoryx/foundry/blocks-2d/ and sound/ into this dir (per usage contract):

- game-loop.js : used as-is for fixed 60hz update/render + pause handling
- scenes.js : used as-is for title/play/end machine
- input.js : used as-is; actions: left/right/up/down + strike (Space/Enter + pointer tap)
- tween.js : used as-is for herald move easing, pylon charge pop, gate slide
- particles.js : used as-is (with seeded rng) for strike impact + charge bursts
- rng.js : used as-is, seeded with 'herald-pylons'
- webaudio-kit.js : used as-is for synth fallbacks; extended in-game for real wav decode/play (kit unlocks ctx on gesture; files loaded on first strike)

Key adaptations (none changed load-bearing):
- none for core shapes
- added audio file decode using WebAudio after FoundryAudio gesture arm (real files satisfy asset min-kit)
- input pointer drives a target pos for herald (drag to move), tap near pylon + strike or direct strike key when close
- scenes render receives ctx and uses alpha for interpolation on moving herald

If none used: N/A
