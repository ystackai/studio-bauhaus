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
    w: 126,
    h: 36,
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

    // Initial spread so first paint (pre-input) is rich and non-uniform
    spawnLoom(60);
    spawnLoom(175);
    spawnLoom(310);
    spawnLoom(455);

    spawnGate(120);
    spawnGate(395);

    spawnSpool(85);
    spawnSpool(210);
    spawnSpool(295);
    spawnSpool(410);
    spawnSpool(520);
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
    var pr = 28; // generous read for embodied shuttle
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

    // Subtle paper grid (textile drafting paper)
    ctx.strokeStyle = COLORS.paper;
    ctx.lineWidth = 1;
    for (var gx = 40; gx < W; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (var gy = 30; gy < H; gy += 28) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // Bauhaus geometric accents (non-uniform, low opacity)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(40, 80, 18, 18);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(W - 70, 140, 22, 22);
    ctx.fillStyle = COLORS.yellow;
    ctx.beginPath();
    ctx.arc(120, 420, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(W - 55, 510, 14, 36);
    ctx.restore();
  }

  function drawWarpThreads(t) {
    // Vertical warp threads with animated wave
    ctx.strokeStyle = COLORS.warp;
    ctx.lineWidth = 1.5;
    for (var w = 0; w < 9; w++) {
      var baseX = 55 + w * 82;
      ctx.beginPath();
      ctx.moveTo(baseX, 0);
      for (var yy = 0; yy < H; yy += 18) {
        var wx = baseX + Math.sin((yy * 0.018) + t * 1.7 + w * 0.6) * (3.5 + (w % 2));
        ctx.lineTo(wx, yy);
      }
      ctx.stroke();
    }
  }

  function drawWeftWaves(t) {
    // Horizontal animated weft motion (thread being laid)
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.25;
    for (var r = 0; r < 4; r++) {
      var baseY = 70 + r * 125 + Math.sin(t * 0.7 + r) * 4;
      ctx.beginPath();
      ctx.moveTo(25, baseY);
      for (var xx = 25; xx < W - 20; xx += 14) {
        var wy = baseY + Math.sin(xx * 0.022 + t * 2.6 + r * 1.3) * 6.5;
        ctx.lineTo(xx, wy);
      }
      ctx.stroke();
    }
  }

  function drawLoom(l, t) {
    ctx.save();
    ctx.translate(l.x, l.y);
    var hh = l.h * 0.5;

    // Colored loom posts (Bauhaus primary blocks)
    ctx.fillStyle = l.color;
    ctx.fillRect(-26, -hh, 9, l.h);
    ctx.fillRect(17, -hh, 9, l.h);

    // Cross members
    ctx.fillRect(-27, -hh + 6, 54, 5);
    ctx.fillRect(-27, hh - 11, 54, 5);

    // Inner active threads (waving)
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.0;
    for (var k = 0; k < 6; k++) {
      var tx = -17 + k * 7.2;
      var wave = Math.sin(t * 3.8 + k * 1.1 + l.y * 0.02) * 2.8;
      ctx.beginPath();
      ctx.moveTo(tx + wave, -hh + 14);
      ctx.lineTo(tx - wave * 0.6, hh - 14);
      ctx.stroke();
    }

    // Small geometric marker
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-4, -4, 8, 8);

    ctx.restore();
  }

  function drawGate(gt) {
    var barH = 17;
    ctx.fillStyle = COLORS.black;

    // Left clamp arm
    ctx.fillRect(38, gt.y - barH * 0.5, gt.gapLeft - 38, barH);
    // Right clamp arm
    var rightStart = gt.gapLeft + gt.gapW;
    ctx.fillRect(rightStart, gt.y - barH * 0.5, W - 38 - rightStart, barH);

    // Clamp detail teeth (Bauhaus graphic)
    ctx.fillStyle = '#111';
    ctx.fillRect(gt.gapLeft - 9, gt.y - 6, 6, 12);
    ctx.fillRect(rightStart + 3, gt.y - 6, 6, 12);

    // Gap highlight (readable opening)
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(gt.gapLeft + 1, gt.y - 7, gt.gapW - 2, 14);
  }

  function drawSpool(sp, t) {
    ctx.save();
    ctx.translate(sp.x, sp.y);

    // Bright thread spool body
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(-3.5, -11, 7, 22);

    // Thread rings
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -4, 9, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 5, 9, 3.5, 0, 0, Math.PI * 2); ctx.stroke();

    // Wobble bob (pre-input motion visible)
    var bob = Math.sin(sp.phase + t * 2.2) * 1.5;
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-1, -1 + bob, 2, 2);

    ctx.restore();
  }

  function drawShuttle(x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    var tilt = firstInputDone ? Math.sin(t * 2.4) * 0.06 : Math.sin(t * 1.1) * 0.04;
    ctx.rotate(tilt);

    // Large embodied shuttle body (horizontal skater)
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(-62, -13, 124, 26);

    // Pointed nose and tail (shuttle geometry)
    ctx.beginPath();
    ctx.moveTo(-62, -13);
    ctx.lineTo(-78, 0);
    ctx.lineTo(-62, 13);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(62, -13);
    ctx.lineTo(78, 0);
    ctx.lineTo(62, 13);
    ctx.closePath();
    ctx.fill();

    // Black Bauhaus block stripes
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-28, -9, 10, 18);
    ctx.fillRect(18, -9, 10, 18);

    // Central thread eye (red accent)
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(-2, -2, 4, 4);

    // Skate rail / weft guide
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-52, 15);
    ctx.lineTo(52, 15);
    ctx.stroke();

    // Embodied "presence" — small shoulder detail
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(-18, -16, 36, 4);

    ctx.restore();
  }

  function drawWeaveTrail(x, y, t) {
    // Active thread trail behind the shuttle (shows motion and weaving)
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x - 40, y + 9);
    for (var i = 0; i < 5; i++) {
      var tx = x - 40 - i * 18;
      var ty = y + 9 + Math.sin(t * 3.1 + i) * (2.5 + i * 0.4);
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 11);
    for (var j = 0; j < 3; j++) {
      ctx.lineTo(x + 10 - j * 22, y + 11 + Math.cos(t * 2.8 + j) * 3.5);
    }
    ctx.stroke();
  }

  function drawFlash(tLeft) {
    // Large high-contrast ring / foreground action (visible >=0.8s)
    var cx = player.x;
    var cy = player.y;
    var expand = (0.85 - tLeft) * 210 + 18;
    ctx.save();
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 5;
    ctx.globalAlpha = Math.max(0.25, tLeft / 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, expand, 0, Math.PI * 2);
    ctx.stroke();

    // Inner high contrast ring
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, expand * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // Bright thread cross through center (loom shed flash)
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - expand * 0.9, cy);
    ctx.lineTo(cx + expand * 0.9, cy);
    ctx.stroke();
    ctx.restore();
  }

  function drawEffect(ef, t) {
    if (ef.type === 'weaveRing') {
      var r = 22 + (0.82 - ef.life) * 160;
      ctx.save();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 4;
      ctx.globalAlpha = Math.max(0.2, ef.life / 0.82);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COLORS.yellow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (ef.type === 'thread') {
      ctx.save();
      ctx.globalAlpha = ef.life / 0.7;
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ef.x, ef.y);
      ctx.lineTo(ef.x - ef.vx * 0.012, ef.y - ef.vy * 0.012);
      ctx.stroke();
      ctx.restore();
    } else if (ef.type === 'spark') {
      ctx.save();
      ctx.globalAlpha = ef.life / 0.45;
      ctx.fillStyle = ef.color || COLORS.yellow;
      ctx.fillRect(ef.x - 1.5, ef.y - 1.5, 3, 3);
      ctx.restore();
    } else if (ef.type === 'hit') {
      ctx.save();
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 2;
      ctx.globalAlpha = ef.life / 0.35;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 22 + (0.35 - ef.life) * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawProgressTextile() {
    // Non-HUD textile progress: left side thread stack / woven bar
    var pct = Math.min(1, progress / 1100);
    var barH = 260;
    var bx = 22;
    var by = 160;

    ctx.fillStyle = COLORS.black;
    ctx.fillRect(bx, by, 7, barH);

    // Woven segments (primary colors)
    var segs = Math.floor(pct * 11);
    for (var i = 0; i < segs; i++) {
      var cols = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.teal];
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(bx - 1, by + barH - (i + 1) * 23, 9, 18);
    }

    // Current shuttle marker on the "warp"
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(bx - 3, by + barH - pct * barH - 3, 13, 6);
  }

  function drawScoreSpools() {
    // Embodied score: small spools drawn near top-right, not a number dashboard
    var sx = W - 52;
    var sy = 46;
    for (var i = 0; i < Math.min(score, 9); i++) {
      ctx.save();
      ctx.translate(sx - (i % 3) * 17, sy + Math.floor(i / 3) * 18);
      ctx.fillStyle = (i < score) ? COLORS.red : COLORS.warp;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(-1.5, -3.5, 3, 7);
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

    // Minimal tension threads on right (health)
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 2;
    for (var h = 0; h < 4; h++) {
      var hy = 520 + h * 14;
      ctx.globalAlpha = (h < health) ? 1 : 0.15;
      ctx.beginPath();
      ctx.moveTo(W - 46, hy);
      ctx.lineTo(W - 28, hy + 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Debrief overlay (outcome labels match actual result)
    if (gameState !== 'play') {
      drawDebrief();
    }

    // Tiny footer motion indicator (no label-heavy console)
    ctx.fillStyle = COLORS.black;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, H - 3, W * (0.2 + Math.sin(t * 2) * 0.03), 3);
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
