# Re-encodes the background music for shipping, into assets/web/. The masters in assets/ are the
# files the music was supplied as and are never touched; the development server plays those.
#
#   python tools/make-audio.py
#
# ffmpeg with LAME does the work: the one on PATH, or else the copy the imageio-ffmpeg package
# carries (pip install imageio-ffmpeg). LAME's variable bit rate at quality 5 averages about
# 130 kbps against about 190 in the supplied files; played at the game's music level, under the
# sound effects, the difference does not carry, and the two tracks shrink by about a third.
# tools/build-release.cjs ships these in place of the masters and stops if one is missing or older
# than its master.
#
# The sound effects are left alone on purpose. They are short WAV and MP3 clips embedded in
# assets/*-sound.js, and an MP3 encoder puts about 25 ms of silence in front of every clip, which
# would land the slash and impact sounds late against the hits they belong to.
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'web')
TRACKS = ['title-bgm.mp3', 'stage1-bgm.mp3']
QUALITY = '5'


def ffmpeg():
    found = shutil.which('ffmpeg')
    if found:
        return found
    try:
        import imageio_ffmpeg
    except ImportError:
        sys.exit('ffmpeg was not found. Install it, or: pip install imageio-ffmpeg')
    return imageio_ffmpeg.get_ffmpeg_exe()


def main():
    exe = ffmpeg()
    os.makedirs(OUT, exist_ok=True)
    before_total = after_total = 0
    for name in TRACKS:
        src = os.path.join(ROOT, 'assets', name)
        dst = os.path.join(OUT, name)
        subprocess.run([exe, '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
                        '-vn', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', QUALITY, dst],
                       check=True)
        before, after = os.path.getsize(src), os.path.getsize(dst)
        before_total += before
        after_total += after
        print('%-18s %6dK -> %5dK  (-%d%%)' % (name, before // 1024, after // 1024,
                                               100 - after * 100 // before))
    print('%-18s %6dK -> %5dK' % ('TOTAL', before_total // 1024, after_total // 1024))


if __name__ == '__main__':
    main()
