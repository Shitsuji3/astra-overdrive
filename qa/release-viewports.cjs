// Shoots the title screen and the game at the window sizes people actually arrive with, so a
// layout that only works on a wide desktop cannot reach release unnoticed.
//
//   node server.cjs release 4174
//   node qa/release-viewports.cjs
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.RELEASE_URL || 'http://127.0.0.1:4174/';
const SIZES = [
  ['desktop 1280x720', 1280, 720, false],
  ['laptop 960x540', 960, 540, false],
  ['small 800x600', 800, 600, false],
  ['phone landscape 844x390', 844, 390, true],
  ['phone portrait 390x844', 390, 844, true]
];

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const shots = [];
    for (const [label, width, height, mobile] of SIZES) {
      const page = await br.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
      await page.goto(URL);
      await page.waitForTimeout(900);
      shots.push({ label: label + '  title', width, height, png: await page.screenshot() });
      await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
      await page.waitForTimeout(1400);
      shots.push({ label: label + '  in play', width, height, png: await page.screenshot() });
      await page.close();
    }

    // stack them into one sheet, each scaled to a common width so they can be compared
    const page = await br.newPage({ viewport: { width: 900, height: 600 } });
    await page.goto(URL);
    const sheet = await page.evaluate(async (shots) => {
      const W = 560, pad = 22, cols = 2;
      const laid = shots.map(s => ({ ...s, h: Math.round(s.height * W / s.width) }));
      const rows = [];
      for (let i = 0; i < laid.length; i += cols) rows.push(laid.slice(i, i + cols));
      const c = document.createElement('canvas');
      c.width = cols * W + (cols + 1) * 10;
      c.height = rows.reduce((sum, r) => sum + Math.max(...r.map(s => s.h)) + pad + 10, 10);
      const x = c.getContext('2d');
      x.fillStyle = '#06131c'; x.fillRect(0, 0, c.width, c.height);
      let y = 10;
      for (const row of rows) {
        const tall = Math.max(...row.map(s => s.h));
        for (let i = 0; i < row.length; i++) {
          const im = new Image(); im.src = row[i].png; await im.decode();
          const ox = 10 + i * (W + 10);
          x.fillStyle = '#eaf6ff'; x.font = '13px monospace';
          x.fillText(row[i].label, ox, y + 14);
          x.drawImage(im, ox, y + pad, W, row[i].h);
          x.strokeStyle = '#2b4b5c'; x.strokeRect(ox + .5, y + pad + .5, W - 1, row[i].h - 1);
        }
        y += tall + pad + 10;
      }
      return c.toDataURL();
    }, shots.map(s => ({ ...s, png: 'data:image/png;base64,' + s.png.toString('base64') })));
    fs.writeFileSync(path.join(__dirname, 'release-viewports.png'), Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('captured ' + shots.length + ' frames to qa/release-viewports.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
