/* FoundryAudio — dependency-free WebAudio one-shots for FactoryX games.
 *
 * Usage:
 *   1. COPY this file into your game's own directory (.factoryx/ is never
 *      committed) and load it: <script src="webaudio-kit.js"></script>
 *   2. Call FoundryAudio.install() once at boot. The AudioContext is created
 *      on the first pointerdown/keydown — browsers block audio before a user
 *      gesture, and the FactoryX critic probes exactly this: audio must play
 *      on interaction.
 *   3. Hook one-shots to game events: FoundryAudio.click(), .success(), ...
 *
 * Volume discipline: master defaults to 0.4. Hover is quieter than click,
 * fail is gentle rather than punishing, the drone pad sits far underneath.
 * Raise individual peaks before you ever raise the master.
 */
(function () {
  'use strict';

  var kit = {
    _ctx: null,
    _master: null,
    _drone: null,
    _volume: 0.4,
    muted: false,

    /* Arm a one-time gesture listener that unlocks the AudioContext. */
    install: function () {
      var self = this;
      var arm = function () {
        self._ensure();
        window.removeEventListener('pointerdown', arm);
        window.removeEventListener('keydown', arm);
      };
      window.addEventListener('pointerdown', arm);
      window.addEventListener('keydown', arm);
      return this;
    },

    ready: function () {
      return !!this._ctx;
    },

    setVolume: function (value) {
      this._volume = Math.max(0, Math.min(1, value));
      if (this._master) {
        this._master.gain.value = this.muted ? 0 : this._volume;
      }
    },

    mute: function () {
      this.muted = true;
      if (this._master) this._master.gain.value = 0;
    },

    unmute: function () {
      this.muted = false;
      if (this._master) this._master.gain.value = this._volume;
    },

    _ensure: function () {
      if (!this._ctx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        this._ctx = new Ctx();
        this._master = this._ctx.createGain();
        this._master.gain.value = this.muted ? 0 : this._volume;
        this._master.connect(this._ctx.destination);
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },

    /* One oscillator tone with an attack/decay envelope. */
    _tone: function (opts) {
      var ctx = this._ensure();
      if (!ctx) return;
      var t0 = ctx.currentTime + (opts.delay || 0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(opts.freq, t0);
      if (opts.sweepTo) {
        osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + opts.dur);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(opts.peak || 0.2, t0 + (opts.attack || 0.005));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
      osc.connect(gain).connect(this._master);
      osc.start(t0);
      osc.stop(t0 + opts.dur + 0.05);
    },

    /* Band-passed noise burst (whoosh). */
    _noise: function (opts) {
      var ctx = this._ensure();
      if (!ctx) return;
      var t0 = ctx.currentTime;
      var length = Math.max(1, Math.floor(ctx.sampleRate * opts.dur));
      var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource();
      src.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.8;
      filter.frequency.setValueAtTime(opts.from, t0);
      filter.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(opts.peak || 0.15, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
      src.connect(filter).connect(gain).connect(this._master);
      src.start(t0);
      src.stop(t0 + opts.dur + 0.05);
    },

    /* ── One-shots ──────────────────────────────────────────────────── */

    click: function () {
      this._tone({ type: 'triangle', freq: 660, sweepTo: 520, dur: 0.07, peak: 0.22 });
    },

    hover: function () {
      this._tone({ type: 'sine', freq: 880, dur: 0.045, peak: 0.08 });
    },

    success: function () {
      this._tone({ type: 'sine', freq: 523.25, dur: 0.12, peak: 0.2 });               /* C5 */
      this._tone({ type: 'sine', freq: 659.25, dur: 0.12, peak: 0.2, delay: 0.09 });  /* E5 */
      this._tone({ type: 'sine', freq: 783.99, dur: 0.22, peak: 0.22, delay: 0.18 }); /* G5 */
    },

    fail: function () {
      this._tone({ type: 'triangle', freq: 311.13, dur: 0.16, peak: 0.18 });              /* Eb4 */
      this._tone({ type: 'triangle', freq: 233.08, dur: 0.3, peak: 0.18, delay: 0.12 });  /* Bb3 */
    },

    pickup: function () {
      this._tone({ type: 'triangle', freq: 440, sweepTo: 1046.5, dur: 0.09, peak: 0.2 });
    },

    whoosh: function () {
      this._noise({ from: 320, to: 1800, dur: 0.28, peak: 0.15 });
    },

    /* Low drone pad: two barely-detuned sines under a lowpass. Fades in over
     * ~2.5s and sits at a whisper — atmosphere, not music. */
    droneStart: function (freq) {
      var ctx = this._ensure();
      if (!ctx || this._drone) return;
      var base = freq || 55; /* A1 */
      var t0 = ctx.currentTime;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.06, t0 + 2.5);
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      var oscA = ctx.createOscillator();
      var oscB = ctx.createOscillator();
      oscA.type = 'sine';
      oscB.type = 'sine';
      oscA.frequency.value = base;
      oscB.frequency.value = base * 1.007; /* slow beating between the pair */
      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain).connect(this._master);
      oscA.start(t0);
      oscB.start(t0);
      this._drone = { oscA: oscA, oscB: oscB, gain: gain };
    },

    droneStop: function () {
      if (!this._ctx || !this._drone) return;
      var t0 = this._ctx.currentTime;
      var drone = this._drone;
      this._drone = null;
      drone.gain.gain.setTargetAtTime(0.0001, t0, 0.6);
      drone.oscA.stop(t0 + 3);
      drone.oscB.stop(t0 + 3);
    }
  };

  if (typeof window !== 'undefined') window.FoundryAudio = kit;
  if (typeof module !== 'undefined' && module.exports) module.exports = kit;
})();
