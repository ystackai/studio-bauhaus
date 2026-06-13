// studio-bauhaus: procedural rice paper grain, rigid structural grid, interaction loop
// Zero external dependencies - Canvas 2D + Web Audio API

const canvas = document.getElementById('bauhaus');
const ctx = canvas.getContext('2d');

// State
let width, height;
let mouseX = -1, mouseY = -1;
let hoverActive = false;
let metronomeTime = 0;
let lastMetronomeSnap = false;
let revealProgress = 0; // 0..1 over 2.4s
let hueLocked = false;
let pulseAmplitude = 0;
let driftPhase = 0;

// Audio context (lazy init on first user interaction)
let audioCtx = null;
let audioInitialized = false;

// Performance
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;
let lastFrameTime = 0;

// Grain buffer (offscreen canvas for performance)
let grainCanvas = null;
let grainCtx = null;
const GRAIN_SIZE = 256;

// Seeded simple pseudo-random for grain
function mulberry32(a) {
   return function() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   }
}

// Procedural rice paper grain generation
function initGrain() {
   grainCanvas = document.createElement('canvas');
   grainCanvas.width = GRAIN_SIZE;
   grainCanvas.height = GRAIN_SIZE;
   grainCtx = grainCanvas.getContext('2d');
   const imgData = grainCtx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
   const rng = mulberry32(42); // fixed seed for deterministic grain
   
   for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = rng() * 35 + 185; // warm rice paper tones
      // Subtle fiber-like variation
      const fiber = Math.sin(rng() * Math.PI * 8) * 8;
      const val = Math.min(255, Math.max(0, noise + fiber));
      imgData.data[i] = val;     // R - warm
      imgData.data[i + 1] = val - 8; // G - slightly less
      imgData.data[i + 2] = val - 18; // B - noticeably less (warm cast)
      imgData.data[i + 3] = Math.floor(rng() * 25 + 180); // semi-transparent
   }
   grainCtx.putImageData(imgData, 0, 0);
}

// Sine easing (exact spec: must use sine curve for reveal)
function sineEase(t) {
   // t: 0..1 -> 0..1
   return (1 - Math.cos(t * Math.PI)) / 2;
}

// Drift function: half-pixel max, sine-coupled
function getDrift(t) {
   // ±0.5px cap, coupled to sine curve
   return Math.sin(t * Math.PI * 2 + driftPhase) * 0.5;
}

// Metronome: exact 2.4s downbeat
const METRONOME_PERIOD = 2400; // 2.4s in ms
const HUE_LOCK_TIME = 1800; // yellow hue locks at exactly 1.8s
const REVEAL_DURATION = 2400; // 2.4s for full lantern reveal

function initAudio() {
   if (audioInitialized) return;
   audioCtx = new (window.AudioContext || window.webkitAudioContext)();
   audioInitialized = true;
}

// Soft-attack staccato for hover
function playHoverStaccato() {
   if (!audioCtx) return;
   const now = audioCtx.currentTime;
   
   const osc = audioCtx.createOscillator();
   const gain = audioCtx.createGain();
   
   osc.type = 'sine';
   osc.frequency.setValueAtTime(520, now);
   osc.frequency.exponentialRampToValueAtTime(390, now + 0.08);
   
   // Soft attack, quick decay (staccato)
   gain.gain.setValueAtTime(0, now);
   gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
   gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
   
   osc.connect(gain);
   gain.connect(audioCtx.destination);
   osc.start(now);
   osc.stop(now + 0.15);
}

// Crisp click for downbeat snap
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

// Low syncopated underpulse that decays
function playUnderpulse() {
   if (!audioCtx) return;
   const now = audioCtx.currentTime;
   
   const osc = audioCtx.createOscillator();
   const gain = audioCtx.createGain();
   
   osc.type = 'sine';
   osc.frequency.setValueAtTime(110, now);
   osc.frequency.exponentialRampToValueAtTime(82, now + 0.8);
   
   // Descending third: 110 -> 82.41 (A2 -> E2, approximately)
   gain.gain.setValueAtTime(0.08, now);
   gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
   
   osc.connect(gain);
   gain.connect(audioCtx.destination);
   osc.start(now);
   osc.stop(now + 1.5);
}

function resize() {
   width = canvas.width = window.innerWidth;
   height = canvas.height = window.innerHeight;
}

function drawGrainBackground(time) {
   if (!grainCanvas) return;
   
   const pattern = ctx.createPattern(grainCanvas, 'repeat');
   ctx.fillStyle = pattern;
   
   // Grain density modulated by reveal
   ctx.globalAlpha = 0.3 + revealProgress * 0.4;
   ctx.fillRect(0, 0, width, height);
   ctx.globalAlpha = 1;
}

function drawBaseBackground(reveal) {
   let baseR = 26;
   let baseG = 26;
   let baseB = 26;
   
   // Yellow hue: rises as reveal progresses, locks at 1.8s (0.75 of 2.4s)
   const hueLockThreshold = HUE_LOCK_TIME / REVEAL_DURATION;
   let yellowIntensity = 0;
   
   if (reveal < hueLockThreshold) {
      yellowIntensity = sineEase(reveal / hueLockThreshold);
   } else {
      // Lock at full yellow intensity
      yellowIntensity = 1;
      hueLocked = true;
   }
   
   // Blend from dark base to warm yellow rice paper
   baseR = Math.floor(baseR + (245 - baseR) * yellowIntensity);
   baseG = Math.floor(baseG + (238 - baseG) * yellowIntensity);
   baseB = Math.floor(baseB + (195 - baseB) * yellowIntensity);
   
   ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
   ctx.fillRect(0, 0, width, height);
}

// Central triangle with half-pixel drift
function drawCentralTriangle(time) {
   const cx = width / 2;
   const cy = height / 2;
   const size = Math.min(width, height) * 0.25;
   
   // Half-pixel drift: ±0.5px max, sine coupled
   const driftX = getDrift(time / 1000);
   const driftY = getDrift(time / 1000 + Math.PI / 2);
   
   const alpha = 0.4 + sineEase(revealProgress) * 0.6;
   
   ctx.save();
   ctx.translate(cx + driftX, cy + driftY);
   ctx.globalAlpha = alpha;
   
   const grad = ctx.createLinearGradient(-size, -size, size, size);
   grad.addColorStop(0, '#8B7355');
   grad.addColorStop(0.5, '#D4C5A9');
   grad.addColorStop(1, '#8B7355');
   
   ctx.fillStyle = grad;
   ctx.beginPath();
   
   // Triangle: point up, with structural bevels
   const top = { x: 0, y: -size * 0.8 };
   const left = { x: -size * 0.7, y: size * 0.5 };
   const right = { x: size * 0.7, y: size * 0.5 };
   
   ctx.moveTo(left.x, left.y);
   ctx.lineTo(top.x, top.y);
   ctx.lineTo(right.x, right.y);
   ctx.closePath();
   ctx.fill();
   
   // Structural bevel: crisp edge highlight
   ctx.strokeStyle = '#E8D9C5';
   ctx.lineWidth = 1.5;
   ctx.stroke();
   
   ctx.restore();
}

// Rigid structural grid with half-pixel drift on non-load-bearing elements
function drawGrid(time) {
   const spacing = 80;
   const cols = Math.ceil(width / spacing) + 1;
   const rows = Math.ceil(height / spacing) + 1;
   
   // Determine if we just snapped (metronome boundary)
   const metronomePhase = (metronomeTime % METRONOME_PERIOD) / METRONOME_PERIOD;
   const justSnapped = metronomePhase < 0.02 && metronomeTime > 100;
   
   // Drift for non-load-bearing, ZERO drift on load-bearing lines
   const snapTightness = justSnapped ? 0 : (hoverActive ? 0.3 : 0.15);
   
   ctx.lineWidth = 0.5;
   
   for (let i = 0; i <= cols; i++) {
      const x = i * spacing;
      const isLoadBearing = (i % 4 === 0);
      
      let offsetX = 0;
      if (!isLoadBearing) {
         offsetX = getDrift(time / 1000 + i) * snapTightness;
      }
      
      const drawX = x + offsetX;
      
      // Grid line color: darker for load-bearing, lighter for secondary
      if (isLoadBearing) {
         ctx.strokeStyle = `rgba(139, 115, 85, ${0.3 + revealProgress * 0.4})`;
      } else {
         ctx.strokeStyle = `rgba(160, 145, 115, ${0.15 + revealProgress * 0.3})`;
      }
      
      ctx.beginPath();
      ctx.moveTo(drawX, 0);
      ctx.lineTo(drawX, height);
      ctx.stroke();
   }
   
   for (let j = 0; j <= rows; j++) {
      const y = j * spacing;
      const isLoadBearing = (j % 4 === 0);
      
      let offsetY = 0;
      if (!isLoadBearing) {
         offsetY = getDrift(time / 1000 + j + 100) * snapTightness;
      }
      
      const drawY = y + offsetY;
      
      if (isLoadBearing) {
         ctx.strokeStyle = `rgba(139, 115, 85, ${0.3 + revealProgress * 0.4})`;
      } else {
         ctx.strokeStyle = `rgba(160, 145, 115, ${0.15 + revealProgress * 0.3})`;
      }
      
      ctx.beginPath();
      ctx.moveTo(0, drawY);
      ctx.lineTo(width, drawY);
      ctx.stroke();
   }
}

// Hover/tremor effect: tactile soft response
function drawHoverTremor(time) {
   if (!hoverActive) return;
   
   const cx = mouseX;
   const cy = mouseY;
   const radius = 80;
   
   // Tremor amplitude: soft attack
   const tremorAmp = sineEase(Math.min(1, (time % 800) / 400)) * 2;
   
   ctx.save();
   ctx.translate(cx + Math.sin(time / 100) * tremorAmp,
                cy + Math.cos(time / 120) * tremorAmp);
   
   // Soft glow circle (lantern feel)
   const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
   grad.addColorStop(0, `rgba(232, 217, 197, ${0.15 + revealProgress * 0.1})`);
   grad.addColorStop(0.5, `rgba(232, 217, 197, ${0.05 + revealProgress * 0.05})`);
   grad.addColorStop(1, 'rgba(232, 217, 197, 0)');
   
   ctx.fillStyle = grad;
   ctx.beginPath();
   ctx.arc(0, 0, radius, 0, Math.PI * 2);
   ctx.fill();
   
   ctx.restore();
}

// Underpulse visual: fades after snap
function drawUnderpulse(time) {
   const metronomePhase = (metronomeTime % METRONOME_PERIOD) / METRONOME_PERIOD;
   const pulseFade = Math.max(0, Math.sin(metronomePhase * Math.PI));
   
   if (pulseFade < 0.01) return;
   
   const cx = width / 2;
   const cy = height / 2;
   
   ctx.save();
   ctx.globalAlpha = pulseFade * 0.08 * pulseAmplitude;
   ctx.strokeStyle = '#D4C5A9';
   ctx.lineWidth = 2;
   ctx.beginPath();
   ctx.arc(cx, cy, 150 + pulseFade * 50, 0, Math.PI * 2);
   ctx.stroke();
   ctx.restore();
}

// Core interaction loop
let prevMetronomeCycle = -1;

function update(time) {
   requestAnimationFrame(render);
   
   // 60fps budget enforcement
   const delta = time - lastFrameTime;
   if (delta < FRAME_DURATION - 2) {
      // Small delay to maintain ~60fps
      setTimeout(() => update(time), FRAME_DURATION - delta);
      return;
   }
   lastFrameTime = time;
   
   // Metronome timing
   metronomeTime += delta;
   const currentCycle = Math.floor(metronomeTime / METRONOME_PERIOD);
   
   // Check for downbeat snap
   if (currentCycle !== prevMetronomeCycle && prevMetronomeCycle >= 0) {
      // Snap occurred
      lastMetronomeSnap = true;
      playSnapClick();
      playUnderpulse();
      pulseAmplitude = 1;
   }
   prevMetronomeCycle = currentCycle;
   
   // Reveal progress: 0..1 over 2.4s (first cycle)
   if (metronomeTime < REVEAL_DURATION) {
      revealProgress = metronomeTime / REVEAL_DURATION;
   } else {
      revealProgress = 1;
   }
   
   // Pulse decay
   pulseAmplitude *= 0.97;
   if (pulseAmplitude < 0.01) pulseAmplitude = 0;
   
   // Drift phase advance
   driftPhase += delta * 0.0005;
   
   // Render
   render(time);
}

function render(time) {
   ctx.clearRect(0, 0, width, height);
   
   const reveal = sineEase(revealProgress);
   
   // 1. Base background (rice paper tone, yellow hue progression)
   drawBaseBackground(reveal);
   
   // 2. Procedural grain overlay
   drawGrainBackground(time);
   
   // 3. Structural grid
   drawGrid(time);
   
   // 4. Central triangle with drift
   drawCentralTriangle(time);
   
   // 5. Hover effects
   drawHoverTremor(time);
   
   // 6. Underpulse visual
   drawUnderpulse(time);
}

// Input handlers
canvas.addEventListener('mousemove', (e) => {
   mouseX = e.clientX;
   mouseY = e.clientY;
   
   if (!hoverActive) {
      hoverActive = true;
      if (!audioInitialized) initAudio();
      playHoverStaccato();
   }
});

canvas.addEventListener('mouseleave', () => {
   hoverActive = false;
   mouseX = -1;
   mouseY = -1;
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
   e.preventDefault();
   if (!audioInitialized) initAudio();
   const touch = e.touches[0];
   mouseX = touch.clientX;
   mouseY = touch.clientY;
   hoverActive = true;
   playHoverStaccato();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
   e.preventDefault();
   const touch = e.touches[0];
   mouseX = touch.clientX;
   mouseY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', () => {
   hoverActive = false;
   mouseX = -1;
   mouseY = -1;
});

// Init
function init() {
   resize();
   initGrain();
   window.addEventListener('resize', resize);
   lastFrameTime = performance.now();
   requestAnimationFrame(update);
}

init();
