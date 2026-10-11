"""
Mangala Dhwani — an original instrumental for Darshan & Vathsala's invitation.

Composed and synthesised entirely by this script (no samples, no third-party
recordings), so the resulting audio is original to this project.

Musical outline (raga Mohanam — S R2 G3 P D2, an auspicious pentatonic raga
often heard at South Indian weddings; Sa = D, 72 bpm):
    0:00  tanpura drone and a soft string pad open the space
    0:07  bansuri-style flute alap (free time, gentle glides)
    0:40  santoor-like melody (A), soft mridangam-style percussion enters
    1:07  melody B, a step higher
    1:33  melody A returns with the flute singing above it
    2:00  closing flute phrase resolves to Sa; drone fades for a seamless loop

Usage:  python tools/compose_soundtrack.py  ->  public/audio/mangala-dhwani.mp3
Needs:  numpy, scipy, lameenc  (see tools/requirements.txt)
"""
from __future__ import annotations

import os
import sys

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
TOTAL = 150.0
SA = 293.66  # D4
BEAT = 60.0 / 72.0
rng = np.random.default_rng(15112026)

# just-intonation ratios for the swaras used (semitone offsets from Sa)
RATIO = {-12: 0.5, -8: 5 / 8, -5: 3 / 4, -3: 5 / 6, 0: 1.0, 2: 9 / 8, 4: 5 / 4, 7: 3 / 2, 9: 5 / 3, 12: 2.0, 14: 9 / 4, 16: 5 / 2, 19: 3.0}
S, R, G, P, D = 0, 2, 4, 7, 9
Sh, Rh = 12, 14  # upper Sa, Ri
Dl, Pl = -3, -5  # lower Dha, Pa


def hz(deg: int, octave: int = 0) -> float:
    return SA * RATIO[deg] * (2.0 ** octave)


N = int(TOTAL * SR)
left = np.zeros(N)
right = np.zeros(N)


def place(sig: np.ndarray, start: float, gain: float = 1.0, pan: float = 0.0) -> None:
    """Add a mono signal at `start` seconds with equal-power panning (-1 left … +1 right)."""
    i = int(start * SR)
    if i < 0:  # humanised timing can nudge the first note just before 0 s
        sig, i = sig[-i:], 0
    if i >= N:
        return
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    left[i : i + len(sig)] += sig * np.cos(a)
    right[i : i + len(sig)] += sig * np.sin(a)


def env(n: int, attack: float, release: float) -> np.ndarray:
    e = np.ones(n)
    a = min(n, max(1, int(attack * SR)))
    r = min(n - a, max(1, int(release * SR)))
    e[:a] = np.linspace(0, 1, a) ** 1.6
    e[n - r :] *= np.linspace(1, 0, r) ** 1.4
    return e


# ---------------------------------------------------------------- instruments


def tanpura_pluck(freq: float, dur: float = 4.6) -> np.ndarray:
    """Additive tanpura string with a travelling 'jawari' bloom through the harmonics."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    centre = 2.0 + 15.0 * (1 - np.exp(-t / 1.1))
    amp_env = np.exp(-t / 3.0) * (1 - np.exp(-t / 0.012))
    out = np.zeros(n)
    for k in range(1, 26):
        fk = freq * k * (1 + 0.00025 * k)
        if fk > 8000:
            break
        bloom = 1 + 1.9 * np.exp(-(((k - centre) / 3.2) ** 2))
        out += (k ** -0.95) * bloom * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
    return out * amp_env * env(n, 0.005, 0.6)


def santoor(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    """Hammered-string pluck: two slightly detuned strings, bright partials that decay faster."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for detune in (1.0, 1.0018):
        f = freq * detune
        for k in range(1, 14):
            fk = f * k * np.sqrt(1 + 0.0004 * k * k)
            if fk > 13000:
                break
            amp = (k ** -1.05) * np.exp(-(k - 1) * 0.12)
            decay = 2.6 / (1 + 0.45 * (k - 1))
            out += amp * np.exp(-t / decay) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
    hit = int(0.008 * SR)
    noise = rng.standard_normal(hit) * np.linspace(1, 0, hit) ** 2
    out[:hit] += 0.25 * np.convolve(noise, np.ones(6) / 6, mode='same')
    return out * vel * env(n, 0.002, 0.35)


def flute_line(notes: list[tuple[int | None, float]], octave: int = 1) -> np.ndarray:
    """Bansuri-like legato line: glides between notes, delayed vibrato, breath noise."""
    total = sum(d for _, d in notes)
    n = int(total * SR) + 1
    freq = np.zeros(n)
    amp = np.zeros(n)
    pos = 0
    prev_f = None
    vib_depth = np.zeros(n)
    for deg, dur in notes:
        m = int(dur * SR)
        seg = slice(pos, pos + m)
        if deg is None:
            freq[seg] = prev_f or hz(S, octave)
            pos += m
            prev_f = None
            continue
        f = hz(deg, octave)
        glide = min(m, int(0.09 * SR))
        target = np.full(m, f)
        if prev_f:
            target[:glide] = np.exp(np.linspace(np.log(prev_f), np.log(f), glide))
        freq[seg] = target
        a = np.ones(m)
        att = min(m, int((0.16 if prev_f is None else 0.05) * SR))
        a[:att] = np.linspace(0.0 if prev_f is None else 0.82, 1, att)
        amp[seg] = a
        tt = np.arange(m) / SR
        vib_depth[seg] = np.clip((tt - 0.35) / 0.6, 0, 1) * (0.011 if dur > 0.9 else 0.004)
        pos += m
        prev_f = f
    # releases before rests and at the end
    smooth = np.convolve(amp, np.ones(int(0.18 * SR)) / int(0.18 * SR), mode='same')
    amp = np.minimum(amp, smooth * 1.4)
    t = np.arange(n) / SR
    vib = 1 + vib_depth * np.sin(2 * np.pi * 5.1 * t)
    phase = np.cumsum(2 * np.pi * freq * vib / SR)
    tone = np.sin(phase) + 0.30 * np.sin(2 * phase + 0.4) + 0.09 * np.sin(3 * phase + 1.1) + 0.035 * np.sin(4 * phase)
    sos = butter(2, [1400, 6500], btype='band', fs=SR, output='sos')
    breath = sosfilt(sos, rng.standard_normal(n)) * 0.16
    out = (tone + breath) * amp
    return out * env(n, 0.05, 0.5)


def pad(degs: list[int], dur: float, octave: int = -1) -> np.ndarray:
    """Warm, slow string pad: three gently detuned voices per note, soft harmonic roll-off."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for deg in degs:
        f0 = hz(deg, octave)
        for cents in (-6, 0, 7):
            f = f0 * 2 ** (cents / 1200)
            for k in range(1, 9):
                out += (k ** -1.7) * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28))
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.18 * t)
    return out * trem * env(n, 2.6, 3.2) / (len(degs) * 3)


def thom(vel: float = 1.0) -> np.ndarray:
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    f = 74 * (1 + 0.3 * np.exp(-t / 0.035))
    body = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.42)
    click = np.convolve(rng.standard_normal(n), np.ones(30) / 30, mode='same') * np.exp(-t / 0.004)
    return (body + 0.25 * click) * vel


def ta(vel: float = 1.0, ring: float = 0.14) -> np.ndarray:
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    out = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / (ring * d)) for f, a, d in ((415, 1.0, 1.0), (622, 0.5, 0.7), (830, 0.3, 0.5)))
    sos = butter(2, 2500, btype='high', fs=SR, output='sos')
    click = sosfilt(sos, rng.standard_normal(n)) * np.exp(-t / 0.003)
    return (out + 0.18 * click) * vel


# ------------------------------------------------------------- composition

# tanpura cycle P(low) S S S(low), every 1.25 s, panned across
for i, t0 in enumerate(np.arange(0.0, TOTAL - 4.0, 1.25)):
    deg, octv = [(P, -1), (S, 0), (S, 0), (S, -1)][i % 4]
    place(tanpura_pluck(hz(deg, octv)), t0 + rng.normal(0, 0.006), gain=0.055, pan=[-0.35, 0.2, -0.1, 0.35][i % 4])

# pad harmony
for start, dur, chord in [
    (3.0, 38.0, [S, P]),
    (40.0, 13.4, [S, G, P]),
    (53.3, 13.4, [Dl, S, G]),
    (66.7, 13.4, [S, G, P]),
    (80.0, 13.4, [R, P, D]),
    (93.3, 13.4, [S, G, P]),
    (106.7, 13.4, [Dl, S, G]),
    (120.0, 26.0, [S, P]),
]:
    sig = pad(chord, dur + 2.5)
    place(sig, start, gain=0.05, pan=-0.25)
    place(pad(chord, dur + 2.5), start, gain=0.05, pan=0.25)

# flute alap (free time)
alap = [
    (S, 3.0), (R, 1.2), (G, 2.6), (None, 0.6),
    (G, 0.8), (P, 1.1), (G, 0.8), (R, 1.0), (S, 3.0), (None, 1.4),
    (G, 1.0), (P, 1.2), (D, 2.6), (P, 1.0), (G, 1.2), (R, 1.0), (G, 2.2), (None, 0.5),
    (R, 0.8), (S, 1.2), (Dl, 1.6), (S, 3.6),
]
place(flute_line(alap), 7.0, gain=0.16, pan=-0.12)

melody_a = [
    (G, 1), (P, 1), (D, 1), (P, 1),
    (G, 1.5), (R, 0.5), (S, 2),
    (R, 1), (G, 1), (P, 1), (G, 1),
    (R, 1), (S, 1), (Dl, 2),
    (S, 1), (R, 1), (G, 1), (P, 1),
    (D, 1), (Sh, 1), (D, 1), (P, 1),
    (G, 1), (P, 0.5), (G, 0.5), (R, 1), (G, 1),
    (S, 4),
]
melody_b = [
    (P, 1), (D, 1), (Sh, 2),
    (Rh, 1), (Sh, 1), (D, 1), (P, 1),
    (G, 1), (P, 1), (D, 1), (Sh, 1),
    (D, 2), (P, 2),
    (G, 1), (R, 1), (G, 1), (P, 1),
    (D, 1), (P, 1), (G, 1), (R, 1),
    (S, 1), (R, 1), (G, 1), (R, 1),
    (S, 4),
]


def play_santoor(melody: list[tuple[int, float]], start: float, gain: float) -> None:
    t = start
    for deg, beats in melody:
        dur = beats * BEAT
        vel = rng.uniform(0.85, 1.0)
        place(santoor(hz(deg), max(dur, 0.5) + 2.2, vel), t + rng.normal(0, 0.006), gain=gain, pan=0.18)
        if beats >= 2:  # soft tremolo, as a santoor player sustains a long note
            for k, tt in enumerate(np.arange(t + BEAT, t + dur - 0.05, BEAT / 4)):
                place(santoor(hz(deg), 1.2, 0.32 - 0.02 * k), tt, gain=gain, pan=0.18)
        t += dur


play_santoor(melody_a, 40.0, 0.13)
play_santoor(melody_b, 40.0 + 32 * BEAT, 0.13)
play_santoor(melody_a, 40.0 + 64 * BEAT, 0.12)
# the flute sings melody A an octave above in the third pass
place(flute_line([(d, b * BEAT) for d, b in melody_a]), 40.0 + 64 * BEAT, gain=0.11, pan=-0.15)

# closing alap and a final Sa
closing = [(G, 2.0), (R, 1.5), (S, 4.0), (None, 0.8), (R, 1.0), (S, 1.5), (Dl, 2.0), (S, 5.5)]
place(flute_line(closing), 121.0, gain=0.15, pan=-0.12)
place(santoor(hz(S), 6.0, 0.8), 120.0, gain=0.12, pan=0.18)
place(santoor(hz(S, -1), 6.0, 0.7), 120.0, gain=0.10, pan=0.18)

# soft mridangam-style percussion, 40 s → 120 s
perc = np.zeros(N)
pattern = [(0.0, 'thom', 1.0), (0.0, 'din', 0.7), (1.0, 'ta', 0.6), (1.5, 'ki', 0.25), (2.0, 'din', 0.6), (2.5, 'ta', 0.45), (3.0, 'ta', 0.4), (3.5, 'ki', 0.22)]
for bar in range(24):
    bar_start = 40.0 + bar * 4 * BEAT
    for beat, stroke, vel in pattern:
        t0 = bar_start + beat * BEAT + rng.normal(0, 0.005)
        sig = thom(vel) if stroke == 'thom' else ta(vel, ring=0.45 if stroke == 'din' else 0.12)
        i = int(t0 * SR)
        perc[i : i + len(sig)] += sig[: N - i] if i + len(sig) > N else sig
fade = np.ones(N)
a, b, c, d = (int(x * SR) for x in (40.0, 46.0, 112.0, 120.0))
fade[:a] = 0
fade[a:b] = np.linspace(0, 1, b - a)
fade[c:d] = np.linspace(1, 0, d - c)
fade[d:] = 0
perc *= fade * 0.04
left += perc
right += perc

# -------------------------------------------------------------- space & master

ir_len = int(2.6 * SR)
t = np.arange(ir_len) / SR
ir = []
for _ in range(2):
    bright = sosfilt(butter(2, 3500, btype='high', fs=SR, output='sos'), rng.standard_normal(ir_len)) * np.exp(-t / 0.22)
    dark = sosfilt(butter(2, 2200, btype='low', fs=SR, output='sos'), rng.standard_normal(ir_len)) * np.exp(-t / 0.62)
    r = 0.35 * bright + dark
    r[: int(0.012 * SR)] = 0
    ir.append(r / np.sqrt(np.sum(r**2)))
wet_l = fftconvolve(left, ir[0])[:N]
wet_r = fftconvolve(right, ir[1])[:N]
mix_l = left * 0.78 + wet_l * 0.42
mix_r = right * 0.78 + wet_r * 0.42

master = np.stack([mix_l, mix_r])
fade_in = int(1.5 * SR)
fade_out = int(7.0 * SR)
master[:, :fade_in] *= np.linspace(0, 1, fade_in)
master[:, -fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5
master = np.tanh(master * (0.6 / np.max(np.abs(master)))) / np.tanh(0.6)  # gentle soft-knee limiting
master *= 0.89 / np.max(np.abs(master))  # peak at -1 dBFS

rms_db = 20 * np.log10(np.sqrt(np.mean(master**2)))
print(f'duration {TOTAL:.0f}s  peak -1.0 dBFS  rms {rms_db:.1f} dBFS')

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio')
os.makedirs(out_dir, exist_ok=True)
pcm = (np.clip(master.T, -1, 1) * 32767).astype('<i2').tobytes()

import lameenc  # noqa: E402  (imported late so the analysis above runs without it)

enc = lameenc.Encoder()
enc.set_bit_rate(128)
enc.set_in_sample_rate(SR)
enc.set_channels(2)
enc.set_quality(2)
mp3 = enc.encode(pcm) + enc.flush()
path = os.path.normpath(os.path.join(out_dir, 'mangala-dhwani.mp3'))
with open(path, 'wb') as fh:
    fh.write(mp3)
print(f'wrote {path} ({len(mp3) / 1024:.0f} KB)')

if '--wav' in sys.argv:  # optional lossless copy for auditioning / analysis
    import wave

    with wave.open(path.replace('.mp3', '.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)
