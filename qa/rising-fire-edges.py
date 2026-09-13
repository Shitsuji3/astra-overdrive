'''Edge-by-edge comparison of the rising cut's fire against the reference GIF.

Both images are measured on fire pixels only - warm, and leaning red over blue. An earlier
version let grey and white into the mask, which pulled in the reference hero's steel armour
under the hand and made the reference's trailing edge look wide at the hand when it is not.

Each fire is cut into ten slices along its own principal axis; for each slice the leading
(upper) and trailing (lower) extent from the axis is reported in body heights, plus how uneven
and how rough each edge is and how many loose drips there are. The last lines give the ratio,
reference over mine, per slice: multiply a rig edge table by those (damped) to close the gap.
'''
import os, math, sys
import numpy as np
from PIL import Image

os.chdir('C:/Users/situz/Documents/ChatGPT/Astragemes')
MW, INSET = 150, 22
# Optionally measure each of my four frames along its own plume axis, given in degrees off
# vertical, instead of a fitted one. A lopsided fire rotates a fitted axis, the slices then cut
# it obliquely, and it reads fat at the hand and thin at the tip when it is the other way round.
MINE_DEG = [float(v) for v in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
# the reference's fitted axis holds steady at 40 to 43 degrees across the rise, so it is fixed there
REF_DEG = 41.5 if MINE_DEG else None


def axis_frame(fx, fy, deg=None):
    cx, cy = fx.mean(), fy.mean()
    x, y = fx - cx, fy - cy
    if deg is None:
        sxx, syy, sxy = (x * x).mean(), (y * y).mean(), (x * y).mean()
        th = 0.5 * math.atan2(2 * sxy, sxx - syy)
        dx, dy = math.cos(th), math.sin(th)
        if dy > 0:
            dx, dy = -dx, -dy
    else:
        # a fixed axis this many degrees off vertical, pointing up and forward
        r = math.radians(deg)
        dx, dy = math.sin(r), -math.cos(r)
    return x * dx + y * dy, x * (-dy) + y * dx


def warm_only(a):
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (a.max(2) > 120) & (R >= G) & (G >= B) & ((R - B) > 40)


def fragments(mask, a):
    R, B = a[:, :, 0], a[:, :, 2]
    H, W = mask.shape
    seen = np.zeros(mask.shape, dtype=bool)
    count = 0
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if 2 <= len(pts) <= 40:
            yy = np.array([q[0] for q in pts])
            xx = np.array([q[1] for q in pts])
            if float((R[yy, xx] - B[yy, xx]).mean()) > 40:
                count += 1
    return count


def slices(mask, body, deg=None):
    fy, fx = np.nonzero(mask)
    al, ac = axis_frame(fx, fy, deg)
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


def uneven(v):
    m = v[1:-1]
    return float(m.std() / m.mean()) if m.mean() > 0 else 0.0


def rough(v):
    return float(np.abs(np.diff(v[1:-1])).mean())


gif = Image.open('qa/rising-ref/reference.gif')
gif.seek(6)
a0 = np.asarray(gif.convert('RGB')).astype(int)
ys, xs = np.nonzero(a0.max(2) > 40)
GB = ys.max() - ys.min()
ref = []
for i in (18, 24, 30, 36):
    gif.seek(i)
    a = np.asarray(gif.convert('RGB')).astype(int)
    m = warm_only(a)
    l, t = slices(m, GB, REF_DEG)
    ref.append((l, t, fragments(m, a)))

mine = Image.open('qa/rising-ref/mine11.png').convert('RGB')
c0 = np.asarray(mine.crop((INSET, 0, MW - 3, mine.height))).astype(int)
ys, xs = np.nonzero((c0.max(2) < 236) | ((c0.max(2) - c0.min(2)) > 22))
MB = ys.max() - ys.min()
# optionally measure the fire from another strip laid out the same way, e.g. the plume alone
fire_strip = Image.open(sys.argv[1]).convert('RGB') if len(sys.argv) > 1 and sys.argv[1] != '-' else mine
got = []
for n, i in enumerate((4, 5, 6, 7)):
    a = np.asarray(fire_strip.crop((i * MW + INSET, 0, (i + 1) * MW - 3, fire_strip.height))).astype(int)
    m = warm_only(a)
    l, t = slices(m, MB, MINE_DEG[n] if MINE_DEG else None)
    got.append((l, t, fragments(m, a)))

RL = np.mean([r[0] for r in ref], 0)
RT = np.mean([r[1] for r in ref], 0)
ML = np.mean([g[0] for g in got], 0)
MT = np.mean([g[1] for g in got], 0)
row = lambda v: ' '.join('%.2f' % x for x in v)
print('fire pixels only, ten slices along each fire from the hand to the tip, in body heights')
print('  reference upper  ' + row(RL))
print('  mine      upper  ' + row(ML))
print('  reference lower  ' + row(RT))
print('  mine      lower  ' + row(MT))
print()
print('                              reference   mine')
print('  upper edge unevenness         %6.2f    %6.2f' % (np.mean([uneven(r[0]) for r in ref]), np.mean([uneven(g[0]) for g in got])))
print('  lower edge unevenness         %6.2f    %6.2f' % (np.mean([uneven(r[1]) for r in ref]), np.mean([uneven(g[1]) for g in got])))
print('  upper edge roughness          %6.3f    %6.3f' % (np.mean([rough(r[0]) for r in ref]), np.mean([rough(g[0]) for g in got])))
print('  lower edge roughness          %6.3f    %6.3f' % (np.mean([rough(r[1]) for r in ref]), np.mean([rough(g[1]) for g in got])))
print('  loose drips and fragments     %6.1f    %6.1f' % (np.mean([r[2] for r in ref]), np.mean([g[2] for g in got])))
print()
print('ratio, reference over mine, per slice (slice 1 is at the hand and is not trustworthy):')
print('  upper  ' + row(RL / np.maximum(ML, 1e-3)))
print('  lower  ' + row(RT / np.maximum(MT, 1e-3)))
