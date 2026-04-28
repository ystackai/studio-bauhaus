// ───────────────────────────────────────────────────────
// Bauhaus 0.10 — Structural Spine, Linen Weave, Drag Anchor
// ───────────────────────────────────────────────────────

(() => {
    "use strict";

    // ─── CONSTANTS ──────────────────────────────────────
    const GRID_SIZE = 40;
    const EXHALE_WINDOW = 300; // ms, ±5ms
    const DRAG_THRESHOLD = 8; // px, raised friction to prevent slide
    const DRIFT_TOLERANCE = 0.5; // half-pixel
    const BPM = 72;
    const BEAT_INTERVAL = 60_000 / BPM; // ms per beat
    const PITCH_BEND_HZ = 15;
    const PITCH_BEND_DECAY = 800; // ms
    const LFO_RATE_MIN = 0.4; // "lazy cat stretch"
    const LFO_RATE_MAX = 0.6;
    const BASE_LOCK_MS = 2400;
    const CHORD_FREQS = [261.63, 329.63, 392.00]; // C4, E4, G4 (major third resonance)

    // ─── STATE ──────────────────────────────────────────
    let canvas, ctx, W, H;
    let audioCtx = null;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let geometryX = 0, geometryY = 0;
    let snappedX = 0, snappedY = 0;
    let geometryType = "circle"; // "circle" | "triangle"
    let dragEngaged = false; // threshold click fired
    let state = "idle"; // "idle" | "dragging" | "exhaling" | "resolving"
    let exhaleTimer = null;
    let metronomeIntervalId = null;
    let metronomePhase = 0;
    let lastBeatTime = 0;
    let dragRumblNode = null;
    let chordNodes = [];
    let lfoNode = null, lfoGain = null;
    let frameId = null;
    let linenPattern = null;
    let dragVectorX = 0, dragVectorY = 0;

    // ─── INIT ───────────────────────────────────────────
    function init() {
        canvas = document.getElementById("spine");
        ctx = canvas.getContext("2d");
        resize();
        window.addEventListener("resize", resize);

        createLinenPattern();

        // Center initial geometry on grid
        snappedX = Math.round(W / 2 / GRID_SIZE) * GRID_SIZE;
        snappedY = Math.round(H / 2 / GRID_SIZE) * GRID_SIZE;
        geometryX = snappedX;
        geometryY = snappedY;

        // Input: mouse and touch
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);

        // Start metronome and render loop
        startMetronome();
        renderLoop();
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * (devicePixelRatio || 1);
        canvas.height = H * (devicePixelRatio || 1);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
        createLinenPattern();
    }

    // ─── AUDIO CONTEXT ──────────────────────────────────
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // ─── METRONOME: 72 BPM with loose-spring wobble ─────
    function startMetronome() {
        lastBeatTime = performance.now();
        tickMetronome();
        metronomeIntervalId = setInterval(tickMetronome, BEAT_INTERVAL);
    }

    function tickMetronome() {
        const ac = getAudioCtx();
        const now = ac.currentTime;
        const beat = metronomePhase % 4;

        // Downbeat: full click; off-beat: softer click
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        // Loose spring wobble: pitch bend ±15Hz decaying 0.8s
        const baseFreq = beat === 0 ? 1000 : 800;
        const wobble = Math.sin(metronomePhase * 0.5) * PITCH_BEND_HZ;

        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq + wobble, now);
        osc.frequency.exponentialRampToValueAtTime(
            baseFreq + wobble * 0.5,
            now + 0.8
        );

        const vol = beat === 0 ? 0.12 : 0.06;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain).connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.8);
        metronomePhase++;
    }

    // ─── DRAG AUDIO: friction rumble + threshold click ───
    function playDragRumble() {
        const ac = getAudioCtx();
        const now = ac.currentTime;

        // Low frequency noise-like rumble
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const lfo = ac.createOscillator();
        const lfoGain = ac.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(55, now);

        // Irregular LFO for texture
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(LFO_RATE_MIN + Math.random() * (LFO_RATE_MAX - LFO_RATE_MIN), now);
        lfoGain.gain.setValueAtTime(8, now);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.04, now);

        osc.connect(gain).connect(ac.destination);
        osc.start(now);
        lfo.start(now);

        dragRumblNode = { osc, gain, lfo, lfoGain };
    }

    function stopDragRumble() {
        if (!dragRumblNode) return;
        const ac = getAudioCtx();
        const { osc, gain, lfo } = dragRumblNode;
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
        osc.stop(ac.currentTime + 0.12);
        lfo.stop(ac.currentTime + 0.12);
        dragRumblNode = null;
    }

    function playThresholdClick() {
        const ac = getAudioCtx();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(g).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    // ─── RELEASE AUDIO: spring snap + drift ping ────────
    function playSpringSnap() {
        const ac = getAudioCtx();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(g).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.26);
    }

    function playDriftPing() {
        const ac = getAudioCtx();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.16);
    }

    // ─── EXHALE AUDIO: air swell + syncopated off-beat click ──
    function playExhaleSwell() {
        const ac = getAudioCtx();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(180, t + 0.3);
        g.gain.setValueAtTime(0.03, t);
        g.gain.linearRampToValueAtTime(0.09, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(g).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.31);
    }

    function playOffBeatClick() {
        const ac = getAudioCtx();
        const t = ac.currentTime;
        // Off-beat: half the beat interval = syncopation
        setTimeout(() => {
            const ac2 = getAudioCtx();
            const t2 = ac2.currentTime;
            const osc = ac2.createOscillator();
            const g = ac2.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(900, t2);
            g.gain.setValueAtTime(0.07, t2);
            g.gain.exponentialRampToValueAtTime(0.001, t2 + 0.05);
            osc.connect(g).connect(ac2.destination);
            osc.start(t2);
            osc.stop(t2 + 0.06);
        }, BEAT_INTERVAL / 2);
    }

    // ─── CHORD: yellow major third resolution ──────────────
    function playYellowChord() {
        const ac = getAudioCtx();
        const t = ac.currentTime;
        const masterGain = ac.createGain();
        const lp = ac.createBiquadFilter();

        // Spatial panning from drag vector
        const panX = Math.max(-1, Math.min(1, dragVectorX / (W * 0.4)));
        const panner = ac.createStereoPanner();
        panner.pan.setValueAtTime(panX, t);

        lp.type = "lowpass";
        lp.frequency.setValueAtTime(2200, t);
        lp.frequency.exponentialRampToValueAtTime(800, t + 0.6);
        lp.Q.setValueAtTime(1.2, t);

        masterGain.gain.setValueAtTime(0, t);
        masterGain.gain.linearRampToValueAtTime(0.18, t + 0.05);
        masterGain.gain.setValueAtTime(0.18, t + 0.15);
        masterGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        // LFO "lazy cat stretch"
        lfoNode = ac.createOscillator();
        lfoGain = ac.createGain();
        const lfoRate = LFO_RATE_MIN + Math.random() * (LFO_RATE_MAX - LFO_RATE_MIN);
        lfoNode.type = "sine";
        lfoNode.frequency.setValueAtTime(lfoRate, t);
        lfoGain.gain.setValueAtTime(4, t);

        lfoNode.connect(lfoGain);
        lfoGain.connect(lp.frequency);
        lfoNode.start(t);
        lfoNode.stop(t + 1.3);

        panner.connect(masterGain).connect(ac.destination);

        chordNodes = [];

        CHORD_FREQS.forEach((freq) => {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.3, t);
            osc.connect(g).connect(lp);
            osc.start(t);
            osc.stop(t + 1.3);
            chordNodes.push({ osc, gain: g });
        });

        // Geometry settle thud
        const thud = ac.createOscillator();
        const thudG = ac.createGain();
        thud.type = "sine";
        thud.frequency.setValueAtTime(60, t);
        thud.frequency.exponentialRampToValueAtTime(30, t + 0.4);
        thudG.gain.setValueAtTime(0.2, t);
        thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        thud.connect(thudG).connect(ac.destination);
        thud.start(t);
        thud.stop(t + 0.51);
        chordNodes.push({ osc: thud, gain: thudG });
    }

    // ─── LINEN WEAVE PATTERN ──────────────────────────────
    function createLinenPattern() {
        const pc = document.createElement("canvas");
        const pSize = 24;
        pc.width = pSize;
        pc.height = pSize;
        const p = pc.getContext("2d");

        // Base linen
        p.fillStyle = "#F5F2EB";
        p.fillRect(0, 0, pSize, pSize);

        // Weave threads
        p.strokeStyle = "rgba(180, 175, 165, 0.35)";
        p.lineWidth = 0.6;
        // Horizontal threads
        for (let y = 0; y < pSize; y += 3) {
            p.beginPath();
            p.moveTo(0, y + Math.random() * 0.8);
            p.lineTo(pSize, y + Math.random() * 0.8);
            p.stroke();
        }
        // Vertical threads
        for (let x = 0; x < pSize; x += 3) {
            p.beginPath();
            p.moveTo(x + Math.random() * 0.8, 0);
            p.lineTo(x + Math.random() * 0.8, pSize);
            p.stroke();
        }

        // Grain noise
        for (let i = 0; i < 80; i++) {
            const gx = Math.random() * pSize;
            const gy = Math.random() * pSize;
            const bright = 190 + Math.random() * 50;
            p.fillStyle = `rgba(${bright}, ${bright - 5}, ${bright - 15}, ${0.1 + Math.random() * 0.15})`;
            p.fillRect(gx, gy, 1, 1);
        }

        linenPattern = ctx.createPattern(pc, "repeat");
    }

    // ─── GRID SPINE RENDER ───────────────────────────────
    function drawGrid() {
        // Primary grid
        ctx.strokeStyle = "rgba(26, 26, 26, 0.25)";
        ctx.lineWidth = 0.8;
        for (let x = GRID_SIZE; x < W; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = GRID_SIZE; y < H; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Secondary subdivisions (load-bearing cross points)
        ctx.fillStyle = "rgba(26, 26, 26, 0.12)";
        for (let x = 0; x <= W; x += GRID_SIZE) {
            for (let y = 0; y <= H; y += GRID_SIZE) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ─── GEOMETRY DRAWING ─────────────────────────────────
    const GEO_RADIUS = 28;

    function snapToGrid(x, y) {
        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        };
    }

    function drawGeometry(x, y, type, highlight) {
        ctx.save();

        // Shadow / depth
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;

        if (type === "circle") {
            // Anchor circle
            ctx.beginPath();
            ctx.arc(x, y, GEO_RADIUS, 0, Math.PI * 2);
            ctx.closePath();

            const grad = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, GEO_RADIUS);
            if (highlight) {
                // Yellow chord bloom
                grad.addColorStop(0, "#FFD700");
                grad.addColorStop(0.7, "#E6C200");
                grad.addColorStop(1, "#C9A800");
            } else {
                grad.addColorStop(0, "#8E8E8E");
                grad.addColorStop(0.7, "#7E7E7E");
                grad.addColorStop(1, "#6E6E6E");
            }
            ctx.fillStyle = grad;
            ctx.fill();

            // Linen texture overlay on geometry
            ctx.globalCompositeOperation = "overlay";
            if (linenPattern) {
                ctx.fillStyle = linenPattern;
                ctx.fill();
            }
            ctx.globalCompositeOperation = "source-over";

            ctx.shadowColor = "transparent";
            ctx.strokeStyle = "rgba(26,26,26,0.4)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x, y, GEO_RADIUS, 0, Math.PI * 2);
            ctx.stroke();

        } else if (type === "triangle") {
            // Transient triangle
            const r = GEO_RADIUS;
            const h = r * Math.sqrt(3);
            ctx.beginPath();
            ctx.moveTo(x, y - h * 0.4);
            ctx.lineTo(x - r * 0.86, y + h * 0.56);
            ctx.lineTo(x + r * 0.86, y + h * 0.56);
            ctx.closePath();

            const grad = ctx.createLinearGradient(x - r, y - h * 0.4, x + r, y + h * 0.56);
            grad.addColorStop(0, "#B0B0B0");
            grad.addColorStop(0.5, "#9E9E9E");
            grad.addColorStop(1, "#A0A0A0");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.strokeStyle = "rgba(26,26,26,0.45)";
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        ctx.restore();
    }

    // ─── EXHALE VISUAL ─────────────────────────────────────
    let exhaleProgress = 0;
    let exhaleStart = 0;

    function drawExhaleRing(x, y) {
        if (state !== "exhaling") return;
        const elapsed = performance.now() - exhaleStart;
        const prog = Math.min(elapsed / EXHALE_WINDOW, 1);
        const pulseR = GEO_RADIUS + 18 * Math.sin(prog * Math.PI);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 * (1 - prog)})`;
        ctx.lineWidth = 2 + 4 * (1 - prog);
        ctx.stroke();
        ctx.restore();
    }

    // ─── CHORD BLOOM ──────────────────────────────────────
    let chordBloomAlpha = 0;
    let chordBloomActive = false;

    function drawChordBloom(x, y) {
        if (!chordBloomActive) return;
        const scale = 1 + chordBloomAlpha * 0.25;
        ctx.save();
        ctx.globalAlpha = chordBloomAlpha * 0.2;
        const grad = ctx.createRadialGradient(x, y, GEO_RADIUS * 0.5, x, y, GEO_RADIUS * 5 * scale);
        grad.addColorStop(0, "#FFD700");
        grad.addColorStop(0.4, "rgba(255, 215, 0, 0.5)");
        grad.addColorStop(1, "rgba(255, 215, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - GEO_RADIUS * 5, y - GEO_RADIUS * 5, GEO_RADIUS * 10, GEO_RADIUS * 10);
        ctx.restore();

        // Decay bloom
        chordBloomAlpha *= 0.975;
        if (chordBloomAlpha < 0.005) {
            chordBloomActive = false;
            chordBloomAlpha = 0;
            state = "idle";
            geometryType = "circle";
            // Reset position to grid center
            snappedX = Math.round(W / 2 / GRID_SIZE) * GRID_SIZE;
            snappedY = Math.round(H / 2 / GRID_SIZE) * GRID_SIZE;
            geometryX = snappedX;
            geometryY = snappedY;
        }
    }

    // ─── POINTER HANDLERS ─────────────────────────────────
    function onPointerDown(e) {
        getAudioCtx();
        const pt = canvasPoint(e);
        dragStartX = pt.x;
        dragStartY = pt.y;
        isDragging = true;
        dragEngaged = false;
        state = "dragging";
        playDragRumble();

         // Re-init smooth position to anchor drag to pointer
        smoothingGeometryX = geometryX;
        smoothingGeometryY = geometryY;

         // Triangle aggression on engagement
        geometryType = "triangle";
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const pt = canvasPoint(e);
        const dx = pt.x - dragStartX;
        const dy = pt.y - dragStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

          // Raised threshold: friction bite
        if (!dragEngaged && dist >= DRAG_THRESHOLD) {
            dragEngaged = true;
            geometryX = pt.x;
            geometryY = pt.y;
            playThresholdClick();
          }

        if (dragEngaged) {
              // Drag vector for spatial panning
            dragVectorX = pt.x - snappedX;
            dragVectorY = pt.y - snappedY;

              // Follow pointer while dragging, always snapped to grid on release later
            geometryX = pt.x;
            geometryY = pt.y;
          }
      }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        stopDragRumble();

          // Compute pre-snap position vs grid target for drift validation
        const rawX = geometryX;
        const rawY = geometryY;
        const s = snapToGrid(rawX, rawY);

          // Half-pixel drift: distance from release point to nearest grid intersection
        const driftX = Math.abs(rawX - s.x);
        const driftY = Math.abs(rawY - s.y);
        const drift = Math.sqrt(driftX * driftX + driftY * driftY);

          // Apply snap
        snappedX = s.x;
        snappedY = s.y;
        geometryX = snappedX;
        geometryY = snappedY;

        playSpringSnap();

        if (drift <= DRIFT_TOLERANCE) {
            playDriftPing();
            beginExhale();
          } else {
              // Reject: geometry too far from grid, unstable
            state = "idle";
            geometryType = "circle";
          }
     }

    function beginExhale() {
        state = "exhaling";
        exhaleStart = performance.now();
        exhaleProgress = 0;
        playExhaleSwell();
        playOffBeatClick();

        // Resolve after EXHALE_WINDOW (0.3s)
        if (exhaleTimer) clearTimeout(exhaleTimer);
        exhaleTimer = setTimeout(() => {
            resolveChord();
        }, EXHALE_WINDOW);
    }

    function resolveChord() {
        state = "resolving";
        geometryType = "circle"; // Triangle aggression dissolves into circle anchor
        chordBloomActive = true;
        chordBloomAlpha = 1;
        playYellowChord();
    }

    // ─── COORDINATES ─────────────────────────────────────
    function canvasPoint(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    // ─── SMOOTH SNAP ANIMATION ───────────────────────────
    let smoothingGeometryX = 0, smoothingGeometryY = 0;

    function initSmoothPos() {
        smoothingGeometryX = geometryX;
        smoothingGeometryY = geometryY;
    }

    function updateSmoothPos() {
        if (state === "exhaling") {
             // Hard-lock geometry to center, zero drift during exhale window
            smoothingGeometryX = snappedX;
            smoothingGeometryY = snappedY;
        } else if (!isDragging) {
             // Snap-toward with spring
            const snapTargetX = snappedX;
            const snapTargetY = snappedY;
            smoothingGeometryX += (snapTargetX - smoothingGeometryX) * 0.18;
            smoothingGeometryY += (snapTargetY - smoothingGeometryY) * 0.18;
         } else {
            smoothingGeometryX = geometryX;
            smoothingGeometryY = geometryY;
         }
     }

    // ─── RENDER LOOP (60fps) ─────────────────────────────
    function renderLoop() {
        updateSmoothPos();

        // Clear
        ctx.clearRect(0, 0, W, H);

        // 1. Linen weave base
        if (linenPattern) {
            ctx.fillStyle = linenPattern;
            ctx.fillRect(0, 0, W, H);
        }

        // 2. Grid spine (load-bearing)
        drawGrid();

        // 3. Current geometry with snap animation
        drawGeometry(smoothingGeometryX, smoothingGeometryY, geometryType, state === "resolving");

        // 4. Exhale ring
        drawExhaleRing(smoothingGeometryX, smoothingGeometryY);

        // 5. Chord bloom (yellow resonance)
        drawChordBloom(smoothingGeometryX, smoothingGeometryY);

         // 6. Drag indicator when threshold not yet met
        if (isDragging && !dragEngaged) {
            const dx = dragStartX - geometryX;
            const dy = dragStartY - geometryY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const progress = Math.min(dist / DRAG_THRESHOLD, 1);
            ctx.save();
            ctx.beginPath();
            ctx.arc(geometryX, geometryY, GEO_RADIUS + 4 + 6 * progress, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(26, 26, 26, ${0.15 + 0.2 * progress})`;
            ctx.lineWidth = 1.2 + progress;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.restore();
          }

        // 7. Half-pixel validation indicator
        if (state === "exhaling") {
            const elapsed = performance.now() - exhaleStart;
            const prog = Math.min(elapsed / EXHALE_WINDOW, 1);
            ctx.save();
            ctx.fillStyle = `rgba(255, 215, 0, ${0.6 * prog})`;
            ctx.font = `10px monospace`;
            ctx.textAlign = "center";
            ctx.fillText(`${Math.round((1 - prog) * EXHALE_WINDOW)}ms`, smoothingGeometryX, smoothingGeometryY + GEO_RADIUS + 18);
            ctx.restore();
        }

        frameId = requestAnimationFrame(renderLoop);
    }

    // ─── BOOT ─────────────────────────────────────────────
    initSmoothPos();
    init();
})();
