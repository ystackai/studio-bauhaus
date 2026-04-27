// studio-bauhaus: procedural rice paper grain, rigid structural grid, interaction loop
// Zero external dependencies - Canvas 2D + Web Audio API

const canvas = document.getElementById('bauhaus');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let width = 0, height = 0;
let mouseX = -1, mouseY = -1;
let hoverActive = false;
let hoverStartTime = 0;          // ms when cursor first entered
let metronomeTime = 0;          // ms since init
let revealProgress = 0;         // 0..1 over 2.4s (sine-eased)
let hueLocked = false;
let pulseAmplitude = 0;
let driftPhase = 0;
let snapFlash = 0;              // visual flash at snap instant
let prevMetronomeCycle = -1;

// ---------------------------------------------------------------------------
// Audio context (lazy init on first user interaction)
// ---------------------------------------------------------------------------
let audioCtx = null;
let audioInitialized = false;

// ---------------------------------------------------------------------------
// Timing constants (locked to spec)
// ---------------------------------------------------------------------------
const METRONOME_PERIOD = 2400;  // 2.4 s downbeat
const HUE_LOCK_MS = 1800;        // yellow hue locks at exactly 1.8 s
const REVEAL_DURATION = 2400;    // full lantern reveal in 2.4 s
const GRID_SPACING = 80;

// ---------------------------------------------------------------------------
// Grain buffer (offscreen canvas for performance)
// ---------------------------------------------------------------------------
let grainCanvas = null;
let grainCtx = null;
const GRAIN_SIZE = 256;

// Seeded PRNG (Mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Procedural rice-paper grain ---
function initGrain() {
  grainCanvas = document.createElement('canvas');
  grainCanvas.width = GRAIN_SIZE;
  grainCanvas.height = GRAIN_SIZE;
  grainCtx = grainCanvas.getContext('2d');
  const imgData = grainCtx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  const rng = mulberry32(42);

  for (let y = 0; y < GRAIN_SIZE; y++) {
    for (let x = 0; x < GRAIN_SIZE; x++) {
      const i = (y * GRAIN_SIZE + x) * 4;
      const noise = rng() * 35 + 185;
      // Fiber-like directional variation
      const fiber = Math.sin(rng() * Math.PI * 8) * 8;
      const val = Math.min(255, Math.max(0, noise + fiber));
      imgData.data[i]     = val;        // R – warm
      imgData.data[i + 1] = val - 8;   // G – slightly less
      imgData.data[i + 2] = val - 18;  // B – warm cast
      imgData.data[i + 3] = Math.floor(rng() * 25 + 180);
    }
  }
  grainCtx.putImageData(imgData, 0, 0);
}

// ---------------------------------------------------------------------------
// Easing / drift helpers
// ---------------------------------------------------------------------------
// Exact sine curve: 0..1 -> 0..1
function sineEase(t) {
  return (1 - Math.cos(t * Math.PI)) / 2;
}

// Half-pixel drift: ±0.5 px cap, sine-coupled
function getDrift(phase) {
  return Math.sin(phase * Math.PI * 2 + driftPhase) * 0.5;
}

// ---------------------------------------------------------------------------
// Audio synthesis
// ---------------------------------------------------------------------------
function initAudio() {
  if (audioInitialized) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  audioInitialized = true;
}

// Soft-attack staccato on hover entry
function playHoverStaccato() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(390, now + 0.08);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02); // soft attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

// Crisp click on downbeat snap
function playSnapClick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

// Low syncopated underpulse, descending third, decays into stillness
function playUnderpulse() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);   // A2
  osc.frequency.exponentialRampToValueAtTime(82.41, now + 0.8); // E2 (descending third)
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 1.5);
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function resize() {
  width = canvas.width  = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

// ---------------------------------------------------------------------------
// Drawing: base background (rice paper + yellow hue progression)
// ---------------------------------------------------------------------------
function drawBaseBackground(reveal) {
  // Dark base
  let r = 26, g = 26, b = 26;

  // Yellow hue rise, locks at 1.8 s (0.75 of reveal duration)
  const lockFraction = HUE_LOCK_MS / REVEAL_DURATION; // 0.75
  let yellowIntensity;

  if (revealProgress < lockFraction) {
    // Ramp up with sine easing to lock point
    yellowIntensity = sineEase(revealProgress / lockFraction);
    hueLocked = false;
  } else {
    // Locked at full
    yellowIntensity = 1;
    hueLocked = true;
  }

  r = Math.floor(r + (245 - r) * yellowIntensity);
  g = Math.floor(g + (238 - g) * yellowIntensity);
  b = Math.floor(b + (195 - b) * yellowIntensity);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, width, height);
}

// ---------------------------------------------------------------------------
// Drawing: procedural grain overlay
// ---------------------------------------------------------------------------
function drawGrainBackground() {
  if (!grainCanvas) return;
  const pattern = ctx.createPattern(grainCanvas, 'repeat');
  ctx.fillStyle = pattern;
  ctx.globalAlpha = 0.3 + sineEase(revealProgress) * 0.4;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Drawing: structural grid with bevels
// ---------------------------------------------------------------------------
function drawGrid(time) {
  const cols = Math.ceil(width  / GRID_SPACING) + 1;
  const rows = Math.ceil(height / GRID_SPACING) + 1;
  const snapped = metronomeTime >= METRONOME_PERIOD;
  const snapTightness = hoverActive ? (snapped ? 0 : 0.3) : (snapped ? 0 : 0.15);

  // --- Vertical lines ---
  for (let i = 0; i <= cols; i++) {
    const baseX = i * GRID_SPACING;
    const isPrimary = (i % 4 === 0); // load-bearing every 4th

    let ox = 0;
    if (!isPrimary) ox = getDrift(time / 1000 + i) * snapTightness;
    const x = baseX + ox;

    // Alpha scales with reveal
    const alpha = isPrimary
      ? 0.25 + sineEase(revealProgress) * 0.45
      : 0.12 + sineEase(revealProgress) * 0.3;

    // Core line
    ctx.strokeStyle = `rgba(139,115,85,${alpha})`;
    ctx.lineWidth = isPrimary ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Structural bevel (light edge on right, shadow edge on left)
    if (isPrimary) {
      ctx.strokeStyle = `rgba(232,217,197,${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 1, 0);
      ctx.lineTo(x + 1, height);
      ctx.stroke();
      ctx.strokeStyle = `rgba(80,65,45,${alpha * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(x - 1, 0);
      ctx.lineTo(x - 1, height);
      ctx.stroke();
    }
  }

  // --- Horizontal lines ---
  for (let j = 0; j <= rows; j++) {
    const baseY = j * GRID_SPACING;
    const isPrimary = (j % 4 === 0);

    let oy = 0;
    if (!isPrimary) oy = getDrift(time / 1000 + j + 100) * snapTightness;
    const y = baseY + oy;

    const alpha = isPrimary
      ? 0.25 + sineEase(revealProgress) * 0.45
      : 0.12 + sineEase(revealProgress) * 0.3;

    ctx.strokeStyle = `rgba(139,115,85,${alpha})`;
    ctx.lineWidth = isPrimary ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    if (isPrimary) {
      ctx.strokeStyle = `rgba(232,217,197,${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + 1);
      ctx.lineTo(width, y + 1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(80,65,45,${alpha * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(0, y - 1);
      ctx.lineTo(width, y - 1);
      ctx.stroke();
    }
  }

  // --- Intersection nodes (bevel accents at primary intersections) ---
  for (let i = 0; i <= cols; i += 4) {
    for (let j = 0; j <= rows; j += 4) {
      const x = i * GRID_SPACING;
      const y = j * GRID_SPACING;
      const alpha = 0.2 + sineEase(revealProgress) * 0.3;
      const radius = 2.5;

      // Light highlight
      ctx.fillStyle = `rgba(232,217,197,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(x + 0.5, y - 0.5, radius, 0, Math.PI * 2);
      ctx.fill();

      // Dot
      ctx.fillStyle = `rgba(139,115,85,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// Drawing: central Bauhaus geometry (triangle + circle + rectangle)
// ---------------------------------------------------------------------------
function drawCentralGeometry(time) {
  const cx = width  / 2;
  const cy = height / 2;
  const size = Math.min(width, height) * 0.18;
  const alpha = 0.35 + sineEase(revealProgress) * 0.65;

  // Half-pixel drift
  const dx = getDrift(time / 1000);
  const dy = getDrift(time / 1000 + Math.PI / 2);

  ctx.save();
  ctx.translate(cx + dx, cy + dy);
  ctx.globalAlpha = alpha;

  // ---- Triangle (point-up) ----
  const triGrad = ctx.createLinearGradient(-size, -size, size, size);
  triGrad.addColorStop(0, '#8B7355');
  triGrad.addColorStop(0.5, '#D4C5A9');
  triGrad.addColorStop(1, '#8B7355');

  ctx.fillStyle = triGrad;
  ctx.beginPath();
  ctx.moveTo(-size * 0.7,  size * 0.45); // bottom-left
  ctx.lineTo( 0,          -size * 0.75); // top
  ctx.lineTo( size * 0.7,  size * 0.45); // bottom-right
  ctx.closePath();
  ctx.fill();

  // Bevel on triangle edges
  ctx.strokeStyle = '#E8D9C5';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ---- Circle (Bauhaus circle) ----
  const circR = size * 0.45;
  const circGrad = ctx.createRadialGradient(0, -size * 1.1, 0, 0, -size * 1.1, circR);
  circGrad.addColorStop(0, 'rgba(180,165,135,0.8)');
  circGrad.addColorStop(1, 'rgba(120,105,80,0.9)');

  ctx.fillStyle = circGrad;
  ctx.beginPath();
  ctx.arc(0, -size * 1.1, circR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E8D9C5';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // ---- Rectangle (Bauhaus block) ----
  const rectW = size * 0.9, rectH = size * 0.4;
  const rectX = -rectW / 2, rectY = size * 0.7;

  const rectGrad = ctx.createLinearGradient(rectX, rectY, rectX + rectW, rectY + rectH);
  rectGrad.addColorStop(0, '#7A6B52');
  rectGrad.addColorStop(0.5, '#9E8E72');
  rectGrad.addColorStop(1, '#7A6B52');

  ctx.fillStyle = rectGrad;
  ctx.fillRect(rectX, rectY, rectW, rectH);
  ctx.strokeStyle = '#E8D9C5';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(rectX, rectY, rectW, rectH);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: hover tremor (tactile glow around cursor)
// ---------------------------------------------------------------------------
function drawHoverTremor(time) {
  if (!hoverActive) return;

  // Soft attack envelope: full tremor at 200 ms
  const hoverDur = Math.max(0, time - hoverStartTime);
  const attack = Math.min(1, hoverDur / 200);
  const tremorAmp = attack * 2;

  const ox = Math.sin(time / 100) * tremorAmp;
  const oy = Math.cos(time / 120) * tremorAmp;

  ctx.save();
  ctx.translate(mouseX + ox, mouseY + oy);

  const radius = 80;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  grad.addColorStop(0, `rgba(232,217,197,${0.15 + sineEase(revealProgress) * 0.1})`);
  grad.addColorStop(0.5,`rgba(232,217,197,${0.05 + sineEase(revealProgress) * 0.05})`);
  grad.addColorStop(1, 'rgba(232,217,197,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: syncopated underpulse visual ring
// ---------------------------------------------------------------------------
function drawUnderpulse() {
  if (pulseAmplitude < 0.01) return;
  const cx = width  / 2;
  const cy = height / 2;

  ctx.save();
  ctx.globalAlpha = pulseAmplitude * 0.08;
  ctx.strokeStyle = '#D4C5A9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 150 + (1 - pulseAmplitude) * 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: snap flash
// ---------------------------------------------------------------------------
function drawSnapFlash() {
  if (snapFlash < 0.01) return;
  ctx.save();
  ctx.globalAlpha = snapFlash * 0.06;
  ctx.fillStyle = '#F0E6D0';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
function render(time) {
  ctx.clearRect(0, 0, width, height);

  // 1. Base rice-paper background with yellow hue progression
  drawBaseBackground(time);

  // 2. Procedural grain overlay
  drawGrainBackground();

  // 3. Structural grid + bevels
  drawGrid(time);

  // 4. Central Bauhaus geometry (triangle, circle, rectangle) with drift
  drawCentralGeometry(time);

  // 5. Hover glow / tremor
  drawHoverTremor(time);

  // 6. Underpulse ring
  drawUnderpulse();

  // 7. Snap flash overlay
  drawSnapFlash();
}

// ---------------------------------------------------------------------------
// Main animation loop (strict 60fps delta)
// ---------------------------------------------------------------------------
let lastFrameTime = 0;

function loop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;

  if (delta < 16) {
    // Frame too early — skip to maintain 60fps cap
    requestAnimationFrame(loop);
    return;
  }
  lastFrameTime = timestamp - (delta % 16);

  // --- Update ---
  metronomeTime += delta;
  driftPhase += delta * 0.0005;

  // Metronome cycle tracking
  const currentCycle = Math.floor(metronomeTime / METRONOME_PERIOD);
  if (currentCycle !== prevMetronomeCycle && prevMetronomeCycle >= 0) {
    lastMetronomeSnap = true;
    playSnapClick();
    playUnderpulse();
    pulseAmplitude = 1;
    snapFlash = 1;
  }
  prevMetronomeCycle = currentCycle;

  // Reveal progress (sine-eased over 2.4 s)
  revealProgress = Math.min(1, metronomeTime / REVEAL_DURATION);

  // Pulse decay
  pulseAmplitude *= 0.97;
  if (pulseAmplitude < 0.01) pulseAmplitude = 0;

  // Snap flash decay
  snapFlash *= 0.92;
  if (snapFlash < 0.01) snapFlash = 0;

  // --- Draw ---
  render(timestamp);

  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Input handlers
// ---------------------------------------------------------------------------
canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!hoverActive) {
    hoverActive = true;
    hoverStartTime = performance.now();
    if (!audioInitialized) initAudio();
    playHoverStaccato();
  }
});

canvas.addEventListener('mouseleave', () => {
  hoverActive = false;
  mouseX = -1;
  mouseY = -1;
});

// Touch
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!audioInitialized) initAudio();
  const t = e.touches[0];
  mouseX = t.clientX;
  mouseY = t.clientY;
  hoverActive = true;
  hoverStartTime = performance.now();
  playHoverStaccato();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  mouseX = t.clientX;
  mouseY = t.clientY;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  hoverActive = false;
  mouseX = -1;
  mouseY = -1;
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  resize();
  initGrain();
  window.addEventListener('resize', resize);
  lastFrameTime = 0;
  requestAnimationFrame(loop);
}

init();
