const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const needle = document.getElementById('compass-needle');

let W, H, DPR;
function resize() {
   DPR = devicePixelRatio;
   W = canvas.width = window.innerWidth * DPR;
   H = canvas.height = window.innerHeight * DPR;
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
         const grain = Math.round(n * 30 * 0.3);
         d[idx] = grain;
         d[idx+1] = grain;
         d[idx+2] = grain;
         d[idx+3] = Math.round((Math.abs(n) * 0.3) * 255);
      }
   }
   grainCtx.putImageData(img, 0, 0);
   grainPattern = ctx.createPattern(grainCanvas, 'repeat');
}

// Cursor state
const cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 };
let prevCursor = { x: cursor.x, y: cursor.y };
let isSnapping = false;
let snapPhase = 0;
let exhaleProgress = 0;
let gridLocked = false;
let stumbleOffset = { x: 0, y: 0 };
let breathPhase = 0;
let audioDuckFactor = 1;
let targetDuckFactor = 1;

// Grid
const cellSize = 40;

// Cursor input - ensures audio context starts on first interaction
function ensureAudioCtx() {
   getAudioCtx();
}

function updateCursor(x, y) {
   prevCursor.x = cursor.x;
   prevCursor.y = cursor.y;
   cursor.x = x;
   cursor.y = y;
   cursor.vx = cursor.x - prevCursor.x;
   cursor.vy = cursor.y - prevCursor.y;
   needle.style.left = cursor.x + 'px';
   needle.style.top = cursor.y + 'px';
}

canvas.addEventListener('mousemove', e => { ensureAudioCtx(); updateCursor(e.clientX, e.clientY); });
canvas.addEventListener('touchmove', e => {
   e.preventDefault();
   ensureAudioCtx();
   updateCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchstart', e => {
   e.preventDefault();
   ensureAudioCtx();
   if (e.touches.length > 0) updateCursor(e.touches[0].clientX, e.touches[0].clientY);
   triggerSnap();
}, { passive: false });
canvas.addEventListener('mousedown', e => { ensureAudioCtx(); triggerSnap(); });

// Snap interaction
function triggerSnap() {
    ensureAudioCtx();
    if (isSnapping) return;
    isSnapping = true;
    snapPhase = 0;
    gridLocked = true;
    stumbleOffset.x = 0;
    stumbleOffset.y = 0;
    needle.classList.add('active');

    targetDuckFactor = 0.4;
    playSnapAudio();

    setTimeout(() => {
       snapPhase = 1;
       gridLocked = false;
       stumbleOffset.x = (Math.random() - 0.5) * 8;
       stumbleOffset.y = (Math.random() - 0.5) * 8;
       targetDuckFactor = 0.55;
       setTimeout(() => { targetDuckFactor = 1; }, 280);
     }, 150);

    setTimeout(() => {
       snapPhase = 2;
       exhaleProgress = 1;
       playExhaleAudio();
       setTimeout(() => {
          isSnapping = false;
          snapPhase = 0;
          needle.classList.remove('active');
        }, 800);
     }, 300);
}

// Audio
let audioCtx = null;
let masterGain = null;
function getAudioCtx() {
   if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = audioDuckFactor;
      masterGain.connect(audioCtx.destination);
   }
   if (audioCtx.state === 'suspended') audioCtx.resume();
   return audioCtx;
}

function setMasterDuck(val) {
   if (!masterGain) return;
   masterGain.gain.setTargetAtTime(val, getAudioCtx().currentTime, 0.02);
}

let hoverCooldown = 0;
let lastHoverAudioTime = 0;
function playHoverAudio(vel) {
   if (vel < 3) return;
   const ac = getAudioCtx();
   const t = ac.currentTime;
   const dur = Math.min(0.03 + vel * 0.001, 0.08);
   const amp = Math.min(vel / 80, 0.12);

   // Brush noise for hi-hat texture
   const bufLen = Math.floor(ac.sampleRate * dur);
   const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
   const data = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) {
      const env = Math.exp(-i / (bufLen * 0.3));
      data[i] = (Math.random() * 2 - 1) * env;
   }
   const src = ac.createBufferSource();
   src.buffer = buf;

   const hp = ac.createBiquadFilter();
   hp.type = 'highpass';
   hp.frequency.value = 7000 + Math.min(vel * 50, 3000);
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
      osc.frequency.value = 3200 + vel * 30;
      tg.gain.setValueAtTime(amp * 0.3, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      osc.connect(tg);
      tg.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.03);
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

    // Primary voice: descending minor arpeggio C4->A3->F3 (as per spec)
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
      // ADSR: fast attack, medium sustain, smooth release
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

// 60fps render loop
let lastTime = 0;
let lastAudioTime = 0;
const FRAME_MS = 1000 / 60;

function render(ts) {
   requestAnimationFrame(render);
    if (lastTime === 0) lastTime = ts;
    const delta = ts - lastTime;
    if (delta < FRAME_MS * 0.8) return;
    lastTime = ts;

   const w = window.innerWidth;
   const h = window.innerHeight;
   ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

     // Smooth duck factor interpolation + apply to master gain
    audioDuckFactor += (targetDuckFactor - audioDuckFactor) * 0.15;
    if (masterGain) {
       masterGain.gain.setTargetAtTime(audioDuckFactor, getAudioCtx().currentTime, 0.02);
    }

   // Hover audio throttle
   if (ts - lastAudioTime > 16) {
      lastAudioTime = ts;
      const speed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
      if (speed > 2 && hoverCooldown <= 0) {
         playHoverAudio(speed);
         hoverCooldown = 4;
      }
      hoverCooldown = Math.max(0, hoverCooldown - 1);
   }

   // Exhale decay (completes within ~1s)
   exhaleProgress *= 0.978;
   if (exhaleProgress < 0.001) exhaleProgress = 0;

   // Stumble interpolation (micro-stumble after grid lock)
   stumbleOffset.x *= 0.92;
   stumbleOffset.y *= 0.92;

   // Breathing phase
   breathPhase += 0.015;

   // Cursor effective position with stumble offset (calculated BEFORE use)
   const effectiveX = cursor.x + stumbleOffset.x;
   const effectiveY = cursor.y + stumbleOffset.y;

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

   // Breathing blue proximity fill
   const maxReach = Math.min(w, h) * 0.4;
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
         const prox = 1 - Math.min(dist / (maxReach * breathMod), 1);
         if (prox < 0.05) continue;
         const sat = 0.4 + prox * 0.6;
         const breathShift = Math.sin(breathPhase * 0.7 + cx * 0.005) * 0.15;
         const rc = Math.round((42 + breathShift * 20) * sat);
         const gc = Math.round((92 + breathShift * 10) * sat);
         const bc = Math.round((170 - breathShift * 15) * sat);
         const alpha = prox * (0.35 + breathShift * 0.3) * (1 - exhaleProgress * 0.5);
         ctx.fillStyle = `rgba(${rc},${gc},${bc},${alpha})`;
         ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
   }

   // Time for wobble
   const t = ts * 0.001;

   // Structural grid lines with cursor-proximity wobble
   ctx.lineWidth = 1;
   ctx.strokeStyle = 'rgba(8,8,8,0.8)';

   // Horizontal lines
   for (let i = 0; i <= nRows; i++) {
      ctx.beginPath();
      const baseY = i * cellSize;
      for (let j = 0; j <= nCols; j++) {
         const bx = j * cellSize;
         const dx = bx - effectiveX;
         const dy = baseY - effectiveY;
         const dist = Math.sqrt(dx * dx + dy * dy) + 1;
         const wobbleAmt = Math.min(4 / (dist * 0.015), 3.5) * (gridLocked ? 0.1 : 1);
         const nx = noise.noise2D(bx * 0.02 + t * 0.3, baseY * 0.02) * wobbleAmt;
         const ny = noise.noise2D(baseY * 0.02 + t * 0.2, bx * 0.02) * wobbleAmt;
         const px = bx + nx;
         const py = baseY + ny;
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
         const wobbleAmt = Math.min(4 / (dist * 0.015), 3.5) * (gridLocked ? 0.1 : 1);
         const nx = noise.noise2D(baseX * 0.02 + t * 0.3, by * 0.02) * wobbleAmt;
         const ny = noise.noise2D(by * 0.02 + t * 0.2, baseX * 0.02) * wobbleAmt;
         const px = baseX + nx;
         const py = by + ny;
         if (i === 0) ctx.moveTo(px, py);
         else ctx.lineTo(px, py);
      }
      ctx.stroke();
   }

   // Grain overlay (pre-rendered pattern)
   if (grainPattern) {
      ctx.save();
      ctx.globalAlpha = 0.3 - exhaleProgress * 0.15;
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
   }

   // Snap phase overlays
   if (isSnapping) {
      if (snapPhase === 0) {
         // Half-beat structural rest
         const pulse = 0.15 + Math.sin(ts * 0.03) * 0.04;
         ctx.fillStyle = `rgba(15,15,15,${pulse})`;
         ctx.fillRect(0, 0, w, h);
      } else if (snapPhase === 2) {
         ctx.fillStyle = `rgba(25,25,25,${exhaleProgress * 0.18})`;
         ctx.fillRect(0, 0, w, h);
      }
   }

   // Compass needle at cursor (canvas-drawn)
   const compassR = 7;
   const speed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
   const alpha = Math.min(0.5 + speed * 0.02, 1);
   ctx.strokeStyle = `rgba(58,122,255,${alpha})`;
   ctx.lineWidth = 1.5;
   ctx.beginPath();
   ctx.arc(cursor.x, cursor.y, compassR, 0, Math.PI * 2);
   ctx.stroke();
   if (speed > 0.5) {
      const angle = Math.atan2(cursor.vy, cursor.vx);
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      ctx.lineTo(
         cursor.x + Math.cos(angle) * compassR * 2.5,
         cursor.y + Math.sin(angle) * compassR * 2.5
      );
      ctx.stroke();
   }
}
requestAnimationFrame(render);
