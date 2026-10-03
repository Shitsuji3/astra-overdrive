// Actual body-only draws for visual review of right-hand saber / left-arm buster in every pose.
// Weapon identity is checked visually in the board, not inferred from a Canvas transform.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const folder = path.join(__dirname, process.env.RISING_ARM_QA_DIR || 'rising-arms-20261003');
fs.mkdirSync(folder, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    const errors = [], failed = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => failed.push(r.url()));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    // This inspection explicitly loads art; Playables can defer title preload until host start.
    await page.evaluate(() => AstraRenderer.preload());
    await page.waitForFunction(() => AstraSaberRig.risingReady);
    const result = await page.evaluate(async () => {
      const base = new Image(); base.src = 'assets/player-run-v4.svg'; await base.decode();
      const c = document.createElement('canvas'); c.width = 1280; c.height = 680;
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#f5f6f8'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#243a51'; ctx.font = 'bold 20px Meiryo';
      ctx.fillText('右腕：手でセイバーの柄を握る　／　左腕：バスター', 15, 28);
      const cases = [[4,.035,'引き'], [4,.085,'低い構え'], [4,.145,'振り上げ'],
        [4,.3,'空中の頂点'], [4,.67,'追い振り'], [4,.85,'腕を開く'], [5,0,'落下の構え']];
      const draws = [], nativeDraw = ctx.drawImage.bind(ctx);
      ctx.drawImage = function(img) {
        if (img.src.includes('player-rising-front-v3')) draws.push(img.src);
        return nativeDraw(...arguments);
      };
      const points = [];
      cases.forEach(([stage, phase, label], i) => {
        const x = (i % 4) * 320, y = 40 + Math.floor(i / 4) * 320;
        ctx.save(); ctx.translate(x + 160, y + 280); ctx.scale(3.5, 3.5);
        AstraSaberRig.draw(ctx, { image: base, stage, phase, facing: 1, bodyOnly: true });
        ctx.restore();
        ctx.strokeStyle = '#d4dce5'; ctx.strokeRect(x, y, 320, 320);
        ctx.fillStyle = '#243a51'; ctx.font = '16px Meiryo'; ctx.fillText(label, x + 12, y + 305);
        const p = AstraSaberRig.pose(stage, phase);
        points.push({ stage, phase, cell: p.risingFrame, hand: p.hand, hip: p.hip });
      });
      return { png: c.toDataURL(), draws, points };
    });
    assert.equal(result.draws.length, 7, 'All active poses use the corrected whole-body atlas');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    fs.writeFileSync(path.join(folder, 'arms-all-poses.png'), Buffer.from(result.png.split(',')[1], 'base64'));
    delete result.png;
    fs.writeFileSync(path.join(folder, 'arms-draw-report.json'), JSON.stringify({ ...result, errors, failed }, null, 2));
    console.log(JSON.stringify({ draws: result.draws.length, errors, failed }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
