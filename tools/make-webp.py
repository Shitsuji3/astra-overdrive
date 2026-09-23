# Re-encodes the shipping art as WebP into assets/web/. The originals in assets/ are never
# touched; this only ever writes into assets/web/.
#
#   set PYTHONPATH=qa/python-deps
#   python tools/make-webp.py                  every image
#   python tools/make-webp.py stage-city.png   only the ones named
#
# Most images keep their exact pixel size, so every source coordinate, mask and scale in the rigs
# keeps working. Three are shipped at the size the game actually draws them, because the masters
# are several times larger than anything on the 640 x 360 canvas:
#   stage-city     drawn at exactly 768 x 432 with smoothing off, so it is point-sampled to that
#                  size here: the same gritty pixels the game picked out of the full picture.
#   boss-warden    drawn about 64 px wide, smoothed; 384 wide is what the other bosses ship at.
#   player-sheet   cells drawn 48 x 64 (the dash after-images); a quarter keeps them at 2x.
# The code reads source rectangles relative to each picture's own width, so either size works.
#
# Run it again whenever one of the source images changes. tools/build-release.cjs reads what
# this produces and fails loudly if anything is missing or older than its source.
import base64
import io
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'web')

# name, quality, shipped size (None keeps the master's), resampling. The two full-screen backdrops
# carry gradients and need a little more quality. player-idle-v2.png is no longer shipped: nothing
# in the game draws it (see run-rig-v6.js, o.spriteIdle).
IMAGES = [
    ('title-art.png', 92, None, None),
    ('stage-city.png', 92, (768, 432), Image.NEAREST),
    ('boss-warden.png', 92, (384, 256), Image.LANCZOS),
    ('enemy-atlas-v2.png', 92, None, None),
    ('player-sheet.png', 92, (384, 256), Image.LANCZOS),
    ('player-saber-v2.png', 92, None, None),
    ('saber-turn-atlas.png', 92, None, None),
]
# The run atlas is a PNG carried as base64 inside an SVG that applies a chroma-key filter.
# Only the payload changes; the wrapper, its size and the filter stay byte-for-byte.
SVG = ('player-run-v4.svg', 94)


def report(name, before, after):
    cut = 100 - after * 100 // max(before, 1)
    print('%-24s %6dK -> %5dK  (-%d%%)' % (name, before // 1024, after // 1024, cut))


def main(only):
    os.makedirs(OUT, exist_ok=True)
    before_total = after_total = 0
    known = [entry[0] for entry in IMAGES] + [SVG[0]]
    for name in only:
        if name not in known:
            sys.exit('%s is not one of: %s' % (name, ', '.join(known)))

    for name, quality, size, resample in IMAGES:
        if only and name not in only:
            continue
        src = os.path.join(ROOT, 'assets', name)
        dst = os.path.join(OUT, os.path.splitext(name)[0] + '.webp')
        image = Image.open(src).convert('RGBA')
        target = size or image.size
        if size:
            image = image.resize(size, resample)
        image.save(dst, 'WEBP', quality=quality, method=6)
        check = Image.open(dst)
        if check.size != target:
            sys.exit('%s came out %s, expected %s' % (name, check.size, target))
        before, after = os.path.getsize(src), os.path.getsize(dst)
        before_total += before
        after_total += after
        report(name, before, after)

    name, quality = SVG
    if only and name not in only:
        print('')
        report('TOTAL', before_total, after_total)
        return
    src = os.path.join(ROOT, 'assets', name)
    dst = os.path.join(OUT, name)
    svg = io.open(src, 'r', encoding='utf-8').read()
    match = re.search(r'href="data:image/png;base64,([^"]+)"', svg)
    if not match:
        sys.exit('%s no longer carries a base64 PNG' % name)
    inner = Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert('RGBA')
    packed = io.BytesIO()
    inner.save(packed, 'WEBP', quality=quality, method=6)
    encoded = base64.b64encode(packed.getvalue()).decode('ascii')
    head = svg[:match.start(1) - len('data:image/png;base64,')]
    rebuilt = head + 'data:image/webp;base64,' + encoded + svg[match.end(1):]
    io.open(dst, 'w', encoding='utf-8', newline='\n').write(rebuilt)
    before, after = os.path.getsize(src), os.path.getsize(dst)
    before_total += before
    after_total += after
    report(name + ' (inner)', before, after)

    print('')
    report('TOTAL', before_total, after_total)


if __name__ == '__main__':
    main(sys.argv[1:])
