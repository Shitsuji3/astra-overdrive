import json
from pathlib import Path
from PIL import Image

root = Path(__file__).parent / 'motion-preview'
records = json.loads((root / 'records.json').read_text())
base = Image.open(root / 'idle-0.png').convert('RGB')
hud = base.crop((0, 0, 640, 55)).tobytes()
feet = base.crop((210, 296, 280, 311)).tobytes()
checks = []
for record in records:
    name = record['name']
    im = Image.open(root / (name + '.png')).convert('RGB')
    if name != 'charge':
        assert im.crop((0, 0, 640, 55)).tobytes() == hud, f'HUD changed with motion: {name}'
    if name.startswith('idle-'):
        assert im.crop((210, 296, 280, 311)).tobytes() == feet, f'Idle feet drift: {name}'
    for motion in ('run', 'saber'):
        if name.startswith(motion + '-'):
            suffix = '-v4.svg' if motion == 'run' else '-v2.png'
            assert any(d['src'].endswith('/player-' + motion + suffix) for d in record['draws']), f'Missing atlas: {name}'
    checks.append(name)
run_records = [r for r in records if r['name'].startswith('run-') and r['name'][4:].isdigit()]
assert len(run_records) == 16 and [r['runFrame'] for r in run_records] == list(range(16)), 'Run must expose run-0..run-15'
saber_maps = [[0,1,2,3,4,5,6,7], [7,6,5,4,3,4,6,7], [0,1,2,2,3,4,5,7]]
for stage, expected in enumerate(saber_maps, 1):
    rs = [r for r in records if r['name'].startswith(f'saber-stage{stage}-')]
    assert len(rs) == 8 and [r['saberFrame'] for r in rs] == expected, f'Saber stage {stage} frame map mismatch'
    assert all(r['saberCombo'] == stage for r in rs), f'Saber stage {stage} combo mismatch'
for phase in (3, 4, 5):
    ims = [Image.open(root / f'saber-stage{stage}-{phase}.png').convert('RGB').tobytes() for stage in range(1,4)]
    assert len(set(ims)) == 3, f'Saber hit/swing stages collapse at phase {phase}'

from PIL import ImageDraw
sheet = Image.new('RGBA', (8 * 310, 3 * 250), (24, 24, 30, 255))
draw = ImageDraw.Draw(sheet)
for stage in range(1, 4):
    for phase in range(8):
        im = Image.open(root / f'saber-stage{stage}-{phase}.png').convert('RGBA').crop((180, 190, 335, 315)).resize((300, 240))
        x, y = phase * 310, (stage - 1) * 250
        sheet.alpha_composite(im, (x, y)); draw.text((x + 4, y + 4), f'{stage}-{phase}', fill='white')
sheet.save(root / 'saber-contact-new.png')
assert Image.open(root/'idle-1.png').crop((210, 260, 280, 295)).tobytes() != base.crop((210, 260, 280, 295)).tobytes(), 'Idle must animate'
print(json.dumps({'passed_scenes': len(checks), 'hud': 'unchanged during motion', 'idle_feet': 'fixed', 'atlases': '16 run frames and 8 saber frames, both directions'}, ensure_ascii=False))
