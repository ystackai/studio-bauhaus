/* ============================================================
   Grid-Kinetic Canvas + Web Audio Metronome Engine
   ============================================================ */

// ── Noise (fast value noise, not simplex — threshold 0.65) ──
function createNoise2D(seed) {
  var p = new Uint8Array(512);
  for (var i = 0; i < 256; i++) p[i] = i;
  var s = seed || 1;
  for (var i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    var j = s % (i + 1);
    var t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (var i = 0; i < 256; i++) p[i + 256] = p[i];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y) {
    var u = (h & 1) === 0 ? x : y;
    var v = (h & 1) === 0 ? y : x;
    return ((h & 2) ? -u : u) + ((h & 4) ? -v : v);
  }

  return function (x, y) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    var u = fade(x), v = fade(y);
    var aa = p[p[X] + Y], ab = p[p[X] + Y + 1];
    var ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
      lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u),
      v
    );
  };
}

// ── Globals ──
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var statusEl = document.getElementById('status');

var W, H;
var GRID = 16;
var NOISE_SCALE = 0.04;
var NOISE_THRESHOLD = 0.65;
var LINEN_OPACITY = 0.45;

// ── State ──
var dragging = false;
var mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0;
var velocity = 0, velocityHistory = [];
var friction = 0;
var linenOffsetX = 0, linenOffsetY = 0;
var motifOpacity = 0.2;
var motifScale = 1;
var motifPulse = 0;
var metronomePhase = 0;
var exhaleStart = 0;
var chordPlaying = false;
var chordOscillators = [];

// ── Audio ──
var audioCtx = null;
var compressorNode = null;
var reverbNode = null;
var reverbSendGain = null;
var masterGain = null;
var bpm = 110;
var beatInterval = 60 / bpm;
var nextBeatTime = 0;
var currentBeatCount = 0;
var metronomeRunning = false;
var scheduleTimer = null;

// ── Pre-allocate linen offscreen canvas (1/4 resolution for perf) ──
var linenCanvas, linenCtx, linenW, linenH;
var noise = createNoise2D(47);
var linenDirty = true;

function initLinen() {
  linenW = Math.ceil(W / 4);
  linenH = Math.ceil(H / 4);
  linenCanvas = document.createElement('canvas');
  linenCanvas.width = linenW;
  linenCanvas.height = linenH;
  linenCtx = linenCanvas.getContext('2d');
  bakeLinen();
}

function bakeLinen() {
  if (!linenCtx) { linenCanvas = document.createElement('canvas'); linenCanvas.width = linenW; linenCanvas.height = linenH; linenCtx = linenCanvas.getContext('2d'); }
  var img = linenCtx.createImageData(linenW, linenH);
  var d = img.data;
  for (var y = 0; y < linenH; y++) {
    for (var x = 0; x < linenW; x++) {
      var v = noise((x + linenOffsetX * 4) * NOISE_SCALE, (y + linenOffsetY * 4) * NOISE_SCALE);
      var idx = (y * linenW + x) * 4;
      if (v > NOISE_THRESHOLD) {
        d[idx] = 30; d[idx + 1] = 30; d[idx + 2] = 30; d[idx + 3] = 190;
      } else {
        d[idx + 3] = 0;
      }
    }
  }
  linenCtx.putImageData(img, 0, 0);
}

// ── Resize ──
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  linenW = Math.ceil(W / 4);
  linenH = Math.ceil(H / 4);
  linenDirty = true;
}
window.addEventListener('resize', resize);
resize();

// ── Audio Init (on first gesture) ──
function initAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.8;

  compressorNode = audioCtx.createDynamicsCompressor();
  compressorNode.threshold.value = -6;
  compressorNode.knee.value = 10;
  compressorNode.ratio.value = 12;
  compressorNode.attack.value = 0.003;
  compressorNode.release.value = 0.1;

  reverbNode = audioCtx.createConvolver();
  reverbSendGain = audioCtx.createGain();
  reverbSendGain.gain.value = 1.0;

  masterGain.connect(compressorNode);
  compressorNode.connect(audioCtx.destination);
  reverbNode.connect(reverbSendGain);
  reverbSendGain.connect(compressorNode);

  buildReverbImpulse();
}

function buildReverbImpulse() {
  var sr = audioCtx.sampleRate;
  var len = sr * 2.4;
  var buf = audioCtx.createBuffer(2, len, sr);
  for (var ch = 0; ch < 2; ch++) {
    var d = buf.getChannelData(ch);
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var decay = Math.exp(-t * (Math.log(0.001) / 1.8));
      var damp = 0.7;
      d[i] = (Math.random() * 2 - 1) * decay * (1 - damp * (1 - Math.exp(-t * 4)));
    }
  }
  reverbNode.buffer = buf;
}

// ── Metronome Scheduling ──
function startMetronome() {
  if (metronomeRunning) return;
  metronomeRunning = true;
  nextBeatTime = audioCtx.currentTime + 0.02;
  currentBeatCount = 0;
  scheduleTimer = setInterval(tickScheduler, 25);
}

function stopMetronome() {
  metronomeRunning = false;
  if (scheduleTimer) { clearInterval(scheduleTimer); scheduleTimer = null; }
}

function tickScheduler() {
  if (!metronomeRunning || !audioCtx) return;
  while (nextBeatTime < audioCtx.currentTime + 0.15) {
    scheduleBeat(nextBeatTime, currentBeatCount);
    nextBeatTime += beatInterval;
    currentBeatCount++;
  }
}

function scheduleBeat(time, count) {
  var downbeat = (count % 2 === 0);
  var offbeat = !downbeat;

  // Loose spring wobble: ±40ms jitter on downbeat
  var jitter = downbeat ? (Math.random() - 0.5) * 0.080 : (Math.random() - 0.5) * 0.015;
  var t = time + jitter;

  // Downbeat: pitch-bent sine (drop 3 semitones, recover 150ms)
  if (downbeat) {
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = 'sine';
    var f0 = 900;
    var f1 = f0 / Math.pow(2, 3 / 12);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.98, t + 0.15);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.20);
  }

  // Off-beat: muted hi-hat
  if (offbeat) {
    playHiHat(t);
  }

  // Visual pulse trigger
  metronomePhase = downbeat ? 1 : 0.5;
}

function playHiHat(time) {
  var sr = audioCtx.sampleRate;
  var dur = 0.05;
  var len = Math.floor(sr * dur);
  var buf = audioCtx.createBuffer(1, len, sr);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / len * 12);
  }
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  var g = audioCtx.createGain();
  g.gain.value = 0.06;
  src.connect(hp);
  hp.connect(g);
  g.connect(masterGain);
  src.start(time);
}

// ── Granular Scrape (drag sound) ──
function playScrape(time, vel) {
  var sr = audioCtx.sampleRate;
  var dur = 0.04 + vel * 0.06;
  var len = Math.floor(sr * dur);
  var buf = audioCtx.createBuffer(1, len, sr);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 800 + vel * 1600;
  bp.Q.value = 3 + vel * 4;
  var lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  var g = audioCtx.createGain();
  g.gain.value = Math.min(vel * 0.15, 0.12);
  src.connect(bp);
  bp.connect(lp);
  lp.connect(g);
  g.connect(masterGain);
  src.start(time);
}

// ── Exhale breath ──
function playExhale(time) {
  var sr = audioCtx.sampleRate;
  var dur = 0.4;
  var len = Math.floor(sr * dur);
  var buf = audioCtx.createBuffer(1, len, sr);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) {
    var env = Math.sin(Math.PI * i / len);
    d[i] = (Math.random() * 2 - 1) * env * 0.25;
  }
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(0.2, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  src.connect(lp);
  lp.connect(g);
  g.connect(masterGain);
  src.start(time);
}

// ── Yellow Chord (C4/E4/G4) ──
function playChord() {
  if (chordPlaying) return;
  chordPlaying = true;
  var t = audioCtx.currentTime;
  var freqs = [261.63, 329.63, 392.00];
  chordOscillators = [];

  freqs.forEach(function (f) {
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.3);
    g.gain.setValueAtTime(0.18, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 3.2);

    osc.connect(g);
    g.connect(masterGain);
    g.connect(reverbNode);

    osc.start(t);
    osc.stop(t + 3.5);
    chordOscillators.push(osc);
  });

  motifOpacity = 1;
  motifScale = 1.35;
  statusEl.textContent = 'resolved';
  statusEl.className = 'resolved';
  // Fade back after chord
  setTimeout(function () {
    chordPlaying = false;
    statusEl.textContent = 'drag to begin';
    statusEl.className = '';
    motifOpacity = 0.2;
    motifScale = 1;
  }, 3800);
}

function stopChord() {
  chordOscillators.forEach(function (o) { try { o.stop(); } catch (e) { /* ignore */ } });
  chordOscillators = [];
  chordPlaying = false;
}

// ── Input ──
var scrapeAccumulator = 0;
var dragFrames = 0;
var isDragging = false;

canvas.addEventListener('mousedown', function (e) {
  initAudio();
  isDragging = true;
  prevMouseX = mouseX = e.clientX;
  prevMouseY = mouseY = e.clientY;
  velocity = 0;
  friction = 0;
  dragFrames = 0;
  stopChord();
  startMetronome();
  statusEl.textContent = 'building friction';
  statusEl.className = 'active';
});

canvas.addEventListener('mousemove', function (e) {
  if (!isDragging) return;
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseX = e.clientX;
  mouseY = e.clientY;

  var dx = mouseX - prevMouseX;
  var dy = mouseY - prevMouseY;
  var d = Math.sqrt(dx * dx + dy * dy);

  // Smoothed velocity
  velocity = velocity * 0.7 + Math.min(d / 30, 1) * 0.3;
  friction = velocity * 0.6 + friction * 0.4;

  // Half-pixel drift on drag
  linenOffsetX += dx * 0.02;
  linenOffsetY += dy * 0.02;

  // Trigger scrape sounds
  scrapeAccumulator += d;
  if (scrapeAccumulator > 15 && velocity > 0.08) {
    playScrape(audioCtx.currentTime, velocity);
    scrapeAccumulator = 0;
  }

  dragFrames++;
  if (dragFrames % 6 === 0) linenDirty = true;

  // Status updates
  if (velocity > 0.5) statusEl.textContent = 'friction anchored — release to exhale';
  else if (velocity > 0.2) statusEl.textContent = 'building...';
});

canvas.addEventListener('mouseup', function () {
  if (!isDragging) return;
  isDragging = false;
  stopMetronome();

  // 0.3s exhale window
  playExhale(audioCtx.currentTime);
  statusEl.textContent = 'exhaling...';
  statusEl.className = 'exhale';

  setTimeout(function () {
    // Validate: friction still anchored above threshold
    if (friction > 0.12 && velocity > 0.05) {
      playChord();
    } else {
      statusEl.textContent = 'drifted — re-engage';
      statusEl.className = '';
      motifOpacity = 0.2;
      motifScale = 1;
    }
  }, 300);
});

// ── Rendering ──
var lastTime = performance.now();

function drawGrid() {
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var x = 0; x <= W; x += GRID) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (var y = 0; y <= H; y += GRID) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
}

function drawMotif(t) {
  var cx = W / 2, cy = H / 2;
  var pulse = Math.sin(t * 4) * 0.03 * metronomePhase;
  var scale = motifScale + pulse;

  // Circle #f0c040
  ctx.beginPath();
  ctx.arc(cx, cy, 65 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c040';
  ctx.globalAlpha = motifOpacity;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Triangle #e0a020
  var r = 42 * scale;
  ctx.beginPath();
  for (var i = 0; i < 3; i++) {
    var a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    var tx = cx + Math.cos(a) * r;
    var ty = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(tx, ty);
    else ctx.lineTo(tx, ty);
  }
  ctx.closePath();
  ctx.fillStyle = '#e0a020';
  ctx.globalAlpha = motifOpacity * 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
}

var smoothOffsetX = 0, smoothOffsetY = 0;

function render() {
  var now = performance.now();
  var dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  // Smooth linen offset (half-pixel drift)
  smoothOffsetX += (linenOffsetX - smoothOffsetX) * 0.12;
  smoothOffsetY += (linenOffsetY - smoothOffsetY) * 0.12;

  // Decay when dragging slows
  if (isDragging && dragFrames > 30) {
    if (velocity < 0.05) {
      friction *= 0.99;
    }
  }

  // Opacity responds to friction
  if (isDragging) {
    motifOpacity = 0.2 + friction * 0.8;
    motifScale = 1 + friction * 0.25;
  } else if (!chordPlaying) {
    motifOpacity += (0.2 - motifOpacity) * dt * 2;
    motifScale += (1 - motifScale) * dt * 2;
  }

  // ── Layer 1: Base field ──
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  // ── Layer 2: Grid spine ──
  drawGrid();

  // ── Layer 3: Linen overlay ──
  if (linenDirty) {
    linenW = Math.ceil(W / 4);
    linenH = Math.ceil(H / 4);
    if (!linenCanvas) {
      linenCanvas = document.createElement('canvas');
      linenCtx = linenCanvas.getContext('2d');
    }
    linenCanvas.width = linenW;
    linenCanvas.height = linenH;
    bakeLinen();
    linenDirty = false;
  }

  ctx.save();
  ctx.globalAlpha = LINEN_OPACITY;
  // Scale up 1/4 res linen to full, offset by half-pixel drift
  var s = 4;
  ctx.setTransform(s, 0, 0, s, smoothOffsetX, smoothOffsetY);
  ctx.drawImage(linenCanvas, 0, 0, linenW, linenH);
  ctx.restore();

  // ── Layer 4: Central motif ──
  drawMotif(performance.now() / 1000);

  requestAnimationFrame(render);
}

// ── Boot ──
initLinen();
requestAnimationFrame(render);
