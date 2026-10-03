"""Package real-input browser captures; never modifies the game's sprite artwork."""
from pathlib import Path
from PIL import Image
import os

folder = Path(__file__).resolve().parent / os.environ.get('RISING_QA_DIR', 'rising-body-20261003')
paths = sorted((folder / 'frames').glob('*.png'))
if len(paths) != 70:
    raise SystemExit(f'Expected 70 browser captures, found {len(paths)}')
frames = [Image.open(p).convert('RGB').crop((0, 70, 240, 330)).resize(
    (480, 520), Image.Resampling.NEAREST) for p in paths]
for name, interval in [('motion-normal.webp', 17), ('motion-slow.webp', 50)]:
    durations = [interval] * len(frames)
    durations[-1] = 600
    frames[0].save(folder / name, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, lossless=True, quality=100, method=4)

# A compact, flame-free inspection of the three key poses from the browser-rendered board.
if (folder / 'body-keyposes.png').exists():
    board = Image.open(folder / 'body-keyposes.png')
    board.crop((320, 310, 1280, 620)).save(folder / 'body-three-poses.png')
print('Saved normal/slow real-input playback; optional body-only crop kept when available.')
