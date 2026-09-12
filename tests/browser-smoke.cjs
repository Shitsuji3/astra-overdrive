// Optional integration QA: provide Playwright via PLAYWRIGHT_PACKAGE or npm.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const root = path.resolve(__dirname, '..');
const url = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const screenshotDir = path.join(root, 'qa');

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(5000);
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  function checked(name, condition) { assert.ok(condition, name); checks.push(name); }
  try {
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.goto(url);
    checked('clean title screen', await page.locator('#title').isVisible() && !await page.locator('#modal').isVisible());
    await page.screenshot({ path: path.join(screenshotDir, 'title.png') });
    await page.keyboard.press('ArrowDown');
    // CONTINUE is hidden, so one step down from START MISSION lands on the stage select
    checked('menu skips hidden items', await page.evaluate(() => document.activeElement.dataset.action === 'stage-select'));
    await page.keyboard.press('ArrowDown');
    checked('menu keeps walking to the guide', await page.evaluate(() => document.activeElement.dataset.action === 'guide'));
    await page.keyboard.press('Enter');
    checked('keyboard opens guide', await page.locator('#modal').isVisible());
    await page.keyboard.press('Escape');
    await page.locator('[data-action=start]').click();
    await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
    checked('keyboard movement', await page.evaluate(() => game.state.player.x > 110));
    await page.keyboard.down(' '); await page.waitForTimeout(160); await page.keyboard.up(' ');
    checked('keyboard jump', await page.evaluate(() => game.state.player.y < 255));
    await page.keyboard.press('Escape');
    const time = await page.evaluate(() => game.state.timeElapsed);
    await page.waitForTimeout(100);
    checked('pause freezes simulation', await page.evaluate(t => game.state.mode === 'paused' && game.state.timeElapsed === t, time));
    await page.locator('#overlay [data-action=settings]').click();
    await page.keyboard.press('Escape');
    checked('settings Escape keeps game paused', await page.evaluate(() => game.state.mode === 'paused' && !document.querySelector('#overlay').hidden && document.querySelector('#modal').hidden));
    await page.keyboard.press('Escape');
    checked('keyboard resume clears overlay', await page.evaluate(() => game.state.mode === 'playing' && document.querySelector('#overlay').hidden));
    await page.keyboard.down('j'); await page.waitForTimeout(1300);
    checked('charge fills', await page.evaluate(() => game.state.player.charge > .95));
    await page.keyboard.up('j');
    checked('charge releases', await page.waitForFunction(() => game.state.player.charge === 0).then(() => true));
    await page.evaluate(() => { game.state.player.x = 800; game.state.player.y = 425; });
    await page.waitForFunction(() => game.state.mode === 'dead');
    checked('death opens retry', await page.locator('#overlay').isVisible());
    await page.keyboard.press('r');
    checked('keyboard retry clears overlay', await page.evaluate(() => game.state.mode === 'playing' && document.querySelector('#overlay').hidden));
    await page.screenshot({ path: path.join(screenshotDir, 'stage.png') });
    // the arena moved when the stage grew, so ask the game where it is
    await page.evaluate(() => { game.state.player.x = AstraCombat.arena.spawn + 40; });
    await page.waitForFunction(() => game.state.boss?.active);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(screenshotDir, 'boss.png') });
    // hold his wind-up so the kill step measures the victory hand-off, not his attack pool
    await page.evaluate(() => { game.state.boss.hp = 1; game.state.boss.timer = 99; });
    for (let i = 0; i < 10 && !await page.evaluate(() => game.state.mode === 'victory'); i++) {
      await page.keyboard.down('j'); await page.waitForTimeout(70);
      await page.keyboard.up('j'); await page.waitForTimeout(180);
    }
    await page.waitForFunction(() => game.state.mode === 'victory');
    checked('projectile boss kill opens victory', await page.locator('#overlay').isVisible());
    await page.screenshot({ path: path.join(screenshotDir, 'victory.png') });
    await page.locator('[data-action=replay]').click();
    checked('victory replay starts fresh mission', await page.evaluate(() => game.state.mode === 'playing' && game.state.player.x < 100 && document.querySelector('#overlay').hidden));
    await page.keyboard.press('Escape');
    await page.locator('#overlay [data-action=title]').click();
    await page.locator('[data-action=start]').click();
    const secondTime = await page.evaluate(() => game.state.timeElapsed);
    await page.waitForTimeout(150);
    checked('title then second start keeps RAF alive', await page.evaluate(t => game.state.timeElapsed > t, secondTime));
    assert.deepEqual(errors, [], 'browser has no uncaught exceptions');
    checks.push('no browser errors');
    fs.writeFileSync(path.join(screenshotDir, 'browser-results.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
