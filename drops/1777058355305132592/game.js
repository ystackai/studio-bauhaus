(function () {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  let W, H;
  let mouseX = 0, mouseY = 0;
  let prevMouseX = 0, prevMouseY = 0;
  let cursorX = 0, cursorY = 0;
  let velocity = 0;
  let momentum = 0;
  let audioCtx = null;
  let humGain = null;
  let humOsc = null;
  let humOsc2 = null;
  let humStarted = false;

  // Thread grid config
  const threadSpacing = 18;
  const threadWidthBase = 1.2;
  const coverageTarget = 0.3;

  // Warp seed data: precomputed random offsets for organic feel
  let warpRows = [];
  let warpCols = [];

  // Momentum states
  const MOMENTUM_THRESHOLD = 3;
  const MOMENTUM_MAX = 1;
  const FRICTION_HIGH = 0.82;
  const FRICTION_LOW = 0.96;
  const INERTIA_SCALE = 0.08;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    generateWarpData();
  }

  function generateWarpData() {
    warpRows = [];
    warpCols = [];
    const numRows = Math.ceil(H / threadSpacing) + 2;
    const numCols = Math.ceil(W / threadSpacing) + 2;

    for (let i = 0; i < numCols; i++) {
      warpCols.push({
        xOff: (Math.random() - 0.5) * threadSpacing * 0.6,
        yOff: Math.random() * Math.PI * 2,
        thickness: threadWidthBase + Math.random() * threadWidthBase * 0.8,
        present: Math.random() < coverageTarget + 0.15,
        waviness: Math.random() * 3,
        hueShift: Math.random() * 12 - 6,
      });
    }

    for (let i = 0; i < numRows; i++) {
      warpRows.push({
        yOff: (Math.random() - 0.5) * threadSpacing * 0.5,
        xOff: Math.random() * Math.PI * 2,
        thickness: threadWidthBase + Math.random() * threadWidthBase * 0.6,
        present: Math.random() < coverageTarget + 0.1,
        waviness: Math.random() * 2.5,
        hueShift: Math.random() * 10 - 5,
      });
    }
  }

  function initAudio() {
    if (humStarted) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    humGain = audioCtx.createGain();
    humGain.gain.value = 0;
    humGain.connect(audioCtx.destination);

    // Low fundamental
    humOsc = audioCtx.createOscillator();
    humOsc.type = "sine";
    humOsc.frequency.value = 68;
    humOsc.connect(humGain);
    humOsc.start();

    // Slight harmonic for warmth
    humOsc2 = audioCtx.createOscillator();
    humOsc2.type = "triangle";
    humOsc2.frequency.value = 95;
    const gain2 = audioCtx.createGain();
    gain2.gain.value = 0.3;
    humOsc2.connect(gain2);
    gain2.connect(humGain);
    humOsc2.start();

    humStarted = true;
  }

  function updateAudio(mom, vel) {
    if (!humStarted || !audioCtx) return;
    const t = audioCtx.currentTime;

    // Slow drag = high resistance = louder hum, higher pitch
    // Fast momentum = low resistance = quieter hum, lower pitch
    const normalizedMom = Math.min(mom, 1);
    const targetVol = Math.max(0.08, 0.35 * (1 - normalizedMom));
    const targetFreq = 55 + 30 * (1 - normalizedMom);
    const targetFreq2 = 75 + 40 * (1 - normalizedMom);

    humGain.gain.linearRampToValueAtTime(targetVol, t + 0.08);
    humOsc.frequency.linearRampToValueAtTime(targetFreq, t + 0.08);
    humOsc2.frequency.linearRampToValueAtTime(targetFreq2, t + 0.08);
  }

  function drawThreadGrid() {
    const baseR = 140;
    const baseG = 132;
    const baseB = 118;

    // Warp threads (horizontal)
    for (let i = 0; i < warpCols.length; i++) {
      if (!warpCols[i].present) continue;
      const col = warpCols[i];
      const baseX = i * threadSpacing + col.xOff;
      const thick = col.thickness * (0.85 + 0.15 * Math.sin(Date.now() * 0.001 + col.yOff));

      const alpha = 0.12 + 0.08 * Math.sin(Date.now() * 0.0008 + col.xOff);
      const r = Math.max(0, Math.min(255, baseR + col.hueShift));
      const g = Math.max(0, Math.min(255, baseG + col.hueShift * 0.7));
      const b = Math.max(0, Math.min(255, baseB + col.hueShift * 0.5));

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r|0},${g|0},${b|0},${alpha.toFixed(3)})`;
      ctx.lineWidth = thick;
      ctx.lineCap = "round";

      for (let y = -threadSpacing; y <= H + threadSpacing; y += 4) {
        const wave = Math.sin(y * 0.02 + col.xOff) * col.waviness;
        if (y === -threadSpacing) {
          ctx.moveTo(baseX + wave, y);
        } else {
          ctx.lineTo(baseX + wave, y);
        }
      }
      ctx.stroke();
    }

    // Weft threads (vertical)
    for (let i = 0; i < warpRows.length; i++) {
      if (!warpRows[i].present) continue;
      const row = warpRows[i];
      const baseY = i * threadSpacing + row.yOff;
      const thick = row.thickness * (0.88 + 0.12 * Math.sin(Date.now() * 0.0012 + row.xOff));

      const alpha = 0.1 + 0.07 * Math.sin(Date.now() * 0.0009 + row.xOff * 1.3);
      const r = Math.max(0, Math.min(255, baseR - 5 + row.hueShift));
      const g = Math.max(0, Math.min(255, baseG - 5 + row.hueShift * 0.6));
      const b = Math.max(0, Math.min(255, baseB - 3 + row.hueShift * 0.4));

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r|0},${g|0},${b|0},${alpha.toFixed(3)})`;
      ctx.lineWidth = thick;
      ctx.lineCap = "round";

      for (let x = -threadSpacing; x <= W + threadSpacing; x += 4) {
        const wave = Math.sin(x * 0.018 + row.xOff) * row.waviness;
        if (x === -threadSpacing) {
          ctx.moveTo(x, baseY + wave);
        } else {
          ctx.lineTo(x, baseY + wave);
        }
      }
      ctx.stroke();
    }

    // Crossing nodes for subtle texture
    for (let ri = 0; ri < warpRows.length; ri += 2) {
      if (!warpRows[ri].present) continue;
      for (let ci = 0; ci < warpCols.length; ci += 2) {
        if (!warpCols[ci].present) continue;
        const cx = ci * threadSpacing + warpCols[ci].xOff;
        const cy = ri * threadSpacing + warpRows[ri].yOff;
        const dist = Math.sqrt((cx - cursorX) ** 2 + (cy - cursorY) ** 2);
        if (dist < 200) {
          const fadeIn = 1 - dist / 200;
          const nodeAlpha = 0.03 + 0.04 * fadeIn * momentum;
          ctx.beginPath();
          ctx.fillStyle = `rgba(170,175,168,${nodeAlpha.toFixed(3)})`;
          ctx.arc(cx, cy, 1.5 + fadeIn * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawBlueField() {
    const radius = 120 + momentum * 280;
    const alpha = 0.03 + momentum * 0.12;
    const softness = 20 + momentum * 40;

    const grad = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, radius);
    grad.addColorStop(0, `rgba(100,150,210,${alpha.toFixed(3)})`);
    grad.addColorStop(0.4, `rgba(90,140,200,${(alpha * 0.6).toFixed(3)})`);
    grad.addColorStop(0.7, `rgba(80,130,190,${(alpha * 0.25).toFixed(3)})`);
    grad.addColorStop(1, `rgba(70,120,180,0)`);

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow for exhale effect
    if (momentum > 0.3) {
      const outerR = radius * 1.6;
      const outerGrad = ctx.createRadialGradient(cursorX, cursorY, radius * 0.6, cursorX, cursorY, outerR);
      const outerAlpha = (momentum - 0.3) * 0.08;
      outerGrad.addColorStop(0, `rgba(110,160,220,${(outerAlpha * 0.5).toFixed(3)})`);
      outerGrad.addColorStop(1, `rgba(90,140,200,0)`);

      ctx.beginPath();
      ctx.fillStyle = outerGrad;
      ctx.arc(cursorX, cursorY, outerR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCursor() {
    const size = 3 + momentum * 2;
    const alpha = 0.5 + momentum * 0.3;

    const grad = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, size);
    grad.addColorStop(0, `rgba(220,225,230,${alpha.toFixed(3)})`);
    grad.addColorStop(1, `rgba(200,210,220,0)`);

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(cursorX, cursorY, size, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBlurLayer() {
    // Blur intensity inversely proportional to momentum
    const blurAlpha = 0.04 * (1 - momentum);
    if (blurAlpha < 0.002) return;

    ctx.save();
    ctx.filter = `blur(${(1 - momentum) * 2}px)`;
    ctx.fillStyle = `rgba(42,40,37,${blurAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function updatePhysics() {
    const dx = mouseX - prevMouseX;
    const dy = mouseY - prevMouseY;
    const inputSpeed = Math.sqrt(dx * dx + dy * dy);

    // Inertia interpolation
    const currentFriction = momentum > 0.5 ? FRICTION_LOW : FRICTION_HIGH;
    const lerpFactor = 1 - currentFriction;

    cursorX += (mouseX - cursorX) * lerpFactor;
    cursorY += (mouseY - cursorY) * lerpFactor;

    // Velocity tracking with smoothing
    velocity = velocity * 0.7 + inputSpeed * 0.3;

    // Momentum builds with sustained velocity, decays otherwise
    if (velocity > MOMENTUM_THRESHOLD) {
      momentum = Math.min(MOMENTUM_MAX, momentum + 0.012);
    } else {
      momentum = Math.max(0, momentum - 0.018);
    }

    prevMouseX = mouseX;
    prevMouseY = mouseY;
  }

  function drawBackground() {
    // Warm linen-toned base
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, "#322f2a");
    bgGrad.addColorStop(0.5, "#2c2a26");
    bgGrad.addColorStop(1, "#252320");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  }

  let frameCount = 0;

  function frame() {
    frameCount++;

    updatePhysics();
    updateAudio(momentum, velocity);

    drawBackground();
    drawThreadGrid();
    drawBlueField();
    drawBlurLayer();
    drawCursor();

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!humStarted) initAudio();
  });
  window.addEventListener("touchmove", function (e) {
    e.preventDefault();
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
    if (!humStarted) initAudio();
  }, { passive: false });
  window.addEventListener("touchstart", function (e) {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
    if (!humStarted) initAudio();
  });

  resize();
  mouseX = W / 2;
  mouseY = H / 2;
  cursorX = W / 2;
  cursorY = H / 2;
  prevMouseX = W / 2;
  prevMouseY = H / 2;
  frame();
})();
