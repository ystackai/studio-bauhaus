/* FoundryScenes — a minimal scene/state machine.
 *
 * Why: "the game just starts" is a standing charm failure. Title → play →
 * end is the smallest dramatic arc, and hand-rolled flag soup (playing=true,
 * gameOver=false, showTitle=...) is where update/render logic diverges.
 * One current scene, explicit enter/exit, done.
 *
 * Usage:
 *   FoundryScenes.add('title', {
 *     enter:  function () {...},                 // optional
 *     update: function (dt) {...},
 *     render: function (ctx, alpha) {...},
 *     exit:   function () {...},                 // optional
 *   });
 *   FoundryScenes.go('title');
 *   ... in FoundryLoop:  update: FoundryScenes.update,
 *                        render: function (a) { FoundryScenes.render(ctx, a); }
 *
 * Discipline: three scenes is usually right (title, play, end). The end
 * scene must offer one-input restart — the critic's interaction probe and
 * bored humans both press something.
 */
(function () {
  'use strict';

  var scenes = {};
  var current = null;
  var currentName = '';

  window.FoundryScenes = {
    add: function (name, scene) {
      if (typeof scene.update !== 'function' || typeof scene.render !== 'function') {
        throw new Error('scene "' + name + '" needs update(dt) and render(ctx, alpha)');
      }
      scenes[name] = scene;
    },

    go: function (name) {
      var next = scenes[name];
      if (!next) throw new Error('unknown scene "' + name + '"');
      if (current && current.exit) current.exit();
      current = next;
      currentName = name;
      if (current.enter) current.enter();
    },

    name: function () {
      return currentName;
    },

    update: function (dt) {
      if (current) current.update(dt);
    },

    render: function (ctx, alpha) {
      if (current) current.render(ctx, alpha);
    },
  };
})();
