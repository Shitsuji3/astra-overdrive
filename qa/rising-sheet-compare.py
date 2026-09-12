"""Builds the side-by-side: the user's eleven-frame sheet over my eleven frames.

The two are drawn at different scales - the reference sprite stands twenty-nine pixels, mine
stands forty-seven - so mine is shrunk by that ratio.  Both rows stand on one baseline, and
each frame is anchored on its feet rather than its bounding box, because a frame whose plume
fills the top of the cell would otherwise float.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

os.chdir(r'C:\Users\situz\Documents\ChatGPT\Astragemes')

REF = [(27, 52), (54, 77), (79, 121), (128, 173), (179, 223), (228, 274),
       (277, 323), (329, 375), (381, 407), (413, 437), (444, 463)]
MW, INSET = 150, 22
LABEL = ['1 stand', '2 draw', '3 wind back', '4 floor pass', '5 launch', '6 rise',
         '7 apex', '8 tear off', '9 arms wide', '10 fall', '11 land']

ref = Image.open('qa/rising-ref/frames.png').convert('RGB')
mine = Image.open('qa/rising-ref/mine11.png').convert('RGB')


def mask(im):
    a = np.asarray(im).astype(int)
    return (a.max(2) < 236) | ((a.max(2) - a.min(2)) > 22)


def content(im):
    m = mask(im)
    ys, xs = np.nonzero(m)
    bot = ys.max()
    foot = xs[ys >= bot - 3].mean()
    return dict(x0=xs.min(), y0=ys.min(), x1=xs.max(), y1=bot, footx=foot)


ref_cells = [ref.crop((a, 0, b + 1, ref.height)) for a, b in REF]
mine_cells = [mine.crop((i * MW + INSET, 0, (i + 1) * MW - 3, mine.height)) for i in range(11)]
ref_info = [content(c) for c in ref_cells]
mine_info = [content(c) for c in mine_cells]

ref_h = ref_info[0]['y1'] - ref_info[0]['y0']
mine_h = mine_info[0]['y1'] - mine_info[0]['y0']
print('standing height  reference %d  mine %d' % (ref_h, mine_h))

Z = 4.0
mz = Z * ref_h / mine_h
CELL_W, CELL_H, PAD, HEAD = 200, 320, 6, 22
BASE = int(CELL_H * .86)


def row(cells, info, zoom, ground):
    """Each frame on its own cell, standing on the baseline.

    The reference sheet packs every frame on its own feet - the leap is not in the drawing,
    it is in whatever plays the drawing - so mine is laid out the same way. Otherwise my rising
    frames, which really do climb, would fly off the top of the cell and there would be nothing
    to compare the poses against.
    """
    strip = Image.new('RGB', (11 * (CELL_W + PAD) + PAD, CELL_H), (252, 252, 250))
    for i, (c, nfo) in enumerate(zip(cells, info)):
        big = c.resize((int(c.width * zoom), int(c.height * zoom)), Image.NEAREST)
        oy = BASE - int(nfo['y1'] * zoom)
        ox = PAD + i * (CELL_W + PAD) + CELL_W // 2 - int(nfo['footx'] * zoom)
        sx0, sy0 = max(0, -ox), max(0, -oy)
        sx1 = min(big.width, PAD + i * (CELL_W + PAD) + CELL_W - ox)
        sy1 = min(big.height, CELL_H - oy)
        if sx1 <= sx0 or sy1 <= sy0:
            continue
        strip.paste(big.crop((sx0, sy0, sx1, sy1)), (ox + sx0, oy + sy0))
    return strip


top = row(ref_cells, ref_info, Z, ref_info[0]['y1'])
bot = row(mine_cells, mine_info, mz, mine_info[0]['y1'])

sheet = Image.new('RGB', (top.width, 2 * (CELL_H + HEAD) + PAD), (252, 252, 250))
sheet.paste(top, (0, HEAD))
sheet.paste(bot, (0, CELL_H + 2 * HEAD))
d = ImageDraw.Draw(sheet)
d.text((PAD, 5), 'REFERENCE   the eleven-frame sheet', fill=(20, 30, 40))
d.text((PAD, CELL_H + HEAD + 5), 'ASTRA // OVERDRIVE   in game', fill=(20, 30, 40))
for i, lab in enumerate(LABEL):
    x = PAD + i * (CELL_W + PAD) + 4
    for base in (HEAD, CELL_H + 2 * HEAD):
        d.rectangle([x - 4, base, x - 4 + CELL_W, base + CELL_H - 1], outline=(214, 220, 226))
        d.text((x, base + CELL_H - 14), lab, fill=(110, 120, 130))
sheet.save('qa/rising-ref/sheet-compare.png')
print('wrote qa/rising-ref/sheet-compare.png', sheet.size)
