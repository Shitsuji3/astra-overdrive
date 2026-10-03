"""Arrange actual browser captures into a slow animation and a close pose comparison.

Capture first with RISING_QA_DIR=rising-backturn-20261003 and RISING_ANIMATE=1
using qa/rising-reference-20261003.cjs after. This never changes the game artwork.
"""
from pathlib import Path
from PIL import Image

folder = Path(__file__).resolve().parent / 'rising-backturn-20261003'
frames = [
    Image.open(p).convert('RGBA').crop((0, 70, 240, 330)).resize((480, 520), Image.Resampling.NEAREST)
    for p in sorted((folder / 'frames').glob('*.png'))
]
if len(frames) != 70:
    raise SystemExit(f'Expected 70 browser captures, found {len(frames)}')
durations = [50] * len(frames)
durations[0], durations[-1] = 450, 650
frames[0].save(folder / 'motion-slow.webp', save_all=True, append_images=frames[1:],
               duration=durations, loop=0, lossless=True, quality=100, method=4)

comparison = Image.new('RGB', (1500, 660), '#f7f7f7')
for row, label in enumerate(['before', 'after']):
    strip = Image.open(folder / f'{label}-right.png')
    for column, phase in enumerate([3, 4, 6, 7, 8]):
        cell = strip.crop((phase * 340 + 30, 140, phase * 340 + 180, 300))
        cell = cell.resize((300, 320), Image.Resampling.NEAREST)
        comparison.paste(cell, (column * 300, row * 330 + 10))
comparison.save(folder / 'backturn-closeup.png')
print('Saved slow motion (70 real-input frames) and close comparison.')
