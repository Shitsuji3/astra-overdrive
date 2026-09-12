import math
from pathlib import Path
import numpy as np
from PIL import Image
try:
    import cv2
except ImportError as exc:
    raise SystemExit('OpenCV (cv2) is required for flow-based run interpolation') from exc

ROOT = Path(__file__).parent
SRC, OUT = ROOT / 'player-run-v2.png', ROOT / 'player-run-v3.png'
W, H, N = 384, 512, 14
RX = [178, 195, 207, 208, 185, 206, 207, 213]
GY = [430, 432, 441, 410, 389, 406, 393, 380]
ANCHOR = (192, 460)

def aligned_cells():
    src = np.asarray(Image.open(SRC).convert('RGBA')); cells = []
    for k in range(8):
        x, y = (k % 4) * W, (k // 4) * H
        cell = src[y:y + H, x:x + W].copy()
        M = np.float32([[1, 0, ANCHOR[0] - RX[k]], [0, 1, ANCHOR[1] - GY[k]]])
        cells.append(cv2.warpAffine(cell, M, (W, H), flags=cv2.INTER_LINEAR,
                                    borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)))
    return cells

def interpolate(a, b, t):
    aa, bb = a[..., 3].astype(np.float32) / 255, b[..., 3].astype(np.float32) / 255
    pa, pb = a[..., :3].astype(np.float32) * aa[..., None], b[..., :3].astype(np.float32) * bb[..., None]
    ga = cv2.cvtColor(pa.astype(np.uint8), cv2.COLOR_RGB2GRAY); gb = cv2.cvtColor(pb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    def dis_flow(first, second):
        dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
        dis.setFinestScale(0)
        return dis.calc(first, second, None)
    fwd, back = dis_flow(ga, gb), dis_flow(gb, ga)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    def warp(v, flow, scale): return cv2.remap(v, xx - scale * flow[..., 0], yy - scale * flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    # Warp only one source pose per phase. Blending two large, differently
    # posed silhouettes creates visible double heads/bodies. The half-phase
    # switch is the intentional limit of this lightweight inbetween method.
    if t < 0.5:
        premul, alpha = warp(pa, fwd, t), warp(aa, fwd, t)
    else:
        premul, alpha = warp(pb, back, 1 - t), warp(bb, back, 1 - t)
    rgb = premul / np.maximum(alpha[..., None], 1e-6)
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
    out[alpha < 1 / 255] = 0
    return out

def main():
    cells = aligned_cells(); frames = []
    for i in range(N):
        phase = i * 8 / N; a, t = int(math.floor(phase)), phase % 1
        frames.append(interpolate(cells[a % 8], cells[(a + 1) % 8], t) if t else cells[a % 8])
    atlas = np.zeros((H * 2, W * 7, 4), np.uint8)
    for i, frame in enumerate(frames): atlas[(i // 7)*H:(i // 7 + 1)*H, (i % 7)*W:(i % 7 + 1)*W] = frame
    Image.fromarray(atlas, 'RGBA').save(OUT)
    print(f'{OUT} {atlas.shape[1]}x{atlas.shape[0]} frames={len(frames)} anchor={ANCHOR}')

if __name__ == '__main__': main()
