# blocks-2d usage for Triadic Grid Run

- **game-loop.js**: none — implemented inline `requestAnimationFrame` loop with `dt = Math.min(0.06, delta/1000)` clamped variable step + manual accumulation for spawns/particles. Reason: single-file slice; avoids extra HTTP requests for this minimal canary; dt cap + easing keeps feel similar to fixed for this scope.
- **input.js**: none — direct addEventListener for pointer (mousemove/touch + mousedown/touchstart) + keyboard (Arrow/WASD + Space mode flip). Press buffer approximated by immediate stampAt on press (no 120ms queue needed for stamp verb). Reason: pointer primary + mode buttons; keep payload 1 file.
- **scenes.js**: none — ad-hoc `state` machine ('start'|'playing'|'gameover'|'win') with direct DOM class toggles and init functions. Reason: trivial 4-state flow, no need for enter/exit hooks yet.
- **tween.js**: none — hand lerp `pos += (target-pos)*0.18` for cursor aim easing; pulse via `Math.sin` timers. Reason: only two easings; avoids dep for 30-60s slice.
- **particles.js**: none — inline pooled array of simple velocity particles + speedlines + floating text. Spawned on stamp/clash/triad. Reason: tiny bespoke bursts match the "construction shards" visual language.
- **screen-shake.js**: none — no trauma curve; uses small translate on gridResT flash instead. Reason: grid "res" effect is the intended hit reaction.
- **rng.js**: none — Math.random() for spawns/pulses. Reason: no seeded replays required for this slice; pure client demo.
- **sound/webaudio-kit.js**: none — custom Audio closure with AudioBuffer playback from committed wavs + oscillator tone fallback. Reason: already uses real asset buffers loaded post-gesture; keeps audio identity self-contained.
- **juice**: inline CSS transitions + canvas feedback; no external snippets.

**Summary**: blocks-2d provided by foundry but intentionally not copied/adapted for this tight playable slice (all-in-one index.html + 2 PNG + 5 WAV, <60kB total). Core disciplines (dt clamp, easing on aim, immediate visible feedback, post-gesture audio) are present inline. If systems expand beyond slice, re-evaluate copy of game-loop + input for fixed timestep + buffering.

See WORKFLOW.md for the usage contract.
