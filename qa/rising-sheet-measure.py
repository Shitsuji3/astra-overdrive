"""How far above its own feet does the plume's tip reach?

This is what the eye reads when it compares the two sheets, and unlike the plume's own length
it does not care where the root sits or how the blob's axis was fitted.  Reported in body
heights so the two art scales cancel.
"""
import os
import numpy as np
from PIL import Image

os.chdir(r'C:\Users\situz\Documents\ChatGPT\Astragemes')

REF = [(27, 52), (54, 77), (79, 121), (128, 173), (179, 223), (228, 274),
       (277, 323), (329, 375), (381, 407), (413, 437), (444, 463)]
MW, INSET = 150, 22


def bounds(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    on = (a.max(2) < 236) | ((a.max(2) - a.min(2)) > 22)
    ys, xs = np.nonzero(on)
    return ys.min(), ys.max(), xs.min(), xs.max()


ref = Image.open('qa/rising-ref/frames.png')
mine = Image.open('qa/rising-ref/mine11.png')
rc = [ref.crop((a, 0, b + 1, ref.height)) for a, b in REF]
mc = [mine.crop((i * MW + INSET, 0, (i + 1) * MW - 3, mine.height)) for i in range(11)]

rh = bounds(rc[0])
mh = bounds(mc[0])
ref_stand = rh[1] - rh[0]
mine_stand = mh[1] - mh[0]

print(' fr | tip above own feet, in body heights | widest span, in body heights')
print('    |   reference      mine               |  reference      mine')
for i in range(11):
    rt, rb, rx0, rx1 = bounds(rc[i])
    mt, mb, mx0, mx1 = bounds(mc[i])
    print('f%-2d |     %5.2f        %5.2f              |    %5.2f       %5.2f' % (
        i + 1, (rb - rt) / ref_stand, (mb - mt) / mine_stand,
        (rx1 - rx0) / ref_stand, (mx1 - mx0) / mine_stand))
