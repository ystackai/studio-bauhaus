// === Constants ===
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;
const BPM = 120;
const BEAT_INTERVAL = 60 / BPM;
const CYCLE_DURATION = 2.4;
const PHASE_GRID_SNAP = 0.0;
const PHASE_LANTERN_START = 0.8;
const PHASE_TRIANGLE_BLOOM = 1.8;
const PHASE_STRUCTURAL_LOCK = 2.4;
const TRANGLE_YELLOW = [242, 208, 43];
const PAPER_COLOR = [245, 240, 232];
const BLUE_CHANNEL_FREQ = 293.66;

// === State ===
let canvas = null;
let ctx = null;
let audioCtx = null;
let audioStarted = false;
let cycleStartTime = 0;
let globalTime = 0;
let lastFrameTime = 0;
let isHovering = false;
let hoverStartTime = 0;
let mouseX = 0;
let mouseY = 0;
let halfPixelDrift = 0;
let w = window.innerWidth;
let h = window.innerHeight;

// === Audio Engine ===
function initAudio() {
  if (audioStarted) return;
  audioStarted = true;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain to enforce -18dBFS peak
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(audioCtx.destination);
}

function playMetronomeClick(time, volume = 0.15) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = 1000;
  osc.type = 'sine';

  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(time);
  osc.stop(time + 0.06);
}

function playGridSnap(time) {
  if (!audioCtx) return;

  // Crisp, dry click with descending third on blue channel
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const gain2 = audioCtx.createGain();

  osc.frequency.value = 800;
  osc.type = 'square';

  osc2.frequency.value = BLUE_CHANNEL_FREQ * 1.5;
  osc2.type = 'sine';

  gain.gain.setValueAtTime(0.08, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

  gain2.gain.setValueAtTime(0.06, time);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  osc.start(time);
  osc.stop(time + 0.02);
  osc2.start(time);
  osc2.stop(time + 0.1);
}

function playLanternExhale(time) {
  if (!audioCtx) return;

  // Soft inhale/exhale breath synced to sine easing at -24dBFS
  const bufferSize = audioCtx.sampleRate * CYCLE_DURATION;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / audioCtx.sampleRate;
    const envelope = Math.sin(Math.PI * t / CYCLE_DURATION);
    const noise = (Math.random() * 2 - 1);
    data[i] = noise * envelope * 0.0625;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = audioCtx.createGain();
  gain.gain.value = 1;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  source.start(time);
}

function playStructuralLock(time) {
  if (!audioCtx) return;

  // Deep, grounded thud at 2.4s
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = 60;
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(time);
  osc.stop(time + 0.35);
}

function playDriftHum(time, driftAmount) {
  if (!audioCtx) return;

  // Subtle high-frequency hum modulated with triangle's bloom
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = 2400 + driftAmount * 200;
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.02 + Math.abs(driftAmount) * 0.01, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(time);
  osc.stop(time + 0.2);
}

// === Timeline Logic ===
function getPhase(elapsed) {
  return elapsed % CYCLE_DURATION;
}

function sineEase(t) {
  return Math.sin(Math.PI * t);
}

function sineEaseIn(t) {
  return 1 - Math.cos((Math.PI / 2) * t);
}

function computeLanternOpacity(elapsed) {
  const phase = getPhase(elapsed);
  if (phase < PHASE_LANTERN_START || phase > PHASE_STRUCTURAL_LOCK) return 0;

  const t = (phase - PHASE_LANTERN_START) / (PHASE_STRUCTURAL_LOCK - PHASE_LANTERN_START);
  return sineEase(t);
}

function computeTriangleBleed(elapsed) {
  const phase = getPhase(elapsed);
  if (phase < PHASE_TRIANGLE_BLOOM) return 0;

  const t = Math.min((phase - PHASE_TRIANGLE_BLOOM) / (PHASE_STRUCTURAL_LOCK - PHASE_TRIANGLE_BLOOM), 1);
  return sineEaseIn(t);
}

function computeHalfPixelDrift(elapsed) {
  const phase = getPhase(elapsed);
  // Half-pixel drift coupled to sine curve, peaks during structural lock
  if (phase >= PHASE_STRUCTURAL_LOCK - 0.4) {
    const t = (phase - (PHASE_STRUCTURAL_LOCK - 0.4)) / 0.4;
    return 0.5 * Math.sin(Math.PI * t);
  }
  return 0;
}

function computeGrainDensity(elapsed, drift) {
  // Grain density tilts dynamically with half-pixel drift
  const baseDensity = 180;
  const tilt = drift * 20;
  return baseDensity + tilt;
}

// === Rendering ===
function drawRicePaperBase() {
  ctx.fillStyle = `rgb(${PAPER_COLOR[0]}, ${PAPER_COLOR[1]}, ${PAPER_COLOR[2]})`;
  ctx.fillRect(0, 0, w, h);
}

function drawGrain(elapsed, drift) {
  const density = computeGrainDensity(elapsed, drift);
  const grainSize = 1;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';

  const seed = Math.floor(elapsed * 10) % 1000;
  for (let i = 0; i < density; i++) {
    const x = ((i * 7 + seed) % w) + drift * ((i % 2 === 0) ? 1 : -1);
    const y = ((i * 13 + seed * 3) % h);
    ctx.fillRect(Math.round(x + 0.5), Math.round(y), grainSize, grainSize);
   }
}

function drawGrid(elapsed) {
  const phase = getPhase(elapsed);
  const snapIntensity = phase < 0.1 ? sineEase(phase / 0.1) : Math.max(0, 1 - (phase - 0.1) / 0.5);

  const spacing = 60;
  const hasSnapped = phase >= PHASE_GRID_SNAP && phase <= 0.1;

  ctx.strokeStyle = `rgba(80, 90, 110, ${0.08 + snapIntensity * 0.25})`;
  ctx.lineWidth = 0.5 + snapIntensity * 0.5;

  for (let x = spacing; x < w; x += spacing) {
    const driftOffset = halfPixelDrift * Math.sin(x * 0.01);
    ctx.beginPath();
    ctx.moveTo(x + driftOffset, 0);
    ctx.lineTo(x + driftOffset, h);
    ctx.stroke();
   }

  for (let y = spacing; y < h; y += spacing) {
    const driftOffset = halfPixelDrift * Math.cos(y * 0.01);
    ctx.beginPath();
    ctx.moveTo(0, y + driftOffset);
    ctx.lineTo(w, y + driftOffset);
    ctx.stroke();
   }
}

function drawStructuralLines(elapsed) {
  const phase = getPhase(elapsed);
  const lockProgress = phase >= PHASE_STRUCTURAL_LOCK - 0.5
    ? Math.min((phase - (PHASE_STRUCTURAL_LOCK - 0.5)) / 0.5, 1)
    : 0;

  ctx.strokeStyle = `rgba(60, 70, 90, ${0.12 + lockProgress * 0.3})`;
  ctx.lineWidth = 1 + lockProgress * 1.5;

  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.25;

  // Load-bearing horizontal and vertical lines with subtle bevel
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx + size, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx, cy + size);
  ctx.stroke();

  // Bevel highlight
  if (lockProgress > 0.3) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${(lockProgress - 0.3) * 0.4})`;
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    ctx.moveTo(cx - size, cy - 0.5);
    ctx.lineTo(cx + size, cy - 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 0.5, cy - size);
    ctx.lineTo(cx - 0.5, cy + size);
    ctx.stroke();
  }
}

function drawLanternFade(elapsed) {
  const opacity = computeLanternOpacity(elapsed);
  if (opacity <= 0) return;

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.max(w, h) * 0.6;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, `rgba(255, 250, 230, ${opacity * 0.6})`);
  gradient.addColorStop(0.7, `rgba(255, 245, 220, ${opacity * 0.3})`);
  gradient.addColorStop(1, `rgba(255, 240, 215, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTriangle(elapsed) {
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.12;

  let r = TRANGLE_YELLOW[0];
  let g = TRANGLE_YELLOW[1];
  let b = TRANGLE_YELLOW[2];

  const bleed = computeTriangleBleed(elapsed);
  r = Math.round(r + (PAPER_COLOR[0] - r) * bleed);
  g = Math.round(g + (PAPER_COLOR[1] - g) * bleed);
  b = Math.round(b + (PAPER_COLOR[2] - b) * bleed);

  // Half-pixel drift on triangle position
  const driftX = halfPixelDrift * 0.5;
  const driftY = halfPixelDrift * 0.3;

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.strokeStyle = `rgba(80, 70, 20, ${0.3 - bleed * 0.2})`;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cx + driftX, cy - size + driftY);
  ctx.lineTo(cx - size + driftX, cy + size + driftY);
  ctx.lineTo(cx + size + driftX, cy + size + driftY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHoverIndicator() {
  if (!isHovering) return;

  const elapsed = (performance.now() - hoverStartTime) / 1000;
  const opacity = Math.min(elapsed * 2, 0.3);

  ctx.strokeStyle = `rgba(180, 160, 100, ${opacity})`;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 20 + elapsed * 5, 0, Math.PI * 2);
  ctx.stroke();
}

function render(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;

  const delta = timestamp - lastFrameTime;

  // Frame rate capping to 60fps
  if (delta < FRAME_DURATION) {
    requestAnimationFrame(render);
    return;
  }

  lastFrameTime = timestamp - (delta % FRAME_DURATION);

  // Update global time
  const now = performance.now();
  globalTime = (now - cycleStartTime) / 1000;

  // Compute half-pixel drift (coupled to sine curve)
  halfPixelDrift = computeHalfPixelDrift(globalTime);

  // Clear and draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRicePaperBase();
  drawGrain(globalTime, halfPixelDrift);
  drawGrid(globalTime);
  drawStructuralLines(globalTime);
  drawLanternFade(globalTime);
  drawTriangle(globalTime);
  drawHoverIndicator();

  // Schedule audio events on frame-complete
  const phase = getPhase(globalTime);
  const audioTime = audioCtx ? audioCtx.currentTime : null;

  if (audioTime) {
    // Metronome click every beat
    const beatIndex = Math.floor(globalTime / BEAT_INTERVAL);
    if (beatIndex !== (lastMetronomeBeat || -1)) {
      lastMetronomeBeat = beatIndex;
      playMetronomeClick(audioTime, 0.1);
    }

    // Grid snap at 0.0s
    if (phase < 0.05 && !(lastPhase >= CYCLE_DURATION - 0.05)) {
      playGridSnap(audioTime);
    }

    // Lantern exhale at 0.8s
    if (Math.abs(phase - PHASE_LANTERN_START) < 0.05 && !lanternPlayed) {
      lanternPlayed = true;
      playLanternExhale(audioTime);
    }
    if (phase > PHASE_LANTERN_START + 0.1) {
      lanternPlayed = false;
    }

    // Drift hum during structural lock transition
    if (Math.abs(phase - PHASE_STRUCTURAL_LOCK) < 0.2 && Math.abs(halfPixelDrift) > 0.01) {
      if (!driftHumPlayed || Math.random() < 0.02) {
        driftHumPlayed = true;
        playDriftHum(audioTime, halfPixelDrift);
      }
    } else {
      driftHumPlayed = false;
    }

    // Structural lock thud at 2.4s
    if (Math.abs(phase) < 0.05 && globalTime > CYCLE_DURATION) {
      if (!lockThudPlayed) {
        lockThudPlayed = true;
        playStructuralLock(audioTime);
      }
    }
    if (phase > 0.1) {
      lockThudPlayed = false;
    }
  }

  lastPhase = phase;

  requestAnimationFrame(render);
}

// === Event Handlers ===
let lastMetronomeBeat = -1;
let lastPhase = -1;
let lanternPlayed = false;
let driftHumPlayed = false;
let lockThudPlayed = false;

function init() {
  canvas = document.getElementById('stage');
  ctx = canvas.getContext('2d');

  let w = window.innerWidth;
  let h = window.innerHeight;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mouseenter', (e) => {
    initAudio();
    isHovering = true;
    hoverStartTime = performance.now();
    cycleStartTime = performance.now();
  });

  canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  canvas.addEventListener('mouseleave', () => {
    isHovering = false;
  });

  // Start render loop
  requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', init);
