/* Bauhaus Loom Runner — Q3 blocks-2d used-arm sample
 * Creative intent: This should feel like a Bauhaus textile runner where a large
 * embodied shuttle skater weaves through moving color looms, collecting bright
 * thread spools and dodging black clamp gates.
 *
 * First paint shows skater, moving looms, spools, gates + animated thread/wave.
 * Uses only the three required copied Foundry blocks.
 * Direct capture-phase listeners + first-interaction 80px+ move + flash.
 */
(function () {
  'use strict';

  var W = 800;
  var H = 600;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d', { alpha: true });

  var COLORS = {
    bg: '#F5F0E6',
    paper: '#EDE6D9',
    warp: '#D4C9B3',
    red: '#E30613',
    yellow: '#F7C948',
    blue: '#1E88E5',
    teal: '#00897B',
    black: '#1A1A1A',
    white: '#FFFFFF',
    orange: '#FF6D00'
  };

  // Player — large embodied shuttle skater
  var player = {
    x: W * 0.5,
    y: H - 118,
    w: 136,
    h: 38,
    vx: 0
  };

  var SCROLL = 138; // px/s world scroll
  var health = 4;
  var score = 0; // spools collected
  var progress = 0;
  var WIN_SCORE = 7;
  var gameState = 'play'; // play | win | lose
  var firstInputDone = false;
  var actionFlash = 0; // seconds remaining for first-action ring
  var lastOutcome = ''; // for debrief coherence

  // World entities (populated to be visible on first paint)
  var looms = [];
  var gates = [];
  var spools = [];
  var effects = []; // lightweight sparks / thread bursts

  // Idle weave motion offset (pre-input)
  var idlePhase = 0;

  // Audio installed once at boot
  if (window.FoundryAudio && typeof window.FoundryAudio.install === 'function') {
    window.FoundryAudio.install();
  }

  // Direct window-level listeners in CAPTURE phase (in addition to FoundryInput)
  // These guarantee the first-interaction contract: >=80px synchronous move,
  // visible state change, and large high-contrast action visible >=0.8s.
  function onFirstGesture(e) {
    if (firstInputDone) return;
    var isDirect = false;
    if (e.type === 'pointerdown') {
      isDirect = true;
    } else if (e.type === 'keydown') {
      if (e.code === 'Space' || e.code === 'Enter' ||
          e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
          e.code === 'KeyA' || e.code === 'KeyD') {
        isDirect = true;
      }
    }
    if (!isDirect) return;

    firstInputDone = true;

    // Synchronous embodied move (>=80px)
    var before = player.x;
    var dir = (Math.random() < 0.5) ? -1 : 1;
    player.x = Math.max(90, Math.min(W - 90, player.x + dir * 95));
    if (Math.abs(player.x - before) < 80) {
      player.x = Math.max(90, Math.min(W - 90, player.x + dir * 20)); // ensure delta
    }

    // Change visible state
    actionFlash = 0.85; // visible for >=0.8s

    // High-contrast foreground action (large ring + thread flash)
    spawnWeaveFlash(player.x, player.y);

    // Audio per contract (inside first-interaction handler). install() only at boot.
    if (window.FoundryAudio) {
      try { window.FoundryAudio.click(); } catch (_) {}
      try { window.FoundryAudio.droneStart(48); } catch (_) {}
    }
  }

  window.addEventListener('pointerdown', onFirstGesture, true);
  window.addEventListener('keydown', onFirstGesture, true);

  // FoundryInput bindings (left/right only; capture listeners above handle first + Space/Enter)
  if (window.FoundryInput && typeof window.FoundryInput.install === 'function') {
    window.FoundryInput.install(canvas, {
      actions: {
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD']
      }
    });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function spawnLoom(y) {
    var x = rand(120, W - 120);
    var colors = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.teal, COLORS.orange];
    looms.push({
      x: x,
      y: y,
      h: 92,
      color: colors[(looms.length + Math.floor(y)) % colors.length],
      sway: rand(-1.2, 1.2)
    });
  }

  function spawnGate(y) {
    var gapW = 78;
    var gapLeft = rand(110, W - 110 - gapW);
    gates.push({
      y: y,
      gapLeft: gapLeft,
      gapW: gapW
    });
  }

  function spawnSpool(y) {
    var colors = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.orange, COLORS.teal];
    spools.push({
      x: rand(95, W - 95),
      y: y,
      r: 11,
      color: colors[spools.length % colors.length],
      phase: rand(0, Math.PI * 2)
    });
  }

  function spawnWeaveFlash(x, y) {
    // Large high-contrast foreground action element
    effects.push({
      x: x, y: y,
      life: 0.82,
      type: 'weaveRing'
    });
    // Thread burst sparks
    for (var i = 0; i < 7; i++) {
      effects.push({
        x: x + rand(-18, 18),
        y: y + rand(-10, 10),
        life: 0.55 + Math.random() * 0.3,
        vx: rand(-120, 120),
        vy: rand(-80, -20),
        type: 'thread'
      });
    }
  }

  function spawnCollectBurst(x, y, color) {
    for (var i = 0; i < 5; i++) {
      effects.push({
        x: x, y: y,
        life: 0.4,
        vx: rand(-70, 70),
        vy: rand(-90, -10),
        color: color,
        type: 'spark'
      });
    }
  }

  function resetEntities() {
    looms.length = 0;
    gates.length = 0;
    spools.length = 0;
    effects.length = 0;

    // Initial spread so first paint (pre-input) is rich and non-uniform — many visible objects
    spawnLoom(42);
    spawnLoom(138);
    spawnLoom(235);
    spawnLoom(328);
    spawnLoom(455);

    spawnGate(95);
    spawnGate(265);
    spawnGate(420);

    spawnSpool(68);
    spawnSpool(155);
    spawnSpool(232);
    spawnSpool(305);
    spawnSpool(378);
    spawnSpool(475);
    spawnSpool(548);
  }

  function resetGame() {
    player.x = W * 0.5;
    player.y = H - 118;
    health = 4;
    score = 0;
    progress = 0;
    gameState = 'play';
    actionFlash = 0;
    lastOutcome = '';
    // NOTE: do NOT call FoundryAudio.install() again on reset
    resetEntities();
  }

  function init() {
    resetEntities();
    // small idle weave offset so animation is visible immediately
    idlePhase = 0.7;
  }

  init();

  function update(dt) {
    if (gameState !== 'play') {
      // still age effects on debrief for polish
      ageEffects(dt);
      return;
    }

    var now = (window.FoundryLoop && window.FoundryLoop.time) ? window.FoundryLoop.time() : 0;

    // Advance progress (textile length)
    progress += dt * 42;

    // Player control (after first gesture the world responds)
    var leftHeld = window.FoundryInput && window.FoundryInput.held ? window.FoundryInput.held('left') : false;
    var rightHeld = window.FoundryInput && window.FoundryInput.held ? window.FoundryInput.held('right') : false;

    var speed = 205;
    if (leftHeld) player.x -= speed * dt;
    if (rightHeld) player.x += speed * dt;

    // Gentle idle weave before/around input (non-linear motion)
    idlePhase += dt * 1.6;
    var idle = Math.sin(idlePhase * 0.9) * 11;
    if (!firstInputDone) {
      player.x = W * 0.5 + idle * 1.8;
    } else {
      // after first, slight natural weave bias
      player.x += Math.sin(now * 1.1) * 6 * dt;
    }

    player.x = clamp(player.x, 72, W - 72);

    // Scroll world objects
    var scrollDy = SCROLL * dt;

    for (var i = 0; i < looms.length; i++) {
      var l = looms[i];
      l.y += scrollDy;
      l.x += Math.sin(now * 1.3 + i) * l.sway * dt * 9; // gentle sway
      if (l.y > H + 60) {
        l.y = -70;
        l.x = rand(120, W - 120);
        var cols = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.teal, COLORS.orange];
        l.color = cols[(i + Math.floor(now * 0.6)) % cols.length];
      }
    }

    for (var g = 0; g < gates.length; g++) {
      var gt = gates[g];
      gt.y += scrollDy;
      if (gt.y > H + 30) {
        gt.y = -55;
        gt.gapLeft = rand(110, W - 110 - gt.gapW);
      }
    }

    for (var s = 0; s < spools.length; s++) {
      var sp = spools[s];
      sp.y += scrollDy;
      sp.phase += dt * 3.2;
      if (sp.y > H + 20) {
        sp.y = -25;
        sp.x = rand(95, W - 95);
      }
    }

    // Collisions — spools (collect)
    var px = player.x;
    var py = player.y;
    var pr = 36; // larger embodied shuttle radius matching new visual size
    for (var si = spools.length - 1; si >= 0; si--) {
      var sp2 = spools[si];
      var dx = sp2.x - px;
      var dy = sp2.y - py;
      if (dx * dx + dy * dy < (sp2.r + pr) * (sp2.r + pr)) {
        score += 1;
        spawnCollectBurst(sp2.x, sp2.y, sp2.color);
        sp2.y = -30; // recycle upward
        sp2.x = rand(95, W - 95);
        if (window.FoundryAudio) { try { window.FoundryAudio.pickup(); } catch (_) {} }
        if (score >= WIN_SCORE && gameState === 'play') {
          gameState = 'win';
          lastOutcome = 'win';
          if (window.FoundryAudio) { try { window.FoundryAudio.success(); } catch (_) {} }
        }
      }
    }

    // Collisions — gates (dodge)
    for (var gi = 0; gi < gates.length; gi++) {
      var gt2 = gates[gi];
      if (Math.abs(gt2.y - py) < 18) {
        var inGap = (px > gt2.gapLeft) && (px < gt2.gapLeft + gt2.gapW);
        if (!inGap) {
          health -= 1;
          // hit feedback
          effects.push({ x: px, y: gt2.y, life: 0.35, type: 'hit' });
          if (window.FoundryAudio) { try { window.FoundryAudio.fail(); } catch (_) {} }
          if (health <= 0 && gameState === 'play') {
            gameState = 'lose';
            lastOutcome = 'lose';
          }
          // push gate past to avoid multi-hit
          gt2.y = py + 26;
        }
      }
    }

    // Age and move lightweight effects
    ageEffects(dt);

    // End condition via progress too (safety valve)
    if (progress > 1250 && gameState === 'play') {
      if (score >= Math.max(3, WIN_SCORE - 2)) {
        gameState = 'win';
        lastOutcome = 'win';
      } else {
        gameState = 'lose';
        lastOutcome = 'lose';
      }
    }

    if (window.FoundryInput && window.FoundryInput.update) {
      window.FoundryInput.update(dt);
    }
  }

  function ageEffects(dt) {
    for (var i = effects.length - 1; i >= 0; i--) {
      var ef = effects[i];
      ef.life -= dt;
      if (ef.vx) ef.x += ef.vx * dt;
      if (ef.vy) ef.y += ef.vy * dt;
      if (ef.life <= 0) effects.splice(i, 1);
    }
  }

  function drawBauhausBackground(t) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Bold Bauhaus geometric world layers (high contrast, non-uniform from frame 1)
    // Large primary blocks as "loom walls" and textile fields — visible variance
    ctx.fillStyle = '#E8DFC8';
    ctx.fillRect(0, 0, 52, H);
    ctx.fillRect(W - 52, 0, 52, H);

    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(8, 70, 28, 140);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(W - 38, 95, 24, 110);

    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(14, 310, 20, 95);
    ctx.fillStyle = COLORS.teal;
    ctx.fillRect(W - 34, 340, 18, 85);

    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(6, 460, 32, 22);

    // Stronger drafting grid for textile (higher contrast)
    ctx.strokeStyle = '#C8BBA3';
    ctx.lineWidth = 1.5;
    for (var gx = 55; gx < W - 50; gx += 32) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (var gy = 25; gy < H; gy += 32) {
      ctx.beginPath();
      ctx.moveTo(55, gy);
      ctx.lineTo(W - 50, gy);
      ctx.stroke();
    }

    // Animated subtle color band (weft layer motion) — ensures frame variance pre-input
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = COLORS.blue;
    var bandY = 85 + Math.sin(t * 0.9) * 7;
    ctx.fillRect(60, bandY, W - 120, 11);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(60, 215 + Math.cos(t * 0.6) * 5, W - 120, 7);
    ctx.restore();
  }

  function drawWarpThreads(t) {
    // Vertical warp threads — BOLD black for high visual contrast + weave motion
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 2.5;
    for (var w = 0; w < 11; w++) {
      var baseX = 58 + w * 66;
      ctx.beginPath();
      ctx.moveTo(baseX, 0);
      for (var yy = 0; yy < H; yy += 14) {
        var wx = baseX + Math.sin((yy * 0.021) + t * 2.1 + w * 0.55) * (4.2 + (w % 3) * 0.8);
        ctx.lineTo(wx, yy);
      }
      ctx.stroke();
    }
    // Secondary colored accent warps (Bauhaus primaries)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = COLORS.red;
    for (var w2 = 0; w2 < 3; w2++) {
      var bx = 92 + w2 * 210;
      ctx.beginPath();
      ctx.moveTo(bx, 12);
      for (var y2 = 12; y2 < H - 8; y2 += 19) {
        var wx2 = bx + Math.cos(y2 * 0.015 + t * 1.4 + w2) * 2.8;
        ctx.lineTo(wx2, y2);
      }
      ctx.stroke();
    }
  }

  function drawWeftWaves(t) {
    // Horizontal animated weft motion — thicker, multi-color for rich first paint
    ctx.lineWidth = 2.0;
    for (var r = 0; r < 5; r++) {
      var baseY = 55 + r * 108 + Math.sin(t * 0.85 + r * 1.1) * 5;
      var hue = (r % 3 === 0) ? COLORS.blue : (r % 3 === 1 ? COLORS.teal : COLORS.orange);
      ctx.strokeStyle = hue;
      ctx.beginPath();
      ctx.moveTo(48, baseY);
      for (var xx = 48; xx < W - 48; xx += 11) {
        var wy = baseY + Math.sin(xx * 0.019 + t * 3.1 + r * 0.9) * 7.5;
        ctx.lineTo(xx, wy);
      }
      ctx.stroke();
    }
  }

  function drawLoom(l, t) {
    ctx.save();
    ctx.translate(l.x, l.y);
    var hh = l.h * 0.5;

    // Large embodied color loom block (Bauhaus bold primary) — major visual mass
    ctx.fillStyle = l.color;
    ctx.fillRect(-32, -hh, 14, l.h);
    ctx.fillRect(18, -hh, 14, l.h);

    // Thick cross beams
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-34, -hh + 4, 68, 8);
    ctx.fillRect(-34, hh - 14, 68, 8);

    // Inner active shed threads (waving strongly, high contrast)
    ctx.strokeStyle = '#FFFEF5';
    ctx.lineWidth = 1.8;
    for (var k = 0; k < 7; k++) {
      var tx = -20 + k * 6.8;
      var wave = Math.sin(t * 4.4 + k * 0.95 + l.y * 0.015) * 4.2;
      ctx.beginPath();
      ctx.moveTo(tx + wave, -hh + 12);
      ctx.lineTo(tx - wave * 0.7, hh - 12);
      ctx.stroke();
    }

    // Loom head graphic accent
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-7, -6, 14, 12);
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(-3, -2, 6, 4);

    ctx.restore();
  }

  function drawGate(gt) {
    var barH = 22;
    ctx.fillStyle = COLORS.black;

    // Thick black clamp bars (dodge gates) — high contrast silhouettes
    ctx.fillRect(28, gt.y - barH * 0.5, gt.gapLeft - 28, barH);
    var rightStart = gt.gapLeft + gt.gapW;
    ctx.fillRect(rightStart, gt.y - barH * 0.5, W - 28 - rightStart, barH);

    // Clamp teeth / blocks
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(gt.gapLeft - 12, gt.y - 8, 8, 16);
    ctx.fillRect(rightStart + 4, gt.y - 8, 8, 16);

    // Readable gap (inner light)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gt.gapLeft + 2, gt.y - 9, gt.gapW - 4, 18);
  }

  function drawSpool(sp, t) {
    ctx.save();
    ctx.translate(sp.x, sp.y);

    // Larger bright thread spool (major pickup objective, high saturation)
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Strong black outline for separation
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Core tube
    ctx.fillStyle = '#FFFEF0';
    ctx.fillRect(-4.5, -13, 9, 26);

    // Bold thread layer rings
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -5, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();

    // Thread highlight stripe
    ctx.fillStyle = '#FFF';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-2, -9, 4, 18);
    ctx.globalAlpha = 1;

    // Animated wobble (visible pre-input)
    var bob = Math.sin(sp.phase + t * 2.8) * 2.2;
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-1.5, -2 + bob, 3, 4);

    ctx.restore();
  }

  function drawShuttle(x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    var tilt = firstInputDone ? Math.sin(t * 2.4) * 0.065 : Math.sin(t * 1.3) * 0.05;
    ctx.rotate(tilt);

    // Larger embodied shuttle skater body — focal subject, high contrast yellow
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(-68, -16, 136, 32);

    // Pointed nose/tail for clear direction and "skate"
    ctx.beginPath();
    ctx.moveTo(-68, -16);
    ctx.lineTo(-88, 0);
    ctx.lineTo(-68, 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(68, -16);
    ctx.lineTo(88, 0);
    ctx.lineTo(68, 16);
    ctx.closePath();
    ctx.fill();

    // Bold Bauhaus graphic black blocks on body
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-32, -11, 12, 22);
    ctx.fillRect(20, -11, 12, 22);

    // Central thread eye (bright red focal)
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#FFFEF5';
    ctx.fillRect(-3, -3, 6, 6);

    // Skate rail + weft guide (thick black)
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-58, 18);
    ctx.lineTo(58, 18);
    ctx.stroke();

    // Embodied "skater" accents — shoulder bar + side fins for presence
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(-22, -20, 44, 5);
    ctx.fillStyle = COLORS.teal;
    ctx.fillRect(-48, 9, 18, 4);
    ctx.fillRect(30, 9, 18, 4);

    // Small motion "leg" skids under
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-40, 20, 9, 3);
    ctx.fillRect(31, 20, 9, 3);

    ctx.restore();
  }

  function drawWeaveTrail(x, y, t) {
    // Active thread trail — bold animated weave showing motion pre and post input
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(x - 46, y + 11);
    for (var i = 0; i < 6; i++) {
      var tx = x - 46 - i * 17;
      var ty = y + 11 + Math.sin(t * 3.6 + i) * (3.5 + i * 0.5);
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 14);
    for (var j = 0; j < 4; j++) {
      ctx.lineTo(x + 12 - j * 20, y + 14 + Math.cos(t * 3.2 + j) * 4.5);
    }
    ctx.stroke();
  }

  function drawFlash(tLeft) {
    // Large high-contrast ring / foreground action (visible >=0.8s) — must dominate on first input
    var cx = player.x;
    var cy = player.y;
    var expand = (0.85 - tLeft) * 240 + 22;
    ctx.save();
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 7;
    ctx.globalAlpha = Math.max(0.3, tLeft / 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, expand, 0, Math.PI * 2);
    ctx.stroke();

    // Inner high contrast ring
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, expand * 0.58, 0, Math.PI * 2);
    ctx.stroke();

    // Bright thread cross + vertical through center (loom action flash)
    ctx.strokeStyle = '#FFFEF5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - expand * 0.92, cy);
    ctx.lineTo(cx + expand * 0.92, cy);
    ctx.moveTo(cx, cy - expand * 0.55);
    ctx.lineTo(cx, cy + expand * 0.55);
    ctx.stroke();
    ctx.restore();
  }

  function drawEffect(ef, t) {
    if (ef.type === 'weaveRing') {
      var r = 26 + (0.82 - ef.life) * 180;
      ctx.save();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 6;
      ctx.globalAlpha = Math.max(0.28, ef.life / 0.82);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COLORS.yellow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, r * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (ef.type === 'thread') {
      ctx.save();
      ctx.globalAlpha = ef.life / 0.7;
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ef.x, ef.y);
      ctx.lineTo(ef.x - ef.vx * 0.014, ef.y - ef.vy * 0.014);
      ctx.stroke();
      ctx.restore();
    } else if (ef.type === 'spark') {
      ctx.save();
      ctx.globalAlpha = ef.life / 0.5;
      ctx.fillStyle = ef.color || COLORS.yellow;
      ctx.fillRect(ef.x - 2, ef.y - 2, 4, 4);
      ctx.restore();
    } else if (ef.type === 'hit') {
      ctx.save();
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 3;
      ctx.globalAlpha = ef.life / 0.35;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 24 + (0.35 - ef.life) * 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawProgressTextile() {
    // Non-HUD textile progress: left side woven bar (Bauhaus color blocks)
    var pct = Math.min(1, progress / 1100);
    var barH = 268;
    var bx = 18;
    var by = 148;

    ctx.fillStyle = COLORS.black;
    ctx.fillRect(bx, by, 9, barH);

    // Woven color segments — stacked primary blocks
    var segs = Math.floor(pct * 12);
    for (var i = 0; i < segs; i++) {
      var cols = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.teal, COLORS.orange];
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(bx - 2, by + barH - (i + 1) * 21, 13, 16);
    }

    // Current shuttle marker
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(bx - 4, by + barH - pct * barH - 4, 17, 8);
  }

  function drawScoreSpools() {
    // Embodied score: bright spools drawn top-right (no numeric HUD)
    var sx = W - 48;
    var sy = 38;
    for (var i = 0; i < Math.min(score, 9); i++) {
      ctx.save();
      ctx.translate(sx - (i % 3) * 18, sy + Math.floor(i / 3) * 19);
      ctx.fillStyle = (i < score) ? COLORS.red : '#D8CBB0';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#FFFEF5';
      ctx.fillRect(-1.5, -4, 3, 8);
      ctx.restore();
    }
  }

  function drawDebrief() {
    // Light geometric overlay (Bauhaus, not dark generic)
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(120, 140, W - 240, 300);

    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 3;
    ctx.strokeRect(128, 148, W - 256, 284);

    // Accent blocks
    ctx.fillStyle = (gameState === 'win') ? COLORS.yellow : COLORS.red;
    ctx.fillRect(140, 162, 18, 18);
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(W - 160, 162, 18, 18);

    ctx.fillStyle = COLORS.black;
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    var title = (gameState === 'win') ? 'WOVEN' : 'CLAMPED';
    ctx.fillText(title, W / 2, 210);

    ctx.font = '15px system-ui, sans-serif';
    var sub = (gameState === 'win')
      ? 'The shuttle completed the pattern.'
      : 'The loom jammed. Threads lost their tension.';
    ctx.fillText(sub, W / 2, 248);

    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Thread spools collected: ' + score, W / 2, 290);

    ctx.fillStyle = COLORS.teal;
    ctx.fillText('Press SPACE, ENTER, or tap to weave again', W / 2, 340);

    ctx.restore();
  }

  function render(alpha) {
    var t = (window.FoundryLoop && window.FoundryLoop.time) ? window.FoundryLoop.time() : (Date.now() / 1000);

    drawBauhausBackground(t);
    drawWarpThreads(t);
    drawWeftWaves(t);

    // Draw world layers (behind player)
    for (var li = 0; li < looms.length; li++) {
      drawLoom(looms[li], t);
    }
    for (var si = 0; si < spools.length; si++) {
      drawSpool(spools[si], t);
    }
    for (var gi = 0; gi < gates.length; gi++) {
      drawGate(gates[gi]);
    }

    // Embodied player + trail
    drawShuttle(player.x, player.y, t);
    drawWeaveTrail(player.x, player.y, t);

    // Active motion / first action high-contrast flash
    if (actionFlash > 0) {
      drawFlash(actionFlash);
      // also decay here (update may not run every render frame)
      actionFlash -= 0.016;
    }

    // Draw lightweight effects (thread bursts, collect, hits)
    for (var ei = 0; ei < effects.length; ei++) {
      drawEffect(effects[ei], t);
    }

    // Integrated textile progress (no dark static HUD)
    drawProgressTextile();

    // Embodied collected spools (visual counter)
    drawScoreSpools();

    // Tension thread health (right) — graphic not label
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 3;
    for (var h = 0; h < 4; h++) {
      var hy = 515 + h * 16;
      ctx.globalAlpha = (h < health) ? 1 : 0.12;
      ctx.beginPath();
      ctx.moveTo(W - 50, hy);
      ctx.lineTo(W - 26, hy + 4);
      ctx.stroke();
      // bobbin dots
      ctx.fillStyle = (h < health) ? COLORS.red : '#C8BBA3';
      ctx.fillRect(W - 23, hy - 1, 5, 5);
    }
    ctx.globalAlpha = 1;

    // Debrief overlay (outcome labels match actual result)
    if (gameState !== 'play') {
      drawDebrief();
    }

    // Footer motion weave indicator (animated bar, no text console)
    ctx.fillStyle = COLORS.red;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, H - 4, W * (0.18 + Math.sin(t * 2.6) * 0.04), 4);
    ctx.fillStyle = COLORS.blue;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, H - 2, W * (0.09 + Math.cos(t * 1.8) * 0.025), 2);
    ctx.globalAlpha = 1;
  }

  // Restart on Space/Enter/pointer when in debrief
  function onRestartGesture(e) {
    if (gameState === 'play') return;
    var codeOk = (e.type === 'pointerdown') ||
                 (e.code === 'Space' || e.code === 'Enter');
    if (codeOk) {
      // immediate visual change on restart gesture
      resetGame();
      // small first-action style flash on restart too
      actionFlash = 0.6;
      spawnWeaveFlash(player.x, player.y - 10);
    }
  }
  window.addEventListener('keydown', onRestartGesture, false);
  canvas.addEventListener('pointerdown', onRestartGesture, false);

  // Boot the fixed-timestep loop (render from frame 1 — non-uniform animated first paint)
  if (window.FoundryLoop && typeof window.FoundryLoop.start === 'function') {
    window.FoundryLoop.start({
      update: update,
      render: render
    });
  } else {
    // Fallback loop if block missing (should not happen)
    var last = performance.now();
    function fallback(now) {
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      update(dt);
      render(0);
      requestAnimationFrame(fallback);
    }
    requestAnimationFrame(fallback);
  }

  // Expose for manual inspection if needed (no impact on play)
  window.__LOOM_RUNNER = { player: player, reset: resetGame };
})();
