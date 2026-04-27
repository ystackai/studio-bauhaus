var GRID_COLOR = '#1A1A1A';
var GRID_WEIGHT = 2;
var MOTIF_COLOR = '#F2D269';
var BPM = 120;
var BEAT_MS = 60000 / BPM;
var TREMOR_FREQ = 40;
var CELL = 48;

var W, H, cols, rows;
var gridCanvas, gridCtx;
var weaveCanvas, weaveCtx;
var motifCanvas, motifCtx;
var overlayEl, cursorEl;

var phase = 'idle';
var hoverStart = 0;
var hoverActive = false;
var revealStart = 0;
var motifAlpha = 1.0;
var overlayOpacity = 0;
var gridSnapProgress = 0;
var tremorLocked = false;
var resolved = false;
var lastBeatCount = -1;

var trail = [];
var cursorX = -100, cursorY = -100;
var metaBeatCount = 0;

var audioCtx = null;
var tremorOsc = null;
var tremorGain = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  setupTremorLayer();
}

function setupTremorLayer() {
  if (!audioCtx) return;
  tremorGain = audioCtx.createGain();
  tremorGain.gain.value = 0;
  tremorGain.connect(audioCtx.destination);
  tremorOsc = audioCtx.createOscillator();
  tremorOsc.type = 'sine';
  tremorOsc.frequency.value = TREMOR_FREQ;
  tremorOsc.connect(tremorGain);
  tremorOsc.start();
}

function playSnap() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var osc = audioCtx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(240, now);
  var gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
  gain.gain.setTargetAtTime(0, now + 0.005, 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playDescendingThird() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.linearRampToValueAtTime(180, now + 0.15);
  var gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

function playHighClick() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var bufLen = audioCtx.sampleRate * 0.05;
  var buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
  }
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 8000;
  bp.Q.value = 2;
  var gain = audioCtx.createGain();
  gain.gain.value = 0.12;
  src.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(now);
}

function playMetronomeTick() {
  if (!audioCtx) return;
  var now = audioCtx.currentTime;
  var osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1000;
  var gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function getBeatOffset(elapsed) {
  return elapsed % BEAT_MS;
}

function getOffBeatPulse(elapsed) {
  var offBeat = getBeatOffset(elapsed);
  var offBeatCenter = BEAT_MS * 0.5;
  return 1 - Math.abs(offBeat - offBeatCenter) / offBeatCenter;
}

function generateWeaveTexture() {
  if (!weaveCtx) return;
  var w = 512;
  var h = 512;
  var offC = document.createElement('canvas');
  offC.width = w;
  offC.height = h;
  var ctx = offC.getContext('2d');

  var imgData = ctx.createImageData(w, h);
  var d = imgData.data;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var v = 0;
      v += Math.sin(x * 0.08 + y * 0.03) * 0.5;
      v += Math.sin(x * 0.03 - y * 0.07) * 0.3;
      v += Math.sin((x + y) * 0.05) * 0.2;
      v += Math.sin(x * 0.15) * Math.sin(y * 0.12) * 0.4;
      var level = Math.floor(((v + 1.4) / 2.8) * 128) + 128;
      level = Math.min(255, Math.max(0, level));
      var idx = (y * w + x) * 4;
      d[idx] = level * 0.85;
      d[idx + 1] = level * 0.78;
      d[idx + 2] = level * 0.65;
      d[idx + 3] = 180;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  weaveCtx.imageSmoothingEnabled = true;
  weaveCtx.clearRect(0, 0, weaveCanvas.width, weaveCanvas.height);
  weaveCtx.drawImage(offC, 0, 0, weaveCanvas.width, weaveCanvas.height);
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  cols = Math.ceil(W / CELL) + 1;
  rows = Math.ceil(H / CELL) + 1;
  gridCanvas.width = W;
  gridCanvas.height = H;
  weaveCanvas.width = W;
  weaveCanvas.height = H;
  motifCanvas.width = W;
  motifCanvas.height = H;
  generateWeaveTexture();
}

function drawGrid(elapsed) {
  gridCtx.clearRect(0, 0, W, H);
  gridCtx.strokeStyle = GRID_COLOR;
  gridCtx.lineWidth = GRID_WEIGHT;

  var tremor = 0;
  if (phase === 'hover' && hoverActive && !tremorLocked) {
    var pulse = getOffBeatPulse(elapsed);
    tremor = Math.sin(elapsed * TREMOR_FREQ * Math.PI * 2 / 1000) * 2 * pulse;
  }

  var snapOffset = 0;
  if (phase === 'releasing' && !resolved) {
    var dt = elapsed - revealStart;
    var snapEase = easeOutCubic(Math.min(1, dt / 300));
    snapOffset = gridSnapProgress * (1 - snapEase) * 8;
    gridSnapProgress = 1;
  }

  for (var c = 0; c <= cols; c++) {
    var x = c * CELL + tremor + snapOffset * Math.sin(c * 0.3);
    gridCtx.beginPath();
    gridCtx.moveTo(Math.round(x) + 0.5, 0);
    gridCtx.lineTo(Math.round(x) + 0.5, H);
    gridCtx.stroke();
  }
  for (var r = 0; r <= rows; r++) {
    var y = r * CELL + tremor * 0.5 + snapOffset * Math.cos(r * 0.3);
    gridCtx.beginPath();
    gridCtx.moveTo(0, Math.round(y) + 0.5);
    gridCtx.lineTo(W, Math.round(y) + 0.5);
    gridCtx.stroke();
  }
}

function drawMetronomePulse(elapsed) {
  var currentBeat = Math.floor(elapsed / BEAT_MS);
  if (currentBeat !== lastBeatCount) {
    lastBeatCount = currentBeat;
    metaBeatCount = currentBeat;
    if (phase === 'hover' && hoverActive) {
      gridCtx.fillStyle = 'rgba(26, 26, 26, 0.08)';
      gridCtx.fillRect(0, 0, W, H);
    }
  }

  var offBeat = getBeatOffset(elapsed);
  var onBeat = Math.max(0, 1 - offBeat / (BEAT_MS * 0.15));
  if (onBeat > 0.1 && phase === 'hover' && hoverActive) {
    gridCtx.strokeStyle = 'rgba(242, 210, 105, ' + (onBeat * 0.15) + ')';
    gridCtx.lineWidth = 1;
    gridCtx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  var c1 = 1.70158;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawMotif(elapsed) {
  motifCtx.clearRect(0, 0, W, H);

  var cx = W / 2;
  var cy = H / 2;
  var size = Math.min(W, H) * 0.28;

  var points = [
    [cx, cy - size * 0.55],
    [cx - size * 0.48, cy + size * 0.35],
    [cx + size * 0.48, cy + size * 0.35]
  ];
  var tri2 = [
    [cx, cy + size * 0.05],
    [cx - size * 0.28, cy + size * 0.75],
    [cx + size * 0.28, cy + size * 0.75]
  ];
  var tri3 = [
    [cx, cy - size * 0.15],
    [cx - size * 0.14, cy + size * 0.25],
    [cx + size * 0.14, cy + size * 0.25]
  ];

  var ox = 0, oy = 0;
  if (phase === 'hover' && hoverActive && !tremorLocked) {
    var pulse = getOffBeatPulse(elapsed);
    ox = Math.sin(elapsed * TREMOR_FREQ * Math.PI * 2 / 1000) * 1.5 * pulse;
    oy = Math.cos(elapsed * TREMOR_FREQ * Math.PI * 2 / 1000 * 0.7) * 1.0 * pulse;
  }

  var scale = 1;
  if (phase === 'releasing' && !resolved) {
    var dt = elapsed - revealStart;
    var snapT = Math.min(1, dt / 300);
    if (snapT < 1) {
      scale = 1 + 0.08 * (1 - easeOutBack(snapT));
    }
  }

  if (!resolved) {
    motifCtx.save();
    motifCtx.translate(cx + ox, cy + oy);
    motifCtx.scale(scale, scale);
    motifCtx.translate(-cx, -cy);
  } else {
    motifCtx.save();
    motifCtx.translate(cx, cy);
    motifCtx.scale(scale, scale);
    motifCtx.translate(-cx, -cy);
  }

  motifCtx.globalAlpha = motifAlpha;
  motifCtx.fillStyle = MOTIF_COLOR;
  motifCtx.beginPath();
  motifCtx.moveTo(points[0][0], points[0][1]);
  motifCtx.lineTo(points[1][0], points[1][1]);
  motifCtx.lineTo(points[2][0], points[2][1]);
  motifCtx.closePath();
  motifCtx.fill();

  motifCtx.globalAlpha = motifAlpha * 0.7;
  motifCtx.beginPath();
  motifCtx.moveTo(tri2[0][0], tri2[0][1]);
  motifCtx.lineTo(tri2[1][0], tri2[1][1]);
  motifCtx.lineTo(tri2[2][0], tri2[2][1]);
  motifCtx.closePath();
  motifCtx.fill();

  motifCtx.globalAlpha = motifAlpha * 0.4;
  motifCtx.beginPath();
  motifCtx.moveTo(tri3[0][0], tri3[0][1]);
  motifCtx.lineTo(tri3[1][0], tri3[1][1]);
  motifCtx.lineTo(tri3[2][0], tri3[2][1]);
  motifCtx.closePath();
  motifCtx.fill();

  motifCtx.restore();
}

function drawCursorTrail() {
  if (trail.length === 0) return;
  var now = performance.now();
  var i, p, age, alpha, r;
  motifCtx.save();
  motifCtx.strokeStyle = MOTIF_COLOR;
  motifCtx.lineWidth = 1.5;
  for (i = 0; i < trail.length; i++) {
    p = trail[i];
    age = now - p.t;
    alpha = Math.max(0, 1 - age / 300);
    r = 4 + (1 - alpha) * 2;
    if (alpha > 0) {
      motifCtx.globalAlpha = alpha * 0.5;
      motifCtx.beginPath();
      motifCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      motifCtx.stroke();
    }
  }
  motifCtx.restore();
  purgeTrail();
}

function purgeTrail() {
  var now = performance.now();
  var cutoff = now - 300;
  var keepIdx = 0;
  for (var i = 0; i < trail.length; i++) {
    if (trail[i].t >= cutoff) {
      break;
    }
    keepIdx = i + 1;
  }
  if (keepIdx > 0) {
    trail.splice(0, keepIdx);
  }
}

function updateCursorTrail(x, y) {
  cursorX = x;
  cursorY = y;
  cursorEl.style.left = x + 'px';
  cursorEl.style.top = y + 'px';
  trail.push({ x: x, y: y, t: performance.now() });
  if (trail.length > 60) {
    trail.splice(0, trail.length - 60);
  }
}

function enterHover(elapsed) {
  if (phase === 'idle') {
    phase = 'hover';
    hoverActive = true;
    hoverStart = elapsed;
    gridSnapProgress = 0;
    initAudio();
    if (tremorGain) {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      tremorGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 0.04);
    }
  }
}

function leaveHover() {
  if (phase === 'hover') {
    phase = 'idle';
    hoverActive = false;
    if (tremorGain && audioCtx) {
      tremorGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
    }
  }
}

function startReveal(elapsed) {
  if (phase !== 'hover' || resolved) return;
  phase = 'releasing';
  hoverActive = false;
  revealStart = elapsed;
  motifAlpha = 1.0;
  overlayOpacity = 0;
  gridSnapProgress = 1;
  resolved = false;
  tremorLocked = false;

  if (tremorGain && audioCtx) {
    tremorGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01);
  }

  playSnap();

  var dt80 = BEAT_MS * 0.5;
  setTimeout(function() {
    playDescendingThird();
  }, dt80);

  setTimeout(function() {
    playHighClick();
    resolved = true;
    tremorLocked = true;
    motifAlpha = 0.6;
  }, 2400);
}

function updateRevealState(elapsed) {
  if (phase !== 'releasing' || resolved) return;

  var dt = elapsed - revealStart;

  if (dt > 0 && motifAlpha > 0.6) {
    var decayT = Math.min(1, dt / 800);
    motifAlpha = 1.0 - decayT * 0.4;
  } else if (dt >= 800) {
    motifAlpha = 0.6;
  }

  var fadeStart = 400;
  var fadeDuration = 2000;
  var fadeProgress = 0;
  if (dt > fadeStart) {
    fadeProgress = Math.min(1, (dt - fadeStart) / fadeDuration);
  }
  overlayOpacity = fadeProgress;
  overlayEl.style.opacity = overlayOpacity.toFixed(4);
}

var lastTs = 0;

function loop(ts) {
  lastTs = ts;

  if (phase === 'releasing') {
    updateRevealState(ts);
  }

  drawGrid(ts);
  drawMetronomePulse(ts);
  drawMotif(ts);
  drawCursorTrail();

  requestAnimationFrame(loop);
}

function init() {
  gridCanvas = document.getElementById('grid-canvas');
  gridCtx = gridCanvas.getContext('2d');
  weaveCanvas = document.getElementById('weave-canvas');
  weaveCtx = weaveCanvas.getContext('2d');
  motifCanvas = document.getElementById('motif-canvas');
  motifCtx = motifCanvas.getContext('2d');
  overlayEl = document.getElementById('overlay');
  cursorEl = document.getElementById('cursor-trail');

  cursorEl.style.opacity = '0';

  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', function(e) {
    cursorEl.style.opacity = '1';
    updateCursorTrail(e.clientX, e.clientY);
    enterHover(performance.now());
  });

  document.addEventListener('mouseleave', function() {
    leaveHover();
    cursorEl.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function() {
    cursorEl.style.opacity = '1';
  });

  document.addEventListener('click', function(e) {
    e.preventDefault();
    initAudio();
    startReveal(performance.now());
  });

  document.addEventListener('touchstart', function(e) {
    e.preventDefault();
    initAudio();
    var touch = e.touches[0];
    updateCursorTrail(touch.clientX, touch.clientY);
    enterHover(performance.now());
  }, { passive: false });

  document.addEventListener('touchend', function(e) {
    e.preventDefault();
    startReveal(performance.now());
    leaveHover();
  }, { passive: false });

  lastTs = performance.now();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
