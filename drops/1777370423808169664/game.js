// =============================================================
//  game.js — Bauhaus grid / friction / pulse visualization
//  Renders canvas and drives audio scheduler via AudioEngine
// =============================================================

"use strict";

// ---------- constants ----------
const TARGET_FPS      = 60;
const FRAME_DURATION  = 1000 / TARGET_FPS;
const CYCLE_DURATION  = 2.7;              // 2.4 + 0.3s extension

const BPM             = 120;
const BEAT_INTERVAL   = 60 / BPM;         // 0.5s

const PHASE_LANTERN      = 0.8;
const PHASE_TRIANGLE     = 1.8;
const PHASE_STRUCTURAL   = 2.7;

const TRIANGLE_YELLOW   = [242, 208, 43];
const PAPER_COLOR       = [245, 240, 232];

// ---------- state ----------
var canvas        = null;
var ctx           = null;
var w             = window.innerWidth;
var h             = window.innerHeight;
var cycleStart    = 0;
var globalTime    = 0;
var lastFrame     = 0;
var prevPhase     = -1;
var halfPixelDrift= 0;

var isHovering   = false;
var hoverStart   = 0;
var mouseX       = 0;
var mouseY       = 0;

var animId       = null;

// ---------- timing helpers ----------
function getPhase(t) { return t % CYCLE_DURATION; }

function sineEase(t) {
   return Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
}

function sineEaseIn(t) {
   return 1 - Math.cos((Math.PI / 2) * Math.max(0, Math.min(1, t)));
}

function computeLanternOpacity(t) {
   var p = getPhase(t);
   if (p < PHASE_LANTERN || p > PHASE_STRUCTURAL) return 0;
   return sineEase((p - PHASE_LANTERN) / (PHASE_STRUCTURAL - PHASE_LANTERN));
}

function computeTriangleBleed(t) {
   var p = getPhase(t);
   if (p < PHASE_TRIANGLE) return 0;
   return sineEaseIn(Math.min((p - PHASE_TRIANGLE) / (PHASE_STRUCTURAL - PHASE_TRIANGLE), 1));
}

function computeDrift(t) {
   var p = getPhase(t);
   if (p < 2.0) return 0;
   var tt = (p - 2.0) / 0.7;
   return 0.5 * sineEase(Math.min(tt, 1));
}

// ---------- drawing ----------
function drawPaper() {
   ctx.fillStyle = "rgb(" + PAPER_COLOR.join(",") + ")";
   ctx.fillRect(0, 0, w, h);
}

function drawGrain(elapsed, drift) {
   var density = 180 + Math.round(drift * 20);
   var seed    = Math.floor(elapsed * 10) % 1000;

   ctx.fillStyle = "rgba(0,0,0,0.025)";
   for (var i = 0; i < density; i++) {
      var x = ((i * 7 + seed) % w) + drift * ((i % 2 === 0) ? 1 : -1);
      var y = ((i * 13 + seed * 3) % h);
      ctx.fillRect(Math.round(x + 0.5), Math.round(y), 1, 1);
   }
}

function drawGrid(phase) {
   var snapIntensity = phase < 0.1
      ? sineEase(phase / 0.1)
      : Math.max(0, 1 - (phase - 0.1) / 0.5);

   var sp = 60;
   ctx.strokeStyle = "rgba(80,90,110," + (0.08 + snapIntensity * 0.25) + ")";
   ctx.lineWidth   = 0.5 + snapIntensity * 0.5;

   for (var x = sp; x < w; x += sp) {
      var dO = halfPixelDrift * Math.sin(x * 0.01);
      ctx.beginPath();
      ctx.moveTo(x + dO, 0);
      ctx.lineTo(x + dO, h);
      ctx.stroke();
   }
   for (var y = sp; y < h; y += sp) {
      var dO2 = halfPixelDrift * Math.cos(y * 0.01);
      ctx.beginPath();
      ctx.moveTo(0, y + dO2);
      ctx.lineTo(w, y + dO2);
      ctx.stroke();
   }
}

function drawStructuralLines(phase) {
   var lp = phase >= PHASE_STRUCTURAL - 0.5
      ? Math.min((phase - (PHASE_STRUCTURAL - 0.5)) / 0.5, 1)
      : 0;

   ctx.strokeStyle = "rgba(60,70,90," + (0.12 + lp * 0.3) + ")";
   ctx.lineWidth   = 1 + lp * 1.5;

   var cx = w / 2, cy = h / 2;
   var sz = Math.min(w, h) * 0.25;

   // horizontal
   ctx.beginPath(); ctx.moveTo(cx - sz, cy); ctx.lineTo(cx + sz, cy); ctx.stroke();
   // vertical
   ctx.beginPath(); ctx.moveTo(cx, cy - sz); ctx.lineTo(cx, cy + sz); ctx.stroke();

   // bevel highlight
   if (lp > 0.3) {
      ctx.strokeStyle = "rgba(255,255,255," + ((lp - 0.3) * 0.4) + ")";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - sz, cy - 0.5); ctx.lineTo(cx + sz, cy - 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 0.5, cy - sz); ctx.lineTo(cx - 0.5, cy + sz); ctx.stroke();
   }
}

function drawLantern(t) {
   var op = computeLanternOpacity(t);
   if (op < 0.001) return;

   var cx = w / 2, cy = h / 2;
   var rad = Math.max(w, h) * 0.6;

   var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
   g.addColorStop(0,    "rgba(255,250,230," + (op * 0.6) + ")");
   g.addColorStop(0.7,  "rgba(255,245,220," + (op * 0.3) + ")");
   g.addColorStop(1,     "rgba(255,240,215,0)");

   ctx.fillStyle = g;
   ctx.fillRect(0, 0, w, h);
}

function drawTriangle(t) {
   var cx = w / 2, cy = h / 2;
   var sz = Math.min(w, h) * 0.12;

   var bleed = computeTriangleBleed(t);
   var r = Math.round(TRIANGLE_YELLOW[0] + (PAPER_COLOR[0] - TRIANGLE_YELLOW[0]) * bleed);
   var g2= Math.round(TRIANGLE_YELLOW[1] + (PAPER_COLOR[1] - TRIANGLE_YELLOW[1]) * bleed);
   var b = Math.round(TRIANGLE_YELLOW[2] + (PAPER_COLOR[2] - TRIANGLE_YELLOW[2]) * bleed);

   var dx = halfPixelDrift * 0.5;
   var dy = halfPixelDrift * 0.3;

   ctx.fillStyle = "rgb(" + r + "," + g2 + "," + b + ")";
   ctx.strokeStyle = "rgba(80,70,20," + (0.3 - bleed * 0.2) + ")";
   ctx.lineWidth = 1;

   ctx.beginPath();
   ctx.moveTo(cx + dx, cy - sz + dy);
   ctx.lineTo(cx - sz + dx, cy + sz + dy);
   ctx.lineTo(cx + sz + dx, cy + sz + dy);
   ctx.closePath();
   ctx.fill();
   ctx.stroke();
}

function drawHover() {
   if (!isHovering) return;

   var e  = (performance.now() - hoverStart) / 1000;
   var op = Math.min(e * 2, 0.3);

   ctx.strokeStyle = "rgba(180,160,100," + op + ")";
   ctx.lineWidth = 1;
   ctx.beginPath();
   ctx.arc(mouseX, mouseY, 20 + e * 5, 0, Math.PI * 2);
   ctx.stroke();
}

function drawStillness(t) {
   var phase = getPhase(t);
   var cycleN = Math.floor(t / CYCLE_DURATION);
   var sinceLock = t - cycleN * CYCLE_DURATION;

   if (sinceLock > PHASE_STRUCTURAL) {
      var linger = Math.min((sinceLock - PHASE_STRUCTURAL) / 0.3, 1);
      ctx.strokeStyle = "rgba(245,240,232," + (linger * 0.15) + ")";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 30 + linger * 10, 0, Math.PI * 2);
      ctx.stroke();
   }
}

// ---------- render loop ----------
function render(ts) {
   if (!lastFrame) lastFrame = ts;

   var delta = ts - lastFrame;
   if (delta < FRAME_DURATION) {
      animId = requestAnimationFrame(render);
      return;
   }
   lastFrame = ts - (delta % FRAME_DURATION);

   var now = performance.now();
   if (cycleStart) globalTime = (now - cycleStart) / 1000;

   halfPixelDrift = computeDrift(globalTime);

   var phase   = getPhase(globalTime);

   // audio scheduling (non-blocking, look-ahead)
   if (cycleStart) {
      AudioEngine.schedule(globalTime, phase, prevPhase, halfPixelDrift);
   }
   prevPhase = phase;

   // draw layers
   ctx.clearRect(0, 0, w, h);
   drawPaper();
   drawGrain(globalTime, halfPixelDrift);
   drawGrid(phase);
   drawStructuralLines(phase);
   drawLantern(globalTime);
   drawTriangle(globalTime);
   drawStillness(globalTime);
   drawHover();

   animId = requestAnimationFrame(render);
}

// ---------- startup ----------
function startExperience() {
   AudioEngine.start();

   var overlay = document.getElementById("overlay");
   if (overlay) overlay.classList.add("hidden");

   var muteBtn = document.getElementById("mute-btn");
   if (muteBtn) muteBtn.classList.add("visible");

   cycleStart = performance.now();
}

// ---------- resize ----------
function resize() {
   w = window.innerWidth;
   h = window.innerHeight;
   var dpr = window.devicePixelRatio || 1;
   canvas.width  = w * dpr;
   canvas.height = h * dpr;
   canvas.style.width  = w + "px";
   canvas.style.height = h + "px";
   ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------- init ----------
function init() {
   canvas = document.getElementById("stage");
   ctx    = canvas.getContext("2d");

   resize();
   window.addEventListener("resize", resize);

   // start button
   var btn = document.getElementById("start-btn");
   if (btn) btn.addEventListener("click", startExperience);

   // hover / touch
   canvas.addEventListener("mouseenter", function (e) {
      isHovering = true;
      hoverStart = performance.now();
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (cycleStart) AudioEngine.cueInput(AudioEngine.getCtx().currentTime);
   });

   canvas.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
   });

   canvas.addEventListener("mouseleave", function () {
      isHovering = false;
   });

   canvas.addEventListener("touchstart", function  (e) {
      var t = e.touches[0];
      isHovering = true;
      hoverStart = performance.now();
      mouseX = t.clientX;
      mouseY = t.clientY;
      if (cycleStart) AudioEngine.cueInput(AudioEngine.getCtx().currentTime);
      e.preventDefault();
   });

   canvas.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      mouseX = t.clientX;
      mouseY = t.clientY;
      e.preventDefault();
   });

   canvas.addEventListener("touchend", function () {
      isHovering = false;
   });

   // mute toggle
   var muteBtn = document.getElementById("mute-btn");
   if (muteBtn) {
      muteBtn.addEventListener("click", function () {
         var m = AudioEngine.toggleMute();
         document.getElementById("mute-icon").textContent = m ? "\uD83D\uDD07" : "\uD83D\uDD0A";
      });
   }

   // kick off render loop
   animId = requestAnimationFrame(render);
}

document.addEventListener("DOMContentLoaded", init);
