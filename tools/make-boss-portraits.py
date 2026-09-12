# Builds the square portraits the stage select shows next to each mission.
#
#   set PYTHONPATH=qa/python-deps
#   python tools/make-boss-portraits.py
#
# Reads the masters in assets/bosses/src/ and writes 240px WebP into assets/bosses/.
# The painted scene behind each machine is kept on purpose here: framed in a panel it reads as
# a briefing photograph, which is what a portrait wants. The cut-out versions in this folder
# are for the in-game sprite, which is a different job.
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'bosses', 'src')
OUT = os.path.join(ROOT, 'assets', 'bosses')
SIZE = 240

# Where the machine sits in its frame, as a fraction, so the crop lands on it rather than on
# the scenery. left, top, right, bottom.
FRAMING = {
    'warden':         (.00, .00, 1.0, 1.0),
    'tidebreaker':    (.04, .02, .96, .94),
    'coilhead':       (.03, .02, .97, .95),
    'ashmaw':         (.05, .10, .95, .92),
    'nullpriest':     (.03, .03, .97, .94),
    'gravelock':      (.02, .10, .98, .92),
    'sparkwidow':     (.02, .05, .98, .93),
    'obsidian-crown': (.02, .06, .98, .93),
}


def portrait(name):
    source = os.path.join(SRC, name + '.png')
    im = Image.open(source).convert('RGB')
    w, h = im.size
    l, t, r, b = FRAMING[name]
    box = im.crop((int(w * l), int(h * t), int(w * r), int(h * b)))
    # Fit the whole frame into the square rather than cropping to it: a claw or a tail sliced
    # off reads as a mistake. The bars are filled from the frame's own corner colour, which is
    # the dark of the factory, so they disappear into the panel.
    bw, bh = box.size
    scale = SIZE / max(bw, bh)
    fitted = box.resize((max(1, round(bw * scale)), max(1, round(bh * scale))), Image.LANCZOS)
    corner = box.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    square = Image.new('RGB', (SIZE, SIZE), corner)
    square.paste(fitted, ((SIZE - fitted.width) // 2, (SIZE - fitted.height) // 2))
    box = square
    target = os.path.join(OUT, name + '-portrait.webp')
    box.save(target, 'WEBP', quality=88, method=6)
    return os.path.getsize(target)


if __name__ == '__main__':
    total = 0
    for name in FRAMING:
        size = portrait(name)
        total += size
        print('%-16s %5dK' % (name, size // 1024 or 1))
    print('%-16s %5dK total' % ('', total // 1024))
