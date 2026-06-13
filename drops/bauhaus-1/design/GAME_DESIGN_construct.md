# GAME_DESIGN.md — Brief 29

## Title & one-liner

**Bauhaus Construct** — Snap primary-color shapes onto a grid until they form the target composition.

## Anchors

- **Gameplay like:** *Tetris* — you place pieces one at a time until the board resolves into a complete composition. The tension is between the urgency of filling space and the precision required to hit exact positions; you can only rotate and place, never remove once locked, so every decision is permanent.

- **Visuals like:** *PixelHunters* — every level is a flat 2D SVG canvas. The art direction is strictly Bauhaus Digital: primary-color planes (red, yellow, blue) and black/white ground and lines on a measured grid. No gradients, no shadows, no perspective. The grid itself is the aesthetic.

- **Sounds like:** *The Grain Snap* — the generative music instrument from the foundry serves as underscore. Each piece placement triggers a single note from a pentatonic scale tied to the piece's color; as more pieces lock, the rhythmic density increases, and the final lock plays a resolved chord. When no pieces remain on the hand, silence returns briefly before the next level begins.

## Core loop (the first 30 seconds, written as play)

The player opens the page. A white canvas fills the screen, split in two: the top half shows a small target composition in primary colors on a subtle black grid; the bottom half shows a tray of 3–5 primitive shapes — a red square, a yellow rectangle, a blue circle, a black line — arranged in a row.

The first ten seconds: the target is visible but abstract. A black arrow or outline highlights the first empty space on the grid. The player **clicks** a piece from the tray to select it. The piece lifts, follows the cursor.

The player **moves** the piece over the grid. As it nears a valid cell, the grid cell highlights in a faint black outline. When the piece's footprint aligns with the grid, it **snaps** audibly — a short percussive tone from the generative instrument.

Three verbs: **select** (click a piece from the tray), **move** (drag it over the grid), **snap** (it locks into place with a note).

That is the entire loop, repeated: select, move, snap. Repeat until the composition is complete.

## Interaction map

| Input | Action | Feedback (visual + audio) |
|---|---|---|
| Click/tap piece in tray | Select that piece; it lifts off the tray and follows cursor | Faint highlight pulse; a soft "pluck" tone |
| Move cursor over grid | Piece hovers above grid, showing placement preview with faint outline | Cell-by-cell highlight on valid snap positions |
| Click/tap on grid | Snap piece into nearest valid grid cell; locks permanently | Sharp percussive note from generative instrument matching piece color; cell flashes briefly in piece color |
| R key or right-click on selected piece | Rotate piece 90° clockwise | Short slide tone upward; piece preview updates with rotated shape |
| Click tray area (no piece selected) | Deselect current piece; tray returns to idle state | No audio; tray piece dims slightly |
| Escape key | Deselect; if any pieces are already locked, they remain | No audio |
| Click "New" button | Discard current level, load next level | Brief silence, then first note of next level's motif |
| Click "Retry" button | Reset current level to initial state | Brief silence, then re-play of level's first note |

Every row is implementable: the grid is an SVG `<g>` with `<rect>` cells; pieces are SVG `<rect>`, `<circle>`, `<line>` elements. Drag uses pointer events. Snap uses nearest-grid-cell distance calculation. Audio uses Web Audio API oscillator nodes mapped to piece colors.

## Win / Lose

**Win:** All required cells in the target composition are filled by locked pieces. When the last piece snaps, the composition resolves: a 600 ms hold of the completed composition with a final resolved chord (all piece-color notes played together, then fade to white). The "New" button appears.

**Lose:** No pieces remain on the tray and the composition is incomplete. The grid outline pulses red briefly; the locked pieces remain, the tray shows empty. The "Retry" button appears.

**Run length:** 30–90 seconds per level. Early levels have 3–5 pieces; later levels have up to 8–10 pieces and more constrained shapes.

## Session shape

- **First 10 seconds:** The target composition appears top-half, tray bottom-half. A faint animated arrow (a black line segment that sweeps in one direction) indicates the first empty cell. The player drags the first piece in — no text explains the game. The grid snaps the piece into place with sound. By second 10, the player has locked one piece and feels the mechanic.

- **First minute:** The player places 2–3 pieces. Each snap adds a note to an emerging rhythm. The composition starts to feel familiar — the player recognizes that the grid is their workspace and the tray is their palette. A second lock triggers the first realization: "I am building this."

- **Replay hook:** Each level is a unique composition — no two are the same arrangement. The player earns "compositions completed" as a score. Levels are sorted by piece count (3 → 4 → 5 → ... → 10), creating a natural progression. The desire to "see it complete" — to feel that final resolution chord — drives replay.

## Difficulty ramp

**What escalates:** Number of pieces (3 to 10), piece rotation requirements (early pieces fit unrotated; mid levels require at least one 90° rotation; late levels require 0°/90°/180°/270° of all pieces), and grid constraint density (early levels have large contiguous target areas; late levels have fragmented target regions separated by white space).

**Curve:** Linear piece-count increase over the first 20 levels, then plateau at 8–10 pieces. Rotation difficulty scales: levels 1–5 require zero rotations, levels 6–15 require one rotation, levels 16+ require multiple rotations.

**Player agency:** There is no resource economy or currency. The only thing the player earns is progress — more levels unlock as they complete previous ones. This keeps the focus purely on composition skill, not on managing inventory or score multipliers.

## Why it's fun (falsifiable hypothesis)

**The tension:** Precision-vs-greed. The player wants to place pieces quickly and celebrate early completion, but placing a piece in the wrong cell makes a level unwinnable (pieces lock permanently). The satisfying moment comes from resisting the urge to lock prematurely and thinking one step ahead.

**What would CONFIRM this:** If the majority of failed levels occur because a player locked an early piece that blocked a later one — i.e., players rush the first snap and regret it — then precision-vs-greed is the real tension. We would observe players clicking a second time before the first piece fully locks, or hovering over the grid longer than the average placement time.

**What would REFUTE this:** If players fail because the level layout is genuinely unsolvable (no valid arrangement of the given pieces fits the target), then the problem is level design, not tension. If players complete levels in under 5 seconds with no hesitation, then the precision requirement is not present and the tension is absent.

## Scope budget — the OUT list

This game explicitly does **NOT** have:

- **3D, perspective, or WebGL.** Everything is flat 2D SVG on a grid.
- **Photorealism.** Shapes are geometric primitives: squares, rectangles, circles, lines, triangles. No textures, no photos, no gradients.
- **Extra colors beyond the primary palette.** Red (#E04040), yellow (#F0C830), blue (#3060D0), black (#1A1A1A), white (#F5F5F0). No green, orange, purple, or any other hue in v1.
- **Narrative or story.** No characters, no plot, no dialogue. No flavor text explaining the game.
- **Power-ups, collectibles, or items.** The game is purely composition.
- **Multiplayer or networking.** Single-player only. No leaderboards in v1.
- **Save/load.** No persistence between sessions. Refreshing the page resets everything.
- **In-app purchases, ads, or monetization.**
- **Sound effects other than generative music.** No UI beeps, no explosion sounds, no ambient noise. All audio is the parameterized music instrument.
- **Menus beyond level select and retry.** No settings screen, no options menu.
- **Touch swiping.** Only click/tap and drag. No gesture-based controls.
- **Variable piece sizes beyond the grid grid.** All pieces align to the grid exactly.

## Test API

The browser game must expose `window.__GAME` as a namespace with the following properties and methods:

**State queries (read-only):**
- `window.__GAME.getState()` — returns `{ level: number, locked: Array<{cell: {row, col}, color: string, rotation: number}>, tray: Array<{type: string, color: string, rotation: number}>, target: Array<{row, col, color}>, phase: 'idle' | 'playing' | 'win' | 'lose' }`
- `window.__GAME.canPlace(piece, row, col, rotation)` — returns boolean: whether placing `piece` at `row, col` with `rotation` would be valid (not overlapping existing locked pieces, and the footprint is within grid bounds).
- `window.__GAME.isLevelComplete()` — returns boolean.
- `window.__GAME.getAvailablePieces()` — returns array of pieces still on the tray.
- `window.__GAME.isLevelSolvable()` — returns boolean (runs a backtracking solver; useful for critic validation that a level is fair).

**Simulation hooks (mutating, for testing):**
- `window.__GAME.placePiece(pieceIndex, row, col, rotation)` — simulates locking a piece at the given position. Returns `{success: boolean, note?: string}` (success false if invalid position).
- `window.__GAME.rotatePiece(pieceIndex, degrees)` — rotates a tray piece by the given degrees (90, 180, 270).
- `window.__GAME.deselect()` — clears the currently selected piece.
- `window.__GAME.nextLevel()` — advances to the next level, resets state.
- `window.__GAME.retryLevel()` — resets current level to initial state.
- `window.__GAME.resetAll()` — resets everything to level 1.
- `window.__GAME.simulateWin()` — forces the level into win state for testing the resolution animation.
- `window.__GAME.simulateLose()` — forces the level into lose state (removes all tray pieces, leaves locked pieces) for testing the lose state.

**Critic test scenarios:**
1. `getState().phase === 'playing'` after init — confirms game started correctly.
2. `canPlace(0, 2, 3, 0)` returns `true` — confirms a valid placement is recognized.
3. `canPlace(0, 2, 3, 0)` then `placePiece(0, 2, 3, 0)` — after placement, `getState().locked` should contain the new piece.
4. `canPlace(0, 2, 3, 0)` returns `false` after placement — confirms piece is now locked and cannot be placed again.
5. `isLevelComplete()` returns `true` after all target cells are filled — confirms win detection.
6. `isLevelSolvable()` returns `true` for all generated levels — confirms no unsolvable levels are generated.
7. `simulateWin()` — `getState().phase` becomes `'win'` — confirms win animation triggers.
8. `simulateLose()` — `getState().phase` becomes `'lose'` — confirms lose state renders.
9. All audio calls use the Web Audio API (no `<audio>` tags) — confirms generative music integration.
