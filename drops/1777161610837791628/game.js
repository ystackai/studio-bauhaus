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

// Grid
const cellSize = 40;

// Cursor input
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
canvas.addEventListener('mousemove', e => updateCursor(e.clientX, e.clientY));
canvas.addEventListener('touchmove', e => {
   e.preventDefault();
   updateCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('mousedown', triggerSnap);
canvas.addEventListener('touchstart', triggerSnap);

// Snap interaction
function triggerSnap() {
    if (isSnapping) return;
    isSnapping = true;
    snapPhase = 0;
    gridLocked = true;
    stumbleOffset.x = 0;
    stumbleOffset.y = 0;
    needle.classList.add('active');
    audioDuckFactor = 1;
    playSnapAudio();
    setTimeout(() => {
       snapPhase = 1;
       gridLocked = false;
       stumbleOffset.x = (Math.random() - 0.5) * 8;
       stumbleOffset.y = (Math.random() - 0.5) * 8;
       const ac = getAudioCtx();
       audioDuckFactor = 0.55;
       setTimeout(() => { audioDuckFactor = 1; }, 320);
      }, 160);
    setTimeout(() => {
       snapPhase = 2;
       exhaleProgress = 1;
       playExhaleAudio();
       setTimeout(() => {
          isSnapping = false;
          snapPhase = 0;
          needle.classList.remove('active');
         }, 1000);
      }, 350);
 }

// Audio
let audioCtx = null;
function getAudioCtx() {
   if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
   if (audioCtx.state === 'suspended') audioCtx.resume();
   return audioCtx;
}

let hoverCooldown = 0;
function playHoverAudio(vel) {
   if (vel < 2) return;
   const ac = getAudioCtx();
   const osc = ac.createOscillator();
   const gain = ac.createGain();
   const filter = ac.createBiquadFilter();
   filter.type = 'highpass';
   filter.frequency.value = 6000;
   osc.type = 'triangle';
   osc.frequency.value = 8000 + vel * 100;
    gain.gain.value = Math.min(vel / 50, 0.06) * audioDuckFactor;
   osc.connect(filter);
   filter.connect(gain);
   gain.connect(ac.destination);
   osc.start();
   osc.stop(ac.currentTime + 0.04);
}

function playSnapAudio() {
   const ac = getAudioCtx();
   const t = ac.currentTime;
   // Metallic click
   const osc = ac.createOscillator();
   const g1 = ac.createGain();
   osc.type = 'square';
   osc.frequency.setValueAtTime(2200, t);
   osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);
   g1.gain.setValueAtTime(0.15, t);
   g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
   osc.connect(g1);
   g1.connect(ac.destination);
   osc.start(t);
   osc.stop(t + 0.09);
   // Brushed steel swipe
   const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.25));
    }
   const ns = ac.createBufferSource();
   ns.buffer = buf;
   const g2 = ac.createGain();
   g2.gain.value = 0.1;
   const bp = ac.createBiquadFilter();
   bp.type = 'bandpass';
   bp.frequency.value = 3000;
   bp.Q.value = 1.5;
   ns.connect(bp);
   bp.connect(g2);
   g2.connect(ac.destination);
   ns.start(t + 0.03);
}

function playExhaleAudio() {
   const ac = getAudioCtx();
   const t = ac.currentTime;
   // Descending minor arpeggio C4->A3->F3
   const notes = [261.63, 220, 174.61];
   notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const st = t + i * 0.2;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.07, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.8);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(st);
      osc.stop(st + 0.85);
    });
}

// 60fps render loop
let lastTime = 0;
let lastAudioTime = 0;
const FRAME_MS = 1000 / 60;

function render(ts) {
   requestAnimationFrame(render);
   const delta = ts - lastTime;
   if (delta < FRAME_MS * 0.8) return;
   lastTime = ts;

   const w = window.innerWidth;
   const h = window.innerHeight;
   ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

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

    // Exhale decay
    exhaleProgress *= 0.983;

    // Stumble interpolation (micro-stumble after grid lock)
    stumbleOffset.x *= 0.92;
    stumbleOffset.y *= 0.92;

    // Breathing phase
    breathPhase += 0.015;

   // Background - matte charcoal
   ctx.fillStyle = '#2a2a2a';
   ctx.fillRect(0, 0, w, h);

   // Base blue field
   const blueIntensity = 0.35 - exhaleProgress * 0.2;
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

    // Cursor effective position with stumble offset
    const effectiveX = cursor.x + stumbleOffset.x;
    const effectiveY = cursor.y + stumbleOffset.y;

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

   // Compass needle at cursor
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
