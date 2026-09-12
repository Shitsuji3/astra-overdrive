# Cuts a boss out of the painted background it was generated on, and writes a transparent PNG
# into assets/bosses/. The source art is opaque: a factory scene behind the machine. The game
# draws bosses over its own background, so the scene has to come off first.
#
#   set PYTHONPATH=qa/python-deps
#   python tools/cut-boss.py "<source image>" <boss-id>
#
# How it works: GrabCut is seeded with a rectangle just inside the frame, the border ring is
# marked as certain background, and the centre block as certain foreground. The mask is then
# cleaned up (largest blob only, holes filled, edge feathered by one pixel) and the result is
# cropped to what is left. Writes a side-by-side check image next to the output.
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'bosses')


def cut(path, name, rounds=6):
    rgb = np.array(Image.open(path).convert('RGB'))
    h, w = rgb.shape[:2]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    # a generous box around the subject, then certainties at the extremes
    pad_x, pad_y = int(w * .04), int(h * .04)
    mask[pad_y:h - pad_y, pad_x:w - pad_x] = cv2.GC_PR_FGD
    ring = int(min(w, h) * .035)
    mask[:ring, :] = cv2.GC_BGD
    mask[:, :ring] = cv2.GC_BGD; mask[:, -ring:] = cv2.GC_BGD
    # the walkway the machine was drawn standing on runs along the bottom of every frame
    mask[int(h * .92):, :] = cv2.GC_BGD
    cx, cy = w // 2, int(h * .52)
    rx, ry = int(w * .12), int(h * .12)
    mask[cy - ry:cy + ry, cx - rx:cx + rx] = cv2.GC_FGD

    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, None, bgd, fgd, rounds, cv2.GC_INIT_WITH_MASK)
    keep = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # One pass leaves the scene that shows between a machine's own limbs, because there the
    # background is the same dark teal as the parts around it. Re-seeding from the first result
    # and running again lets the colour model separate the two properly.
    for _ in range(2):
        core = cv2.erode(keep, np.ones((15, 15), np.uint8))
        outside = cv2.dilate(keep, np.ones((25, 25), np.uint8))
        again = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
        again[keep > 0] = cv2.GC_PR_FGD
        again[core > 0] = cv2.GC_FGD
        again[outside == 0] = cv2.GC_BGD
        again[:ring, :] = cv2.GC_BGD
        again[:, :ring] = cv2.GC_BGD; again[:, -ring:] = cv2.GC_BGD
        again[int(h * .92):, :] = cv2.GC_BGD
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(bgr, again, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
        keep = np.where((again == cv2.GC_FGD) | (again == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # keep only the machine: the biggest blob, with its holes filled
    n, labels, stats, _ = cv2.connectedComponentsWithStats(keep, 8)
    if n > 1:
        biggest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        keep = np.where(labels == biggest, 255, 0).astype(np.uint8)
    # Fill only small enclosed gaps. The wide space between a machine's legs is background
    # and has to stay that way, or the scene behind it comes along for the ride.
    gaps, labels, stats, _ = cv2.connectedComponentsWithStats(255 - keep, 4)
    limit = w * h * .012
    for i in range(1, gaps):
        x, y, bw, bh, area = stats[i]
        touches = x == 0 or y == 0 or x + bw >= w or y + bh >= h
        if not touches and area < limit:
            keep[labels == i] = 255
    keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # one pixel of feather so the cut edge does not shimmer when the sprite is scaled
    alpha = cv2.GaussianBlur(keep, (3, 3), 0)

    ys, xs = np.where(alpha > 8)
    if not len(ys):
        sys.exit('nothing survived the cut for ' + name)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = np.dstack([rgb, alpha])[y0:y1, x0:x1]

    os.makedirs(OUT, exist_ok=True)
    target = os.path.join(OUT, name + '.png')
    Image.fromarray(out).save(target)

    # a check sheet: source, mask, and the cut over a mid grey
    grey = np.full_like(out[..., :3], 90)
    a = out[..., 3:4] / 255.0
    over = (out[..., :3] * a + grey * (1 - a)).astype(np.uint8)
    sheet = Image.new('RGB', (w + (x1 - x0) * 2 + 24, max(h, y1 - y0)), (18, 26, 32))
    sheet.paste(Image.fromarray(rgb), (0, 0))
    sheet.paste(Image.fromarray(cv2.cvtColor(alpha, cv2.COLOR_GRAY2RGB)[y0:y1, x0:x1]), (w + 12, 0))
    sheet.paste(Image.fromarray(over), (w + (x1 - x0) + 24, 0))
    sheet.save(os.path.join(ROOT, 'qa', 'cut-' + name + '.png'))

    kept = int((alpha > 128).sum())
    print('%-16s %s -> %s  kept %d%% of the frame' %
          (name, (w, h), (x1 - x0, y1 - y0), round(kept * 100 / ((x1 - x0) * (y1 - y0)))))


if __name__ == '__main__':
    cut(sys.argv[1], sys.argv[2])
