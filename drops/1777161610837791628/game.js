const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const needle = document.getElementById('compass-needle');

let W, H, DPR;
function resize() {
   DPR = devicePixelRatio || 1;
   W = canvas.width = Math.round(window.innerWidth * DPR);
   H = canvas.height = Math.round(window.innerHeight * DPR);
   ctx.setTransform(1, 0, 0, 1, 0, 0);
   regenerateGrain();
}
window.addEventListener('resize', resize);
resize();

// Simplex noise
class SimplexNoise {
   constructor(seed = Math.random()) {
      this.grad3 = [
          [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
          [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
          [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
       ];
      this.p = new Uint8Array(512);
      const perm = new Uint8Array(256);
      for (let i = 0; i < 256; i++) perm[i] = i;
      let s = seed * 2147483647 | 0;
      for (let i = 255; i > 0; i--) {
         s = (s * 16807) % 2147483647;
         const j = s % (i + 1);
         const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
       }
      for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    }
   dot3(g, x, y) { return g[0]*x + g[1]*y; }
   noise2D(xin, yin) {
      const F2 = 0.5*(Math.sqrt(3)-1);
      const G2 = (3-Math.sqrt(3))/6;
      const s = (xin+yin)*F2;
      const i = Math.floor(xin+s), j = Math.floor(yin+s);
      const t = (i+j)*G2;
      const X0 = i-t, Y0 = j-t;
      const x0 = xin-X0, y0 = yin-Y0;
      let i1, j1;
      if (x0>y0) { i1=1; j1=0; } else { i1=0; j1=1; }
      const x1=x0-i1+G2, y1=y0-j1+G2;
      const x2=x0-1+2*G2, y2=y0-1+2*G2;
      const ii=i&255, jj=j&255;
      let n0=0, n1=0, n2=0;
      let t0 = 0.5-x0*x0-y0*y0;
      if (t0>=0) { t0*=t0; const gi0=this.p[ii+this.p[jj]]%12; n0=t0*t0*this.dot3(this.grad3[gi0],x0,y0); }
      let t1 = 0.5-x1*x1-y1*y1;
      if (t1>=0) { t1*=t1; const gi1=this.p[ii+i1+this.p[jj+j1]]%12; n1=t1*t1*this.dot3(this.grad3[gi1],x1,y1); }
      let t2 = 0.5-x2*x2-y2*y2;
      if (t2>=0) { t2*=t2; const gi2=this.p[ii+1+this.p[jj+1]]%12; n2=t2*t2*this.dot3(this.grad3[gi2],x2,y2); }
      return 70*(n0+n1+n2);
    }
}
const noise = new SimplexNoise(42);

// Pre-rendered grain texture (low-res for performance)
const grainCanvas = document.createElement('canvas');
const grainCtx = grainCanvas.getContext('2d');
let grainPattern = null;
const GRAIN_RES = 256;

function regenerateGrain() {
   grainCanvas.width = GRAIN_RES;
   grainCanvas.height = GRAIN_RES;
   const img = grainCtx.createImageData(GRAIN_RES, GRAIN_RES);
   const d = img.data;
   for (let y = 0; y < GRAIN_RES; y++) {
      for (let x = 0; x < GRAIN_RES; x++) {
         const idx = (y * GRAIN_RES + x) * 4;
         const n = noise.noise2D(x * 0.15, y * 0.15);
         // Layer two octaves for richer charcoal texture
         const grain = noise.noise2D(x * 0.3, y * 0.3) * 0.4;
         const bright = Math.round((n + grain) * 25 * 0.3);
         d[idx] = bright;
         d[idx+1] = bright;
         d[idx+2] = bright + 2; // Slight blue shift for charcoal feel
         d[idx+3] = Math.round((0.15 + Math.abs(n) * 0.15) * 255);
       }
    }
   grainCtx.putImageData(img, 0, 0);
   grainPattern = ctx.createPattern(grainCanvas, 'repeat');
}

// Easing functions
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutSine(t) { return -0.5 * (Math.cos(Math.PI * t) - 1); }

// Cursor state
const cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 };
let prevCursor = { x: cursor.x, y: cursor.y };
let prevPrevCursor = { x: cursor.x, y: cursor.y };

// Interaction state machine
let isSnapping = false;
let snapPhase = 0;       // 0=half-beat rest, 1=stumble, 2=exhale
let exhaleProgress = 0;
let gridLocked = false;
let snapTimer = 0;        // Tracks snap sub-phases deterministically
let stumbleOffset = { x: 0, y: 0 };
let stumbleStart = { x: 0, y: 0 };
let breathPhase = 0;
let audioDuckFactor = 1;
let targetDuckFactor = 1;
let snapStartTime = 0;
let abortCount = 0;

// Grid
const cellSize = 40;

// Cursor input - ensures audio context starts on first interaction
function ensureAudioCtx() {
   getAudioCtx();
}

function updateCursor(x, y, dt) {
   prevPrevCursor.x = prevCursor.x;
   prevPrevCursor.y = prevCursor.y;
   prevCursor.x = cursor.x;
   prevCursor.y = cursor.y;
   
   // Smooth cursor tracking with slight lag for tactile feel
   const smoothing = 0.8;
   cursor.x = cursor.x * (1 - smoothing) + x * smoothing;
   cursor.y = cursor.y * (1 - smoothing) + y * smoothing;
   
   cursor.vx = cursor.x - prevCursor.x;
   cursor.vy = cursor.y - prevCursor.y;
   
   // Calculate angular change for compass direction
   const angularVel = Math.atan2(cursor.vy, cursor.vx) - 
                      Math.atan2(prevCursor.y - prevPrevCursor.y, prevCursor.x - prevPrevCursor.x);
   cursor.angularVel = Math.abs(angularVel) > Math.PI ? angularVel + (angularVel > 0 ? -2*Math.PI : 2*Math.PI) : angularVel;
   
   // Update compass needle DOM element
   needle.style.left = cursor.x + 'px';
   needle.style.top = cursor.y + 'px';
}

canvas.addEventListener('mousemove', e => { ensureAudioCtx(); updateCursor(e.clientX, e.clientY); });
canvas.addEventListener('touchmove', e => {
   e.preventDefault();
   ensureAudioCtx();
   if (e.touches.length > 0) updateCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchstart', e => {
   e.preventDefault();
   ensureAudioCtx();
   if (e.touches.length > 0) updateCursor(e.touches[0].clientX, e.touches[0].clientY);
   triggerSnap();
}, { passive: false });
canvas.addEventListener('touchend', e => {
   e.preventDefault();
   // Abort state: reset half-beat rest without breaking weave
   if (isSnapping && snapPhase === 0) {
      abortSnap();
   }
}, { passive: false });
canvas.addEventListener('mousedown', e => { ensureAudioCtx(); triggerSnap(); });
canvas.addEventListener('mouseup', e => {
   if (isSnapping && snapPhase === 0) {
      abortSnap();
   }
});

// Abort snap cleanly
function abortSnap() {
   isSnapping = false;
   snapPhase = 0;
   gridLocked = false;
   stumbleOffset.x = 0;
   stumbleOffset.y = 0;
   needle.classList.remove('active');
   targetDuckFactor = 1;
   abortCount++;
}

// Snap interaction
function triggerSnap() {
   ensureAudioCtx();
   if (isSnapping) {
      // If already snapping, abort and restart (handles rapid clicks)
      abortSnap();
   }
   isSnapping = true;
   snapPhase = 0;
   gridLocked = true;
   snapStartTime = performance.now();
   stumbleOffset.x = 0;
   stumbleOffset.y = 0;
   needle.classList.add('active');

   targetDuckFactor = 0.4;
   playSnapAudio();
}

// Audio
let audioCtx = null;
let masterGain = null;
function getAudioCtx() {
   if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
   }
   if (audioCtx.state === 'suspended') audioCtx.resume();
   return audioCtx;
}

let hoverCooldown = 0;
let lastHoverAudioTime = 0;
function playHoverAudio(vel) {
   if (vel < 3) return;
   const ac = getAudioCtx();
   const t = ac.currentTime;
   const dur = Math.min(0.03 + vel * 0.0008, 0.06);
   const amp = Math.min(vel / 100, 0.1) * audioDuckFactor;

   // Brush noise for hi-hat texture
   const bufLen = Math.floor(ac.sampleRate * dur);
   const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
   const data = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) {
      const env = Math.exp(-i / (bufLen * 0.25));
      data[i] = (Math.random() * 2 - 1) * env;
   }
   const src = ac.createBufferSource();
   src.buffer = buf;

   const hp = ac.createBiquadFilter();
   hp.type = 'highpass';
   hp.frequency.value = 7000 + Math.min(vel * 40, 3000);
   hp.Q.value = 0.8;

   const gain = ac.createGain();
   gain.gain.value = amp;

   src.connect(hp);
   hp.connect(gain);
   gain.connect(masterGain);
   src.start(t);

   // Tonal tick for snap-tactile feel at higher velocities
   if (vel > 20) {
      const osc = ac.createOscillator();
      const tg = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = 3200 + vel * 25;
      tg.gain.setValueAtTime(amp * 0.25, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      osc.connect(tg);
      tg.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.025);
   }
}

function playSnapAudio() {
   const ac = getAudioCtx();
   const t = ac.currentTime;

   // Metallic click: FM synthesis with two oscillators
   const carrier = ac.createOscillator();
   const modulator = ac.createOscillator();
   const modGain = ac.createGain();
   const clickGain = ac.createGain();

   carrier.type = 'sine';
   carrier.frequency.setValueAtTime(2800, t);
   carrier.frequency.exponentialRampToValueAtTime(400, t + 0.12);

   modulator.type = 'square';
   modulator.frequency.setValueAtTime(6000, t);
   modulator.frequency.exponentialRampToValueAtTime(1000, t + 0.06);
   modGain.gain.setValueAtTime(1200, t);
   modGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

   clickGain.gain.setValueAtTime(0.12, t);
   clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

   modulator.connect(modGain);
   modGain.connect(carrier.frequency);
   carrier.connect(clickGain);
   clickGain.connect(masterGain);

   carrier.start(t);
   modulator.start(t);
   carrier.stop(t + 0.16);
   modulator.stop(t + 0.1);

   // Brushed steel swipe noise
   const swipeDur = 0.18;
   const sBuf = ac.createBuffer(1, ac.sampleRate * swipeDur, ac.sampleRate);
   const sData = sBuf.getChannelData(0);
   for (let i = 0; i < sData.length; i++) {
      const env = Math.exp(-i / (sData.length * 0.35)) * (0.5 + 0.5 * Math.sin(i * 0.02));
      sData[i] = (Math.random() * 2 - 1) * env;
   }
   const swSrc = ac.createBufferSource();
   swSrc.buffer = sBuf;
   const swGain = ac.createGain();
   swGain.gain.value = 0.08;
   const bp = ac.createBiquadFilter();
   bp.type = 'bandpass';
   bp.frequency.value = 2500;
   bp.Q.value = 2;
   swSrc.connect(bp);
   bp.connect(swGain);
   swGain.connect(masterGain);
   swSrc.start(t + 0.02);

   // Sub-thump for tactile weight
   const thump = ac.createOscillator();
   const tGain = ac.createGain();
   thump.type = 'sine';
   thump.frequency.setValueAtTime(150, t);
   thump.frequency.exponentialRampToValueAtTime(40, t + 0.1);
   tGain.gain.setValueAtTime(0.1, t);
   tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
   thump.connect(tGain);
   tGain.connect(masterGain);
   thump.start(t);
   thump.stop(t + 0.13);
}

function playExhaleAudio() {
   const ac = getAudioCtx();
   const t = ac.currentTime;

   // Primary voice: descending minor arpeggio C4->A3->F3->C3
   const notes = [261.63, 220.00, 174.61, 130.81];
   notes.forEach((freq, i) => {
      // Main tone
      const osc = ac.createOscillator();
      const g = ac.createGain();
      const lp = ac.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const st = t + i * 0.2;
      const peakAmp = 0.08 / (1 + i * 0.15);
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(peakAmp, st + 0.015);
      g.gain.linearRampToValueAtTime(peakAmp * 0.7, st + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.8);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2000, st);
      lp.frequency.exponentialRampToValueAtTime(300, st + 0.8);
      lp.Q.value = 1;
      osc.connect(lp);
      lp.connect(g);
      g.connect(masterGain);
      osc.start(st);
      osc.stop(st + 0.85);

      // Slight detune for chorus warmth
      const osc2 = ac.createOscillator();
      const g2 = ac.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.003;
      g2.gain.setValueAtTime(0, st + 0.005);
      g2.gain.linearRampToValueAtTime(peakAmp * 0.3, st + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.001, st + 0.7);
      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start(st + 0.005);
      osc2.stop(st + 0.75);
   });

   // Secondary voice: octave down, soft pad
   const notes2 = [130.81, 110.00, 87.31, 65.41];
   notes2.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const st = t + i * 0.2 + 0.05;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.025, st + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.9);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(st);
      osc.stop(st + 0.95);
   });
}

// Deterministic 60fps render loop
let lastFrameTime = 0;
let frameAccumulator = 0;
const FRAME_DURATION = 1000 / 60; // Fixed timestep for determinism
let lastAudioTime = 0;

function render(ts) {
   requestAnimationFrame(render);
   
   if (lastFrameTime === 0) {
      lastFrameTime = ts;
      return;
   }
   
   // Fixed timestep: accumulate time and process at 60fps intervals
   const delta = ts - lastFrameTime;
   frameAccumulator += delta;
   
   // Process at most 3 frames to prevent spiral of death
   let framesProcessed = 0;
   while (frameAccumulator >= FRAME_DURATION && framesProcessed < 3) {
      frameAccumulator -= FRAME_DURATION;
      lastFrameTime = ts;
      framesProcessed++;
      
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      
      // ---- Update phase ----
      
      // Smooth duck factor interpolation
      audioDuckFactor += (targetDuckFactor - audioDuckFactor) * 0.12;
      if (masterGain) {
         masterGain.gain.setTargetAtTime(audioDuckFactor, getAudioCtx().currentTime, 0.015);
      }
      
      // Snap phase timing (deterministic)
      if (isSnapping) {
         const elapsed = ts - snapStartTime;
         
         if (snapPhase === 0) {
            // 150ms hesitation before downbeat
            if (elapsed > 150) {
               snapPhase = 1;
               gridLocked = false;
               // Seed tumble offset
               const tumbleRadius = 6 + Math.random() * 4;
               const stumbleAngle = Math.random() * Math.PI * 2;
               stumbleStart.x = Math.cos(stumbleAngle) * tumbleRadius;
               stumbleStart.y = Math.sin(stumbleAngle) * tumbleRadius;
               stumbleOffset.x = stumbleStart.x;
               stumbleOffset.y = stumbleStart.y;
               targetDuckFactor = 0.55;
            }
         } else if (snapPhase === 1) {
            // Stumble phase: 280ms micro-stumble
            if (elapsed > 160 + 280) {
               snapPhase = 2;
               exhaleProgress = 1;
               targetDuckFactor = 0.3;
               playExhaleAudio();
            }
            // Stumble interpolation with eased return
            const stumbleT = Math.min((elapsed - 160) / 280, 1);
            const easedT = easeOutCubic(stumbleT);
            stumbleOffset.x = stumbleStart.x * (1 - easedT);
            stumbleOffset.y = stumbleStart.y * (1 - easedT);
            // Add a secondary wobble during stumble
            stumbleOffset.x += Math.sin(stumbleT * Math.PI * 3) * 3 * (1 - easedT);
            stumbleOffset.y += Math.cos(stumbleT * Math.PI * 2.5) * 2 * (1 - easedT);
         } else if (snapPhase === 2) {
            // Exhale phase: 800ms resolution
            if (elapsed > 160 + 280 + 800) {
               isSnapping = false;
               snapPhase = 0;
               needle.classList.remove('active');
               targetDuckFactor = 1;
            }
         }
      }
      
      // Exhale decay (completes within ~1s)
      exhaleProgress *= 0.975;
      if (exhaleProgress < 0.001) exhaleProgress = 0;
      
      // Smooth stumble offset decay outside of snap
      if (!isSnapping) {
         stumbleOffset.x *= 0.9;
         stumbleOffset.y *= 0.9;
      }
      
      // Breathing phase (continuous)
      breathPhase += 0.018;
      
      // Cursor effective position with stumble offset
      const effectiveX = cursor.x + stumbleOffset.x;
      const effectiveY = cursor.y + stumbleOffset.y;
      
      // Hover audio (throttled to ~60fps check, 16ms interval)
      const speed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
      hoverCooldown = Math.max(0, hoverCooldown - 1);
      if (hoverCooldown <= 0 && speed > 2 && !isSnapping) {
         playHoverAudio(speed);
         hoverCooldown = 3;
      }
      
      // ---- Draw phase ----
      
      // Background - matte charcoal
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, w, h);
      
      // Base blue field with exhale desaturation
      const blueIntensity = 0.35 - exhaleProgress * 0.25;
      const cr = Math.round(26 * blueIntensity);
      const cg = Math.round(58 * blueIntensity);
      const cb = Math.round(106 * blueIntensity);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillRect(0, 0, w, h);
      
      // Proximity-based breathing blue field
      const maxReach = Math.min(w, h) * 0.45;
      const nCols = Math.ceil(w / cellSize) + 2;
      const nRows = Math.ceil(h / cellSize) + 2;
      const breathMod = 1 + Math.sin(breathPhase) * 0.12;
      
      for (let i = 0; i < nRows; i++) {
         for (let j = 0; j < nCols; j++) {
            const cx = j * cellSize + cellSize * 0.5;
            const cy = i * cellSize + cellSize * 0.5;
            const dx = cx - effectiveX;
            const dy = cy - effectiveY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Smooth proximity falloff using cosine
            const prox = Math.max(0, 1 - dist / (maxReach * breathMod));
            const smoothProx = prox * prox * (3 - 2 * prox); // smoothstep
            if (smoothProx < 0.02) continue;
            
            // Blue saturation shift based on proximity
            const sat = 0.25 + smoothProx * 0.75;
            const breathShift = Math.sin(breathPhase * 0.7 + cx * 0.004 + cy * 0.003) * 0.15;
            
            // #2A5CAA to #1A3A6A gradient based on proximity
            const r = Math.round((42 + breathShift * 15) * sat);
            const g = Math.round((92 + breathShift * 8) * sat);
            const b = Math.round((170 - breathShift * 12) * sat);
            const alpha = smoothProx * (0.3 + breathShift * 0.2) * (1 - exhaleProgress * 0.45);
            
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
         }
      }
      
      // Time for wobble calculations
      const t = ts * 0.001;
      
      // Structural grid lines with cursor-proximity wobble + velocity-driven displacement
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(6,6,6,0.85)';
      
      // Horizontal lines
      for (let i = 0; i <= nRows; i++) {
         ctx.beginPath();
         const baseY = i * cellSize;
         for (let j = 0; j <= nCols; j++) {
            const bx = j * cellSize;
            const dx = bx - effectiveX;
            const dy = baseY - effectiveY;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            
            // Proximity-based wobble amplitude
            const proxWobble = Math.min(6 / (dist * 0.012), 4) * (gridLocked ? 0.15 : 1);
            
            // Noise-based organic wobble
            const nx = noise.noise2D(bx * 0.018 + t * 0.25, baseY * 0.018) * proxWobble;
            const ny = noise.noise2D(baseY * 0.018 + t * 0.2, bx * 0.018) * proxWobble * 0.7;
            
            // Velocity-driven displacement (cursor motion pulls nearby grid)
            const velInfluence = speed * 0.08 * Math.max(0, 1 - dist / 200);
            const vxDisp = (cursor.vx * velInfluence * 0.3);
            const vyDisp = (cursor.vy * velInfluence * 0.5);
            
            const px = bx + nx + vxDisp;
            const py = baseY + ny + vyDisp;
            
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
         }
         ctx.stroke();
      }
      
      // Vertical lines
      for (let j = 0; j <= nCols; j++) {
         ctx.beginPath();
         const baseX = j * cellSize;
         for (let i = 0; i <= nRows; i++) {
            const by = i * cellSize;
            const dx = baseX - effectiveX;
            const dy = by - effectiveY;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            
            const proxWobble = Math.min(6 / (dist * 0.012), 4) * (gridLocked ? 0.15 : 1);
            
            const nx = noise.noise2D(baseX * 0.018 + t * 0.25, by * 0.018) * proxWobble;
            const ny = noise.noise2D(by * 0.018 + t * 0.2, baseX * 0.018) * proxWobble * 0.7;
            
            const velInfluence = speed * 0.08 * Math.max(0, 1 - dist / 200);
            const vxDisp = cursor.vx * velInfluence * 0.5;
            const vyDisp = cursor.vy * velInfluence * 0.3;
            
            const px = baseX + nx + vxDisp;
            const py = by + ny + vyDisp;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
         }
         ctx.stroke();
      }
      
       // Grain overlay (pre-rendered pattern, slight offset for parallax feel)
      if (grainPattern) {
         ctx.save();
         const grainAlpha = 0.28 - exhaleProgress * 0.12;
         ctx.globalAlpha = grainAlpha;
         const grainOffX = (cursor.x * 0.08) % GRAIN_RES;
         const grainOffY = (cursor.y * 0.08) % GRAIN_RES;
         ctx.translate(grainOffX, grainOffY);
         ctx.fillStyle = grainPattern;
         ctx.fillRect(-GRAIN_RES, -GRAIN_RES, w + 2 * GRAIN_RES, h + 2 * GRAIN_RES);
         ctx.restore();
       }
      
      // Snap phase visual overlays
      if (isSnapping && snapPhase === 0) {
         // Half-beat structural rest: subtle pulse
         const pulse = 0.12 + Math.sin(ts * 0.025) * 0.03;
         ctx.fillStyle = `rgba(12,12,12,${pulse})`;
         ctx.fillRect(0, 0, w, h);
      } else if (isSnapping && snapPhase === 2) {
         // Exhale: dimming overlay
         const exhaleAlpha = exhaleProgress * 0.2;
         ctx.fillStyle = `rgba(20,20,20,${exhaleAlpha})`;
         ctx.fillRect(0, 0, w, h);
      }
      
      // Compass needle at cursor (canvas-drawn)
      const compR = 6;
      const compAlpha = Math.min(0.4 + speed * 0.015, 0.9);
      
      // Outer ring
      ctx.strokeStyle = `rgba(58,122,255,${compAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, compR, 0, Math.PI * 2);
      ctx.stroke();
      
      // Direction indicator
      if (speed > 0.5) {
         const angle = Math.atan2(cursor.vy, cursor.vx);
         const dirLen = compR * 2.2;
         
         ctx.strokeStyle = `rgba(90,160,255,${compAlpha * 0.9})`;
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(cursor.x, cursor.y);
         ctx.lineTo(
            cursor.x + Math.cos(angle) * dirLen,
            cursor.y + Math.sin(angle) * dirLen
         );
         ctx.stroke();
         
         // Arrowhead
         const headLen = 4;
         const headAngle = 0.5;
         const tipX = cursor.x + Math.cos(angle) * dirLen;
         const tipY = cursor.y + Math.sin(angle) * dirLen;
         ctx.beginPath();
         ctx.moveTo(tipX, tipY);
         ctx.lineTo(
            tipX - Math.cos(angle - headAngle) * headLen,
            tipY - Math.sin(angle - headAngle) * headLen
         );
         ctx.moveTo(tipX, tipY);
         ctx.lineTo(
            tipX - Math.cos(angle + headAngle) * headLen,
            tipY - Math.sin(angle + headAngle) * headLen
         );
         ctx.stroke();
      }
      
      // Center dot
      ctx.fillStyle = `rgba(58,122,255,${compAlpha})`;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 2, 0, Math.PI * 2);
      ctx.fill();
   }
}

requestAnimationFrame(render);
