// Photographs the mission select board at the sizes people actually play at, with the cursor
// moved onto a couple of different missions, so the map, the pins and the detail line can be
// checked without guessing.
//
//   node server.cjs
//   node qa/select-screen.cjs
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE
  || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const SIZES = [
  { label: 'desktop 1280x720', width: 1280, height: 720 },
  { label: 'laptop 1024x640', width: 1024, height: 640 },
  { label: 'phone landscape 844x390', width: 844, height: 390 },
  { label: 'phone portrait 390x844', width: 390, height: 844 }
];

(async () => {
  const br = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const shots = [];
  try {
    for (const size of SIZES) {
      const page = await br.newPage({ viewport: { width: size.width, height: size.height } });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(URL);
      // a record on one mission, so the cleared and the blank states are both on screen
      await page.evaluate(() => localStorage.setItem('astra-overdrive-save',
        JSON.stringify({ stage: 'magnet-spine',
          records: { 'signal-yard': { cleared: true, bestScore: 2450, bestTime: 96 },
                     'tidal-refinery': { cleared: true, bestScore: 1810, bestTime: 128 } } })));
      await page.reload();
      await page.locator('[data-action=stage-select]').click();
      await page.waitForTimeout(400);
      shots.push({ label: size.label + '  armed', size, png: await page.screenshot() });
      // walk the cursor so the map pin and the detail line have to keep up
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(120);
      }
      const on = await page.evaluate(() => {
        const lit = document.querySelectorAll('.site.on');
        const cur = document.querySelector('.stage-node.active');
        return { lit: lit.length, litId: lit[0] && lit[0].dataset.site,
          active: cur && cur.dataset.stage,
          detail: (document.querySelector('#stage-detail') || {}).textContent,
          nodes: document.querySelectorAll('.stage-node').length,
          stages: AstraStages.list.length,
          mapShown: !!document.querySelector('.select-map svg') &&
            getComputedStyle(document.querySelector('.select-map')).display !== 'none' };
      });
      console.log(`${size.label.padEnd(24)} nodes ${on.nodes}  map ${on.mapShown ? 'shown' : 'hidden'}  ` +
        `cursor ${on.active}  pin ${on.litId} (${on.lit} lit)`);
      if (on.lit !== 1 || on.litId !== on.active)
        throw new Error(`${size.label}: exactly the armed mission should be lit on the map`);
      if (on.nodes !== on.stages)
        throw new Error(`${size.label}: ${on.stages} missions exist but ${on.nodes} are on the board`);
      if (errors.length) throw new Error(`${size.label}: ${errors.join(' / ')}`);
      shots.push({ label: size.label + '  moved', size, png: await page.screenshot() });

      // where the map is on screen, its pins are a second way to reach the same missions
      if (on.mapShown) {
        await page.locator('.site[data-site="crown-vault"]').click();
        await page.waitForTimeout(150);
        const byPin = await page.evaluate(() => ({
          active: document.querySelector('.stage-node.active').dataset.stage,
          lit: document.querySelector('.site.on').dataset.site }));
        if (byPin.active !== 'crown-vault' || byPin.lit !== 'crown-vault')
          throw new Error(`${size.label}: clicking a pin should arm its mission, got ${JSON.stringify(byPin)}`);
      }

      // and the tile itself still launches the run it names
      await page.locator('.stage-node[data-stage="void-choir"]').click();
      await page.waitForTimeout(700);
      const launched = await page.evaluate(() => ({
        hidden: document.querySelector('#stage-select').hidden,
        stage: window.game && game.state && game.state.stage && game.state.stage.id }));
      if (launched.hidden !== true || launched.stage !== 'void-choir')
        throw new Error(`${size.label}: a tile should launch its stage, got ${JSON.stringify(launched)}`);
      if (errors.length) throw new Error(`${size.label}: ${errors.join(' / ')}`);
      await page.close();
    }

    // stack them into one sheet
    const page = await br.newPage({ viewport: { width: 900, height: 600 } });
    const sheet = await page.evaluate(async (shots) => {
      const pad = 22, gap = 10;
      const imgs = [];
      for (const s of shots) {
        const im = new Image(); im.src = s.png; await im.decode(); imgs.push(im);
      }
      const width = Math.max(...imgs.map(i => i.width)) * 2 + gap;
      let y = 0; const rows = [];
      for (let i = 0; i < imgs.length; i += 2) {
        rows.push({ y, h: Math.max(imgs[i].height, (imgs[i + 1] || imgs[i]).height) });
        y += rows[rows.length - 1].h + pad;
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = y;
      const x = c.getContext('2d');
      x.fillStyle = '#06131c'; x.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < imgs.length; i++) {
        const row = rows[Math.floor(i / 2)], ox = (i % 2) * (Math.max(...imgs.map(m => m.width)) + gap);
        x.drawImage(imgs[i], ox, row.y + pad);
        x.fillStyle = '#eaf6ff'; x.font = 'bold 13px monospace';
        x.fillText(shots[i].label, ox + 4, row.y + 15);
      }
      return c.toDataURL();
    }, shots.map(s => ({ label: s.label, png: 'data:image/png;base64,' + s.png.toString('base64') })));
    fs.writeFileSync('qa/select-screen.png', Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('\nwrote qa/select-screen.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
