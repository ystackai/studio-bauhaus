# Klee — Technical System Design

## Architecture
Single-file self-contained HTML application. No external dependencies. Canvas-based rendering with Web Audio API.

## Core Systems

### Grid System
- 10×8 cell grid, responsive sizing
- Grid drawn with subtle lines on canvas
- Cells tracked via `Set<string>` (key: "col,row")

### Shape System
- Three shape types: circle, square, triangle
- Each shape: `{id, type, color, col, row, size, growLevel, densityFaded}`
- Grow: 3 levels, each expands shape visually + raises pitch

### Audio System
- Web Audio API oscillator-based synthesis
- Color mapping: red→C3, yellow→C4, blue→C5
- Placement: brief tone (0.6s)
- Hold-to-grow: sustained oscillator with frequency ramp (0→400ms silent, then rising pitch)
- Release: exponential decay on gain
- Balance chord: three sequential notes (red/yellow/blue) with staggered starts
- Clear: descending sweep oscillator
- Dissonance: three sawtooth oscillators at closely-spaced frequencies

### Rendering
- Canvas 2D context, devicePixelRatio-aware
- Grid lines, shapes, preview all drawn per frame
- Density-faded shapes: globalAlpha=0.3
- Balance flash: CSS overlay with transition opacity

## Interaction Model
- Pointer events (pointerdown/move/up/cancel) for unified touch+mouse
- Drag: from toolbar to canvas → snap to grid
- Tap: short press (<400ms) on empty cell → place plane
- Hold: >400ms on placed shape → grow
- Long-press: >1000ms on empty canvas → clear all

## Test Surface
`window.__GAME` exposes:
- `getState()` — full game state snapshot
- `isBalanced()` — boolean
- `place(type, color, col, row)` — programmatic placement
- `clear()` — clear all
- `onBalance(fn)` — register callback
