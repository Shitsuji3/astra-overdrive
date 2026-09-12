from pathlib import Path
import hashlib, json, zipfile
from datetime import datetime

root = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
snapshot = json.loads((root/'work/CURRENT-SNAPSHOT.json').read_text(encoding='utf-8-sig'))
backup = Path(snapshot['backup_path'])
assert sha(backup.read_bytes()) == snapshot['sha256'], 'Backup changed'
files = {}
for name, expected in snapshot['files_sha256'].items():
    path = root/name
    assert sha(path.read_bytes()) == expected, f'Current file changed: {name}'
    files[name] = path
for name in ['AGENTS.md', 'work/CURRENT-SNAPSHOT.json', 'work/HANDOFF-20260910.md',
             'work/handoff-20260910-tests.log', 'work/package-handoff-20260910.py']:
    files[name] = root/name
files[backup.relative_to(root).as_posix()] = backup
for folder in ['qa/saber-faithful', 'qa/saber-legs-open', 'qa/saber-motion-reference']:
    for path in (root/folder).rglob('*'):
        rel = path.relative_to(root).as_posix()
        if path.is_file() and not any(part in ['frames','before','before2','node_modules'] for part in path.parts):
            if path.suffix in ['.cjs','.js','.json','.png','.mp4','.md']:
                files[rel] = path
for pattern in ['qa/idle-redrawn*', 'work/SABER*20260910.md', 'work/IDLE-ART-20260910.md']:
    for path in root.glob(pattern):
        if path.is_file(): files[path.relative_to(root).as_posix()] = path
source = root/'qa/saber-motion-v2/source-cell.png'
if source.exists(): files[source.relative_to(root).as_posix()] = source
references = {
    'references/セイバーモーション.gif': Path('C:/Users/situz/Desktop/ゲームAstra/セイバーモーション.gif'),
    'references/idle-reference.png': Path('C:/Users/situz/Pictures/Screenshots/スクリーンショット 2026-09-09 211417.png'),
    'references/rejected-idle.png': Path('C:/Users/situz/Pictures/Screenshots/スクリーンショット 2026-09-10 171837.png'),
}
for name, path in references.items():
    assert path.is_file(), f'Missing reference: {path}'
    files[name] = path
target = root/'dist/ASTRA-HANDOFF-20260910.zip'
if target.exists(): target = target.with_name('ASTRA-HANDOFF-20260910-'+datetime.now().strftime('%H%M%S')+'.zip')
hashes = {name:sha(path.read_bytes()) for name,path in sorted(files.items())}
manifest = json.dumps(hashes,ensure_ascii=False,indent=2).encode('utf-8')
with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name,path in sorted(files.items()): z.write(path,name)
    z.writestr('HANDOFF-FILES-SHA256.json',manifest)
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for name,digest in hashes.items(): assert sha(z.read(name)) == digest, name
digest=sha(target.read_bytes())
target.with_suffix('.zip.sha256').write_text(digest+'  '+target.name+'\n',encoding='utf-8')
print(json.dumps({'zip':str(target),'files':len(files)+1,'bytes':target.stat().st_size,'sha256':digest,'baseline_files_verified':len(snapshot['files_sha256'])},ensure_ascii=False))
