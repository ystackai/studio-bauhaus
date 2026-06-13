(() => {
  // ─── Canvas / Context Setup ────────────────────────────────
  const linenCanvas   = document.getElementById('linen');
  const blueFieldCanvas = document.getElementById('blue-field');
  const weaveCanvas   = document.getElementById('weave');
  const ctxLinen      = linenCanvas.getContext('2d');
  const ctxBlue       = blueFieldCanvas.getContext('2d');
  const ctxWeave      = weaveCanvas.getContext('2d');

  let W, H;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    [linenCanvas, blueFieldCanvas, weaveCanvas].forEach(c => { c.width = W; c.height = H; });
    generateLinen();
    regenerateWeave();
  }

  // ─── Audio Engine (Web Audio API) ──────────────────────────
  let audioCtx = null;
  let humOsc = null, humGain = null, humFilter = null;

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    humOsc = audioCtx.createOscillator();
    humGain = audioCtx.createGain();
    humFilter = audioCtx.createBiquadFilter();

    humOsc.type = 'sine';
    humOsc.frequency.value = 72;          // low weight hum ~C2
    humGain.gain.value = 0;
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 150;
    humFilter.Q.value = 2;

    humOsc.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(audioCtx.destination);
    humOsc.start();
  }

  // Smooth interpolation helper for audio params
  function lerpAudio(target, value, speed) {
    const param = typeof target.setTargetAtTime === 'function' ? target : target && target.gain;
    if (param && typeof param.setTargetAtTime === 'function') {
      param.setTargetAtTime(value, audioCtx.currentTime, speed);
    }
  }

  // ─── Linen Grain Texture ───────────────────────────────────
  function generateLinen() {
    const imgData = ctxLinen.createImageData(W, H);
    const d = imgData.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;

        // Fine horizontal threads (every ~4px, slight jitter)
        const hy = Math.abs(Math.sin(y * 1.82 + Math.sin(x * 0.17) * 0.5));
        // Fine vertical threads
        const hx = Math.abs(Math.sin(x * 1.82 + Math.sin(y * 0.17) * 0.5));

        // Grain noise base
        const grain = (Math.random() * 30 - 15);

        // Thread contribution (warm off-white on warm-grey base)
        const threadStrength = ((hy > 0.85 ? 25 : 0) + (hx > 0.85 ? 20 : 0));

        const r = Math.min(255, 210 + grain + threadStrength);
        const g = Math.min(255, 200 + grain + threadStrength);
        const b = Math.min(255, 188 + grain * 0.8 + threadStrength);

        d[i]     = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    ctxLinen.putImageData(imgData, 0, 0);
  }

  // ─── Sparse Thread Weave Geometry ──────────────────────
  const THREAD_SPACING = 72;     // generous gaps for navigation room
  let threads = [];              // array of {x1,y1,x2,y2, weight}

  function regenerateWeave() {
    threads = [];
    const cols = Math.ceil(W / THREAD_SPACING) + 2;
    const rows = Math.ceil(H / THREAD_SPACING) + 2;

    // Horizontal warp threads with sparse distribution
    for (let r = -1; r <= rows; r++) {
      if (Math.random() < 0.3) continue;          // gaps: every ~3rd row removed
      const y = r * THREAD_SPACING + (Math.random() - 0.5) * 8;
      const weight = 1.2 + Math.random() * 0.7;    // varied thickness
      threads.push({ type: 'h', x1: -20, y1: y, x2: W + 20, y2: y, weight });
    }

    // Vertical weft threads with offset and gap
    for (let c = -1; c <= cols; c++) {
      if (Math.random() < 0.3) continue;           // gaps: every ~3rd col removed
      const x = c * THREAD_SPACING + (Math.random() - 0.5) * 8;
      // Offset verticals by half spacing for traditional weave offset
      const xOffset = (c % 2) ? 10 : -10;
      const weight = 1.0 + Math.random() * 0.5;
      threads.push({ type: 'v', x1: x + xOffset, y1: -20, x2: x + xOffset, y2: H + 20, weight });
    }
  }

  function drawWeave(blurAmount) {
    ctxWeave.clearRect(0, 0, W, H);
    if (blurAmount > 0.01) {
      ctxWeave.filter = `blur(${blurAmount}px)`;
    } else {
      ctxWeave.filter = 'none';
    }

    // Draw warp (horizontal) — muted ink grey
    for (const t of threads) {
      if (t.type !== 'h') continue;
      ctxWeave.beginPath();
      ctxWeave.moveTo(t.x1, t.y1);
      ctxWeave.lineTo(t.x2, t.y2);
      ctxWeave.strokeStyle = 'rgba(72, 80, 96, 0.45)';
      ctxWeave.lineWidth = t.weight;
      ctxWeave.stroke();
    }

    // Draw weft (vertical) — lighter for weave contrast
    for (const t of threads) {
      if (t.type !== 'v') continue;
      ctxWeave.beginPath();
      ctxWeave.moveTo(t.x1, t.y1);
      ctxWeave.lineTo(t.x2, t.y2);
      ctxWeave.strokeStyle = 'rgba(96, 110, 130, 0.4)';
      ctxWeave.lineWidth = t.weight;
      ctxWeave.stroke();
    }

    // Cursor trail ring — visible presence in the weave
    const trailRadius = 8 + momentum * 12;
    const alpha = 0.15 + momentum * 0.3;
    const grad = ctxWeave.createRadialGradient(
      cursor.x, cursor.y, 0,
      cursor.x, cursor.y, trailRadius
    );
    grad.addColorStop(0, `rgba(140, 185, 230, ${alpha})`);
    grad.addColorStop(1, 'rgba(140, 185, 230, 0)');
    ctxWeave.beginPath();
    ctxWeave.arc(cursor.x, cursor.y, trailRadius, 0, Math.PI * 2);
    ctxWeave.fillStyle = grad;
    ctxWeave.fill();

    ctxWeave.filter = 'none';  // reset for next frame
  }

  // ─── Blue Field Resonance Underlay ────────────────────────
  function drawBlueField(intensity) {
    // intensity 0..1 drives blue field brightness and pulse
    const baseR = 8, baseG = 36, baseB = 64;
    const boostR = Math.round(18 * intensity);
    const boostG = Math.round(50 * intensity);
    const boostB = Math.round(90 * intensity);

    // Background gradient from cursor out
    const grad = ctxBlue.createRadialGradient(
      cursor.x, cursor.y, 0,
      cursor.x, cursor.y, Math.max(W, H) * 0.6
    );
    grad.addColorStop(0, `rgb(${baseR + boostR}, ${baseG + boostG}, ${baseB + boostB})`);
    grad.addColorStop(1, `rgb(${baseR}, ${baseG}, ${baseB})`);

    ctxBlue.fillStyle = grad;
    ctxBlue.fillRect(0, 0, W, H);
  }

  // ─── Physics: Stumble-to-March Inertia Curve ───────────────
  const cursor = { x: W / 2, y: H / 2 };        // visual cursor position
  const input  = { x: W / 2, y: H / 2 };        // raw pointer position

  let velocity    = { x: 0, y: 0 };              // current velocity of physics body
  let momentum    = 0;                            // 0..1 accumulated flow state
  let directionStability = 0;                     // how consistent the direction is

  const MAX_SPEED     = 18;                       // pixels per frame at full speed
  const STUMBLE_DAMP  = 0.92;                     // heavy damp in stumble phase
  const MARCH_DAMP    = 0.72;                     // lighter damp in march (more responsive)
  const INERTIA_BASE  = 0.04;                     // slow acceleration from rest
  const INERTIA_MAX   = 0.35;                     // fast acceleration at peak momentum
  const MOMENTUM_RISE  = 0.008;                   // how fast momentum builds per frame
  const MOMENTUM_FALL  = 0.025;                   // decay when direction unstable

  function updatePhysics() {
    if (!tracking) return;

    // Raw delta from pointer to current visual position
    const dx = input.x - cursor.x;
    const dy = input.y - cursor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) {
      // Stopped — decay momentum and velocity
      momentum *= 0.975;
      velocity.x *= STUMBLE_DAMP;
      velocity.y *= STUMBLE_DAMP;
      directionStability *= 0.95;
      return;
    }

    // Direction tracking for stability measurement
    const rawDir = Math.atan2(dy, dx);
    if (directionStability > 0) {
      // Smooth the directional average toward new input
      const dirDiff = Math.abs(Math.sin(rawDir - lastAngle));
      directionStability = directionStability * 0.96 + (1 - dirDiff) * 0.04;
    } else {
      directionStability = 0.5;
    }
    lastAngle = rawDir;

    // Momentum rises with sustained, stable movement
    if (directionStability > 0.3 && dist > 3) {
      momentum = Math.min(1, momentum + MOMENTUM_RISE * (0.5 + directionStability));
    } else {
      momentum = Math.max(0, momentum - MOMENTUM_FALL);
    }

    // Inertia curve: stumble -> march
    // At low momentum: slow accel + heavy damp
    // At high momentum: fast accel + light damp
    const accelFactor = INERTIA_BASE + (INERTIA_MAX - INERTIA_BASE) * momentum;
    const currentDamp = STUMBLE_DAMP + (MARCH_DAMP - STUMBLE_DAMP) * momentum;

    // Acceleration toward target
    velocity.x += dx * accelFactor;
    velocity.y += dy * accelFactor;

    // Clamp speed
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > MAX_SPEED * (0.5 + 0.5 * momentum)) {
      const maxV = MAX_SPEED * (0.5 + 0.5 * momentum);
      velocity.x *= maxV / speed;
      velocity.y *= maxV / speed;
    }

    // Apply damping
    velocity.x *= currentDamp;
    velocity.y *= currentDamp;

    // Integrate position
    cursor.x += velocity.x;
    cursor.y += velocity.y;
  }

  let lastAngle = 0;
  let tracking = false;

  window.addEventListener('mousemove', e => { input.x = e.clientX; input.y = e.clientY; });
  window.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    input.x = t.clientX; input.y = t.clientY;
  }, { passive: false });

  // Init pointer position
  window.addEventListener('pointerdown', () => {
    if (!tracking) {
      initAudio();
      tracking = true;
      input.x = cursor.x;
      input.y = cursor.y;
    }
  }, { once: false });

  // ─── Audio Update Synced to Physics ────────────────────────
  function updateAudio() {
    if (!audioCtx || !tracking) {
      if (humGain) lerpAudio(humGain, 0, 0.15);
      return;
    }

    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const speedNorm = Math.min(1, speed / MAX_SPEED);

    // Hum volume: swells with inertia (lag creates more hum)
    // In stumble phase, lag is high => louder hum for friction feel
    // In march phase, clean and steady
    const lagFriction = (1 - momentum) * 0.6;       // stumble = more friction
    const volumeTarget = 0.02 + speedNorm * 0.08 + lagFriction * 0.05;
    lerpAudio(humGain, volumeTarget, 0.08);

    // Frequency: low at rest, rises slightly in march
    const freqTarget = 72 + momentum * 18 + speedNorm * 8;
    lerpAudio(humOsc.frequency, freqTarget, 0.12);

    // Filter opens as momentum builds (cleaner tone)
    const filterTarget = 150 + momentum * 250;
    lerpAudio(humFilter.frequency, filterTarget, 0.15);
  }

  // Release: cut audio clean
  window.addEventListener('pointerup', () => {
    tracking = false;
    if (humGain) lerpAudio(humGain, 0, 0.06);   // fast but not instant — organic fade
  });

  // ─── Main Render Loop ──────────────────────────────────────
  let bluePulse = 0;

  function frame() {
    updatePhysics();
    updateAudio();

    // Blue field exhale pulse synced to speed transitions
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const targetIntensity = momentum * 0.7 + (1 - momentum) * Math.min(1, speed / 5);
    bluePulse += (targetIntensity - bluePulse) * 0.06;
    drawBlueField(bluePulse);

    // Motion blur: high in stumble phase (hesitation smear), low in march (crisp)
    const blurTarget = (1 - momentum) * 3.5 + speed * 0.12;
    drawWeave(blurTarget);

    requestAnimationFrame(frame);
  }

  // ─── Init ──────────────────────────────────────────────────
  window.addEventListener('resize', resize);
  resize();
  cursor.x = W / 2; cursor.y = H / 2;
  input.x = W / 2;   input.y = H / 2;
  requestAnimationFrame(frame);

})();
