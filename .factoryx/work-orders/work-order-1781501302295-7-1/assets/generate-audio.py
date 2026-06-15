#!/usr/bin/env python3
"""Generate small authored WAV audio assets for Triadic Grid Run.
Deliberate procedural music system: harmonic-rich tones, chords, envelopes,
not sparse single-osc blips. Bauhaus-inspired: clear, geometric, tense/release.
"""
import wave, struct, math, os

SR = 22050
OUTDIR = os.path.dirname(__file__) or '.'

def env(t, dur, a=0.02, d=0.08, s=0.6, r=0.15):
    """Simple ADSR-ish linear envelope 0..1"""
    if t < a:
        return t / a
    if t < a + d:
        return 1.0 - (1.0 - s) * (t - a) / d
    if t < dur - r:
        return s
    if t < dur:
        return s * (dur - t) / r
    return 0.0

def write_wav(name, samples):
    path = os.path.join(OUTDIR, name)
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        for s in samples:
            v = max(-1.0, min(1.0, s))
            w.writeframes(struct.pack('<h', int(v * 32767)))
    print('wrote', path, os.path.getsize(path), 'bytes')
    return path

def tone(freq, dur, wavef=math.sin, vol=0.8, harm=None):
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        e = env(t, dur)
        s = wavef(2 * math.pi * freq * t)
        if harm:
            for h, ha in harm:
                s += ha * wavef(2 * math.pi * freq * h * t)
        out.append(vol * s * e)
    return out

def chord(freqs, dur, vol=0.7):
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        e = env(t, dur, a=0.03, d=0.12, s=0.5, r=0.22)
        s = 0.0
        for f in freqs:
            s += 0.6 * math.sin(2 * math.pi * f * t)
            s += 0.3 * math.sin(2 * math.pi * f * 2 * t)  # octave
        out.append(vol * s * e / max(1, len(freqs)))
    return out

# 1. Collect chime: bright major 3rd pluck with 2nd harmonic (not plain sine)
def gen_collect():
    # E5 + G#5-ish , short decay rich
    s1 = tone(659.25, 0.22, math.sin, 0.75, harm=[(2,0.35),(3,0.12)])
    s2 = tone(830.61, 0.22, math.sin, 0.55, harm=[(2,0.28)])
    return [ (a+b)*0.9 for a,b in zip(s1,s2) ]

# 2. Triad harmony: stacked primary chord (C-E-G) with slow attack for "resolution" feel
def gen_triad():
    return chord([523.25, 659.25, 783.99], 0.48, 0.72)

# 3. Impact hit: low square + noise burst for satisfying "hard edge" thunk
def gen_impact():
    n = int(0.18 * SR)
    out = []
    for i in range(n):
        t = i / SR
        e = env(t, 0.18, a=0.005, d=0.03, s=0.2, r=0.12)
        s = 0.7 * (1 if (i//3 % 2) else -1)   # square low
        s += 0.9 * (2* ( (i*7 % 17)/17.0 - 0.5 )) * (1.0 - t/0.18)  # noise-ish
        out.append(s * e * 0.85)
    return out

# 4. Level phase change: rising resonant sweep + harmonic for "grid shift" drama
def gen_level():
    n = int(0.32 * SR)
    out = []
    f0 = 196.0
    for i in range(n):
        t = i / SR
        e = env(t, 0.32, a=0.01, d=0.06, s=0.65, r=0.18)
        f = f0 + t * 420  # rising
        s = 0.6 * math.sin(2*math.pi*f*t) + 0.35*math.sin(2*math.pi*f*1.5*t)
        s += 0.25 * math.sin(2*math.pi*(f*0.5)*t)
        out.append(s * e * 0.9)
    return out

# 5. Win fanfare: short 4-note ascending motif (Bauhaus clear intervals) + tail chord
def gen_win():
    motif = []
    notes = [659.25, 783.99, 987.77, 1318.51]  # E G B E'
    durs = [0.09, 0.09, 0.09, 0.22]
    for f, d in zip(notes, durs):
        motif += tone(f, d, math.sin, 0.78, harm=[(2,0.4),(3,0.15)])
    # add resolving low fifth under tail
    tail = tone(329.63, 0.28, math.sin, 0.45, harm=[(2,0.3)])
    # mix tail into last part
    for j in range(min(len(tail), len(motif[-len(tail):]))):
        motif[-len(tail)+j] = (motif[-len(tail)+j] + tail[j]) * 0.85
    return motif

# 6. Dodge tick: crisp high harmonic tick for precision success (white accent feel)
def gen_dodge():
    # very short 1175Hz + 2350 + noise tick
    n = int(0.09 * SR)
    out = []
    for i in range(n):
        t = i / SR
        e = env(t, 0.09, a=0.002, d=0.01, s=0.3, r=0.06)
        s = 0.8 * math.sin(2*math.pi*1175*t)
        s += 0.55 * math.sin(2*math.pi*2350*t)
        s += 0.35 * ( (i % 5)/5.0 - 0.5 ) * (1-t/0.09)
        out.append(s * e * 0.9)
    return out

if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    write_wav('collect-chime.wav', gen_collect())
    write_wav('triad-harmony.wav', gen_triad())
    write_wav('impact-hit.wav', gen_impact())
    write_wav('level-phase.wav', gen_level())
    write_wav('win-fanfare.wav', gen_win())
    write_wav('dodge-tick.wav', gen_dodge())
    print('All audio assets generated for deliberate music system.')
