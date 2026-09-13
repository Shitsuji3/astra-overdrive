// The charged thrust at game size, over the factory, the way a player sees it: charging, the orb
// driven out, and the lance. Each moment is a 320x120 crop around the hero, doubled with no smoothing
// and stacked into qa/thrust-ref/in-game.png.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(1200);

    const res = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      game.start({ stage: 'signal-yard' });
      const s = game.state, p = s.player;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.particles = []; s.boss = null;
      let x0 = 400;
      for (let x = 60; x < 3000; x += 10) {
        const floor = s.platforms.some(q => q.y === 310 && q.x <= x - 40 && q.x + q.w >= x + 180);
        const wall = s.platforms.some(q => q.y < 310 && q.y > 150 && q.x < x + 180 && q.x + q.w > x - 40);
        if (floor && !wall) { x0 = x; break; }
      }
      p.x = x0; p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.onGround = true;
      const c = canvas.getContext('2d'), dt = 1 / 60, span = AstraCombat.thrust.span, crops = [];

      function grab(label) {
        s.camera.x = Math.max(0, x0 - 250);
        AstraRenderer.draw(c, s);
        const sx = Math.round(x0 - s.camera.x - 70), sy = 196;
        const out = document.createElement('canvas');
        out.width = 640; out.height = 240;
        const o = out.getContext('2d');
        o.imageSmoothingEnabled = false;
        o.drawImage(canvas, sx, sy, 320, 120, 0, 0, 640, 240);
        o.fillStyle = '#000'; o.fillRect(0, 0, 250, 18);
        o.fillStyle = '#fff'; o.font = '12px monospace'; o.fillText(label, 6, 13);
        crops.push(out);
      }

      game.setInput('saber', true);
      for (let i = 0; i < 60; i++) game._tick(dt);
      grab('holding 1.00s: charging');
      game.setInput('saber', false);
      game._tick(dt);
      const at = [[0.23, 'released: orb driven out'], [0.50, 'lance']];
      let k = 0;
      for (let i = 0; i < 90 && k < at.length; i++) {
        const phase = p.saberCombo === 6 ? (span - p.saberTime) / span : 1;
        if (phase >= at[k][0] - dt / span / 2) { grab(at[k][1]); k++; }
        game._tick(dt);
      }
      const sheet = document.createElement('canvas');
      sheet.width = 640; sheet.height = 240 * crops.length;
      crops.forEach((cv, i) => sheet.getContext('2d').drawImage(cv, 0, 240 * i));
      return sheet.toDataURL();
    });

    fs.mkdirSync('qa/thrust-ref', { recursive: true });
    fs.writeFileSync('qa/thrust-ref/in-game.png', Buffer.from(res.split(',')[1], 'base64'));
    console.log(`wrote qa/thrust-ref/in-game.png  page errors ${errors.length}`);
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
