# Re-encodes the shipping art as WebP at exactly the same pixel dimensions, into assets/web/.
# Nothing is resized, so every source coordinate, mask and scale in the rigs keeps working.
# The originals in assets/ are never touched; this only ever writes into assets/web/.
#
#   set PYTHONPATH=qa/python-deps
#   python tools/make-webp.py
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

# quality per image: the two full-screen backdrops carry gradients and need a little more.
IMAGES = [
    ('title-art.png', 92),
    ('stage-city.png', 92),
    ('boss-warden.png', 92),
    ('enemy-atlas-v2.png', 92),
    ('player-sheet.png', 92),
    ('player-saber-v2.png', 92),
    ('saber-turn-atlas.png', 92),
    ('player-idle-v2.png', 92),
]
# The run atlas is a PNG carried as base64 inside an SVG that applies a chroma-key filter.
# Only the payload changes; the wrapper, its size and the filter stay byte-for-byte.
SVG = ('player-run-v4.svg', 94)


def report(name, before, after):
    cut = 100 - after * 100 // max(before, 1)
    print('%-24s %6dK -> %5dK  (-%d%%)' % (name, before // 1024, after // 1024, cut))


def main():
    os.makedirs(OUT, exist_ok=True)
    before_total = after_total = 0

    for name, quality in IMAGES:
        src = os.path.join(ROOT, 'assets', name)
        dst = os.path.join(OUT, os.path.splitext(name)[0] + '.webp')
        image = Image.open(src)
        source_size = image.size
        image.convert('RGBA').save(dst, 'WEBP', quality=quality, method=6)
        check = Image.open(dst)
        if check.size != source_size:
            sys.exit('%s changed size: %s -> %s' % (name, source_size, check.size))
        before, after = os.path.getsize(src), os.path.getsize(dst)
        before_total += before
        after_total += after
        report(name, before, after)

    name, quality = SVG
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
    main()
