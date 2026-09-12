"""Puts the reference GIF's rising frames next to mine at a matched body height.

Cells are sized from the content so nothing is cropped - the earlier version cut my plume off
at the cell edge, which made it impossible to see what was actually wrong with it.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

os.chdir(r'C:\Users\situz\Documents\ChatGPT\Astragemes')
OUT = 'qa/rising-ref/fire-compare.png'
MW, INSET = 150, 22
GIF_AT = [18, 24, 30, 36]
MINE_AT = [4, 5, 6, 7]

gif = Image.open('qa/rising-ref/reference.gif')
mine = Image.open('qa/rising-ref/mine11.png').convert('RGB')


def on_mask(img, dark):
    a = np.asarray(img.convert('RGB')).astype(int)
    if dark:
        return a.max(2) > 40
    return (a.max(2) < 236) | ((a.max(2) - a.min(2)) > 22)


def tight(img, dark):
    m = on_mask(img, dark)
    ys, xs = np.nonzero(m)
    if not len(xs):
        return None
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


gif.seek(6)
ys, xs = np.nonzero(on_mask(gif.convert('RGB'), True))
GB = ys.max() - ys.min()
m0 = mine.crop((INSET, 0, MW - 3, mine.height))
ys, xs = np.nonzero(on_mask(m0, False))
MB = ys.max() - ys.min()
print('body height  gif %d  mine %d' % (GB, MB))

Z = 3.4
mz = Z * GB / MB
tops, bots = [], []
for g in GIF_AT:
    gif.seek(g)
    c = tight(gif.convert('RGB'), True)
    tops.append(c.resize((int(c.width * Z), int(c.height * Z)), Image.NEAREST))
for i in MINE_AT:
    c = tight(mine.crop((i * MW + INSET, 0, (i + 1) * MW - 3, mine.height)), False)
    bots.append(c.resize((int(c.width * mz), int(c.height * mz)), Image.NEAREST))

CW = max(max(c.width for c in tops), max(c.width for c in bots)) + 16
CH = max(max(c.height for c in tops), max(c.height for c in bots)) + 16
PAD, HEAD = 6, 20
sheet = Image.new('RGB', (4 * (CW + PAD) + PAD, 2 * (CH + HEAD) + PAD), (246, 246, 244))
d = ImageDraw.Draw(sheet)
for row, (cells, labels, bg, fg) in enumerate([
        (tops, ['gif f%d' % g for g in GIF_AT], (14, 14, 16), (235, 235, 235)),
        (bots, ['mine %d' % (i + 1) for i in MINE_AT], (14, 14, 16), (235, 235, 235))]):
    for k, c in enumerate(cells):
        ox = PAD + k * (CW + PAD)
        oy = HEAD + row * (CH + HEAD)
        sheet.paste(Image.new('RGB', (CW, CH), bg), (ox, oy))
        sheet.paste(c, (ox + (CW - c.width) // 2, oy + CH - c.height - 8))
        d.text((ox + 4, oy + CH - 14), labels[k], fill=fg)
d.text((PAD, 4), 'REFERENCE GIF', fill=(20, 24, 30))
d.text((PAD, CH + HEAD + 4), 'ASTRA // OVERDRIVE', fill=(20, 24, 30))
sheet.save(OUT)
print('wrote', OUT, sheet.size)
