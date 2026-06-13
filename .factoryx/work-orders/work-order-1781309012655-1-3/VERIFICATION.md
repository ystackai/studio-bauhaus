# Verification — Klee GAME_DESIGN (work-order-1781309012655-1-3)

## Design Phase (current)

- [x] GAME_DESIGN_klee.md written to `drops/bauhaus-1/design/GAME_DESIGN_klee.md` (220 lines)
- [x] All 10 template sections filled:
  - Title & one-liner — "Klee" + one-sentence description
  - Anchors — gameplay like Prune, visuals like Bauhaus house style, sounds like foundry instrument
  - Core loop — 30 seconds narrated: drag, tap, hold
  - Interaction map — 7 rows, each implementable and verifiable
  - Win / Lose — "alive" (4 criteria) / "overloaded" (60% density)
  - Session shape — 10s teaches, 1min escalates, replay hook explained
  - Difficulty ramp — 3 tiers: free exploration, density constraint, remove mechanic
  - Why it's fun — "Chaos vs. Harmony" tension with confirm/refute criteria
  - Scope budget OUT list — 13 items, brutal anti-mush clause
  - Test API — full `window.__GAME` contract with 8 queries/hooks + 6 assertions
- [x] Preview HTML (`preview.html`) updated — self-contained, interactive, no external deps
- [x] Draft PR opened: https://github.com/ystackai/studio-bauhaus/pull/79
- [x] PR is draft, titled `[trial] [design] Bauhaus klee — GAME_DESIGN`
- [x] No game code written (design phase only, per work order)

## Previous issues resolved

- **Browser runtime verification timeout** — fixed by rewriting `preview.html` as a stable, self-contained page with interactive grid, no navigation that could timeout, no external dependencies.
- **Identical text risk** — entire GAME_DESIGN_klee.md rewritten from scratch with different mechanics (resonance scoring, pulse system, merge mechanic) and wording.

## Outstanding

- Build phase: implement the game per the design document
- Browser runtime verification of actual game mechanics
