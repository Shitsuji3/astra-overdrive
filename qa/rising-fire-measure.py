"""Measures the reference GIF and my render with one identical ruler.

Same method on both: take every warm pixel, fit its principal axis, report the angle from
vertical and the extent along and across that axis in body heights.  Measuring the reference
one way and my own render another way is how the plume ended up first half the size it should
be and then twice it.
"""
import os, math
import numpy as np
from PIL import Image

os.chdir(r'C:\Users\situz\Documents\ChatGPT\Astragemes')
MW, INSET = 150, 22


def axis(fx, fy, body):
    cx, cy = fx.mean(), fy.mean()
    x, y = fx - cx, fy - cy
    sxx, syy, sxy = (x * x).mean(), (y * y).mean(), (x * y).mean()
    th = .5 * math.atan2(2 * sxy, sxx - syy)
    dx, dy = math.cos(th), math.sin(th)
    if dy > 0:
        dx, dy = -dx, -dy
    tilt = math.degrees(math.atan2(dx, -dy))
    al = x * dx + y * dy
    ac = x * (-dy) + y * dx
    return dict(n=len(fx), tilt=tilt,
                along=(np.percentile(al, 97) - np.percentile(al, 3)) / body,
                across=(np.percentile(ac, 97) - np.percentile(ac, 3)) / body,
                solid=len(fx) / max(1.0, (al.max() - al.min()) * (ac.max() - ac.min())))


gif = Image.open('qa/rising-ref/reference.gif')
gif.seek(6)
a = np.asarray(gif.convert('RGB')).astype(int)
ys, xs = np.nonzero(a.max(2) > 40)
GB = ys.max() - ys.min()

print('== reference GIF ==  (body %d px)' % GB)
print(' fr | warm px | deg | along  across | solidity')
ref = []
for i in (18, 22, 26, 30, 34, 38):
    gif.seek(i)
    a = np.asarray(gif.convert('RGB')).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = a.max(2)
    fire = (mx > 40) & (R >= G) & (G >= B) & (((G > 110) & (mx > 170)) | (mx > 235))
    fy, fx = np.nonzero(fire)
    s = axis(fx, fy, GB)
    ref.append(s)
    print('f%-3d| %7d |%4.0f | %5.2f  %5.2f  | %.2f' % (i, s['n'], s['tilt'], s['along'], s['across'], s['solid']))

mine = Image.open('qa/rising-ref/mine11.png').convert('RGB')
c0 = mine.crop((INSET, 0, MW - 3, mine.height))
am = np.asarray(c0).astype(int)
ys, xs = np.nonzero((am.max(2) < 236) | ((am.max(2) - am.min(2)) > 22))
MB = ys.max() - ys.min()

print('\n== my render ==  (body %d px)' % MB)
print(' fr | warm px | deg | along  across | solidity')
got = []
for i in (4, 5, 6, 7):
    c = mine.crop((i * MW + INSET, 0, (i + 1) * MW - 3, mine.height))
    a = np.asarray(c).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx, mn = a.max(2), a.min(2)
    ink = (mx < 246) | ((mx - mn) > 16)
    fire = ink & (R >= G - 10) & (G >= B - 10) & (mx > 120) & ((mx - mn) > 40)
    fy, fx = np.nonzero(fire)
    if len(fx) < 50:
        print('mine %d | none' % (i + 1))
        continue
    s = axis(fx, fy, MB)
    got.append(s)
    print('mine%d| %7d |%4.0f | %5.2f  %5.2f  | %.2f' % (i + 1, s['n'], s['tilt'], s['along'], s['across'], s['solid']))

if ref and got:
    rm = lambda k: float(np.mean([r[k] for r in ref]))
    gm = lambda k: float(np.mean([g[k] for g in got]))
    print('\n== means ==            reference   mine')
    print('  angle from vertical   %6.1f    %6.1f' % (rm('tilt'), gm('tilt')))
    print('  length along axis     %6.2f    %6.2f  body heights' % (rm('along'), gm('along')))
    print('  width across axis     %6.2f    %6.2f  body heights' % (rm('across'), gm('across')))
    print('  solidity              %6.2f    %6.2f' % (rm('solid'), gm('solid')))
    print('\n  scale my length by    %.2f' % (rm('along') / max(gm('along'), .01)))
    print('  scale my width by     %.2f' % (rm('across') / max(gm('across'), .01)))
