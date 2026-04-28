/* ============================================================
   Bauhaus Rhythm Studio — Web Audio Engine + Canvas Renderer
   ============================================================ */
(function () {
  'use strict';

  // ─── Canvas & Context ───
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var overlay = document.getElementById('overlay');
  var W, H;

  // ─── Grid constants (locked by brief) ───
  var GRID_SPACING = 40;
  var GRID_STROKE = '#1a1a1a';
  var BG_COLOR = '#f4f1e8';
  var YELLOW = '#f5c542';
  var TRIANGLE_COLOR = '#1a1a1a';

  // ─── Drag physics (locked thresholds) ───
  var VELOCITY_MIN = 15;  // px/s — linen bite threshold
  var VELOCITY_MAX = 60;  // px/s — grid fracture limit
  var VELOCITY_SAMPLE_RATE = 60;

  // ─── Audio constants (locked by brief) ───
  var BPM = 72;
  var EXHALE_BUFFER = 0.3;
  var DRONE_FREQ = 440;
  var REVERB_DECAY = 1.2;

  // ─── Audio graph nodes (persisted to avoid GC) ───
  var audioCtx = null;
  var masterGain = null;
  var droneGain = null;
  var droneOsc1 = null;
  var droneOsc2 = null;
  var droneOsc3 = null;
  var reverbConvolver = null;
  var reverbGain = null;
  var dryGain = null;
  var compressorNode = null;

  // ─── Metronome scheduling ───
  var nextBeatTime = 0;
  var beatCount = 0;
  var metronomeRunning = false;
  var scheduleInterval = null;

  // ─── State ───
  var started = false;
  var dragging = false;
  var dragStartTime = 0;
  var prevX = 0, prevY = 0;
  var cursorX = 0, cursorY = 0;
  var velX = 0, velY = 0;
  var dragSpeed = 0;
  var friction = 0;           // smooth 0..1
  var circleAligned = false;
  var circleRadius = 40;
  var circleDriftX = 20;      // starts offset
  var circleDriftY = 15;
  var triangleDrift = 25;      // aggression offset
  var triangleAggression = 1;
  var breathPhase = 0;
  var chordPlaying = false;
  var chordResolveTime = 0;
  var chordOscillators = [];
  var metronomePhase = 0;     // 0..1 visual pulse
  var lastExhaleTime = 0;

  // ─── Object pools (zero GC during audio) ───
  var noiseBufPool = [];
  var MAX_NOISE_BURSTS = 12;

  // ─── Simplex-noise-lite (value noise, seeded) ───
  var noisePerm = new Uint8Array(512);
  (function initNoise() {
    for (var i = 0; i < 256; i++) noisePerm[i] = i;
    var s = 47;
    for (var i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      var j = s % (i + 1);
      var t = noisePerm[i]; noisePerm[i] = noisePerm[j]; noisePerm[j] = t;
    }
    for (var i = 0; i < 256; i++) noisePerm[i + 256] = noisePerm[i];
  })();

  function noise2D(x, y) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    var fx = x - Math.floor(x), fy = y - Math.floor(y);
    var u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    var v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    function grad(h, px, py) {
      var a = (h & 1) ? px : py;
      var b = (h & 1) ? py : px;
      return ((h & 2) ? -a : a) + ((h & 4) ? -b : b);
    }
    var aa = noisePerm[noisePerm[X] + Y];
    var ab = noisePerm[noisePerm[X] + Y + 1];
    var ba = noisePerm[noisePerm[X + 1] + Y];
    var bb = noisePerm[noisePerm[X + 1] + Y + 1];
    var g00 = grad(aa, fx, fy);
    var g10 = grad(ba, fx - 1, fy);
    var g01 = grad(ab, fx, fy - 1);
    var g11 = grad(bb, fx - 1, fy - 1);
    var lx0 = g00 + u * (g10 - g00);
    var lx1 = g01 + u * (g11 - g01);
    return lx0 + v * (lx1 - lx0);
  }

  // ─── Resize ───
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initGeometry();
    }
  window.addEventListener('resize', resize);
  resize();

    // Initialize geometry starting positions
  function initGeometry() {
    circleCX = W / 2 + circleDriftX;
    circleCY = H / 2 + circleDriftY;
    targetCircleCX = W / 2;
    targetCircleCY = H / 2;
   }

  // ================================================================
  //  AUDIO ENGINE
  // ================================================================

  function initAudio() {
    if (audioCtx && audioCtx.state === 'running') return;

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // ── Master chain: dry → compressor → destination ──
      compressorNode = audioCtx.createDynamicsCompressor();
      compressorNode.threshold.value = -12;
      compressorNode.knee.value = 10;
      compressorNode.ratio.value = 8;
      compressorNode.attack.value = 0.005;
      compressorNode.release.value = 0.08;

      dryGain = audioCtx.createGain();
      dryGain.gain.value = 0.75;

      reverbGain = audioCtx.createGain();
      reverbGain.gain.value = 0.35;

      reverbConvolver = audioCtx.createConvolver();
      buildReverbImpulse();

      // Chain: dryGain → compressor → destination
      //         reverbConvolver → reverbGain → compressor → destination
      dryGain.connect(compressorNode);
      compressorNode.connect(audioCtx.destination);
      reverbConvolver.connect(reverbGain);
      reverbGain.connect(compressorNode);

      // ── Pre-warm noise buffer pool ──
      for (var i = 0; i < MAX_NOISE_BURSTS; i++) {
        noiseBufPool.push(createNoiseBuffer(0.08));
      }

    } else {
      audioCtx.resume();
    }

    // ── Ambient drone: A440 with harmonics, low volume ──
    startDrone();
  }

  function buildReverbImpulse() {
    var sr = audioCtx.sampleRate;
    var len = Math.floor(sr * 2); // enough for 1.2s decay tail
    var buf = audioCtx.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / sr;
        var envelope = Math.exp(-t * (Math.log(0.001) / REVERB_DECAY));
        var hiCut = Math.exp(-t * 3); // damp high freq over time
        d[i] = (Math.random() * 2 - 1) * envelope * (0.7 + 0.3 * hiCut);
      }
    }
    reverbConvolver.buffer = buf;
  }

  function createNoiseBuffer(duration) {
    var sr = audioCtx.sampleRate;
    var len = Math.floor(sr * duration);
    var buf = audioCtx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // ── A440 Drone ──
  function startDrone() {
    // Fundamental
    droneOsc1 = audioCtx.createOscillator();
    droneOsc1.type = 'sine';
    droneOsc1.frequency.value = DRONE_FREQ; // A440

    // Sub harmonic for warmth
    droneOsc2 = audioCtx.createOscillator();
    droneOsc2.type = 'triangle';
    droneOsc2.frequency.value = DRONE_FREQ / 2;

    // High harmonic shimmer
    droneOsc3 = audioCtx.createOscillator();
    droneOsc3.type = 'sine';
    droneOsc3.frequency.value = DRONE_FREQ * 3;

    droneGain = audioCtx.createGain();
    droneGain.gain.value = 0; // ramp up

    // LFO for subtle wavering
    var lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.4;
    var lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 2;
    lfo.connect(lfoGain);
    lfoGain.connect(droneOsc1.frequency);

    droneOsc1.connect(droneGain);
    droneOsc2.connect(droneGain);
    droneOsc3.connect(droneGain);
    droneGain.connect(dryGain);
    droneGain.connect(reverbConvolver);

    droneOsc1.start();
    droneOsc2.start();
    droneOsc3.start();
    lfo.start();

    droneGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 0.5);
  }

  function setDroneDuck(amount) {
    // amount: 0 = full, 1 = -6dB
    var targetGain = 0.06 * Math.pow(10, -6 * amount / 20);
    if (droneGain) {
      droneGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
    }
  }

  // ── Metronome: 72 BPM, swung 16th notes ──
  var beatInterval = 60 / BPM; // ~0.8333s per beat
  var sixteenthInterval = beatInterval / 4;

  function startMetronome() {
    if (metronomeRunning) return;
    metronomeRunning = true;
    nextBeatTime = audioCtx.currentTime + 0.05;
    beatCount = 0;
    scheduleInterval = setInterval(scheduleAhead, 40);
  }

  function stopMetronome() {
    metronomeRunning = false;
    if (scheduleInterval) {
      clearInterval(scheduleInterval);
      scheduleInterval = null;
    }
  }

  function scheduleAhead() {
    if (!metronomeRunning) return;
    var lookAhead = 0.15;
    while (nextBeatTime < audioCtx.currentTime + lookAhead) {
      scheduleSixteenth(nextBeatTime, beatCount);
      nextBeatTime += sixteenthInterval;
      beatCount++;
    }
  }

  function scheduleSixteenth(time, count) {
    var beatInMeasure = count % 16;
    var isDownbeat = (beatInMeasure === 0);
    var isOffbeat = !isDownbeat && (count % 2 === 1);

    // Swung 16th: push offbeats forward by ~40ms wobble
    var swing = 0;
    if (!isDownbeat && count % 2 === 1) {
      // LFO phase wobble on off-beats: ±25ms
      var lfoVal = Math.sin((count * 0.91) * Math.PI * 2);
      swing = lfoVal * 0.025;
    }

    var t = time + swing;

    // Downbeat: main tick
    if (isDownbeat) {
      playMetronomeTick(t, 0.28, 1000);
      // Apply 0.3s exhale buffer: visual pulse stays 0.3s after beat
      lastExhaleTime = performance.now();
      metronomePhase = 1;
      return;
    }

    // Off-beats: softer tick with wobble
    if (isOffbeat) {
      playMetronomeTick(t, 0.12, 800);
    }
  }

  function playMetronomeTick(time, vol, freq) {
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;

    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    // Bandpass for "mallet" character
    var bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 8;

    osc.connect(bp);
    bp.connect(g);
    g.connect(dryGain);
    g.connect(reverbConvolver);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  // ── Linen rustle: bandpass-filtered noise burst (200-800Hz) ──
  function playLinenRustle(velocity) {
    var t = audioCtx.currentTime;
    if (noiseBufPool.length === 0) return;

    var buf = noiseBufPool.shift();
    var src = audioCtx.createBufferSource();
    src.buffer = buf;

    var bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 200 + velocity * 600 / VELOCITY_MAX; // 200→800Hz
    bp.Q.value = 2 + velocity * 3 / VELOCITY_MAX;

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(Math.min(velocity / VELOCITY_MAX * 0.15, 0.12), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    src.connect(bp);
    bp.connect(g);
    g.connect(dryGain);

    src.start(t);
    // Return buffer to pool after use
    setTimeout(function () { noiseBufPool.push(buf); }, 150);
  }

  // ── Velocity-modulated staccato click ──
  function playStaccatoClick(velocity) {
    var t = audioCtx.currentTime;
    var freq = 1500 + Math.min(velocity, VELOCITY_MAX) * 60; // 1500→5100Hz

    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(Math.min(velocity / VELOCITY_MAX * 0.1, 0.08), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq;

    osc.connect(lp);
    lp.connect(g);
    g.connect(dryGain);
    g.connect(reverbConvolver);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // ── Yellow chord pluck: sine + triangle, breathing decay ──
  function playYellowChord(resolve) {
    if (chordPlaying) return;
    chordPlaying = true;
    chordResolveTime = performance.now();

    var t = audioCtx.currentTime;
    // Major triad: C4/E4/G4
    var freqs = [261.63, 329.63, 392.00];
    var types = ['sine', 'triangle', 'sine'];

    chordOscillators = [];

    for (var i = 0; i < 3; i++) {
      var osc = audioCtx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = freqs[i];

      var g = audioCtx.createGain();
      // Breathing decay: exponential envelope
      var sustain = resolve ? 2.5 : 0.5;
      var peakGain = resolve ? 0.18 : 0.08;

      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peakGain, t + 0.08);
      g.gain.setValueAtTime(peakGain, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + sustain);

      osc.connect(g);
      g.connect(dryGain);
      if (resolve) g.connect(reverbConvolver);

      osc.start(t);
      osc.stop(t + sustain + 0.3);
      chordOscillators.push(osc);
    }

    // Schedule chord fade out
    setTimeout(function () {
      chordPlaying = false;
      chordOscillators = [];
    }, (resolve ? 3000 : 800));

    if (resolve) reverbGain.gain.setTargetAtTime(0.5, t, 0.1);
    setTimeout(function () {
      if (reverbGain) reverbGain.gain.setTargetAtTime(0.35, audioCtx.currentTime, 0.3);
    }, resolve ? 2500 : 600);
  }

  // ── Friction threshold breached: sharp dissonant click ──
  function playDissonantClick() {
    var t = audioCtx.currentTime;
    // Minor second interval: harsh
    var osc1 = audioCtx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.value = 437.00; // A#4 (dissonant vs drone's A440)

    var osc2 = audioCtx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 466.16; // B4

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(dryGain);

    osc1.start(t);
    osc1.stop(t + 0.16);
    osc2.start(t);
    osc2.stop(t + 0.16);
  }

  // ── Alignment feedback: ping vs thud ──
  function playAlignmentPing() {
    var t = audioCtx.currentTime;
    // Harmonic resonance ping: C5
    var osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 523.25;

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    var lfo = audioCtx.createOscillator();
    lfo.frequency.value = 8;
    var lfoG = audioCtx.createGain();
    lfoG.gain.value = 3;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    osc.connect(g);
    g.connect(dryGain);
    g.connect(reverbConvolver);

    osc.start(t);
    osc.stop(t + 0.9);
    lfo.start(t);
    lfo.stop(t + 0.9);
  }

  function playAlignmentThud() {
    var t = audioCtx.currentTime;
    // Flat muted thud: low freq noise burst
    var buf = createNoiseBuffer(0.15);
    var src = audioCtx.createBufferSource();
    src.buffer = buf;

    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    src.connect(lp);
    lp.connect(g);
    g.connect(dryGain);

    src.start(t);
  }

  // ================================================================
  //  INPUT HANDLING
  // ================================================================

  var velSamples = [];

  function getPointerPos(e) {
    var touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX, y: touch.clientY };
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (!started) {
       started = true;
      initAudio();
      startMetronome();
      overlay.classList.add('hidden');
      }
    dragging = true;
    dissonantPlayed = false;
    dragStartTime = performance.now();
    var pos = getPointerPos(e);
    prevX = cursorX = pos.x;
    prevY = cursorY = pos.y;
    velX = velY = dragSpeed = 0;
    friction = 0;
    velSamples = [];

      // Linen rustle on drag start
    playLinenRustle(15);
   }

  function onPointerMove(e) {
    e.preventDefault();
    if (!dragging || !audioCtx) return;
    var pos = getPointerPos(e);

    var dx = pos.x - prevX;
    var dy = pos.y - prevY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    prevX = pos.x;
    prevY = pos.y;
    cursorX = pos.x;
    cursorY = pos.y;

    // 60Hz velocity sampling
    velX = dx;
    velY = dy;

    // Average over last 32 samples for smoothing
    velSamples.push(dist);
    if (velSamples.length > 32) velSamples.shift();
    var avgDist = 0;
    for (var i = 0; i < velSamples.length; i++) avgDist += velSamples[i];
    avgDist /= velSamples.length;
    dragSpeed = avgDist * VELOCITY_SAMPLE_RATE; // px/s

    // Clamp to fracture limit
    dragSpeed = Math.min(dragSpeed, VELOCITY_MAX);

    // Friction builds with velocity above threshold
    if (dragSpeed > VELOCITY_MIN) {
      friction += (dragSpeed / VELOCITY_MAX) * 0.08;
      friction = Math.min(friction, 1);
    } else {
      friction *= 0.95;
    }

    // Drone duck based on drag state
    setDroneDuck(dragSpeed > VELOCITY_MIN ? 1 : 0);

    // Staccato click synced to metronome on high velocity
    if (dragSpeed > VELOCITY_MIN && Math.random() < dragSpeed / VELOCITY_MAX * 0.3) {
      playStaccatoClick(dragSpeed);
    }

    // Linen rustle on threshold crossing
    if (dragSpeed > VELOCITY_MIN && friction > 0.1) {
      if (Math.random() < 0.15) {
        playLinenRustle(dragSpeed);
      }
    }

      // Dissonant click if velocity hits the cap
    if (dragSpeed >= VELOCITY_MAX && !dissonantPlayed) {
      playDissonantClick();
      dissonantPlayed = true;
     }
    if (dragSpeed < VELOCITY_MAX) {
      dissonantPlayed = false;
     }
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    dissonantPlayed = false;

     // 0.3s exhale window: capture alignment state at release
    var now = performance.now();
    var cxDist = Math.abs(circleCX - W / 2);
    var cyDist = Math.abs(circleCY - H / 2);
    var aligned = (cxDist < 2 && cyDist < 2 && friction > 0.3);

    setTimeout(function () {
      if (aligned) {
        playYellowChord(true);
        playAlignmentPing();
        circleAligned = true;
       } else {
        playYellowChord(false);
        if (friction < 0.1) {
          playAlignmentThud();
         } else {
          playDissonantClick();
         }
        circleAligned = false;
       }
     }, EXHALE_BUFFER * 1000);

     // Friction decay after release
    setTimeout(function () {
      friction *= 0.5;
     }, 500);
    }

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);

  // Touch support
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp);

  // ================================================================
  //  RENDERING — 60fps, delta-time capped
  // ================================================================

  var lastTime = performance.now();
  var DT_CAP = 0.034; // one frame over 30fps
  var halfPixelDrift = 0;
  var dissonantPlayed = false; // guard to prevent spam
    var circleCX = 0, circleCY = 0; // initialized in init()
  var targetCircleCX, targetCircleCY;
  var initX = 0, initY = 0; // starting offsets for circle

  function smoothstep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function render() {
    var now = performance.now();
    var dt = Math.min((now - lastTime) / 1000, DT_CAP);
    lastTime = now;

    // Breathing phase for yellow chord
    breathPhase += dt * 1.5;

    // Metronome phase decay (0.3s exhale window)
    if (metronomePhase > 0) {
      metronomePhase *= (1 - dt * 3.5);
      if (metronomePhase < 0.01) metronomePhase = 0;
    }

    // Half-pixel drift: applied via smoothstep easing on drag vectors
    if (dragging && dragSpeed > VELOCITY_MIN) {
      halfPixelDrift += dt * friction * 8;
    } else {
      halfPixelDrift *= (1 - dt * 2);
    }

    // Circle alignment: drifts toward center as friction builds
    var alignmentT = smoothstep(0.1, 0.8, friction);
    targetCircleCX = W / 2;
    targetCircleCY = H / 2;
    circleCX += (targetCircleCX - circleCX) * alignmentT * dt * 4;
    circleCY += (targetCircleCY - circleCY) * alignmentT * dt * 4;

    // Check if circle is "anchored" (within 2px of center)
    var cxDist = Math.abs(circleCX - W / 2);
    var cyDist = Math.abs(circleCY - H / 2);
    circleAligned = (cxDist < 2 && cyDist < 2 && friction > 0.3);

    // Triangle aggression dampens once circle anchors
    triangleAggression += (circleAligned ? 0 : 1 - triangleAggression) * dt * 2;
    if (circleAligned) {
      triangleAggression *= (1 - dt * 1.5);
    }

    // ── Canvas draw ──
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

      // Grid spine: rigid 40px spacing, 1px strokes
    ctx.strokeStyle = GRID_STROKE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = GRID_SPACING; gx <= W - 1; gx += GRID_SPACING) {
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
       }
    for (var gy = GRID_SPACING; gy <= H - 1; gy += GRID_SPACING) {
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
       }
    ctx.stroke();

    // Linen weave overlay: noise-based half-pixel drift
    drawLinenOverlay(halfPixelDrift, dt);

    // Central circle: #f5c542 yellow with breathing pulse
    var breathe = 1 + Math.sin(breathPhase) * 0.06 * metronomePhase;
    var drawRadius = circleRadius * breathe;
    var alpha = circleAligned ? 1 : 0.3 + friction * 0.7;

    ctx.save();
    // Apply half-pixel drift as sub-pixel offset
    ctx.translate(
      Math.sin(halfPixelDrift * 0.3) * 0.5,
      Math.cos(halfPixelDrift * 0.3) * 0.5
    );

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(circleCX, circleCY, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();
    ctx.restore();

    // Central triangle: aggression modulated
    var triSize = 30 * triangleAggression;
    var triCX = W / 2;
    var triCY = H / 2;
    ctx.beginPath();
    ctx.moveTo(triCX, triCY - triSize);
    ctx.lineTo(triCX + triSize * 0.866, triCY + triSize * 0.5);
    ctx.lineTo(triCX - triSize * 0.866, triCY + triSize * 0.5);
    ctx.closePath();
    ctx.fillStyle = TRIANGLE_COLOR;
    ctx.globalAlpha = 0.6 + metronomePhase * 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Drag vector highlight (light-catch on active drag)
    if (dragging && dragSpeed > VELOCITY_MIN) {
      ctx.save();
      ctx.strokeStyle = YELLOW;
      ctx.globalAlpha = (dragSpeed / VELOCITY_MAX) * 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(cursorX, cursorY);
      ctx.stroke();
      ctx.restore();

      // Velocity indicator dot at cursor
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 3 + dragSpeed / 10, 0, Math.PI * 2);
      ctx.fillStyle = dragSpeed >= VELOCITY_MAX ? '#ff4444' : YELLOW;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Chord resolve pulse ring
    if (chordPlaying) {
      var elapsed = (now - chordResolveTime) / 1000;
      var ringAlpha = Math.max(0, 1 - elapsed);
      var ringRadius = 60 + elapsed * 120;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = YELLOW;
      ctx.globalAlpha = ringAlpha * 0.4;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(render);
  }

    // Linen weave: procedural noise overlay (localized to drag area for perf)
  function drawLinenOverlay(drift, dt) {
    if (!dragging && !circleAligned) {
       // Only render linen during active drag or alignment for perf
      return;
      }

    var noiseScale = 0.06;
    var opacity = Math.min(dragSpeed / VELOCITY_MAX * 0.5, 0.5);
    if (opacity < 0.02) return;

      // Localized rendering: circle around cursor or center (avoids full-screen loop)
    var cx = dragging ? cursorX : W / 2;
    var cy = dragging ? cursorY : H / 2;
    var range = dragging ? 200 : 250;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = '#3a3a2a';
    ctx.lineWidth = 0.5;

    var weaveStep = 12;
    var x0 = Math.max(0, Math.floor((cx - range) / weaveStep) * weaveStep);
    var y0 = Math.max(0, Math.floor((cy - range) / weaveStep) * weaveStep);
    var x1 = Math.min(W, x0 + range * 2);
    var y1 = Math.min(H, y0 + range * 2);

    for (var wx = x0; wx < x1; wx += weaveStep) {
      for (var wy = y0; wy < y1; wy += weaveStep) {
        var nx = (wx + drift * 20) * noiseScale;
        var ny = (wy + drift * 15) * noiseScale;
        var v = noise2D(nx, ny);
        if (v > 0.3 && v < 0.7) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + weaveStep * v, wy + v * 0.3);
          ctx.stroke();
          }
        }
       }
    ctx.restore();
   }

  // ── Boot ──
  requestAnimationFrame(render);

})();
