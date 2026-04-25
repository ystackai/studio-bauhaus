(() => {
  // ── Palette ──────────────────────────────────────────────
  const C = {
    blue:   '#1B4F72',
    yellow: '#FFD600',
    black:  '#1A1A1A',
    white:  '#F5F0E8',
    faint:  'rgba(27,79,114,.08)',
  };

  // ── Canvas / HiDPI ──────────────────────────────────────
  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // ── Linen Map  (2D simplex-ish noise via ValueNoise) ───
  const LS = 512; // linen map size
  class ValueNoise {
    // Simple value noise with interpolation
    constructor(sz) {
      this.sz = sz;
      this.p = new Float32Array(sz * sz);
      for (let i = 0; i < this.p.length; i++) this.p[i] = Math.random();
    }
    _hash(x, y) {
      const i = ((y & (this.sz - 1)) * this.sz + (x & (this.sz - 1)));
      return this.p[i];
    }
    get(nx, ny) {
      const xs = nx * this.sz, ys = ny * this.sz;
      const ix = Math.floor(xs), iy = Math.floor(ys);
      let fx = xs - ix, fy = ys - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      const a = this._hash(ix, iy);
      const b = this._hash(ix + 1, iy);
      const c = this._hash(ix, iy + 1);
      const d = this._hash(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    fbm(nx, ny, oct = 4) {
      let v = 0, amp = 1, freq = 1, total = 0;
      for (let i = 0; i < oct; i++) {
        v += this.get(nx * freq, ny * freq) * amp;
        total += amp;
        amp *= .5;
        freq *= 2;
      }
      return v / total;
    }
  }

  const linen = new ValueNoise(LS);

  // Perlin-direction map for grain anisotropy
  const grain = new ValueNoise(LS);

  // Friction field lookup [0..1] — grain-weighted
  function frictionAt(x, y) {
    const nx = ((x / W()) % 1 + 1) % 1;
    const ny = ((y / H()) % 1 + 1) % 1;
    const base = linen.fbm(nx, ny, 5);            // 0-1 roughness
    return .35 + base * .7;                      // range ~0.35..1.05
  }

  // Grain direction [0..tau] at uv
  function grainDir(x, y) {
    const nx = ((x / W()) % 1 + 1) % 1;
    const ny = ((y / H()) % 1 + 1) % 1;
    return grain.fbm(nx * 3.7, ny * 3.7, 3) * 6.2832;
  }

  // ── State Machine ───────────────────────────────────────
  const S = { WEAVING: 0, HESITATION: 1, LOCK: 2, SLIP: 3 };
  let state = S.WEAVING;

  const HESITATION_MS = 520;
  const VEL_THRESH    = 1.8;     // px/frame for entering hesitation
  const JERK_THRESH   = 3.2;     // max allowed jerk during hesitation
  let hesitateStart   = 0;

  // ── Pointer / Physics ───────────────────────────────────
  let px = W() / 2, py = H() / 2;
  let vx = 0, vy = 0;
  let prevVx = 0, prevVy = 0; // for jerk
  let dragging = false;
  let pointerX = 0, pointerY = 0;
  let trail = [];            // recent positions for drawing the weave
  let locks = [];            // array of {x, y, t} successful locks

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (state === S.SLIP) state = S.WEAVING;
    if (state === S.LOCK) {
      // allow re-weave from lock
      state = S.WEAVING;
    }
  });

  canvas.addEventListener('pointermove', e => {
    pointerX = e.clientX;
    pointerY = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    if (dragging) {
      dragging = false;
      if (state === S.WEAVING) {
        state = S.HESITATION;
        hesitateStart = performance.now();
      }
    }
  });

  // ── Audio Context ───────────────────────────────────────
  let actx;
  function ensureAudio() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  }

  function playSnap() {
    ensureAudio();
    const t = actx.currentTime;
    // Bright transient — short high-passed noise burst
    const buf = actx.createBuffer(1, actx.sampleRate * .06, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * .01));
    const src = actx.createBufferSource();
    src.buffer = buf;
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const g = actx.createGain();
    g.gain.setValueAtTime(.45, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .08);
    src.connect(hp).connect(g).connect(actx.destination);
    src.start(t);
  }

  function playExpand() {
    ensureAudio();
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + .35);
    const g = actx.createGain();
    g.gain.setValueAtTime(.25, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .35);
    osc.connect(g).connect(actx.destination);
    osc.start(t);
    osc.stop(t + .35);
  }

  function playFracture() {
    ensureAudio();
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + .3);
    const g = actx.createGain();
    g.gain.setValueAtTime(.18, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .3);
    osc.connect(g).connect(actx.destination);
    osc.start(t);
    osc.stop(t + .3);
  }

  function playHesitation() {
    ensureAudio();
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    const g = actx.createGain();
    g.gain.setValueAtTime(.07, t);
    g.gain.setValueAtTime(.07, t + .18);
    g.gain.exponentialRampToValueAtTime(.001, t + .4);
    osc.connect(g).connect(actx.destination);
    osc.start(t);
    osc.stop(t + .4);
  }

  // ── Blue field expansion tracker ────────────────────────
  let blueFx = 0;   // expanding radius (visual only)
  let blueFy = 0;
  let blueFt = 0;

  // ── Main Loop ───────────────────────────────────────────
  let lastT = 0;

  function frame(ts) {
    if (!lastT) lastT = ts;
    lastT = ts;

    // ─ Physics step ────────────────────────────────────
    if (dragging && (state === S.WEAVING || state === S.HESITATION)) {
      const dx = pointerX - px;
      const dy = pointerY - py;
      const fric = frictionAt(px, py);
      const gDir = grainDir(px, py);
      // Grain alignment bonus: motion along grain is easier
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(targetAngle - gDir);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const grainEase = Math.cos(angleDiff) * .15;
      const damp = .035 * fric + .025 + grainEase;
      vx += dx * damp;
      vy += dy * damp;
      // Non-linear friction: strong drag at high speed, softer at low
      const spd = Math.hypot(vx, vy);
      const drag = Math.min(spd * .06 * fric, .18);
      vx *= 1 - drag;
      vy *= 1 - drag;
      px += vx;
      py += vy;
    } else {
      // Decay when not dragging
      const fric = frictionAt(px, py);
      const decay = .88 * fric;
      vx *= decay;
      vy *= decay;
      px += vx;
      py += vy;
      if (state === S.WEAVING && Math.hypot(vx, vy) < VEL_THRESH) {
        state = S.HESITATION;
        hesitateStart = ts;
        playHesitation();
      }
    }

    // ─ Hesitation check ────────────────────────────────
    if (state === S.HESITATION) {
      const jerk = Math.hypot(vx - prevVx, vy - prevVy);
      const elapsed = ts - hesitateStart;
      if (elapsed > HESITATION_MS) {
        if (jerk < JERK_THRESH && Math.hypot(vx, vy) < VEL_THRESH * 1.5) {
          // LOCK
          state = S.LOCK;
          locks.push({ x: px, y: py, t: ts });
          blueFx = px;
          blueFy = py;
          blueFt = ts;
          playSnap();
          setTimeout(playExpand, 30);
        } else {
          // SLIP
          state = S.SLIP;
          playFracture();
        }
      } else if (dragging || Math.hypot(vx, vy) > VEL_THRESH * 2.5) {
        // resumed weaving
        state = S.WEAVING;
      }
    }

    prevVx = vx;
    prevVy = vy;

    // ─ Trail ───────────────────────────────────────────
    if (state === S.WEAVING || state === S.HESITATION) {
      trail.push({ x: px, y: py, a: 1 });
      if (trail.length > 400) trail.shift();
    }
    for (const p of trail) p.a *= .995;

    // ── Draw ────────────────────────────────────────
    draw(ts);
    requestAnimationFrame(frame);
  }

  // ── Render ─────────────────────────────────────────
  function draw(ts) {
    const w = W(), h = H();

    // Background
    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, w, h);

    // Grid
    const gs = 60;
    ctx.strokeStyle = C.faint;
    ctx.lineWidth = 1;
    for (let x = gs; x < w; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = gs; y < h; y += gs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Blue field expansion
    if (state === S.LOCK) {
      const age = Math.min((ts - blueFt) / 600, 1);
      const r = age * Math.max(w, h) * .7;
      const g = ctx.createRadialGradient(blueFx, blueFy, 0, blueFx, blueFy, r);
      g.addColorStop(0, 'rgba(27,79,114,.18)');
      g.addColorStop(1, 'rgba(27,79,114,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Lock markers (yellow triangles + anchor circles)
    for (const lk of locks) {
      // Anchor dot
      ctx.fillStyle = C.blue;
      ctx.beginPath();
      ctx.arc(lk.x, lk.y, 5, 0, Math.PI * 2);
      ctx.fill();
      // Triangle
      const sz = 28;
      ctx.fillStyle = C.yellow;
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lk.x, lk.y - sz);
      ctx.lineTo(lk.x - sz * .87, lk.y + sz * .5);
      ctx.lineTo(lk.x + sz * .87, lk.y + sz * .5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Trail (the weave)
    if (trail.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i].a;
        const thick = (1 + frictionAt(trail[i].x, trail[i].y) * 2) * a * a;
        if (state === S.HESITATION && trail[i - 1].a < .4) {
          ctx.strokeStyle = `rgba(255,214,0,${a * .5})`; // yellow tint during hesitation
        } else if (state === S.SLIP) {
          ctx.fillStyle = `rgba(26,26,26,${a * .4})`; // black for slip
          ctx.fillRect(trail[i].x - thick, trail[i].y - thick, thick * 4, thick * 4);
          continue;
        } else {
          ctx.strokeStyle = `rgba(27,79,114,${Math.min(a, .7)})`; // blue weave
        }
        ctx.lineWidth = Math.max(.5, thick);
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }

    // Slip fracture lines
    if (state === S.SLIP) {
      ctx.strokeStyle = `rgba(26,26,26,${.3 + .2 * Math.sin(ts * .02)})`;
      ctx.lineWidth = 1.5;
      for (const lk of locks) {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const len = 15 + Math.random() * 25;
          ctx.beginPath();
          ctx.moveTo(lk.x, lk.y);
          ctx.lineTo(lk.x + Math.cos(a) * len, lk.y + Math.sin(a) * len);
          ctx.stroke();
        }
      }
    }

    // Cursor dot
    if (dragging) {
      ctx.fillStyle = state === S.HESITATION ? C.yellow : C.black;
      ctx.beginPath();
      ctx.arc(px, py, state === S.HESITATION ? 7 + 3 * Math.sin(ts * .015) : 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grain overlay
    drawGrain(w, h, ts);

    // State indicator (subtle, top-left)
    ctx.fillStyle = 'rgba(26,26,26,.35)';
    ctx.font = '11px system-ui';
    ctx.fillText(Object.keys(S).find((k, i) => i === state) || '', 12, 20);
  }

  // ── Grain Texture (canvas-based noise overlay) ──────
  const grainOff = document.createElement('canvas');
  const grainCtx = grainOff.getContext('2d');
  grainOff.width = 256;
  grainOff.height = 256;
  const grainImg = grainCtx.createImageData(256, 256);
  for (let i = 0; i < grainImg.data.length; i += 4) {
    const v = Math.random() * 35 + 60;
    grainImg.data[i] = v;
    grainImg.data[i + 1] = v;
    grainImg.data[i + 2] = v;
    grainImg.data[i + 3] = 14; // very subtle
  }
  grainCtx.putImageData(grainImg, 0, 0);

  function drawGrain(w, h, ts) {
    const off = Math.floor(ts * .005) * 0;
    ctx.globalAlpha = 1;
    const pt = ctx.createPattern(grainOff, 'repeat');
    ctx.fillStyle = pt;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Go ──────────────────────────────────────────────
  requestAnimationFrame(frame);
})();
