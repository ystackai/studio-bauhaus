# GameBlocks Usage — Bunny Orbit

## Selected Modules

### `modules/math/WorldBasis.js`
- **Status:** Reused as-is
- **Role:** Coordinate ground truth for 3D orientation (Z-up convention, heading calculations)

### `modules/actor-motion/GeneralObjectModelController.js`
- **Status:** Reused as-is
- **Role:** Applies position/pose frames to the bunny astronaut 3D model in the scene

## Not Used (and Why)
- Character motion controllers: orbit-hopping uses custom physics (thrust/drift), not grounded locomotion
- World environments: planets are custom celestial bodies, not terrain/arenas
- Visual effects: rocket exhaust and landing effects are custom for this game's aesthetic
