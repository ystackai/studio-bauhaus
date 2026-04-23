// --- Bauhaus Press: Ink on Linen ---

const HOLD_MS = 120;
const RIPPLE_MS = 800;
const SETTLE_VEL_THRESHOLD = 4; // px/s to be considered settled
const VEL_WINDOW_MS = 60;

// Canvas / context
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });

// --- Linen noise offscreen texture ---
let noiseCanvas, noiseCtx, noiseData;
function createLinenNoise(w, h) {
     noiseCanvas = document.createElement('canvas');
     noiseCanvas.width = w;
     noiseCanvas.height = h;
     noiseCtx = noiseCanvas.getContext('2d');

     const img = noiseCtx.createImageData(w, h);
     const d = img.data;

     // Seeded simple-noise via hash for determinism
     let seed = 42;
     function srandom() {
         seed = (seed * 16807 + 0) % 2147483647;
         return (seed - 1) / 2147483646;
     }

     // Fill with base noise
     for (let i = 0; i < d.length; i += 4) {
         const n = Math.floor(srandom() * 30 + 190); // 190-220, subtle
         d[i] = n; d[i + 1] = n; d[i + 2] = n + 5; d[i + 3] = 40; // low alpha
     }

     // Horizontal threads (linen weave pattern)
     for (let y = 0; y < h; y++) {
         if (y % 3 === 0 || y % 7 === 0) {
             for (let x = 0; x < w; x++) {
                 const idx = (y * w + x) * 4;
                 const thread = Math.floor(Math.sin(x * 0.3 + srandom() * 2) * 15);
                 d[idx] -= thread;
                 d[idx + 1] -= thread;
                 d[idx + 2] -= thread - 2;
                     d[idx + 3] += 12;
             }
         }
     }

     // Vertical threads (crosshatch)
     for (let x = 0; x < w; x++) {
         if (x % 5 === 0 || x % 11 === 0) {
             for (let y = 0; y < h; y++) {
                 const idx = (y * w + x) * 4;
                 const thread = Math.floor(Math.sin(y * 0.3 + srandom() * 2) * 12);
                     d[idx] -= thread;
                     d[idx + 1] -= thread;
                     d[idx + 2] -= thread - 1;
                     d[idx + 3] += 8;
             }
         }
     }

     noiseCtx.putImageData(img, 0, 0);
     noiseData = img.data;
}

function sampleNoise(nx, ny) {
     // nx, ny in [0,1), return normalized 0-1
     const x = Math.floor(ny * noiseCanvas.width) % noiseCanvas.width;
     const y = Math.floor(ny * noiseCanvas.height) % noiseCanvas.height;
     const idx = (y * noiseCanvas.width + x) * 4;
     return ((noiseData[idx] - 190) / 35); // normalize to roughly -0.2..1.0
}

// --- Resize ---
let W, H;
function resize() {
     const dpr = window.devicePixelRatio || 1;
     W = window.innerWidth;
     H = window.innerHeight;
     canvas.width = W * dpr;
     canvas.height = H * dpr;
     ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
     createLinenNoise(Math.min(W, 1024), Math.min(H, 1024));
}
window.addEventListener('resize', resize);
resize();

// --- Mouse tracking ---
let mx = W / 2, my = H / 2;
const positions = []; // [{x, y, t}]

canvas.addEventListener('mousemove', (e) => {
     mx = e.clientX;
     my = e.clientY;
     positions.push({ x: e.clientX, y: e.clientY, t: performance.now() });
});

// Touch support (basic, single finger — best-effort for the constraint)
canvas.addEventListener('touchmove', (e) => {
     e.preventDefault();
     const t = e.touches[0];
     mx = t.clientX;
     my = t.clientY;
     positions.push({ x: t.clientX, y: t.clientY, t: performance.now() });
}, { passive: false });

function getVelocity(now) {
     const cutoff = now - VEL_WINDOW_MS;
     while (positions.length > 0 && positions[0].t < cutoff) positions.shift();
     if (positions.length < 2) return 0;
     const first = positions[0];
     const last = positions[positions.length - 1];
     const dt = last.t - first.t;
     if (dt < 8) return { speed: Infinity }; // still moving fast or single frame
     const dx = last.x - first.x;
     const dy = last.y - first.y;
     return { speed: Math.sqrt(dx * dx + dy * dy) / (dt / 1000), dx, dy };
}

// --- Settle detection state machine ---
const STATES = { MOVING: 0, HOLDING: 1, RIPPLING: 2 };
let state = STATES.MOVING;
let settleTime = 0; // when settle was detected
let ripples = []; // active ripple objects

function updateSettle(now) {
     if (state === STATES.RIPPLING) return; // can't reset during ripple

     const vel = getVelocity(now);

     if (vel.speed < SETTLE_VEL_THRESHOLD || positions.length === 0) {
         // Settled or no motion
         if (state === STATES.MOVING) {
             state = STATES.HOLDING;
             settleTime = now;
             // Clear positions so a new movement starts fresh
             positions.length = 0;
         } else if (state === STATES.HOLDING) {
             if (now - settleTime >= HOLD_MS) {
                 triggerRipple(mx, my);
                 state = STATES.RIPPLING;
                 ripples[ripples.length - 1].onComplete = () => {
                     state = STATES.MOVING;
                 };
             }
         }
     } else {
         // Still moving
         state = STATES.MOVING;
     }
}

// --- Ripple system ---
function triggerRipple(x, y) {
     playAudio();
     ripples.push({
         x, y,
         born: performance.now(),
         duration: RIPPLE_MS,
         onComplete: null,
     });
}

function updateRipples(now) {
     for (let i = ripples.length - 1; i >= 0; i--) {
         const r = ripples[i];
         const age = now - r.born;
         if (age >= r.duration) {
             if (r.onComplete) r.onComplete();
             ripples.splice(i, 1);
         }
     }
}

// --- Ink bleed rendering ---
function drawRipple(r) {
     const age = performance.now() - r.born;
     const t = Math.min(age / r.duration, 1); // 0..1

     // Easing: slow attack, fast decay (like ink spreading)
     // Custom bezier-ish: rises quickly then decays with inertia
     const easedT = easeOutExpo(t);
     const alpha = Math.sin(t * Math.PI) * 0.65; // bell curve envelope

     if (alpha <= 0.001 && age > 50) return;

     const maxRadius = 180 + t * 40;
     const radius = easedT * maxRadius;

     noiseCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, noiseCanvas.width, noiseCanvas.height);

     // Draw ripple as a set of organic blobs around the circle perimeter
     // This avoids clean vector edges — multiple samples create irregular ink spread
     const segments = 72;
     ctx.save();

     for (let ring = 0; ring < 3; ring++) {
         const ringOffset = ring * 0.15;
         const ringAlpha = alpha * (1 - ring * 0.28);
         const baseR = radius * (1 + ringOffset);

         // Build path of scattered points around circumference, displaced by linen noise
         ctx.beginPath();
         for (let i = 0; i <= segments; i++) {
             const angle = (i / segments) * Math.PI * 2;

             // Sample multiple noise points for this direction
             const n1 = sampleNoise(
                 (r.x + Math.cos(angle) * baseR * 0.5) / W,
                     (r.y + Math.sin(angle) * baseR * 0.5) / H
             );
             const n2 = sampleNoise(
                 (r.x + Math.cos(angle + 0.1) * baseR) / W,
                     (r.y + Math.sin(angle + 0.1) * baseR) / H
             );

             // Displace radius based on noise — creates organic irregular edges
             const displacement = (n1 * 25 + n2 * 15) * easedT;
             const wobble = Math.sin(i * 3.7 + age * 0.01) * 4 * easedT;
             const rDist = baseR + displacement + wobble;

             const px = r.x + Math.cos(angle) * rDist;
             const py = r.y + Math.sin(angle) * rDist;

             if (i === 0) ctx.moveTo(px, py);
             else {
                 // Use quadratic curves to soften the points
                 const prevAngle = ((i - 1) / segments) * Math.PI * 2;
                 const midR = baseR + (n1 + n2) * 18 * easedT + Math.sin(i * 2.3 + age * 0.008) * 3 * easedT;
                 const cpx = r.x + Math.cos((angle + prevAngle) / 2) * midR;
                 const cpy = r.y + Math.sin((angle + prevAngle) / 2) * midR;
                 ctx.quadraticCurveTo(cpx, cpy, px, py);
             }
         }
         ctx.closePath();

         // Gradient fill that mimics ink soaking — dark center, soft edge
         const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, baseR * 1.4);
         const inkBlue = '#c8d4e8';
         grad.addColorStop(0, `rgba(200, 212, 232, ${ringAlpha * 0.1})`);
         grad.addColorStop(0.3, `rgba(200, 212, 232, ${ringAlpha * 0.55})`);
         grad.addColorStop(0.6, `rgba(180, 195, 220, ${ringAlpha * 0.4})`);
         grad.addColorStop(0.85, `rgba(160, 175, 200, ${ringAlpha * 0.15})`);
         grad.addColorStop(1, `rgba(140, 160, 190, 0)`);

         ctx.fillStyle = grad;
         ctx.fill();
     }

     // Additional scattered ink dots — simulates capillary spread on damp linen
     for (let i = 0; i < 20; i++) {
         const angle = i * 1.61803398875 + age * 0.0003; // golden angle
             const n = sampleNoise(
                 (r.x + Math.cos(angle) * radius * 0.7) / W,
                 (r.y + Math.sin(angle) * radius * 0.7) / H
             );
             if (n > 0.2) {
                 const dist = radius * (0.4 + n * 0.8 + Math.random() * 0.3);
                 const dotX = r.x + Math.cos(angle) * dist;
                 const dotY = r.y + Math.sin(angle) * dist;
                 const dotR = 2 + n * 6 * easedT;
                 const dotAlpha = alpha * n * 0.3;

                 ctx.beginPath();
                 ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
                 ctx.fillStyle = `rgba(190, 205, 228, ${dotAlpha})`;
                 ctx.fill();
             }
     }

     ctx.restore();
}

// --- Easing functions ---
function easeOutExpo(t) {
     return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// --- Audio: suspended chord on Web Audio ---
let audioCtx = null;

function initAudio() {
     if (!audioCtx) {
         audioCtx = new (window.AudioContext || window.webkitAudioContext)();
     }
     if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playAudio() {
     initAudio();
     const now = audioCtx.currentTime;
     const dur = RIPPLE_MS / 1000; // 0.8s

     // Three warm partials creating a suspended chord feel
     const freqs = [
         130.81, // C3 - warm bass root
         196.00, // G3 - fifth for warmth
         246.94, // B3 - creates suspended quality (no third)
     ];

     const masterGain = audioCtx.createGain();
     masterGain.gain.setValueAtTime(0, now);
     masterGain.gain.linearRampToValueAtTime(0.12, now + 0.04); // soft attack, no click
     masterGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

     // Low-pass filter for warmth
     const lpf = audioCtx.createBiquadFilter();
     lpf.type = 'lowpass';
     lpf.frequency.setValueAtTime(800, now);
     lpf.frequency.exponentialRampToValueAtTime(200, now + dur * 0.7);
     lpf.Q.value = 0.7;

     masterGain.connect(lpf);
     lpf.connect(audioCtx.destination);

     freqs.forEach((freq, i) => {
         const osc = audioCtx.createOscillator();
         osc.type = 'sine';
             osc.frequency.setValueAtTime(freq + Math.sin(i * 7.3) * 1.5, now); // micro-detune for warmth

         const gain = audioCtx.createGain();
         const vol = [0.5, 0.45, 0.3][i];
         gain.gain.setValueAtTime(vol, now);
         gain.gain.linearRampToValueAtTime(vol * 0.7, now + dur);

         osc.connect(gain);
             gain.connect(masterGain);
             osc.start(now);
         osc.stop(now + dur + 0.05);
     });

     // Soft breath noise: filtered white noise for ambient texture
     const bufferSize = audioCtx.sampleRate * dur;
     const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
     const data = noiseBuffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
         data[i] = (Math.random() * 2 - 1) * 0.015; // very quiet
     }
     const noiseSource = audioCtx.createBufferSource();
     noiseSource.buffer = noiseBuffer;

     const noiseFilter = audioCtx.createBiquadFilter();
         noiseFilter.type = 'bandpass';
         noiseFilter.frequency.value = 600;
         noiseFilter.Q.value = 0.5;

     const noiseGain = audioCtx.createGain();
     noiseGain.gain.setValueAtTime(0, now);
     noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
         noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);

     noiseSource.connect(noiseFilter);
     noiseFilter.connect(noiseGain);
         noiseGain.connect(audioCtx.destination);
         noiseSource.start(now);
     noiseSource.stop(now + dur + 0.05);
}

// --- Main render loop ---
const BAUHAUS_BLUE = '#0a1628'; // Deep saturated blue

function drawBackground() {
     // Solid blue base
     ctx.fillStyle = BAUHAUS_BLUE;
     ctx.fillRect(0, 0, W, H);

     // Linen noise overlay — tiled with subtle transparency
     const nw = noiseCanvas.width;
     const nh = noiseCanvas.height;
     ctx.save();
         ctx.globalAlpha = 0.35;
         for (let ty = -1; ty < Math.ceil(H / nh) + 1; ty++) {
             for (let tx = -1; tx < Math.ceil(W / nw) + 1; tx++) {
                 const ox = tx * nw + ((tx + ty) & 1) * (nw / 2); // slight offset for natural tiling
                 const oy = ty * nh;
                 ctx.drawImage(noiseCanvas, ox, oy);
             }
         }
     ctx.restore();

     // Subtle warm vignette for depth
     const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
     vignette.addColorStop(0, 'rgba(10, 22, 40, 0)');
     vignette.addColorStop(1, 'rgba(5, 10, 20, 0.3)');
     ctx.fillStyle = vignette;
     ctx.fillRect(0, 0, W, H);
}

function drawCursor() {
     // Minimal cursor dot — barely visible, breathes gently
     const breathe = Math.sin(performance.now() * 0.003) * 0.5 + 0.5;
     const r = 2 + breathe * 1.2;
     ctx.beginPath();
     ctx.arc(mx, my, r, 0, Math.PI * 2);
     ctx.fillStyle = `rgba(200, 212, 232, ${0.12 + breathe * 0.06})`;
     ctx.fill();

     // Ripple hint: when settled (holding), cursor grows slightly to signal imminent action
     if (state === STATES.HOLDING) {
         const holdProgress = Math.min((performance.now() - settleTime) / HOLD_MS, 1);
         const hintR = r + holdProgress * 6;
         ctx.beginPath();
             ctx.arc(mx, my, hintR, 0, Math.PI * 2);
         ctx.strokeStyle = `rgba(200, 212, 232, ${holdProgress * 0.08})`;
         ctx.lineWidth = 0.5;
         ctx.stroke();
     }
}

function frame(now) {
     updateSettle(now);
     updateRipples(now);

     drawBackground();

     // Draw all active ripples (blend additively for ink layering feel)
     ctx.save();
     ctx.globalCompositeOperation = 'screen';
     for (const r of ripples) {
         drawRipple(r);
     }
     ctx.restore();

     drawCursor();

     requestAnimationFrame(frame);
}

// --- Init ---
requestAnimationFrame(frame);

// Resume audio on first user gesture (browser policy)
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });
document.addEventListener('mousemove', initAudio, { once: true });
