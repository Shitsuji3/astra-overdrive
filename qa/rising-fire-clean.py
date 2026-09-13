'''Clean comparison of the rising cut's fire against the reference GIF.

Fire and hero are told apart by colour, and the two sets share nothing. The reference fire is every
colour that turns up in its rising frames but never on the hero standing still (frame 6); the
reference hero is every colour of that standing frame. Warm-pixel masks, used before this, counted
the hero's red armour and gold hair as fire, and moved the reference's measured shape and colour
placement far enough to fit the fire to the wrong target.

Mine is masked by its own nine palette colours. Each fire is measured along its own axis: 41.5
degrees off vertical for the reference, the rig's plume angle at each frame for mine.

usage: rising-fire-clean.py [mine degrees, comma separated] [mine strip]
'''
import os, sys, math
import numpy as np
from PIL import Image

os.chdir('C:/Users/situz/Documents/ChatGPT/Astragemes')
MW, INSET = 150, 22
REF_DEG = 41.5
MINE_DEG = [float(v) for v in sys.argv[1].split(',')] if len(sys.argv) > 1 else [49.6, 49.3, 48.2, 61.0]
STRIP = sys.argv[2] if len(sys.argv) > 2 else 'qa/rising-ref/mine11.png'
MINE_PAL = ['#981810', '#c81810', '#e82810', '#f05818', '#f88818', '#f8d828', '#f8f040', '#f8f8b8', '#f8f0f8']
BANDS = [('white', 228, 999), ('yellow', 180, 228), ('orange', 110, 180), ('red', 65, 110), ('darkred', 0, 65)]


def keys(a):
    return a[:, :, 0] * 65536 + a[:, :, 1] * 256 + a[:, :, 2]


def axis(ys, xs, deg):
    cx, cy = xs.mean(), ys.mean()
    r = math.radians(deg)
    dx, dy = math.sin(r), -math.cos(r)
    x, y = xs - cx, ys - cy
    return x * dx + y * dy, x * (-dy) + y * dx


def edges(mask, deg, body):
    ys, xs = np.nonzero(mask)
    al, ac = axis(ys, xs, deg)
    lo, hi = np.percentile(al, 2), np.percentile(al, 98)
    lead, trail = [], []
    for k in range(10):
        sl = (al >= lo + (hi - lo) * k / 10) & (al < lo + (hi - lo) * (k + 1) / 10)
        if sl.sum() < 4:
            lead.append(0.0)
            trail.append(0.0)
            continue
        v = ac[sl]
        lead.append(max(0.0, -float(np.percentile(v, 3))) / body)
        trail.append(max(0.0, float(np.percentile(v, 97))) / body)
    return np.array(lead), np.array(trail)


def bands(mask, a, deg):
    ys, xs = np.nonzero(mask)
    rgb = a[ys, xs]
    L = 0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]
    b = np.full(len(L), -1)
    for bi, (_, lo, hi) in enumerate(BANDS):
        b[(L >= lo) & (L < hi)] = bi
    al, ac = axis(ys, xs, deg)
    lo, hi = np.percentile(al, 2), np.percentile(al, 98)
    fifths = np.full((5, 5), np.nan)
    for f in range(5):
        sl = (al >= lo + (hi - lo) * f / 5) & (al < lo + (hi - lo) * (f + 1) / 5)
        if sl.sum() >= 15:
            for bi in range(5):
                fifths[f, bi] = (b[sl] == bi).sum() / sl.sum()
    far = al >= lo + (hi - lo) * 0.6
    fl, ft = far & (ac < 0), far & (ac > 0)
    lead = [(b[fl] == bi).mean() if fl.sum() else np.nan for bi in range(5)]
    trail = [(b[ft] == bi).mean() if ft.sum() else np.nan for bi in range(5)]
    whole = [(b == bi).mean() for bi in range(5)]
    return fifths, np.array(lead), np.array(trail), np.array(whole)


def where(fire, hero, deg, body):
    ys, xs = np.nonzero(fire)
    al, _ = axis(ys, xs, deg)
    hy, hx = np.nonzero(hero)
    feet = hy.max()
    root = al <= np.percentile(al, 3)
    return np.array([(feet - ys[root].mean()) / body, (feet - ys.mean()) / body])


gif = Image.open('qa/rising-ref/reference.gif')


def frame(i):
    gif.seek(i)
    a = np.asarray(gif.convert('RGB')).astype(int)
    return a, a.max(2) > 40


a6, lit6 = frame(6)
HERO = set(keys(a6)[lit6].tolist())
FIRE = set()
for i in range(14, 46):
    a, lit = frame(i)
    px = a[lit]
    ok = (px[:, 0] >= px[:, 2]) & (px[:, 0] >= 120)
    FIRE.update(((px[:, 0] * 65536 + px[:, 1] * 256 + px[:, 2])[ok]).tolist())
FIRE -= HERO
FIRE_ARR = np.array(sorted(FIRE))
HERO_ARR = np.array(sorted(HERO))
MINE_ARR = np.array(sorted(int(h[1:], 16) for h in MINE_PAL))

R = dict(el=[], et=[], bf=[], bl=[], bt=[], bw=[], wh=[])
for i in (18, 24, 30, 36):
    a, lit = frame(i)
    fire = lit & np.isin(keys(a), FIRE_ARR)
    hero = lit & np.isin(keys(a), HERO_ARR)
    l, t = edges(fire, REF_DEG, 45.0)
    R['el'].append(l)
    R['et'].append(t)
    f, bl, bt, bw = bands(fire, a, REF_DEG)
    R['bf'].append(f)
    R['bl'].append(bl)
    R['bt'].append(bt)
    R['bw'].append(bw)
    R['wh'].append(where(fire, hero, REF_DEG, 45.0))

strip = Image.open(STRIP).convert('RGB')
M = dict(el=[], et=[], bf=[], bl=[], bt=[], bw=[], wh=[])
for n, i in enumerate((4, 5, 6, 7)):
    a = np.asarray(strip.crop((i * MW + INSET, 0, (i + 1) * MW - 3, strip.height))).astype(int)
    fire = np.isin(keys(a), MINE_ARR)
    hero = (a[:, :, 2] > a[:, :, 0] + 30) & (a[:, :, 2] > 100)
    l, t = edges(fire, MINE_DEG[n], 47.0)
    M['el'].append(l)
    M['et'].append(t)
    f, bl, bt, bw = bands(fire, a, MINE_DEG[n])
    M['bf'].append(f)
    M['bl'].append(bl)
    M['bt'].append(bt)
    M['bw'].append(bw)
    if hero.any():
        M['wh'].append(where(fire, hero, MINE_DEG[n], 47.0))


def row(v):
    return ' '.join('%.2f' % x for x in np.nanmean(v, 0))


names = [b[0] for b in BANDS]
print('EDGES along each fire, ten slices hand to tip, body heights, fire colours only')
print('  reference upper  ' + row(R['el']))
print('  mine      upper  ' + row(M['el']))
print('  reference lower  ' + row(R['et']))
print('  mine      lower  ' + row(M['et']))
ru = np.nanmean(R['el'], 0) / np.maximum(np.nanmean(M['el'], 0), 1e-3)
rl = np.nanmean(R['et'], 0) / np.maximum(np.nanmean(M['et'], 0), 1e-3)
print('  ratio upper      ' + ' '.join('%.2f' % v for v in ru))
print('  ratio lower      ' + ' '.join('%.2f' % v for v in rl))
print()
RF, MF = np.nanmean(R['bf'], 0), np.nanmean(M['bf'], 0)
print('COLOUR BY BRIGHTNESS BAND, per fifth of the length (reference / mine)')
print('  fifth        0-20%        20-40%        40-60%        60-80%       80-100%')
for bi, nm in enumerate(names):
    print('  %-8s ' % nm + '  '.join('%3.0f%% /%3.0f%%' % (100 * RF[f, bi], 100 * MF[f, bi]) for f in range(5)))
for label, key in (('far lead ', 'bl'), ('far trail', 'bt'), ('whole    ', 'bw')):
    r, m = np.nanmean(R[key], 0), np.nanmean(M[key], 0)
    print('  %s ' % label + '  '.join('%s %3.0f/%3.0f' % (names[bi], 100 * r[bi], 100 * m[bi]) for bi in range(5)))
print()
if M['wh']:
    w, m = np.nanmean(R['wh'], 0), np.nanmean(M['wh'], 0)
    print('WHERE THE FIRE SITS, body heights above the feet     root     centre')
    print('  reference                                          %5.2f    %5.2f' % tuple(w))
    print('  mine                                               %5.2f    %5.2f' % tuple(m))
