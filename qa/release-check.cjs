// Plays the built bundle the way a visitor would and proves it is fit to publish:
// nothing 404s, nothing is fetched from another site, no script errors, the art that the
// renderer needs actually decoded, and the whole thing weighs what the build said it does.
//
//   node server.cjs release 4174
//   node qa/release-check.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.RELEASE_URL || 'http://127.0.0.1:4174/';
const SHOT = path.join(__dirname, 'release-check.png');

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [], failed = [], offsite = [], bytes = new Map();
    page.on('pageerror', e => errors.push(String(e.message)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('requestfailed', r => failed.push(r.url() + ' ' + (r.failure() || {}).errorText));
    page.on('response', async r => {
      const url = r.url();
      if (!url.startsWith(URL) && !url.startsWith('data:')) offsite.push(url);
      if (r.status() >= 400) failed.push(r.status() + ' ' + url);
      try { bytes.set(url.slice(URL.length) || 'index.html', (await r.body()).length); } catch (e) {}
    });

    await page.goto(URL, { waitUntil: 'load' });
    const beforeStart = [...bytes.values()].reduce((a, b) => a + b, 0);
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(2500);

    // drive it through a kill, a drop and the whole boss fight
    const played = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const s = () => game.state;
      s().player.invuln = 1e9;
      game._roll = () => 0;
      game._killEnemy(s().enemies[0]);
      await wait(200);
      const dropped = s().pickups.filter(k => k.dropped).length;
      s().player.x = AstraCombat.arena.spawn + 60;
      await wait(600);
      if (!s().boss) return { error: 'no boss' };
      const seen = new Set();
      const want = AstraBosses.get(s().boss.id).pool.length;
      const t0 = performance.now();
      // The boss walks and rests between attacks, so only the attacks are counted, and the
      // watch runs until the whole loop has come round once.
      while (seen.size < want && performance.now() - t0 < 40000) {
        s().player.invuln = 1e9; s().boss.hp = s().boss.maxHp;
        const a = String(s().boss.attack || '');
        if (AstraCombat.bossPatterns[a]) seen.add(a);
        await wait(25);
      }
      s().boss.hp = 0;
      const t1 = performance.now();
      while (s().mode === 'playing' && performance.now() - t1 < 5000) { s().player.invuln = 1e9; await wait(30); }
      return { dropped, moves: [...seen], mode: s().mode, finale: Number(((performance.now() - t1) / 1000).toFixed(2)) };
    });

    await page.goto(URL);
    await page.waitForTimeout(800);
    fs.writeFileSync(SHOT, await page.screenshot());

    // a phone has no keyboard, so the on-screen pad has to carry the whole game
    const phone = await br.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await phone.goto(URL);
    await phone.locator('[data-action=start]').click();
    await phone.waitForTimeout(800);
    const pad = {};
    pad.visible = await phone.locator('[data-input=jump]').isVisible();
    const jumpBox = await phone.locator('[data-input=jump]').boundingBox();
    const restingY = await phone.evaluate(() => Math.round(game.state.player.y));
    await phone.touchscreen.tap(jumpBox.x + jumpBox.width / 2, jumpBox.y + jumpBox.height / 2);
    await phone.waitForTimeout(220);
    pad.tapJumped = restingY - await phone.evaluate(() => Math.round(game.state.player.y));
    await phone.waitForTimeout(900);
    const fromX = await phone.evaluate(() => game.state.player.x);
    await phone.locator('[data-input=right]').dispatchEvent('pointerdown');
    await phone.waitForTimeout(600);
    await phone.locator('[data-input=right]').dispatchEvent('pointerup');
    pad.heldMoved = Math.round(await phone.evaluate(() => game.state.player.x) - fromX);
    await phone.close();

    const total = [...bytes.values()].reduce((a, b) => a + b, 0);
    const report = {
      firstPaintKB: Math.round(beforeStart / 1024),
      totalKB: Math.round(total / 1024),
      played, pad, offsite: [...new Set(offsite)], failed, errors
    };
    console.log(JSON.stringify(report, null, 1));

    assert.deepEqual(failed, [], 'nothing fails to load');
    assert.deepEqual(report.offsite, [], 'nothing is fetched from another site');
    assert.deepEqual(errors, [], 'no script errors');
    assert.ok(!played.error, 'the arena was reachable');
    assert.equal(played.dropped, 1, 'a kill can leave a repair cell');
    assert.equal(played.moves.length, 6, `all six of the Warden's attacks ran: ${played.moves.join(', ')}`);
    assert.equal(played.mode, 'victory', 'the boss fight can be finished');
    assert.ok(played.finale > 1.8 && played.finale < 3, `the death sequence runs ${played.finale}s`);
    assert.ok(total / 1048576 < 12, `the bundle stays well inside a 30MB first load: ${(total / 1048576).toFixed(2)}MB`);
    assert.ok(pad.visible, 'the on-screen pad appears on a phone');
    assert.ok(pad.tapJumped > 25, `a quick tap jumps, not only a long press: rose ${pad.tapJumped}px`);
    assert.ok(pad.heldMoved > 60, `holding the pad moves him: ${pad.heldMoved}px`);
    console.log('release check passed; screenshot at qa/release-check.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
