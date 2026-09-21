// The menus answer a gamepad the way they answer the keyboard. A fake standard pad is put behind
// navigator.getGamepads before the page loads; each step holds a button for a few frames and lets it go.
// Covers the title, stage select, the guide, settings, starting a mission, the pause panel with settings
// open over it, the failure panel, and aborting back to the title.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(5000);
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = (name, ok) => { assert.ok(ok, name); checks.push(name); };
  await page.addInitScript(() => {
    const pad = { id: 'fake standard pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
  });
  const BTN = { a: 0, b: 1, start: 9, up: 12, down: 13, left: 14, right: 15 };
  const hold = (name, down) => page.evaluate(([i, d]) => { const b = window.__pad.buttons[i]; b.pressed = d; b.value = d ? 1 : 0; }, [BTN[name], down]);
  async function tap(name) { await hold(name, true); await page.waitForTimeout(90); await hold(name, false); await page.waitForTimeout(140); }
  const focused = () => page.evaluate(() => { const el = document.activeElement; return el ? (el.dataset.action || el.id || '') : ''; });
  const shown = sel => page.locator(sel).isVisible();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('astra-overdrive-save') || '{}'));

  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    check('title is up', await shown('#title'));
    check('boss rush is primary',await focused()==='boss-rush');
    check('title has two choices',await page.locator('#title .menu-item').count()===2);
    await tap('down');await tap('a');
    check('pad opens settings and controls',await focused()==='guide');await tap('a');
    check('pad opens guide',await shown('#modal'));await tap('b');
    check('guide back returns to help choices',await focused()==='guide');await tap('down');
    check('pad reaches settings', await focused() === 'settings');
    await tap('a');
    check('pad A opens settings', await shown('#modal') && await shown('#music'));
    await tap('down');
    check('pad down focuses the first setting', await focused() === 'music');
    check('the focused setting is marked', await page.evaluate(() => document.activeElement.classList.contains('pad-focus')));
    const m0 = await page.evaluate(() => +document.querySelector('#music').value);
    await tap('right');
    const m1 = Math.min(100, m0 + 5);
    check('pad right turns BGM up and saves it', await page.evaluate(v => +document.querySelector('#music').value === v, m1)
      && Math.abs((await saved()).music - m1 / 100) < 1e-9);
    await tap('left');
    check('pad left turns it back down', await page.evaluate(v => +document.querySelector('#music').value === v, m0));
    await tap('down'); await tap('down');
    check('pad reaches MUTE', await focused() === 'mute');
    const muted = await page.evaluate(() => document.querySelector('#mute').checked);
    await tap('a');
    check('pad A toggles MUTE', await page.evaluate(w => document.querySelector('#mute').checked === !w, muted));
    await tap('a');
    await tap('b');
    check('settings back returns to help choices',await shown('#modal')&&await focused()==='guide');
    await tap('b');

    await tap('up');
    await hold('a', true);await page.waitForTimeout(120);
    check('nothing starts while A is down',await shown('#title'));
    await hold('a', false); await page.waitForTimeout(300);
    check('pad A starts the mission when let go', await page.evaluate(() => !!window.game && game.state.mode === 'playing' && document.querySelector('#title').hidden));
    await page.evaluate(() => { game.state.enemies = []; });
    check('the A that started it is not a jump', await page.evaluate(() => game.state.player.onGround && game.state.player.vy >= 0));

    await tap('start');
    check('pad Start pauses', await page.evaluate(() => game.state.mode === 'paused') && await shown('#overlay'));
    check('and letting Start go does not act on the pause panel', await page.evaluate(() => game.state.mode === 'paused'));
    await tap('down'); await tap('down');
    check('pad walks the pause panel', await focused() === 'guide');
    await tap('down'); await tap('a');
    check('pad opens settings over the pause panel', await shown('#modal'));
    await tap('start');
    check('Start with settings open closes settings and keeps the pause', !await shown('#modal') && await page.evaluate(() => game.state.mode === 'paused'));
    await tap('b');
    check('pad B resumes from the pause panel', await page.evaluate(() => game.state.mode === 'playing') && !await shown('#overlay'));
    check('the B that resumed it is not a dash', await page.evaluate(() => !(game.state.player.dashCooldown > 0)));

    await page.evaluate(() => { game.state.player.x = 800; game.state.player.y = 425; });
    await page.waitForFunction(() => game.state.mode === 'dead');
    await page.locator('#overlay').waitFor({state:'visible'});
    await tap('a');
    check('pad A on the failure panel retries', await page.evaluate(() => game.state.mode === 'playing') && !await shown('#overlay'));

    await tap('start'); await tap('up');
    check('pad up from nothing lands on ABORT, the last button', await focused() === 'title');
    await tap('a');
    check('pad A on ABORT returns to the title', await shown('#title') && await focused() === 'boss-rush');

    assert.deepEqual(errors, []);
    checks.push('no browser errors');
    console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
