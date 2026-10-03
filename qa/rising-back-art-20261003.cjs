// Inspect the actual full-body atlas route, hilt attachment, reference key poses and first-swing preload.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const folder = path.join(__dirname, process.env.RISING_ART_QA_DIR || 'rising-body-20261003');
fs.mkdirSync(folder, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const failed = [];
    page.on('requestfailed', request => failed.push(request.url()));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.waitForFunction(() => AstraSaberRig.risingReady);
    const report = await page.evaluate(async reference => {
      const source = new Image(); source.src = 'assets/player-run-v4.svg'; await source.decode();
      const ref = new Image(); ref.src = reference; await ref.decode();
      const cvs = document.createElement('canvas'); cvs.width = 1280; cvs.height = 1030;
      const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false;
      c.fillStyle = '#f5f6f8'; c.fillRect(0, 0, cvs.width, cvs.height);
      const cases = [
        { phase: .035, range: [79, 121], foot: 103, name: '後ろへ引く' },
        { phase: .085, range: [128, 173], foot: 142, name: '低く構える' },
        { phase: .145, range: [179, 223], foot: 188, name: '振り上げ' },
        { phase: .46, range: [277, 323], foot: 286, name: '脚を伸ばして上昇' }
      ];
      const rows = ['参考の動作', '専用コマ：体のみ', 'ゲーム内描画：炎を接続'];
      let drawCount = 0, legacyCount = 0;
      const drawImage = c.drawImage.bind(c), rigid = AstraRunRig.rigidPart;
      c.drawImage = function (img) {
        if (img.src && img.src.includes('player-rising-front-')) drawCount++;
        return drawImage.apply(null, arguments);
      };
      AstraRunRig.rigidPart = function () { legacyCount++; return rigid.apply(this, arguments); };
      for (let row = 0; row < 3; row++) {
        c.fillStyle = '#243a51'; c.font = 'bold 19px Meiryo, sans-serif'; c.fillText(rows[row], 10, row * 310 + 26);
        for (let i = 0; i < cases.length; i++) {
          const item = cases[i], x = i * 320, y = row * 310 + 30;
          const height = row === 2 ? 355 : 255;
          c.save(); c.beginPath(); c.rect(x, y, 320, height); c.clip();
          if (row === 0) {
            const [l, r] = item.range, scale = 4.1;
            c.drawImage(ref, l, 0, r - l, 68, x + 140 + (l - item.foot) * scale, y + 248 - 60 * scale, (r - l) * scale, 68 * scale);
          } else {
            c.translate(x + (row === 2 ? 140 : 125), y + (row === 2 ? 330 : 248));
            c.scale(row === 2 ? 2.5 : 3.7, row === 2 ? 2.5 : 3.7);
            AstraSaberRig.draw(c, { image: source, stage: 4, phase: item.phase, facing: 1, bodyOnly: row === 1 });
          }
          c.restore(); c.strokeStyle = '#d4dce5'; c.strokeRect(x, y, 320, height);
          c.fillStyle = '#243a51'; c.font = '16px Meiryo, sans-serif'; c.fillText(item.name, x + 8, row * 310 + (row === 2 ? 403 : 303));
        }
      }
      AstraRunRig.rigidPart = rigid;
      const attachment = [];
      // Every drawn sprite's hilt must coincide with its fire root before the deliberate release.
      for (const t of [.02, .085, .20, .46, .62]) {
        const p = AstraSaberRig.pose(4, t), f = AstraSaberRig.plume(p);
        const dx = p.hand.x - p.hip.x, dy = p.hand.y - p.hip.y;
        const h = { x: p.hip.x + dx * Math.cos(p.spin) - dy * Math.sin(p.spin), y: p.hip.y + dx * Math.sin(p.spin) + dy * Math.cos(p.spin) };
        attachment.push({ t, frame: p.risingFrame, gap: Math.hypot(h.x - f.root.x, h.y - f.root.y), back: p.backTurn });
      }
      const detached = AstraSaberRig.plume(AstraSaberRig.pose(4, .85));
      const open = AstraSaberRig.pose(4, .85);
      const directions = [];
      for (const facing of [1, -1]) for (const t of [.145, .46, .67, .85]) {
        const p = AstraSaberRig.pose(4, t);
        // Read the transform of the actual sprite draw, not just the mirror property.
        c.drawImage = function (img) {
          if (img.src && img.src.includes('player-rising-front-')) directions.push({ facing, t, xAxis: Math.sign(c.getTransform().a), back: p.backTurn });
          return drawImage.apply(null, arguments);
        };
        c.save(); c.translate(-1000, -1000);
        AstraSaberRig.draw(c, { image: source, stage: 4, phase: t, facing, bodyOnly: true });
        c.restore();
      }
      return { board: cvs.toDataURL(), drawCount, legacyCount, attachment,
        directions,
        detachedGap: Math.hypot(open.hand.x - detached.root.x, open.hand.y - detached.root.y),
        frames: Array.from({ length: 101 }, (_, i) => AstraSaberRig.pose(4, i / 100).risingFrame) };
    }, 'data:image/png;base64,' + fs.readFileSync('C:/Users/situz/Desktop/ゲームAstra/スクリーンショット 2026-09-12 191734.png').toString('base64'));
    assert.equal(report.drawCount, 8, 'Both body-only and full previews draw the new complete-body sprites');
    assert.equal(report.legacyCount, 0, 'The new pose must not reuse the old front limbs or polygon back');
    for (const a of report.attachment) { assert.ok(a.gap < .001, `Hilt/flame attachment at ${a.t}`); assert.equal(a.back, 0); }
    assert.ok(report.detachedGap > 10, 'The flame leaves the hand before the arms open');
    assert.deepEqual([...new Set(report.frames)], [0, 1, 2, 3, 4, 5, 6]);
    for (const d of report.directions) {
      assert.equal(d.back, 0, 'Use the front/side torso during the cut');
      assert.equal(d.xAxis, d.facing, 'The new source faces right; sprite and attack share one facing transform');
    }
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    fs.writeFileSync(path.join(folder, 'body-keyposes.png'), Buffer.from(report.board.split(',')[1], 'base64'));
    delete report.board;
    fs.writeFileSync(path.join(folder, 'art-report.json'), JSON.stringify({ ...report, errors, failed }, null, 2));
    console.log(JSON.stringify({ newSpriteDraws: report.drawCount, oldPartsDrawn: report.legacyCount,
      hiltGaps: report.attachment.map(a => a.gap), errors, failed }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
