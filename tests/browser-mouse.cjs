const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(5000);
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
  const fresh = () => page.evaluate(() => {
    game.start();
    game.state.player.x = 100;
    game.state.enemies = [];
    game.state.pickups = [];
  });
  const target = (distance = 35) => page.evaluate(distance => {
    const x = game.state.player.x + distance;
    game.state.enemies = [{ id: 90, type: 'turret', x, y: 276,
      baseX: x, baseY: 276, w: 30, h: 34, hp: 10, maxHp: 10,
      facing: -1, flash: 0, fireTimer: 999, dead: false }];
  }, distance);
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=start]').click();
    const bounds = await page.locator('canvas').boundingBox();
    const mx = bounds.x + bounds.width / 2, my = bounds.y + bounds.height / 2;
    await fresh(); await target();
    await page.mouse.click(mx, my);
    await page.waitForTimeout(150);
    check('short left click deals exactly 1 normal damage', await page.evaluate(() => game.state.enemies[0].hp === 9 && game.state.shots === 1));

    await fresh(); await target();
    await page.evaluate(() => {
      document.querySelector('canvas').addEventListener('contextmenu', e => { window.mouseMenuBlocked = e.defaultPrevented; });
    });
    // the cut lands where the blade swings out, not on the click, so wait for it to arrive
    const lands = hp => page.waitForFunction(want => game.state.enemies[0].hp === want, hp)
      .then(() => true).catch(() => false);
    await page.mouse.click(mx, my, { button: 'right' });
    check('right click deals exactly 4.5 damage', await lands(5.5));
    check('right click suppresses canvas context menu', await page.evaluate(() => window.mouseMenuBlocked === true));
    await page.waitForTimeout(300);
    await page.mouse.click(mx, my, { button: 'right' });
    check('right click can retrigger without rounding damage', await lands(1));

    await fresh(); await page.mouse.move(mx, my); await page.mouse.down();
    await page.waitForTimeout(1300);
    check('left hold fires nothing and charges nothing', await page.evaluate(() => game.state.shots === 0 && game.state.bullets.length === 0 && !(game.state.player.charge > 0)));
    await page.evaluate(() => { game.state.bullets = []; }); await target(160);
    await page.mouse.up(); await page.waitForTimeout(500);
    check('long mouse release deals 1 normal damage', await page.evaluate(() => game.state.enemies[0].hp === 9));
    check('release emits exactly one plain shot', await page.evaluate(() => game.state.shots === 1));

    await fresh(); await page.mouse.move(mx, my); await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.move(2, 895); await page.mouse.up(); await page.waitForTimeout(50);
    check('release outside canvas ends the held button', await page.evaluate(() => !game.mouseInput.shoot));

    await fresh(); await target(); await page.mouse.move(mx, my); await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.down({ button: 'right' }); await page.waitForTimeout(50);
    await page.mouse.up({ button: 'right' });
    check('right click while holding left preserves the held left button', await page.evaluate(() => game.mouseInput.shoot));
    await page.mouse.up();

    await fresh(); await page.mouse.move(mx, my); await page.mouse.down();
    await page.waitForTimeout(700); await page.keyboard.press('Escape'); await page.mouse.up();
    const pausedShots = await page.evaluate(() => game.state.shots);
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    check('pause cancels a held mouse button without phantom shots', await page.evaluate(n => game.state.shots === n && !game.mouseInput.shoot, pausedShots));

    await fresh();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    });
    await page.waitForTimeout(60);
    check('sub-frame mouse tap is not lost', await page.evaluate(() => game.state.shots === 1));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
