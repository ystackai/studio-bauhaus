#!/usr/bin/env python3
"""
Pure-stdlib asset generator for Triadic Grid Run rework (work-order-1781658166323-6-31).
Produces reviewable file-backed PNG + WAV under this dir + documents provenance.

Palette (Bauhaus primary as moral stance):
  RED   #E63946  (229,57,70)
  YEL   #FFD60A  (255,214,10)
  BLU   #4361EE  (67,97,238)
  BLK   #1a1a1a
  WHT   #f0f0f0 / #fff for highlights

Intent: crisp, ruler-constructed geometry. Stamps and nodes carry inner "construction" marks
so they feel intentionally drawn, not flat icons. No gradients, no blurs.

WAVs: additive + simple percussive envelopes for musical stabs and a short resolving cadence.
Not bleeps: multi-partial tones, slight detune for life, rhythmic spacing for the cadence.
"""
import struct, zlib, wave, math, os, array, random

OUT = os.path.dirname(__file__) or "."
random.seed(1781658166323)  # reproducible for this WO

# --- PNG writer (stdlib only) ---
def _png_chunk(typ, data):
    crc = zlib.crc32(typ + data) & 0xffffffff
    return struct.pack(">I", len(data)) + typ + data + struct.pack(">I", crc)

def make_png_rgb(w, h, rows):
    """rows: list of list of (r,g,b) tuples, length h, each inner len w"""
    hdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8bit RGB no interlace
    sig = b"\x89PNG\r\n\x1a\n"
    out = sig + _png_chunk(b"IHDR", hdr)
    raw = b"".join(b"\x00" + bytes([c for px in row for c in px]) for row in rows)
    out += _png_chunk(b"IDAT", zlib.compress(raw, 9))
    out += _png_chunk(b"IEND", b"")
    return out

def write_png(path, w, h, draw_fn):
    """draw_fn(x,y) -> (r,g,b) for 0<=x<w, 0<=y<h ; writes file"""
    rows = []
    for y in range(h):
        row = []
        for x in range(w):
            row.append(draw_fn(x, y))
        rows.append(row)
    with open(path, "wb") as f:
        f.write(make_png_rgb(w, h, rows))

def col(hexrgb):
    h = hexrgb.lstrip("#")
    return tuple(int(h[i:i+2],16) for i in (0,2,4))

RED = col("#E63946")
YEL = col("#FFD60A")
BLU = col("#4361EE")
BLK = col("#1a1a1a")
WHT = col("#f0f0f0")
DK  = col("#111111")

def lerp(a,b,t): return int(a*(1-t)+b*t)

def stamp_tri_draw(x, y, cx, cy, r, accent):
    """Triangle stamp with construction ticks (3 inner marks at 120deg) + crisp rim."""
    # distance to center
    dx, dy = x-cx, y-cy
    # bary to test inside equilateral
    # simple: use 3 half-plane tests for crisp triangle
    # points: top (0,-r), br (r*0.866, r*0.5), bl (-r*0.866,r*0.5) but in pixel space
    # use polar for fill test + rim
    dist = math.hypot(dx, dy)
    if dist > r + 1.5: return DK  # outside padding
    ang = math.atan2(dy, dx)
    # equilateral halfplanes (approx)
    inside = True
    # rotate space so top is 90deg etc; use 3 dot checks
    # crude but reliable: clip to 3 lines
    # line1: y < 0.5*r + (x * tan(30)) etc; easier: known tri coords
    tx = [0,  0.866*r, -0.866*r]
    ty = [-r, 0.5*r,    0.5*r]
    # barycentric
    def sign(p1x,p1y,p2x,p2y,p3x,p3y):
        return (p1x-p3x)*(p2y-p3y) - (p2x-p3x)*(p1y-p3y)
    d1 = sign(dx,dy, tx[0],ty[0], tx[1],ty[1])
    d2 = sign(dx,dy, tx[1],ty[1], tx[2],ty[2])
    d3 = sign(dx,dy, tx[2],ty[2], tx[0],ty[0])
    has_neg = (d1<0) or (d2<0) or (d3<0)
    has_pos = (d1>0) or (d2>0) or (d3>0)
    inside = not (has_neg and has_pos)
    if not inside and dist > r-0.8: 
        # rim
        return WHT if dist < r+0.6 else BLK
    if not inside: return DK
    # fill base
    base = accent
    # inner construction ticks (3 short radial segments)
    for k in range(3):
        a = -math.pi/2 + k * (2*math.pi/3)
        # tick from 0.35r to 0.72r along ray
        rr = math.hypot(dx,dy)
        if rr < 0.1: continue
        ux,uy = dx/rr, dy/rr
        # project current point onto the 3 rays, see if near one
        ra = -math.pi/2 + k*(2*math.pi/3)
        cos = math.cos(ra); sin=math.sin(ra)
        proj = dx*cos + dy*sin
        if 0.32*r < proj < 0.74*r:
            perp = abs(-dx*sin + dy*cos)
            if perp < 1.6:  # tick thickness
                return (max(10,base[0]-40), max(10,base[1]-40), max(10,base[2]-40))
    # thin inner triangle line for "constructed" look
    if 0.58*r < dist < 0.62*r:
        return WHT
    return base

def stamp_sqr_draw(x, y, cx, cy, r, accent):
    """Square stamp with 2x2 sub-squares construction + rim."""
    dx, dy = x-cx, y-cy
    if abs(dx) > r+1 or abs(dy) > r+1: return DK
    inside = abs(dx) <= r and abs(dy) <= r
    dist = max(abs(dx), abs(dy))
    if not inside:
        if dist <= r + 1.2: return WHT
        return BLK
    # base
    base = accent
    # 2x2 construction (cross + 4 small cells)
    cell = r * 0.42
    # cross lines
    if abs(dx) < 1.4 or abs(dy) < 1.4:
        return (base[0]//2, base[1]//2, base[2]//2)
    # small squares darker
    if abs(dx) < cell and abs(dy) < cell:  # center cross already handled
        pass
    # rim inner
    if r-2.5 < dist < r-0.8:
        return WHT
    return base

def write_stylus_png():
    # 64x32 sheet: left 32x32 TRI (red accent), right 32x32 SQR (blue accent)
    w, h = 64, 32
    def draw(x,y):
        if x < 32:
            return stamp_tri_draw(x, y, 16, 16, 13, RED)
        else:
            return stamp_sqr_draw(x-32, y, 16, 16, 13, BLU)
    write_png(os.path.join(OUT, "stylus.png"), w, h, draw)
    print("wrote stylus.png")

def node_tri_draw(x, y, cx, cy, r, accent):
    dx,dy = x-cx,y-cy; dist=math.hypot(dx,dy)
    if dist > r+2: return DK
    # outer ring always
    if r+0.6 < dist < r+1.8: return WHT
    # fill if inside tri
    tx = [0, 0.866*r, -0.866*r]
    ty = [-r*0.9, r*0.48, r*0.48]
    def sign(p1x,p1y,p2x,p2y,p3x,p3y): return (p1x-p3x)*(p2y-p3y)-(p2x-p3x)*(p1y-p3y)
    d1=sign(dx,dy,tx[0],ty[0],tx[1],ty[1]); d2=sign(dx,dy,tx[1],ty[1],tx[2],ty[2]); d3=sign(dx,dy,tx[2],ty[2],tx[0],ty[0])
    inside = not ((d1<0 or d2<0 or d3<0) and (d1>0 or d2>0 or d3>0))
    if not inside: 
        if dist < r+0.5: return (accent[0]//3,accent[1]//3,accent[2]//3)
        return DK
    # inner construction tri (smaller)
    r2 = r*0.55
    tx2=[0,0.866*r2,-0.866*r2]; ty2=[-r2*0.9,r2*0.48,r2*0.48]
    d1=sign(dx,dy,tx2[0],ty2[0],tx2[1],ty2[1]); d2=sign(dx,dy,tx2[1],ty2[1],tx2[2],ty2[2]); d3=sign(dx,dy,tx2[2],ty2[2],tx2[0],ty2[0])
    in2 = not ((d1<0 or d2<0 or d3<0) and (d1>0 or d2>0 or d3>0))
    if in2 and dist > r*0.28:
        # 3 ticks
        for k in range(3):
            a = -math.pi/2 + k*2*math.pi/3
            proj = dx*math.cos(a) + dy*math.sin(a)
            if 0.18*r < proj < 0.48*r:
                if abs(-dx*math.sin(a)+dy*math.cos(a)) < 1.1: return WHT
    if 0.72*r < dist < 0.78*r: return WHT
    return accent

def node_sqr_draw(x, y, cx, cy, r, accent):
    dx,dy = x-cx,y-cy
    if max(abs(dx),abs(dy)) > r+2: return DK
    if r+0.6 < max(abs(dx),abs(dy)) < r+1.8: return WHT
    inside = abs(dx)<=r and abs(dy)<=r
    if not inside: return DK
    # 2x2 sub squares construction
    s = r*0.48
    if abs(dx)<1.2 or abs(dy)<1.2: return (accent[0]//2+20, accent[1]//2+20, accent[2]//2+20)
    if abs(dx)<s and abs(dy)<s: return accent
    # inner square
    if r*0.58 < max(abs(dx),abs(dy)) < r*0.64: return WHT
    return accent

def write_nodes_png():
    # 96x32 : 3 cols tri (r y b), 3 cols sqr (r y b)  each 32x32
    w, h = 96, 32
    cols = [RED, YEL, BLU]
    def draw(x,y):
        col_idx = (x // 32) % 3
        accent = cols[col_idx]
        if (x // 32) < 3:
            # tri row
            return node_tri_draw(x % 32, y, 16, 16, 12, accent)
        else:
            return node_sqr_draw(x % 32, y, 16, 16, 12, accent)
    write_png(os.path.join(OUT, "nodes.png"), w, h, draw)
    print("wrote nodes.png")

# --- WAV synthesis (musical, not bleep) ---
def env_lin( t, dur, a=0.02, r=0.12 ):
    if t < a: return t / a
    if t > dur-r: return max(0.0, (dur-t)/r )
    return 1.0

def write_wav(path, sr, dur, gen):
    n = int(sr * dur)
    buf = array.array('h')
    for i in range(n):
        t = i / sr
        v = gen(t)
        v = max(-1.0, min(1.0, v))
        buf.append( int(v * 32767) )
    with wave.open(path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(buf.tobytes())
    print("wrote", os.path.basename(path))

def make_stamp_success(color_idx):
    # color 0 red low, 1 yel mid, 2 blu high; use major-ish interval + body
    base = [131, 165, 196][color_idx]  # C3-ish , E3, G3 area
    def gen(t):
        d = 0.38
        e = env_lin(t, d, 0.018, 0.18)
        # 3 partials + light square for edge (Bauhaus honest)
        s = 0.6*math.sin(2*math.pi*base*t)
        s += 0.28*math.sin(2*math.pi*base*1.5*t + 0.3)
        s += 0.16*math.sin(2*math.pi*base*2.02*t)
        s += 0.09* (1 if (base*3.1*t % 1.0) > 0.5 else -1) * 0.6  # light square
        # slight life detune on yel
        if color_idx==1: s += 0.07*math.sin(2*math.pi*(base+0.7)*t)
        return s * e * 0.82
    return gen

def make_clash():
    # short sour but musical (tritone-ish + fast ring down)
    def gen(t):
        d=0.21
        e = env_lin(t, d, 0.01, 0.09)
        f1, f2 = 311, 466  # Eb / Bb' ish clash
        s = 0.7*math.sin(2*math.pi*f1*t) + 0.55*math.sin(2*math.pi*f2*t + 1.1)
        s += 0.12*math.sin(2*math.pi*(f1*1.01)*t)  # beat
        return s * e * 0.75
    return gen

def make_cadence():
    # short 0.9s I-V-I-ish 3 voice resolve using triadic freqs; rhythmic but one event
    def gen(t):
        d = 0.92
        e = env_lin(t, d, 0.025, 0.35)
        # voice1 low C
        s  = 0.42*math.sin(2*math.pi*131*t)
        # voice2 E
        s += 0.36*math.sin(2*math.pi*165*t + (0.2 if t>0.18 else 0))
        # voice3 G + high C tail
        s += 0.31*math.sin(2*math.pi*196*t)
        if t > 0.42:
            s += 0.22*math.sin(2*math.pi*262*t) * ((t-0.42)/(d-0.42))
        # light perc attack
        if t < 0.06:
            s += (0.18 * (1-t/0.06)) * (1 if (t*1400 % 1)>0.5 else -1)
        return s * e * 0.9
    return gen

def write_audio_assets():
    sr = 44100
    write_wav(os.path.join(OUT, "sfx-stamp-0.wav"), sr, 0.38, make_stamp_success(0))
    write_wav(os.path.join(OUT, "sfx-stamp-1.wav"), sr, 0.38, make_stamp_success(1))
    write_wav(os.path.join(OUT, "sfx-stamp-2.wav"), sr, 0.38, make_stamp_success(2))
    write_wav(os.path.join(OUT, "sfx-clash.wav"), sr, 0.21, make_clash())
    write_wav(os.path.join(OUT, "sfx-triad.wav"), sr, 0.92, make_cadence())
    print("audio assets done")

def write_manifest():
    m = """# ASSET_MANIFEST.md — Triadic Grid Run (work-order-1781658166323-6-31)

Generated: 2026-06-17 by gen_assets.py (pure stdlib: zlib/struct for PNG, wave/math for WAV).
No external images or samples. All committed files are reviewable binaries.

## Visuals
- stylus.png (64x32 sheet)
  Left 32x32: TRIANGLE stamp, red accent (#E63946), white construction rim + 3 inner radial ticks at 120deg + thin inner tri line. "Ruler" geometry.
  Right 32x32: SQUARE stamp, blue accent (#4361EE), white rim + 2x2 sub-square cross construction.
  Purpose: current tool cursor (large, obvious, mode-dependent). Loaded as Image, drawn via drawImage slices.
- nodes.png (96x32 sheet)
  Cols 0-2: TRIANGLE nodes (red, yellow, blue) — outer white ring, inner tri construction ticks, core fill.
  Cols 3-5: SQUARE nodes (red, yellow, blue) — outer ring, 2x2 inner construction, cross.
  Purpose: the things you stamp. Inner geometry telegraphs required stamp mode (TRI vs SQR) at a glance; color for triad pips.
  All use Bauhaus primary + black/white only. Flat, high-contrast, precise. No gradients.

## Audio (musical direction, not bleeps)
- sfx-stamp-0.wav (red, ~0.38s): low C-area + 1.5 + 2.0 partials + light square edge + envelope. Success for TRI or color-0.
- sfx-stamp-1.wav (yellow, ~0.38s): mid + detune life + same structure.
- sfx-stamp-2.wav (blue, ~0.38s): higher G-ish.
- sfx-clash.wav (~0.21s): Eb/Bb tritone stab + beat + fast release. Wrong stamp (recoverable, not death).
- sfx-triad.wav (~0.92s): 3-voice I-V-I resolve (C/E/G + tail high C) with light perc attack on downbeat. Full harmony cadence; grid resonance visual syncs to it.
All post-gesture only. Slight rate/gain variation in player for life. Authored to feel like "the grid is playing with you" when you stamp correctly in sequence.

## Provenance & Contract
- Method: pure Python 3 stdlib (no Pillow, no external assets, no base64 in game).
- Intent per house style + rejection: intentional (construction marks, weight hierarchy, primary tension), not flat.
- Used by: index.html relative fetch/decode + drawImage/playBuffer.
- Repro: run `python3 gen_assets.py` (seed pinned to WO id).
- Size target: small geometric PNGs + short musical WAVs keep payload <<2MB.

Work Order: work-order-1781658166323-6-31
"""
    with open(os.path.join(OUT, "ASSET_MANIFEST.md"), "w") as f:
        f.write(m)
    print("wrote ASSET_MANIFEST.md")

if __name__ == "__main__":
    write_stylus_png()
    write_nodes_png()
    write_audio_assets()
    write_manifest()
    print("All assets generated for 92-triadic-grid-run rework.")
