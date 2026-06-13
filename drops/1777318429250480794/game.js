(function () {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  /* ---- Configuration ---- */
  const METRONOME_INTERVAL = 2.4;
  const YIELD_TIME = 1.8;
  const LOCK_HOLD = 3.2;
  const GRID_COLS = 12;
  const GRID_ROWS = 12;
  const GRID_CELL = 60;
  const DRIFT_AMP = 0.5;

  /* ---- State machine ---- */
  const PHASE = {
    INIT: 0,
    HOVER: 1,
    TRIGGER: 2,
    REVEAL: 3,
    REVEAL_HOLD: 4,
    LOCK: 5,
  };

  /* ---- Metrics ---- */
   let dpr = window.devicePixelRatio || 1;
  let W, H;
  let cx, cy;
  let phase = PHASE.INIT;
  let cycleT = 0;
  let cycleCount = 0;
  let mx = -9999, my = -9999;
  let prevMx = mx, prevMy = my;
  let snapIntensity = 0;
  let gridOpacity = 1;
  let audioCtx = null;
  let audioUnlocked = false;
  let metronomeTriggered = false;

  /* ---- Rice paper noise cache ---- */
  let noiseCanvas = null;
  let noiseCtx = null;

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    cx = W / 2;
    cy = H / 2;
    noiseCanvas = document.createElement("canvas");
    noiseCanvas.width = canvas.width;
    noiseCanvas.height = canvas.height;
    noiseCtx = noiseCanvas.getContext("2d");
    generateGrain();
  }

  /* ---- Grain generation ---- */
  function generateGrain() {
    if (!noiseCtx) return;
    const w = noiseCanvas.width;
    const h = noiseCanvas.height;
    const imgData = noiseCtx.createImageData(w, h);
    const d = imgData.data;
    const seed = Math.random() * 65536;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.sin(i * 0.01 + seed) * 0.5 +
                 Math.random() * 0.3 +
                 Math.sin(i * 0.0003 + seed * 0.7) * 0.2) * 25;
      d[i] = v;
      d[i + 1] = v * 0.92;
      d[i + 2] = v * 0.76;
      d[i + 3] = (0.03 + Math.random() * 0.06) * 255;
    }
    noiseCtx.putImageData(imgData, 0, 0);
  }

  /* ---- Web Audio ---- */
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playMetronomeClick() {
    if (!audioCtx || !audioUnlocked) return;
    beep(1200, 0.02, 0.08);
  }

  function playHoverBreath() {
    if (!audioCtx || !audioUnlocked) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 180 + Math.random() * 40;
    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  }

  function playFadeExhale(t) {
    if (!audioCtx || !audioUnlocked) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 340 * (1 - t * 0.15);
    gain.gain.setValueAtTime(0.04 * (1 - t), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  }

  function playDescendingThird() {
    if (!audioCtx || !audioUnlocked) return;
    [440, 349.23].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const st = audioCtx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.025, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(st);
      osc.stop(st + 0.5);
    });
  }

  function playLockPulse() {
    if (!audioCtx || !audioUnlocked) return;
    beep(600, 0.03, 0.06);
    setTimeout(() => { if (audioCtx) beep(480, 0.02, 0.04); }, 80);
  }

  function beep(freq, duration, vol) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration + 0.01);
  }

  /* ---- Drawing helpers ---- */

  /* Rice paper base */
  function drawRicePaper() {
    ctx.fillStyle = "#f0ece4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (noiseCanvas) {
      ctx.drawImage(noiseCanvas, 0, 0);
    }
  }

  /* Beveled grid lines, rigid hierarchy */
  function drawGrid(offset) {
    const cellDpr = GRID_CELL * dpr;
    const cols = GRID_COLS;
    const rows = GRID_ROWS;
    const gridW = cols * cellDpr;
    const gridH = rows * cellDpr;
    const offX = (canvas.width - gridW) / 2 + offset * dpr;
    const offY = (canvas.height - gridH) / 2 + offset * dpr;

    ctx.save();

    /* Main (thick) lines every 3 cells */
    for (let i = 0; i <= cols; i += 3) {
      const x = offX + i * cellDpr;
      ctx.beginPath();
      ctx.moveTo(x, offY);
      ctx.lineTo(x, offY + gridH);
      /* Light side of bevel */
      ctx.strokeStyle = "rgba(90, 80, 65, " + (0.65 * gridOpacity) + ")";
      ctx.lineWidth = 4 * dpr;
      ctx.stroke();
      /* Dark side of bevel */
      ctx.beginPath();
      ctx.moveTo(x + 2 * dpr, offY);
      ctx.lineTo(x + 2 * dpr, offY + gridH);
      ctx.strokeStyle = "rgba(220, 214, 200, " + (0.5 * gridOpacity) + ")";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j += 3) {
      const y = offY + j * cellDpr;
      ctx.beginPath();
      ctx.moveTo(offX, y);
      ctx.lineTo(offX + gridW, y);
      ctx.strokeStyle = "rgba(90, 80, 65, " + (0.65 * gridOpacity) + ")";
      ctx.lineWidth = 4 * dpr;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offX, y + 2 * dpr);
      ctx.lineTo(offX + gridW, y + 2 * dpr);
      ctx.strokeStyle = "rgba(220, 214, 200, " + (0.5 * gridOpacity) + ")";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
    }

    /* Minor (thin) lines every 1 cell */
    for (let i = 0; i <= cols; i++) {
      const x = offX + i * cellDpr;
      ctx.beginPath();
      ctx.moveTo(x, offY);
      ctx.lineTo(x, offY + gridH);
      ctx.strokeStyle = "rgba(120, 110, 95, " + (0.18 * gridOpacity) + ")";
      ctx.lineWidth = 0.8 * dpr;
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const y = offY + j * cellDpr;
      ctx.beginPath();
      ctx.moveTo(offX, y);
      ctx.lineTo(offX + gridW, y);
      ctx.strokeStyle = "rgba(120, 110, 95, " + (0.18 * gridOpacity) + ")";
      ctx.lineWidth = 0.8 * dpr;
      ctx.stroke();
    }

    /* Snap pulse: bright flash on grid lines at trigger */
    if (snapIntensity > 0.01) {
      for (let i = 0; i <= cols; i += 3) {
        const x = offX + i * cellDpr;
        ctx.beginPath();
        ctx.moveTo(x, offY);
        ctx.lineTo(x, offY + gridH);
        ctx.strokeStyle = "rgba(255, 240, 200, " + (snapIntensity * 0.4) + ")";
        ctx.lineWidth = 6 * dpr;
        ctx.stroke();
      }
      for (let j = 0; j <= rows; j += 3) {
        const y = offY + j * cellDpr;
        ctx.beginPath();
        ctx.moveTo(offX, y);
        ctx.lineTo(offX + gridW, y);
        ctx.strokeStyle = "rgba(255, 240, 200, " + (snapIntensity * 0.4) + ")";
        ctx.lineWidth = 6 * dpr;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* Yellow triangle (lantern) with half-pixel drift and sine easing fade */
  function drawTriangle(easeT) {
    const size = 100 * dpr;
    const dX = Math.sin(cycleT * Math.PI * 2 / METRONOME_INTERVAL) * DRIFT_AMP * dpr;
    const dY = Math.cos(cycleT * Math.PI * 2 / METRONOME_INTERVAL) * DRIFT_AMP * dpr;

    const triCx = (cx + dX / dpr) * dpr;
    const triCy = (cy + dY / dpr) * dpr;

    /* Alpha: holds 1 until 1.8s into cycle, then fades to 0 */
    let alpha = 1;
    if (easeT > YIELD_TIME) {
      const t = (easeT - YIELD_TIME) / (METRONOME_INTERVAL - YIELD_TIME);
      const sineT = Math.sin(t * Math.PI * 0.5);
      alpha = 1 - sineT;
    }

    const r = 230;
    const g = 190;
    const b = 40;

    ctx.save();
    ctx.globalAlpha = alpha;

    /* Glow layer */
    ctx.beginPath();
    ctx.moveTo(triCx, triCy - size);
    ctx.lineTo(triCx - size * 0.866, triCy + size * 0.5);
    ctx.lineTo(triCx + size * 0.866, triCy + size * 0.5);
    ctx.closePath();
    ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ",0.15)";
    ctx.filter = "blur(" + (8 * dpr) + "px)";
    ctx.fill();
    ctx.filter = "none";

    /* Solid triangle */
    ctx.beginPath();
    ctx.moveTo(triCx, triCy - size);
    ctx.lineTo(triCx - size * 0.866, triCy + size * 0.5);
    ctx.lineTo(triCx + size * 0.866, triCy + size * 0.5);
    ctx.closePath();
    ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ",1)";
    ctx.fill();

    /* Bevel highlight on triangle */
    ctx.strokeStyle = "rgba(255,255,220,0.25)";
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    ctx.restore();
  }

  /* ---- State update ---- */
  function update(dt) {
    cycleT += dt;
    prevMx = mx;
    prevMy = my;

    /* Full cycle = metronome (2.4s) + lock hold (3.2s) = 5.6s */
    const CYCLE_LEN = METRONOME_INTERVAL + LOCK_HOLD;

     /* Downbeat metronome click at exact cycle reset */
    if (cycleT < dt && !metronomeTriggered) {
      playMetronomeClick();
      metronomeTriggered = true;
      } else if (cycleT >= dt) {
      metronomeTriggered = false;
      }

    if (cycleT < 0.12) {
      phase = PHASE.INIT;
      gridOpacity = 1;
      snapIntensity = 1 - cycleT / 0.12;
     } else if (cycleT < 0.8) {
      phase = PHASE.HOVER;
      gridOpacity = 1;
      snapIntensity *= 0.88;
     } else if (cycleT < 1.0) {
      phase = PHASE.TRIGGER;
      gridOpacity = 1;
      snapIntensity = 1;
     } else if (cycleT < YIELD_TIME) {
      phase = PHASE.REVEAL;
      gridOpacity = 1;
      snapIntensity *= 0.96;
     } else if (cycleT < METRONOME_INTERVAL) {
      phase = PHASE.LOCK;
      gridOpacity = 0.85 - (cycleT - YIELD_TIME) * 0.08;
      snapIntensity *= 0.97;
     } else if (cycleT < CYCLE_LEN) {
      phase = PHASE.REVEAL_HOLD;
      gridOpacity = 0.65;
      snapIntensity *= 0.99;
     } else {
       /* Cycle complete -- reset for next downbeat */
      cycleT = 0;
      cycleCount++;
     }

     /* Descending third on fade transition at 1.8s */
    if (cycleT >= YIELD_TIME && cycleT - YIELD_TIME < dt * 2) {
      playDescendingThird();
     }

     /* Fade exhale audio during lock */
    if (phase === PHASE.LOCK && cycleT - YIELD_TIME > 0.02 && cycleT - YIELD_TIME < 0.25) {
      const exhaleT = (cycleT - YIELD_TIME) / (METRONOME_INTERVAL - YIELD_TIME);
      playFadeExhale(exhaleT);
     }
  }

  /* ---- Render ---- */
   function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

     /* Base */
    drawRicePaper();

     /* Grid with snap offset */
    const gridOff = snapIntensity > 0.5 ? 0.3 * snapIntensity : 0;
    drawGrid(gridOff);

     /* Triangle / lantern */
    drawTriangle(cycleT);
   }

  /* ---- Loop ---- */
  let lastTs = 0;
  let firstAudioInit = true;
  let hoverBreathCD = 0;

  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    /* Unlock audio on first user gesture */
    if (audioUnlocked && audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    /* Hover breath check */
    hoverBreathCD -= dt;
    const dx = mx - prevMx;
    const dy = my - prevMy;
    if (Math.sqrt(dx * dx + dy * dy) > 20 && hoverBreathCD <= 0) {
      playHoverBreath();
      hoverBreathCD = 0.8;
    }

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  /* ---- Input ---- */
  canvas.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    if (firstAudioInit) {
      initAudio();
      audioUnlocked = true;
      firstAudioInit = false;
    }
  });

  canvas.addEventListener("touchmove", function (e) {
    e.preventDefault();
    const t = e.touches[0];
    mx = t.clientX;
    my = t.clientY;
    if (firstAudioInit) {
      initAudio();
      audioUnlocked = true;
      firstAudioInit = false;
    }
  }, { passive: false });

  canvas.addEventListener("click", function () {
    if (firstAudioInit) {
      initAudio();
      audioUnlocked = true;
      firstAudioInit = false;
    }
  });

  window.addEventListener("resize", resizeCanvas);

  /* ---- Boot ---- */
  resizeCanvas();
  requestAnimationFrame(loop);
})();
