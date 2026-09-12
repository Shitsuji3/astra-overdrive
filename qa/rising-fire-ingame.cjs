// A full game frame at the size the player actually sees, mid-rise, over the real factory.
// The plume has to read as fire there, not only in a zoomed crop on white.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(1400);

    const shots = await page.evaluate(async (at) => {
      const canvas = document.querySelector('canvas');
      game.start({ stage: 'signal-yard' });
      const s = game.state, p = s.player;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.boss = null;
      let x0 = 400;
      for (let x = 40; x < 3000; x += 10) {
        const floor = s.platforms.some(q => q.y === 310 && q.x <= x && q.x + q.w >= x + 24);
        const roof = s.platforms.some(q => q.y < 310 && q.y > 100 && q.x < x + 40 && q.x + q.w > x - 12);
        if (floor && !roof) { x0 = x; break; }
      }
      p.x = x0; p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.onGround = true;
      const dt = 1 / 60, out = [];
      let t = 0, i = 0, fired = false;
      for (let step = 0; step < 80; step++) {
        s.camera.x = Math.max(0, x0 - 250);
        while (i < at.length && t >= at[i] - dt / 2) {
          AstraRenderer.draw(canvas.getContext('2d'), s);
          out.push(canvas.toDataURL());
          i++;
        }
        if (!fired) {
          game.setInput('up', true); game.setInput('saber', true);
          game._tick(dt);
          game.setInput('saber', false); game.setInput('up', false);
          fired = true;
        } else game._tick(dt);
        t += dt;
      }
      const sh = document.createElement('canvas');
      sh.width = 640 * 2; sh.height = 360 * 2;
      const c = sh.getContext('2d');
      for (let k = 0; k < out.length && k < 4; k++) {
        const im = new Image(); im.src = out[k]; await im.decode();
        c.drawImage(im, (k % 2) * 640, Math.floor(k / 2) * 360);
      }
      return sh.toDataURL();
    }, [0.18, 0.34, 0.50, 0.68]);

    fs.writeFileSync('qa/rising-ref/in-game.png', Buffer.from(shots.split(',')[1], 'base64'));
    console.log('wrote qa/rising-ref/in-game.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
