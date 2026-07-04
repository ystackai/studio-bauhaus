/* FoundryRng — seeded, deterministic randomness (mulberry32).
 *
 * Why seeded: Math.random() makes every run different, which makes bugs
 * unreproducible and makes the FactoryX critic's screenshot/interaction
 * probes flaky. Seed once from a constant (or a daily string) and the same
 * build behaves the same way every run.
 *
 * Usage:
 *   var rng = FoundryRng.create('lantern-tide');  // or a number
 *   rng.next()            -> float in [0, 1)
 *   rng.range(2, 5)       -> float in [2, 5)
 *   rng.int(0, 9)         -> integer in [0, 9] inclusive
 *   rng.pick(array)       -> uniform element
 *   rng.chance(0.25)      -> boolean, true 25% of the time
 */
(function () {
  'use strict';

  function hashString(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.FoundryRng = {
    create: function (seed) {
      var numeric = typeof seed === 'string' ? hashString(seed) : (seed >>> 0) || 1;
      var next = mulberry32(numeric);
      return {
        next: next,
        range: function (min, max) {
          return min + next() * (max - min);
        },
        int: function (min, max) {
          return min + Math.floor(next() * (max - min + 1));
        },
        pick: function (items) {
          return items[Math.floor(next() * items.length)];
        },
        chance: function (probability) {
          return next() < probability;
        },
      };
    },
  };
})();
