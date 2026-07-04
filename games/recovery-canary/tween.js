/* FoundryTween — a tiny tween engine; the motor behind juice.
 *
 * Why: "spiritless motion" is a standing critic finding. Linear movement
 * reads as generated; eased movement reads as designed. This is the smallest
 * engine that makes easing the default.
 *
 * Usage (drive it from your FoundryLoop update):
 *   FoundryTween.to(sprite, { x: 240, y: 96 }, 0.35, { ease: 'backOut' });
 *   FoundryTween.to(fx, { alpha: 0 }, 0.5, {
 *     ease: 'quadOut', delay: 0.1,
 *     onDone: function () { fx.dead = true; },
 *   });
 *   ... in update(dt):  FoundryTween.update(dt);
 *
 * Discipline: tween positions, scales, and alphas. Do not tween gameplay
 * state (health, score) — those change instantly; only their PRESENTATION
 * eases.
 */
(function () {
  'use strict';

  var EASE = {
    linear: function (t) { return t; },
    quadOut: function (t) { return 1 - (1 - t) * (1 - t); },
    cubicOut: function (t) { var u = 1 - t; return 1 - u * u * u; },
    // A small overshoot — the single cheapest "alive" signal for pops/lands.
    backOut: function (t) {
      var c = 1.70158;
      var u = t - 1;
      return 1 + (c + 1) * u * u * u + c * u * u;
    },
    // Gentle sine settle for floaty things (lanterns, bubbles, drift).
    sineInOut: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
  };

  var active = [];

  window.FoundryTween = {
    /** Tween numeric fields of `target` to `props` over `seconds`. */
    to: function (target, props, seconds, opts) {
      opts = opts || {};
      var from = {};
      for (var key in props) {
        if (Object.prototype.hasOwnProperty.call(props, key)) {
          from[key] = target[key];
        }
      }
      var tween = {
        target: target,
        from: from,
        to: props,
        duration: Math.max(seconds, 0.0001),
        elapsed: 0,
        delay: opts.delay || 0,
        ease: EASE[opts.ease] || EASE.quadOut,
        onDone: opts.onDone || null,
        done: false,
      };
      active.push(tween);
      return tween;
    },

    /** Cancel every tween targeting an object (e.g. before re-tweening it). */
    cancel: function (target) {
      for (var i = 0; i < active.length; i++) {
        if (active[i].target === target) active[i].done = true;
      }
    },

    update: function (dt) {
      for (var i = active.length - 1; i >= 0; i--) {
        var tw = active[i];
        if (tw.done) {
          active.splice(i, 1);
          continue;
        }
        if (tw.delay > 0) {
          tw.delay -= dt;
          continue;
        }
        tw.elapsed += dt;
        var t = Math.min(tw.elapsed / tw.duration, 1);
        var eased = tw.ease(t);
        for (var key in tw.to) {
          if (Object.prototype.hasOwnProperty.call(tw.to, key)) {
            tw.target[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * eased;
          }
        }
        if (t >= 1) {
          tw.done = true;
          active.splice(i, 1);
          if (tw.onDone) tw.onDone();
        }
      }
    },

    /** Active tween count (handy in tests and debug overlays). */
    count: function () {
      return active.length;
    },
  };
})();
