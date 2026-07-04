/* FoundryLoop — fixed-timestep game loop for FactoryX 2D games.
 *
 * Why fixed timestep: variable-dt loops are where LLM-written games rot —
 * movement speed tied to frame rate, tunneling collisions, physics that
 * behaves differently on a 144 Hz monitor. Update logic always runs at
 * exactly STEP seconds per tick; rendering interpolates.
 *
 * Usage:
 *   1. COPY this file into your game's own directory and load it with a
 *      <script> tag (all blocks-2d files are plain scripts, no build step).
 *   2. FoundryLoop.start({ update: function (dt) {...},
 *                          render: function (alpha) {...} });
 *      `dt` is always FoundryLoop.STEP (1/60). `alpha` in [0,1] is how far
 *      into the next step we are — use it to interpolate drawn positions.
 *   3. The loop pauses on tab blur and resumes cleanly (no giant dt spike,
 *      no spiral of death: at most MAX_STEPS updates per frame).
 *
 * Critic note: the FactoryX browser critic screenshots the canvas and
 * measures variance — a game that renders nothing until first input reads
 * as broken. Render your scene from frame one.
 */
(function () {
  'use strict';

  var STEP = 1 / 60;
  var MAX_STEPS = 5; // cap catch-up after a stall; drop time instead of spiraling

  var state = {
    running: false,
    last: 0,
    accumulator: 0,
    update: null,
    render: null,
    rafId: 0,
    elapsed: 0, // total simulated seconds — use for timers instead of Date.now()
  };

  function frame(nowMs) {
    if (!state.running) return;
    var now = nowMs / 1000;
    var delta = Math.min(now - state.last, STEP * MAX_STEPS);
    state.last = now;
    state.accumulator += delta;

    var steps = 0;
    while (state.accumulator >= STEP && steps < MAX_STEPS) {
      state.update(STEP);
      state.elapsed += STEP;
      state.accumulator -= STEP;
      steps += 1;
    }
    state.render(state.accumulator / STEP);
    state.rafId = window.requestAnimationFrame(frame);
  }

  var FoundryLoop = {
    STEP: STEP,

    start: function (opts) {
      if (!opts || typeof opts.update !== 'function' || typeof opts.render !== 'function') {
        throw new Error('FoundryLoop.start needs { update(dt), render(alpha) }');
      }
      state.update = opts.update;
      state.render = opts.render;
      state.running = true;
      state.last = performance.now() / 1000;
      state.accumulator = 0;
      state.rafId = window.requestAnimationFrame(frame);
    },

    stop: function () {
      state.running = false;
      window.cancelAnimationFrame(state.rafId);
    },

    /** Total simulated time in seconds (stable across pauses). */
    time: function () {
      return state.elapsed;
    },
  };

  // Pause simulation while the tab is hidden; resume without a time spike.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      window.cancelAnimationFrame(state.rafId);
    } else if (state.running) {
      state.last = performance.now() / 1000;
      state.accumulator = 0;
      state.rafId = window.requestAnimationFrame(frame);
    }
  });

  window.FoundryLoop = FoundryLoop;
})();
