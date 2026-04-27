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
var snapScale = 0;
var resolved = false;

var trail = [];
var cursorX = -100, cursorY = -100;

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

function getBeatOffset(elapsed) {
  return elapsed % BEAT_MS;
}

function generateWeaveTexture() {
  if (!weaveCtx) return;
  var w = Math.min(weaveCanvas.width, 512);
  var h = Math.min(weaveCanvas.height, 512);
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
      d[idx]     = level * 0.85;
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
  [gridCanvas, weaveCanvas, motifCanvas].forEach(function(c) {
    c.width = W;
    c.height = H;
  });
  generateWeaveTexture();
}

function drawGrid(elapsed) {
  gridCtx.clearRect(0, 0, W, H);
  gridCtx.strokeStyle = GRID_COLOR;
  gridCtx.lineWidth = GRID_WEIGHT;

  var tremor = 0;
  if (phase === 'hover' && hoverActive) {
    var beatMs = BEAT_MS;
    var offBeat = getBeatOffset(elapsed);
    var offBeatFactor = 1 - Math.abs(offBeat - beatMs * 0.5) / (beatMs * 0.5);
    tremor = Math.sin(elapsed * TREMOR_FREQ * Math.PI * 2 / 1000) * 2 * offBeatFactor;
  }

  for (var c = 0; c <= cols; c++) {
    var x = c * CELL + tremor;
    gridCtx.beginPath();
    gridCtx.moveTo(Math.round(x) + 0.5, 0);
    gridCtx.lineTo(Math.round(x) + 0.5, H);
    gridCtx.stroke();
  }
  for (var r = 0; r <= rows; r++) {
    var y = r * CELL + tremor * 0.5;
    gridCtx.beginPath();
    gridCtx.moveTo(0, Math.round(y) + 0.5);
    gridCtx.lineTo(W, Math.round(y) + 0.5);
    gridCtx.stroke();
  }
}

function drawMotif(elapsed) {
  motifCtx.clearRect(0, 0, W, H);

  var cx = W / 2;
  var cy = H / 2;
  var size = Math.min(W, H) * 0.28;

  var points = [
    [cx, cy - size * 0.55],
    [cx - size * 0.48, cy + size * 0.35],
    [cx + size * 0.48, cy + size * 0.35],
  ];
  var tri2 = [
    [cx, cy + size * 0.05],
    [cx - size * 0.28, cy + size * 0.75],
    [cx + size * 0.28, cy + size * 0.75],
  ];
  var tri3 = [
    [cx, cy - size * 0.15],
    [cx - size * 0.14, cy + size * 0.25],
    [cx + size * 0.14, cy + size * 0.25],
  ];

  var ox = 0, oy = 0;
  if (phase === 'hover' && hoverActive) {
    ox = Math.sin(elapsed * TREMOR_FREQ * Math.PI * 2 / 1000) * 1.5;
    oy = Math.cos(elapsed * TREMOR_FREQ * Math.PI * 2 / 1000 * 0.7) * 1.0;
  }

  var scale = 1;
  if (phase === 'releasing' && !resolved) {
    var dt = elapsed - revealStart;
    scale = 1 + snapScale * Math.max(0, 1 - dt / 300);
  }

  motifCtx.save();
  motifCtx.translate(cx + ox, cy + oy);
  motifCtx.scale(scale, scale);
  motifCtx.translate(-cx, -cy);
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
  motifCtx.save();
  var now = performance.now();
  var len = trail.length;
  for (var i = 0; i < len; i++) {
    var p = trail[i];
    var age = now - p.t;
    var alpha = Math.max(0, 1 - age / 300);
    var r = 4 + (1 - alpha) * 2;
    motifCtx.globalAlpha = alpha * 0.5;
    motifCtx.strokeStyle = MOTIF_COLOR;
    motifCtx.lineWidth = 1.5;
    motifCtx.beginPath();
    motifCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    motifCtx.stroke();
  }
  motifCtx.restore();
}

function updateCursorTrail(x, y) {
  cursorX = x;
  cursorY = y;
  var now = performance.now();
  cursorEl.style.left = x + 'px';
  cursorEl.style.top = y + 'px';
  trail.push({ x: x, y: y, t: now });
  var cutoff = now - 300;
  for (var i = trail.length - 1; i >= 0; i--) {
    if (trail[i].t < cutoff) {
      trail.splice(0, i + 1);
      break;
    }
  }
}

function enterHover(elapsed) {
  if (phase === 'idle') {
    phase = 'hover';
    hoverActive = true;
    hoverStart = elapsed;
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
      tremorGain.gain.setTargetAtTime(0, tremorGain.gain.context.currentTime, 0.03);
    }
  }
}

function startReveal(elapsed) {
  if (phase !== 'hover') return;
  phase = 'releasing';
  hoverActive = false;
  revealStart = elapsed;
  motifAlpha = 1.0;
  overlayOpacity = 0;
  snapScale = 1.08;
  resolved = false;

  if (tremorGain && audioCtx) {
    tremorGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01);
  }

  playSnap();
  setTimeout(function() { playDescendingThird(); }, 80);
  setTimeout(function() {
    playHighClick();
    resolved = true;
  }, 2400);
}

var lastTs = 0;

function loop(ts) {
  var totalMs = ts;
  lastTs = ts;

  if (phase === 'releasing') {
    var dt = totalMs - revealStart;

    if (dt > 800 && motifAlpha > 0.6) {
      var decayProgress = Math.min(1, dt / 800);
      motifAlpha = 1.0 - decayProgress * 0.4;
    } else if (dt >= 800) {
      motifAlpha = 0.6;
    }

    var fadeProgress = 0;
    if (dt > 400) {
      fadeProgress = Math.min(1, (dt - 400) / 2000);
    }
    overlayOpacity = fadeProgress;
    overlayEl.style.opacity = overlayOpacity;
  }

  drawGrid(totalMs);
  drawMotif(totalMs);
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

  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', function(e) {
    updateCursorTrail(e.clientX, e.clientY);
    enterHover(performance.now());
  });

  document.addEventListener('mouseleave', function() {
    leaveHover();
  });

  document.addEventListener('click', function() {
    startReveal(performance.now());
  });

  document.addEventListener('touchstart', function(e) {
    initAudio();
    var touch = e.touches[0];
    updateCursorTrail(touch.clientX, touch.clientY);
    enterHover(performance.now());
  });

  document.addEventListener('touchend', function() {
    startReveal(performance.now());
    leaveHover();
  });

  lastTs = performance.now();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
