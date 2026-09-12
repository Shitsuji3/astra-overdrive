"""Two measurements the earlier ones missed, and they are the two that matter.

WIDTH PROFILE.  How wide is the fire at each point along its axis, as a fraction of its widest?
If the reference is already half its width at the base then it has no neck, and the long narrow
throat I built is an invention.

COLOUR SHARE.  What fraction of the fire's pixels are white, cream, yellow, orange and red? The
reference looks predominantly white and yellow; mine looks predominantly orange and red. If so
the layer sizes are wrong regardless of the silhouette.
"""
import os, math
import numpy as np
from PIL import Image

os.chdir(r'C:\Users\situz\Documents\ChatGPT\Astragemes')
MW, INSET = 150, 22


def bands(R, G, B):
    """Five temperature classes, on the GIF's own ladder."""
    mx = np.maximum(np.maximum(R, G), B)
    out = np.zeros(R.shape, np.uint8)
    out[(R > 200) & (G > 200) & (B > 150)] = 5           # white and cream
    out[(out == 0) & (R > 200) & (G > 170) & (B <= 150)] = 4   # yellow and gold
    out[(out == 0) & (R > 200) & (G > 100) & (G <= 170)] = 3   # orange
    out[(out == 0) & (R > 170) & (G > 40) & (G <= 100)] = 2    # red orange
    out[(out == 0) & (R > 70) & (G <= 60) & (mx > 70)] = 1     # red
    return out


def profile(fx, fy, tag, extra=''):
    cx, cy = fx.mean(), fy.mean()
    x, y = fx - cx, fy - cy
    sxx, syy, sxy = (x * x).mean(), (y * y).mean(), (x * y).mean()
    th = .5 * math.atan2(2 * sxy, sxx - syy)
    dx, dy = math.cos(th), math.sin(th)
    if dy > 0:
        dx, dy = -dx, -dy
    al = x * dx + y * dy
    ac = x * (-dy) + y * dx
    lo, hi = np.percentile(al, 2), np.percentile(al, 98)
    print('  %s%s' % (tag, extra))
    cells = []
    for k in range(10):
        a0 = lo + (hi - lo) * k / 10
        a1 = lo + (hi - lo) * (k + 1) / 10
        sl = (al >= a0) & (al < a1)
        if sl.sum() < 4:
            cells.append(0.0)
            continue
        v = ac[sl]
        cells.append(float(np.percentile(v, 97) - np.percentile(v, 3)))
    peak = max(cells) or 1
    print('    width along the axis, base -> tip, as a fraction of the widest:')
    print('    ' + ' '.join('%.2f' % (c / peak) for c in cells))
    return [c / peak for c in cells]


print('== reference GIF ==')
gif = Image.open('qa/rising-ref/reference.gif')
ref_share = np.zeros(6)
ref_prof = []
for i in (18, 24, 30, 36):
    gif.seek(i)
    a = np.asarray(gif.convert('RGB')).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = a.max(2)
    fire = (mx > 40) & (R >= G) & (G >= B) & (((G > 110) & (mx > 170)) | (mx > 235))
    cls = bands(R, G, B) * fire
    for k in range(1, 6):
        ref_share[k] += (cls == k).sum()
    fy, fx = np.nonzero(fire)
    ref_prof.append(profile(fx, fy, 'gif f%d' % i, '  (%d px)' % len(fx)))

print('\n== my render ==')
mine = Image.open('qa/rising-ref/mine11.png').convert('RGB')
my_share = np.zeros(6)
my_prof = []
for i in (4, 5, 6, 7):
    c = mine.crop((i * MW + INSET, 0, (i + 1) * MW - 3, mine.height))
    a = np.asarray(c).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx, mn = a.max(2), a.min(2)
    ink = (mx < 246) | ((mx - mn) > 16)
    fire = ink & (R >= G - 10) & (G >= B - 10) & (mx > 120) & ((mx - mn) > 40)
    cls = bands(R, G, B) * fire
    for k in range(1, 6):
        my_share[k] += (cls == k).sum()
    fy, fx = np.nonzero(fire)
    my_prof.append(profile(fx, fy, 'mine %d' % (i + 1), '  (%d px)' % len(fx)))

print('\n== colour share of the fire ==')
names = {5: 'white / cream', 4: 'yellow / gold', 3: 'orange', 2: 'red orange', 1: 'red'}
rt, mt = ref_share[1:].sum(), my_share[1:].sum()
print('                  reference    mine')
for k in (5, 4, 3, 2, 1):
    print('  %-15s %6.1f%%   %6.1f%%' % (names[k], 100 * ref_share[k] / rt, 100 * my_share[k] / mt))
print('  hot (white+yellow) %5.1f%%   %5.1f%%'
      % (100 * (ref_share[5] + ref_share[4]) / rt, 100 * (my_share[5] + my_share[4]) / mt))

print('\n== width profile, averaged, base -> tip ==')
r = np.mean(ref_prof, 0)
m = np.mean(my_prof, 0)
print('  reference  ' + ' '.join('%.2f' % v for v in r))
print('  mine       ' + ' '.join('%.2f' % v for v in m))
print('\n  at the base (first tenth):  reference %.2f   mine %.2f' % (r[0], m[0]))
print('  at a third along:           reference %.2f   mine %.2f' % (r[3], m[3]))
