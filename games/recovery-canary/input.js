/* FoundryInput — keyboard/pointer state with input buffering.
 *
 * Why buffering: players press jump a few frames early; games that drop
 * those presses feel unresponsive even at 60fps. A buffered press stays
 * valid for BUFFER seconds and is consumed exactly once by gameplay code.
 *
 * Usage:
 *   FoundryInput.install(canvas, {
 *     actions: { jump: ['Space', 'ArrowUp'], left: ['ArrowLeft', 'KeyA'],
 *                right: ['ArrowRight', 'KeyD'] },
 *   });
 *   ... in update(dt):
 *     if (FoundryInput.held('left'))  player.vx = -SPEED;
 *     if (FoundryInput.consume('jump') && player.grounded) player.jump();
 *     FoundryInput.update(dt);       // ages the buffers — call LAST
 *   Pointer: FoundryInput.pointer -> { x, y, down, justDown } in canvas
 *   coordinates (already scaled for CSS-resized canvases).
 *
 * Critic note: the interaction probe clicks the canvas and expects the
 * frame to CHANGE. Make pointer/keyboard input produce visible feedback on
 * the very first interaction.
 */
(function () {
  'use strict';

  var BUFFER = 0.12; // seconds a press stays consumable

  var actionsByCode = {}; // KeyCode -> [action]
  var held = {};          // action -> bool
  var buffered = {};      // action -> seconds remaining
  var canvasRef = null;

  var pointer = { x: 0, y: 0, down: false, justDown: false };

  function canvasCoords(event) {
    var rect = canvasRef.getBoundingClientRect();
    var scaleX = canvasRef.width / rect.width;
    var scaleY = canvasRef.height / rect.height;
    var source = event.touches && event.touches.length ? event.touches[0] : event;
    return {
      x: (source.clientX - rect.left) * scaleX,
      y: (source.clientY - rect.top) * scaleY,
    };
  }

  function onDown(event) {
    var actions = actionsByCode[event.code];
    if (!actions) return;
    event.preventDefault();
    if (event.repeat) return;
    for (var i = 0; i < actions.length; i++) {
      held[actions[i]] = true;
      buffered[actions[i]] = BUFFER;
    }
  }

  function onUp(event) {
    var actions = actionsByCode[event.code];
    if (!actions) return;
    for (var i = 0; i < actions.length; i++) held[actions[i]] = false;
  }

  window.FoundryInput = {
    pointer: pointer,

    install: function (canvas, opts) {
      canvasRef = canvas;
      opts = opts || {};
      var actions = opts.actions || {};
      for (var action in actions) {
        if (!Object.prototype.hasOwnProperty.call(actions, action)) continue;
        var codes = actions[action];
        for (var i = 0; i < codes.length; i++) {
          (actionsByCode[codes[i]] = actionsByCode[codes[i]] || []).push(action);
        }
        held[action] = false;
        buffered[action] = 0;
      }
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);

      var pointerDown = function (event) {
        var at = canvasCoords(event);
        pointer.x = at.x;
        pointer.y = at.y;
        pointer.down = true;
        pointer.justDown = true;
        if (event.cancelable) event.preventDefault();
      };
      var pointerMove = function (event) {
        var at = canvasCoords(event);
        pointer.x = at.x;
        pointer.y = at.y;
      };
      var pointerUp = function () {
        pointer.down = false;
      };
      canvas.addEventListener('mousedown', pointerDown);
      canvas.addEventListener('mousemove', pointerMove);
      window.addEventListener('mouseup', pointerUp);
      canvas.addEventListener('touchstart', pointerDown, { passive: false });
      canvas.addEventListener('touchmove', pointerMove, { passive: false });
      window.addEventListener('touchend', pointerUp);
    },

    /** True while any bound key for the action is down. */
    held: function (action) {
      return !!held[action];
    },

    /** Consume a buffered press (returns true at most once per press). */
    consume: function (action) {
      if (buffered[action] > 0) {
        buffered[action] = 0;
        return true;
      }
      return false;
    },

    /** Age buffers and clear one-frame flags. Call at the END of update. */
    update: function (dt) {
      for (var action in buffered) {
        if (buffered[action] > 0) buffered[action] -= dt;
      }
      pointer.justDown = false;
    },
  };
})();
