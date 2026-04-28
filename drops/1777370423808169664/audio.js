// =============================================================
//  Procedural Audio Engine — Bauhaus Metronome & Friction
//  Web Audio API, lightweight, non-blocking, user-activated
// =============================================================

const AudioEngine = (function () {
  "use strict";

  // ---------- timing constants (from brief) ----------
  const CYCLE_DURATION  = 2.7;      // 2.4s + 0.3s Kandinsky extension
  const BEAT_INTERVAL   = 0.5;      // 120 BPM -> 0.5s
  const PHASE_LANTERN   = 0.8;
  const PHASE_TRIANGLE  = 1.8;
  const PHASE_LOCK      = 2.7;     // structural lock after 0.3s breath

  // ---------- internal state ----------
  let ctx           = null;
  let masterGain    = null;
  let started       = false;
  let muted         = false;
  let metronomeBeat = -1;
  let nextBeatTime  = 0;
  let prevPhase     = -1;

  // play-once guards per cycle
  let _gN = {
    gridSnap: false,
    lantern:  false,
    lock:     false,
    drift:    false,
    hover:    false,
    reset:    false,
  };

  // cached noise buffer for linen friction (created once)
  let frictionBuffer = null;

  // ---------- public API (exposed at end) ----------
  const api = {
    start,
    toggleMute,
    isMuted,
    schedule,
    getCtx,
  };

  // == Context activation (user-triggered to avoid autoplay block) ==

  function start() {
    if (started) return;
    started = true;

    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;           // -~9dB headroom
    masterGain.connect(ctx.destination);

    _buildFrictionBuffer();

    // schedule first beat immediately
    nextBeatTime = ctx.currentTime;
  }

  function getCtx() { return ctx; }

  function isMuted() { return muted; }

  function toggleMute() {
    if (!ctx) return;
    muted = !muted;
    masterGain.gain.setTargetAtTime(muted ? 0 : 0.3, ctx.currentTime, 0.05);
    return muted;
  }

  // ---- Noise buffer: linen friction ----

  function _buildFrictionBuffer() {
    const length = ctx.sampleRate * 1.5;       // 1.5s buffer
    frictionBuffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = frictionBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // mix white noise + 1/f-ish randomness for fabric texture
        const white  = Math.random() * 2 - 1;
        const brownish = _brownish(i, length);
        data[i] = (white * 0.4) + (brownish * 0.6);
      }
    }
  }

  // simple running-average 1/f noise helper
  function _brownish(i, n) {
    // inline brown noise via recursive approximation
    // uses pre-computed seed to avoid external state
    return (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / n * Math.PI * 6));
  }

  // ---- Sound generators ----

  function _metronomeTick(time, vol) {
    vol = vol || 0.12;
    if (!ctx) return;

    // "pocket watch dropped in a puddle" — tight sine click + short metallic tail
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 950;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.07);

    // secondary "puddle" resonance — low tinny blip
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.value = 2400 + (Math.random() * 200);  // slight jitter for puddle feel

    gain2.gain.setValueAtTime(vol * 0.35, time);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc2.start(time);
    osc2.stop(time + 0.12);
  }

  // Syncopated pulse — offsets every 3rd beat
  function _syncopatedPulse(time, vol) {
    vol = vol || 0.08;
    if (!ctx) return;

    // Sub-bass thump with swing feel
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.18);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  function _gridSnap(time) {
    // Crisp descending-click — square pulse + blue-channel sine at 440Hz
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 1200;

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.012);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.02);

    // blue channel harmonic
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.value = 440;
    g2.gain.setValueAtTime(0.05, time);
    g2.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    o2.connect(g2);
    g2.connect(masterGain);
    o2.start(time);
    o2.stop(time + 0.12);
  }

  function _lanternExhale(time) {
    // Soft inhale / breath — filtered noise through lowpass, sine envelope
    if (!ctx) return;

    const src  = ctx.createBufferSource();
    src.buffer = frictionBuffer;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, time);
    lp.frequency.exponentialRampToValueAtTime(120, time + CYCLE_DURATION * 0.6);
    lp.Q.value = 1.2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.07, time + 0.3);
    env.gain.linearRampToValueAtTime(0.04, time + 1.2);
    env.gain.exponentialRampToValueAtTime(0.001, time + CYCLE_DURATION * 0.7);

    src.connect(lp);
    lp.connect(env);
    env.connect(masterGain);

    src.start(time);
    src.stop(time + CYCLE_DURATION * 0.8);
  }

  function _frictionRustle(time, intensity) {
    // Linen friction — bandpass filtered noise, intensity 0..1 controls volume
    if (!ctx) return;
    intensity = Math.max(0, Math.min(1, intensity || 0.5));

    const src  = ctx.createBufferSource();
    src.buffer = frictionBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + intensity * 800;
    bp.Q.value = 3;

    const env = ctx.createGain();
    env.gain.setValueAtTime(intensity * 0.08, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    src.connect(bp);
    bp.connect(env);
    env.connect(masterGain);

    src.start(time);
    src.stop(time + 0.3);
  }

  function _yellowChord(time) {
    // "Yellow chord" resolution — warm major triad in E, with slow attack
    // E4 (329.63), G#4 (415.30), B4 (493.88)
    if (!ctx) return;

    const notes = [329.63, 415.30, 493.88];
    notes.forEach(function (freq, i) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // staggered attack for organic layering
      const attack = time + i * 0.04;
      gain.gain.setValueAtTime(0, attack);
      gain.gain.linearRampToValueAtTime(0.06, attack + 0.15);
      gain.gain.setValueAtTime(0.06, attack + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, attack + 1.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(attack);
      osc.stop(attack + 1.6);
    });

    // warm sub pad at E2
    const sub  = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = 82.41;
    sGain.gain.setValueAtTime(0, time);
    sGain.gain.linearRampToValueAtTime(0.04, time + 0.2);
    sGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

    sub.connect(sGain);
    sGain.connect(masterGain);
    sub.start(time);
    sub.stop(time + 1.7);
  }

  function _structuralLock(time) {
    // Deep grounded thud — 55Hz sine with fast attack, slow decay
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 55;

    gain.gain.setValueAtTime(0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  function _halfPixelDriftHum(time, drift) {
    // High-frequency hum modulated by triangle bloom
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 2400 + drift * 300;

    gain.gain.setValueAtTime(Math.abs(drift) * 0.025, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  function _resetCue(time) {
    // Ascending 3-note gliss — signals loop reset
    if (!ctx) return;

    [660, 880, 1108].forEach(function (f, i) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0   = time + i * 0.06;

      osc.type = 'triangle';
      osc.frequency.value = f;

      gain.gain.setValueAtTime(0.04, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    });
  }

  // ---- State-transition cues ----

  function cueInput(time)   { _frictionRustle(time, 0.4); }
  function cueSuccess(time) { _yellowChord(time); }
  function cueReset(time)   { _resetCue(time); }
  function cueFail(time) {
    // Minor second dissonance — quick, unresolved
    if (!ctx) return;
    [330, 349].forEach(function (f) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.25);
    });
  }

  // ---- Main scheduler ----
  // Called every frame; schedules sounds in advance (look-ahead = 0.1s)

  function schedule(globalTime, phase, prevPhase, drift) {
    if (!ctx || !started) return;

    const now = ctx.currentTime;

    // ----- metronome: every 0.5s -----
    const beatIdx = Math.floor(globalTime / BEAT_INTERVAL);
    if (beatIdx !== metronomeBeat) {
      metronomeBeat = beatIdx;

      const t = nextBeatTime;

      // On beats divisible by 4 -> syncopated pulse instead of click
      if (beatIdx % 4 === 0) {
        _syncopatedPulse(t, 0.1);
      } else {
        _metronomeTick(t, 0.1);
      }

      nextBeatTime += BEAT_INTERVAL;
    }

    // ----- grid snap at 0.0s of cycle -----
    const cycle = Math.floor(globalTime / CYCLE_DURATION);
    if (prevPhase > (CYCLE_DURATION - 0.12) && phase < 0.12) {
      if (!_gN.gridSnap) {
        _gridSnap(now);
        _gN.gridSnap = true;
      }
    }
    if (phase > 0.18) _gN.gridSnap = false;

    // ----- lantern exhale at 0.8s -----
    if (prevPhase < PHASE_LANTERN && phase >= PHASE_LANTERN) {
      if (!_gN.lantern) {
        _lanternExhale(now);
        _gN.lantern = true;
      }
    }
    if (phase > PHASE_LANTERN + 0.12) _gN.lantern = false;

    // ----- triangle bloom hum -----
    if (drift && drift > 0.02) {
      if (!_gN.drift) {
        _halfPixelDriftHum(now, drift);
        _gN.drift = true;
        // also a friction rustle
        _frictionRustle(now, Math.min(drift * 2, 1));
      }
    }
    if (!drift || drift < 0.01) _gN.drift = false;

    // ----- structural lock thud -----
    if (prevPhase > (CYCLE_DURATION - 0.1) && phase < 0.1 && globalTime > CYCLE_DURATION) {
      if (!_gN.lock) {
        _structuralLock(now);
        // yellow chord blooms right after the lock
        setTimeout(function () { cueSuccess(ctx.currentTime); }, 200);
        _gN.lock = true;
      }
    }
    if (phase > 0.15) _gN.lock = false;

    // ----- reset cue on cycle rollover (after first cycle) -----
    if (prevPhase > (CYCLE_DURATION - 0.05) && phase < 0.05 && cycle > 1) {
      if (!_gN.reset) {
        cueReset(now);
        _gN.reset = true;
      }
    }
    if (phase > 0.12) _gN.reset = false;

    prevPhase = phase;
  }

  // ---------- expose ----------
  return api;

})();
