/* FoundryParticles — pooled canvas-2D particle bursts.
 *
 * Why: a burst on impact/collect/place is the highest-value juice per line
 * of code, and hand-rolled particle systems are a reliable source of GC
 * stutter and runaway allocations. This one pools.
 *
 * Usage:
 *   var particles = FoundryParticles.create({ max: 256, rng: rng });
 *   particles.burst(x, y, { count: 12, color: '#e8a33d', speed: 140,
 *                           life: 0.5, size: 3, gravity: 260 });
 *   ... in update(dt):  particles.update(dt);
 *   ... in render():    particles.draw(ctx);
 *
 * Discipline: use palette colors only (FOUNDRY.md rule 1). One burst per
 * meaningful event; continuous emitters are almost always too much.
 */
(function () {
  'use strict';

  window.FoundryParticles = {
    create: function (opts) {
      opts = opts || {};
      var max = opts.max || 256;
      var rng = opts.rng || { range: function (a, b) { return a + Math.random() * (b - a); } };
      var pool = new Array(max);
      for (var i = 0; i < max; i++) {
        pool[i] = { alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 0, size: 0, color: '#fff', gravity: 0 };
      }
      var cursor = 0;

      return {
        burst: function (x, y, cfg) {
          cfg = cfg || {};
          var count = cfg.count || 10;
          var speed = cfg.speed || 120;
          var life = cfg.life || 0.5;
          var size = cfg.size || 3;
          var gravity = cfg.gravity === undefined ? 0 : cfg.gravity;
          var color = cfg.color || '#ffffff';
          for (var n = 0; n < count; n++) {
            var p = pool[cursor];
            cursor = (cursor + 1) % max; // oldest particle is recycled first
            var angle = rng.range(0, Math.PI * 2);
            var velocity = rng.range(speed * 0.4, speed);
            p.alive = true;
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * velocity;
            p.vy = Math.sin(angle) * velocity;
            p.ttl = rng.range(life * 0.6, life);
            p.life = p.ttl;
            p.size = rng.range(size * 0.6, size * 1.4);
            p.color = color;
            p.gravity = gravity;
          }
        },

        update: function (dt) {
          for (var i = 0; i < max; i++) {
            var p = pool[i];
            if (!p.alive) continue;
            p.life -= dt;
            if (p.life <= 0) {
              p.alive = false;
              continue;
            }
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
          }
        },

        draw: function (ctx) {
          for (var i = 0; i < max; i++) {
            var p = pool[i];
            if (!p.alive) continue;
            var fade = p.life / p.ttl;
            ctx.globalAlpha = fade;
            ctx.fillStyle = p.color;
            var s = p.size * fade;
            ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          }
          ctx.globalAlpha = 1;
        },

        /** Live particle count (for tests and tuning). */
        count: function () {
          var n = 0;
          for (var i = 0; i < max; i++) if (pool[i].alive) n++;
          return n;
        },
      };
    },
  };
})();
