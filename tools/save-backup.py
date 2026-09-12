# Saves a restorable copy of the game and records where it went.
#
#   set PYTHONPATH=qa/python-deps
#   python tools/save-backup.py <label>
#
# Packs every tracked working file into dist/history/ASTRA-OVERDRIVE-<label>-<stamp>.zip,
# re-reads the zip to prove each entry matches the file it came from, and rewrites
# work/CURRENT-SNAPSHOT.json to point at it. Earlier backups are never touched, which is what
# makes rolling back to any of them possible.
#
# The file list is taken from the working tree, not from the previous snapshot, so a file added
# since the last save is included rather than silently left out.
import hashlib
import json
import os
import sys
import zipfile
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JST = timezone(timedelta(hours=9))

# Folders that hold output rather than the game: rebuilding them is cheaper than storing them.
SKIP_DIRS = {'.git', 'node_modules', 'release', 'dist', 'qa', '.claude'}
SKIP_SUFFIX = {'.zip', '.log', '.bak'}
# Small enough to keep, and the only things under qa/ worth restoring.
KEEP_QA = ('.cjs', '.py')
SELF = 'work/CURRENT-SNAPSHOT.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def collect():
    files = {}
    for folder, dirs, names in os.walk(ROOT):
        rel_dir = os.path.relpath(folder, ROOT).replace(os.sep, '/')
        if rel_dir == '.':
            rel_dir = ''
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in names:
            rel = (rel_dir + '/' + name) if rel_dir else name
            if os.path.splitext(name)[1] in SKIP_SUFFIX:
                continue
            files[rel] = os.path.join(folder, name)
    for name in sorted(os.listdir(os.path.join(ROOT, 'qa'))):
        if name.endswith(KEEP_QA):
            files['qa/' + name] = os.path.join(ROOT, 'qa', name)
    return dict(sorted(files.items()))


def main(label):
    stamp = datetime.now(JST).strftime('%Y%m%d-%H%M%S')
    history = os.path.join(ROOT, 'dist', 'history')
    os.makedirs(history, exist_ok=True)
    target = os.path.join(history, 'ASTRA-OVERDRIVE-%s-%s.zip' % (label, stamp))
    if os.path.exists(target):
        raise SystemExit('refusing to overwrite ' + target)

    files = collect()
    digests = {}
    with zipfile.ZipFile(target, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for rel, path in files.items():
            with open(path, 'rb') as fh:
                data = fh.read()
            digests[rel] = sha(data)
            z.writestr(rel, data)

    # read it back rather than trusting the write
    with zipfile.ZipFile(target) as z:
        if z.testzip() is not None:
            raise SystemExit('zip is damaged')
        for rel, digest in digests.items():
            if sha(z.read(rel)) != digest:
                raise SystemExit('mismatch in backup: ' + rel)

    with open(target, 'rb') as fh:
        zip_digest = sha(fh.read())
    # The record cannot hold its own hash: it is written after the zip is sealed, so the copy
    # inside the zip is always the previous one. Leaving it out keeps every listed hash true.
    listed = {rel: digest for rel, digest in digests.items() if rel != SELF}
    snapshot = {
        'saved_at': datetime.now(JST).isoformat(),
        'backup_path': target,
        'sha256': zip_digest,
        'file_count': len(files),
        'files_sha256': listed,
    }
    with open(os.path.join(ROOT, 'work', 'CURRENT-SNAPSHOT.json'), 'w', encoding='utf-8') as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    kept = len([n for n in os.listdir(history) if n.endswith('.zip')])
    print(json.dumps({'zip': target, 'files': len(files), 'verified': len(digests),
                      'bytes': os.path.getsize(target), 'sha256': zip_digest,
                      'backups_kept': kept}, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'save')
