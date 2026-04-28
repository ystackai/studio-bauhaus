"use strict";

/* ── constants ─────────────────────────────────────────────── */
var BG = "#f5f5f0";
var GRID = "#1a1a1a";
var CIRCLE = "#FFD700";
var TRIANGLE = "#00CED1";
var LINEN_RGB = "rgba(180,175,165,";
var LINEN_DENSITY = 0.12;

var GRID_SPACING = 40;
var SPINE_THICKNESS = 1;
var LINEN_LINE_GAP = 2;

var METRONOME_BASE = 2.4;
var METRONOME_EXHALE = 0.3;
var SYNC_THRESHOLD = 0.05;

/* ── state ─────────────────────────────────────────────────── */
var canvas, ctx;
var W = 0, H = 0, dpr = 1;

var node = { x: 0, y: 0, dragging: false, radius: 8 };
var metronome = { phase: 0, lastTick: 0, beatCount: 0, exhale: false };
var primitives = [];
var hoverNodes = [];
var scatterEvents = [];

var audioCtx = null;
var audioInitialized = false;
var masterGain = null;
var droneOsc = null;
var droneGain = null;
var reverbGain = null;
var dryGain = null;
var convolver = null;
var reverbBuffer = null;
var droneFilter = null;
var panL = null;
var panR = null;
var lSplit = null;
var rSplit = null;

var linenPatternCanvas = null;
var linenPatternCtx = null;
var linenPattern = null;

/* ── init ──────────────────────────────────────────────────── */
function init() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  resize();
  window.addEventListener("resize", resize);

  node.x = W / 2;
  node.y = H / 2;

  initPrimitives();
  initLinenPattern();

  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

var lastFrame = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rebuildLinenPattern();
}

/* ── audio graph (lazy init on first gesture) ───────────── */
function createReverbBuffer() {
  var duration = 2;
  var rate = audioCtx.sampleRate;
  var length = rate * duration;
  var buffer = audioCtx.createBuffer(2, length, rate);
  for (var ch = 0; ch < 2; ch++) {
    var data = buffer.getChannelData(ch);
    for (var i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
    }
  }
  return buffer;
}

function ensureAudio() {
  if (audioInitialized) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Build reverb
    reverbBuffer = createReverbBuffer();
    convolver = audioCtx.createConvolver();
    convolver.buffer = reverbBuffer;
    reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0;

    // Dry/wet mix
    dryGain = audioCtx.createGain();
    dryGain.gain.value = 0.4;

    // Master output
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6;

    // Stereo split for spatial panning
    lSplit = audioCtx.createGain();
    rSplit = audioCtx.createGain();
    panL = audioCtx.createGain();
    panR = audioCtx.createGain();

    // Wiring: masterGain -> left/right split -> destination
    // Convolver -> reverbGain -> masterGain
    convolver.connect(reverbGain);
    reverbGain.connect(masterGain);

    lSplit.connect(panL);
    rSplit.connect(panR);
    panL.connect(masterGain);
    panR.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Sub-bass drone with low-pass filter
    droneOsc = audioCtx.createOscillator();
    droneFilter = audioCtx.createBiquadFilter();
    droneGain = audioCtx.createGain();
    droneOsc.type = "sine";
    droneOsc.frequency.value = 55;
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 200;
    droneFilter.Q.value = 1;
    droneGain.gain.value = 0.06;
    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(dryGain);
    droneOsc.start();

    audioInitialized = true;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (e) {
    // silent fail
  }
}

/* ── update spatial pan (called each frame if needed) ────── */
function updateSpatialPan(panX) {
  if (!lSplit) return;
  // panX: -1 (left) to +1 (right)
  var left = Math.max(0, 1 - panX);
  var right = Math.max(0, 1 + panX);
  lSplit.gain.value = left;
  rSplit.gain.value = right;
}

/* ── update reverb tail based on grid density ────────────── */
function updateReverbTail() {
  if (!reverbGain) return;
  var density = primitives.length / 50;
  reverbGain.gain.value = Math.min(0.35, density * 0.4);
}

/* ── tick: pocket-watch tick, low-pass filtered, pitch drift */
function playTick() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;

  // Primary tick
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  var lp = audioCtx.createBiquadFilter();
  osc.type = "triangle";
  // Base 850Hz with ±40Hz pitch drift simulating a decaying watch
  osc.frequency.value = 850 + (Math.random() - 0.5) * 80;
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(3200, now);
  lp.frequency.exponentialRampToValueAtTime(600, now + 0.2);
  lp.Q.value = 2;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(lp);
  lp.connect(gain);
  gain.connect(dryGain);
  osc.start(now);
  osc.stop(now + 0.21);

  // Secondary metallic tick layer
  var osc2 = audioCtx.createOscillator();
  var gain2 = audioCtx.createGain();
  var hp2 = audioCtx.createBiquadFilter();
  osc2.type = "sine";
  osc2.frequency.value = 2800 + Math.random() * 200;
  hp2.type = "highpass";
  hp2.frequency.value = 1200;
  gain2.gain.setValueAtTime(0.08, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc2.connect(hp2);
  hp2.connect(gain2);
  gain2.connect(dryGain);
  osc2.start(now);
  osc2.stop(now + 0.07);

  // Reverb tail on tick
  gain.connect(convolver);
}

/* ── chord: yellow major triad with proper harmonics ─────── */
function playChord() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;

  // C major triad: C4, E4, G4 + harmonics
  var fundamentals = [261.63, 329.63, 392.00];
  var harmonicsMap = [1, 2, 3]; // octave multiples

  // Fundamental tones
  fundamentals.forEach(function (f, idx) {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var lp = audioCtx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.value = f;
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(dryGain);
    gain.connect(convolver);
    osc.start(now);
    osc.stop(now + 2.25);
  });

  // 2nd harmonic (octave up) - adds brightness
  fundamentals.forEach(function (f) {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = f * 2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    osc.connect(gain);
    gain.connect(dryGain);
    osc.start(now + 0.05);
    osc.stop(now + 1.65);
  });

  // 3rd harmonic subtle overtone
  fundamentals.forEach(function (f) {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var hp = audioCtx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.value = f * 3;
    hp.type = "highpass";
    hp.frequency.value = 800;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.02, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(hp);
    hp.connect(gain);
    gain.connect(dryGain);
    osc.start(now + 0.1);
    osc.stop(now + 1.25);
  });

  // Swell drone during exhale
  if (droneGain && droneFilter) {
    droneGain.gain.setTargetAtTime(0.18, now, 0.06);
    droneFilter.frequency.setTargetAtTime(350, now, 0.15);
    setTimeout(function () {
      if (droneGain) droneGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 0.2);
      if (droneFilter) droneFilter.frequency.setTargetAtTime(200, audioCtx.currentTime, 0.2);
    }, 1000);
  }
}

/* ── scatter: dissonant click, rapid decay, dry only ────── */
function playScatter() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;

  // Dissonant sawtooth
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 180 + Math.random() * 250;
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain);
  gain.connect(dryGain);
  osc.start(now);
  osc.stop(now + 0.07);

  // Second dissonant voice slightly detuned
  var osc2 = audioCtx.createOscillator();
  var gain2 = audioCtx.createGain();
  osc2.type = "square";
  osc2.frequency.value = osc.frequency.value * 1.015;
  gain2.gain.setValueAtTime(0.06, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc2.connect(gain2);
  gain2.connect(dryGain);
  osc2.start(now);
  osc2.stop(now + 0.06);
}

/* ── drag noise: low-frequency brush, velocity-scaled ───── */
function playDragNoise(velocity) {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var vel = Math.min(1, (velocity || 1) / 40);
  var bufSize = audioCtx.sampleRate * 0.05;
  var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.15;
  }
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400 + vel * 400; // 400-800Hz based on velocity
  lp.Q.value = 1;
  var g = audioCtx.createGain();
  g.gain.value = 0.03 + vel * 0.08;
  src.connect(lp);
  lp.connect(g);
  g.connect(dryGain);
  src.start(now);
}

/* ── exhale bloom: soft pad swell, stereo widening ──────── */
function playExhaleBloom() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;

  // Pad chord: warm major 7th
  var freqs = [196.0, 246.94, 293.66, 349.23];
  freqs.forEach(function (f) {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var hp = audioCtx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.value = f;
    hp.type = "highpass";
    hp.frequency.value = 80;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(hp);
    hp.connect(gain);
    gain.connect(dryGain);
    gain.connect(convolver);
    osc.start(now);
    osc.stop(now + 1.55);
  });

  // Sub bass swell
  var subOsc = audioCtx.createOscillator();
  var subGain = audioCtx.createGain();
  var subLP = audioCtx.createBiquadFilter();
  subOsc.type = "sine";
  subOsc.frequency.value = 55;
  subLP.type = "lowpass";
  subLP.frequency.value = 120;
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.1, now + 0.3);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  subOsc.connect(subLP);
  subLP.connect(subGain);
  subGain.connect(dryGain);
  subGain.connect(convolver);
  subOsc.start(now);
  subOsc.stop(now + 1.85);
}

/* ── lock click: sharp dampened tick, 200ms decay, hp 1.2kHz */
function playLockClick() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;

  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  var hp = audioCtx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.value = 1800 + Math.random() * 200;
  hp.type = "highpass";
  hp.frequency.value = 1200;
  hp.Q.value = 0.5;
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(hp);
  hp.connect(gain);
  gain.connect(dryGain);
  gain.connect(convolver);
  osc.start(now);
  osc.stop(now + 0.21);
}

/* ── hover drift: air whoosh, bandpass 2kHz ─────────────── */
function playHoverDrift() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var bufSize = audioCtx.sampleRate * 0.25;
  var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < bufSize; i++) {
    var t = i / bufSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.08;
  }
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2000;
  bp.Q.value = 3;
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(0.1, now);
  g.gain.linearRampToValueAtTime(0, now + 0.25);
  src.connect(bp);
  bp.connect(g);
  g.connect(dryGain);
  src.start(now);
}

/* ── snap back drift (hover release fade) ────────────────── */
function playHoverRelease() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  var bp = audioCtx.createBiquadFilter();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.linearRampToValueAtTime(900, now + 0.15);
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 4;
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(bp);
  bp.connect(gain);
  gain.connect(dryGain);
  osc.start(now);
  osc.stop(now + 0.16);
}

/* ── primitives (circle & triangle placed on spine) ─────────── */
function initPrimitives() {
  primitives.length = 0;
  var cols = Math.ceil(W / GRID_SPACING);
  var rows = Math.ceil(H / GRID_SPACING);
  for (var r = 2; r < rows - 2; r++) {
    for (var c = 2; c < cols - 2; c++) {
      if ((c + r) % 7 !== 0) continue;
      primitives.push({
        cx: c * GRID_SPACING,
        cy: r * GRID_SPACING,
        type: primitives.length % 2 === 0 ? "circle" : "triangle",
        phase: Math.random() * Math.PI * 2,
        scale: 1,
        glow: 0,
        drift: { x: 0, y: 0 },
      });
    }
  }
}

/* ── linen procedural pattern ──────────────────────────────── */
function initLinenPattern() {
  linenPatternCanvas = document.createElement("canvas");
  rebuildLinenPattern();
}

function rebuildLinenPattern() {
  var pw = 120,
    ph = 120;
  linenPatternCanvas.width = pw;
  linenPatternCanvas.height = ph;
  linenPatternCtx = linenPatternCanvas.getContext("2d");
  linenPatternCtx.fillStyle = BG;
  linenPatternCtx.fillRect(0, 0, pw, ph);

  // warp threads (horizontal)
  for (var y = 0; y < ph; y += LINEN_LINE_GAP) {
    linenPatternCtx.strokeStyle = LINEN_RGB +
      (0.03 + Math.random() * 0.06) + ")";
    linenPatternCtx.lineWidth = 0.5;
    linenPatternCtx.beginPath();
    linenPatternCtx.moveTo(0, y + Math.random() * 0.8);
    for (var x = 0; x < pw; x += 4) {
      linenPatternCtx.lineTo(x, y + Math.random() * 0.8);
    }
    linenPatternCtx.stroke();
  }

  // weft threads (vertical)
  for (var x = 0; x < pw; x += LINEN_LINE_GAP) {
    linenPatternCtx.strokeStyle = LINEN_RGB +
      (0.025 + Math.random() * 0.05) + ")";
    linenPatternCtx.lineWidth = 0.5;
    linenPatternCtx.beginPath();
    linenPatternCtx.moveTo(x + Math.random() * 0.8, 0);
    for (var y = 0; y < ph; y += 4) {
      linenPatternCtx.lineTo(x + Math.random() * 0.8, y);
    }
    linenPatternCtx.stroke();
  }

  // grain dots
  for (var i = 0; i < 200; i++) {
    linenPatternCtx.fillStyle = LINEN_RGB +
      (0.04 + Math.random() * 0.08) + ")";
    linenPatternCtx.beginPath();
    linenPatternCtx.arc(
      Math.random() * pw,
      Math.random() * ph,
      0.3 + Math.random() * 0.5,
      0,
      Math.PI * 2
    );
    linenPatternCtx.fill();
  }

  linenPattern = ctx.createPattern(linenPatternCanvas, "repeat");
}

/* ── drawing ───────────────────────────────────────────────── */

function drawBackground() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
}

function drawGrid() {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = SPINE_THICKNESS;

  var cols = Math.ceil(W / GRID_SPACING);
  var rows = Math.ceil(H / GRID_SPACING);

  // load-bearing spine lines (every 5th line drawn slightly thicker)
  for (var c = 0; c <= cols; c++) {
    var x = c * GRID_SPACING;
    var major = c % 5 === 0;
    ctx.globalAlpha = major ? 0.6 : 0.15;
    ctx.lineWidth = major ? 1.2 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (var r = 0; r <= rows; r++) {
    var y = r * GRID_SPACING;
    var major = r % 5 === 0;
    ctx.globalAlpha = major ? 0.6 : 0.15;
    ctx.lineWidth = major ? 1.2 : 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.lineWidth = SPINE_THICKNESS;
}

function drawLinenOverlay() {
  if (linenPattern) {
    ctx.globalAlpha = LINEN_DENSITY;
    ctx.fillStyle = linenPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function drawPrimitives(t) {
  primitives.forEach(function (p) {
    var driftX = p.drift.x;
    var driftY = p.drift.y;
    var px = p.cx + driftX;
    var py = p.cy + driftY;

    var pulse = Math.sin(t * 0.002 + p.phase) * 0.15;
    var effectiveScale = p.scale * (1 + pulse);

    var color = p.type === "circle" ? CIRCLE : TRIANGLE;

    // glow
    if (p.glow > 0.01) {
      ctx.save();
      ctx.globalAlpha = p.glow * 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      drawShape(ctx, p.type, px, py, 10 * effectiveScale);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "transparent";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    drawShape(ctx, p.type, px, py, 10 * effectiveScale);
    ctx.restore();

    // decay glow
    p.glow *= 0.96;
  });
}

function drawShape(c, type, cx, cy, r) {
  if (type === "circle") {
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();
  } else {
    var h = r * Math.sqrt(3);
    c.beginPath();
    c.moveTo(cx, cy - h * 0.5);
    c.lineTo(cx - r, cy + h * 0.25);
    c.lineTo(cx + r, cy + h * 0.25);
    c.closePath();
    c.stroke();
  }
}

function drawNode() {
  ctx.save();

  // tension ring
  var ringRadius = node.radius + 6 + metronome.phase * 10;
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // core dot
  ctx.globalAlpha = 1;
  ctx.fillStyle = GRID;
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
  ctx.fill();

  // inner highlight
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMetronomeIndicator() {
  var barX = 20;
  var barY = H - 50;
  var barW = 4;
  var barH = 30;

  var progress = metronome.phase;
  var fillH = progress * barH;

  ctx.fillStyle = "rgba(26,26,26,0.08)";
  ctx.fillRect(barX, barY, barW, barH);

  var color = metronome.exhale ? TRIANGLE : GRID;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(barX, barY + barH - fillH, barW, fillH);
  ctx.globalAlpha = 1;
}

function drawScatterEffects() {
  scatterEvents.forEach(function (s) {
    ctx.globalAlpha = s.life;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(s.x - s.vx * s.life * 30, s.y - s.vy * s.life * 30);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/* ── interaction ───────────────────────────────────────────── */

function getPointerPos(e) {
  if (e.touches && e.touches.length) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function onPointerDown(e) {
  e.preventDefault();
  ensureAudio();
  var pos = getPointerPos(e);
  var dx = pos.x - node.x;
  var dy = pos.y - node.y;
  if (Math.sqrt(dx * dx + dy * dy) < 30) {
    node.dragging = true;
  }
}

var prevPointerPos = { x: 0, y: 0 };
var dragVelocity = 0;

var lastHoverCount = 0;

function onPointerMove(e) {
  e.preventDefault();
  var pos = getPointerPos(e);

   // spatial pan: update based on cursor X position
  var panVal = (pos.x / W) * 2 - 1;
  updateSpatialPan(panVal);

  if (node.dragging) {
     // snap to nearest grid intersection for staccato feel
    var rawX = pos.x;
    var rawY = pos.y;

     // linen friction: staccato - add half-pixel jitter
    var jitter = (Math.random() - 0.5) * 1.5;
    node.x = Math.round(rawX / GRID_SPACING) * GRID_SPACING + jitter;
    node.y = Math.round(rawY / GRID_SPACING) * GRID_SPACING + jitter;

     // velocity-scaled drag noise
    var dist = Math.abs(rawX - prevPointerPos.x) + Math.abs(rawY - prevPointerPos.y);
    dragVelocity = dist;
    if (dist > 5 && Math.random() < 0.15) {
      playDragNoise(dist);
     }

    checkPrimitiveResonance();
   } else {
     // hover drift on nearby primitives
    var prevCount = hoverNodes.length;
    hoverNodes.length = 0;
    primitives.forEach(function (p) {
      var ddx = pos.x - p.cx;
      var ddy = pos.y - p.cy;
      var d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < 60) {
        var strength = 1 - d / 60;
        p.drift.x = (Math.random() - 0.5) * strength * 3;
        p.drift.y = (Math.random() - 0.5) * strength * 3;
        hoverNodes.push(p);
       }
     });
     // Hover drift audio: trigger whoosh on first hover entry
    if (prevCount === 0 && hoverNodes.length > 0) {
      playHoverDrift();
     } else if (prevCount > 0 && hoverNodes.length === 0) {
      playHoverRelease();
     }
   }

  prevPointerPos = pos;
  dragVelocity *= 0.9;
}

function onPointerUp(e) {
  if (node.dragging) {
    node.dragging = false;
    trySnapToLock();
  }
}

function checkPrimitiveResonance() {
  primitives.forEach(function (p) {
    var dx = node.x - p.cx;
    var dy = node.y - p.cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 25) {
      p.glow = 0.8;
      p.scale = 1.3;
      setTimeout(function () {
        p.scale = 1;
      }, 400);
    }
  });
}

function trySnapToLock() {
  // check if node is close to any primitive at metronome lock time
  var phaseFrac = metronome.phase % 1;
  var atLock = phaseFrac < SYNC_THRESHOLD || phaseFrac > (1 - SYNC_THRESHOLD);

  var nearest = null;
  var nearDist = Infinity;
  primitives.forEach(function (p) {
    var dx = node.x - p.cx;
    var dy = node.y - p.cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearDist) {
      nearDist = d;
      nearest = p;
    }
  });

  if (atLock && nearest && nearDist < 40) {
     // SYNC - trigger yellow chord + lock click + exhale bloom
    nearest.glow = 1;
    nearest.scale = 1.5;
    playLockClick();
    playChord();
    playExhaleBloom();
    setTimeout(function () {
      nearest.scale = 1;
      }, 1000);
    } else {
      // misalignment - scatter
    playScatter();
    if (nearest) {
      for (var i = 0; i < 5; i++) {
        scatterEvents.push({
          x: nearest.cx,
          y: nearest.cy,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          });
        }
      }
    }
}

/* ── main loop ─────────────────────────────────────────────── */

function loop(now) {
  var dt = (now - lastFrame) / 1000;
  lastFrame = now;
  dt = Math.min(dt, 0.05);

  updateMetronome(now, dt);
  updateScatterEvents(dt);

  drawBackground();
  drawGrid();
  drawLinenOverlay();
  drawMetronomeIndicator();
  drawScatterEffects();
  drawPrimitives(now);
  drawNode();

  requestAnimationFrame(loop);
}

function updateMetronome(now, dt) {
  var cycleDuration = METRONOME_BASE + (metronome.exhale ? METRONOME_EXHALE : 0);
  var prevPhase = metronome.phase;
  metronome.phase += dt / cycleDuration;

  if (metronome.phase >= 1) {
    metronome.phase -= 1;
    metronome.beatCount++;
    metronome.exhale = !metronome.exhale;
    playTick();
    updateReverbTail();
   }

   // Trigger drone swell during exhale phase transition
  if (metronome.exhale && prevPhase > 0.9 && metronome.phase < 0.1) {
    if (droneGain && droneFilter) {
      var t = audioCtx ? audioCtx.currentTime : 0;
      droneGain.gain.setTargetAtTime(0.12, t, 0.15);
      droneFilter.frequency.setTargetAtTime(300, t, 0.2);
     }
   } else if (!metronome.exhale && prevPhase > 0.9 && metronome.phase < 0.1) {
    if (droneGain && droneFilter) {
      var t = audioCtx ? audioCtx.currentTime : 0;
      droneGain.gain.setTargetAtTime(0.06, t, 0.2);
      droneFilter.frequency.setTargetAtTime(200, t, 0.2);
     }
   }
}

function updateScatterEvents(dt) {
  for (var i = scatterEvents.length - 1; i >= 0; i--) {
    scatterEvents[i].life -= dt * 3;
    if (scatterEvents[i].life <= 0) {
      scatterEvents.splice(i, 1);
    }
  }
}

/* ── bootstrap ─────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", init);
