// Photographs the rising cut at the eleven moments the user's frame sheet shows, so my own
// poses can be measured the same way the sheet was and the two compared number by number.
// The sheet is a pose sheet, not a clock, so the moments are spaced by phase through the move
// rather than copied off the reference clip's frame numbers.
//
// The factory background cannot simply be switched off, and measuring a pose against it is
// hopeless, so every frame is drawn twice - once normally and once with the hero shifted far
// off camera - and the difference between the two is the hero and the flame on their own.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);

const AT = [-0.08, -0.02, 0.05, 0.09, 0.20, 0.36, 0.52, 0.66, 0.74, 0.86, 0.98];
const W = 150, H = 200;

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(1200);

    const res = await page.evaluate(async (a) => {
      const { AT, W, H } = a;
      const canvas = document.querySelector('canvas');
      game.start({ stage: 'signal-yard' });
      const s = game.state, p = s.player;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.particles = []; s.boss = null;
      let x0 = 400;
      for (let x = 40; x < 3000; x += 10) {
        const floor = s.platforms.some(q => q.y === 310 && q.x <= x && q.x + q.w >= x + 24);
        const roof = s.platforms.some(q => q.y < 310 && q.y > 110 && q.x < x + 40 && q.x + q.w > x - 12);
        if (floor && !roof) { x0 = x; break; }
      }
      p.x = x0; p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.onGround = true;

      const c = canvas.getContext('2d');
      const box = () => [Math.round(x0 - s.camera.x - 52), 112, W, H];

      function shoot() {
        const [bx, by] = box();
        AstraRenderer.draw(c, s);
        const withHero = c.getImageData(bx, by, W, H);
        const keepX = p.x, keepT = p.saberTime;
        p.x = x0 + 90000; p.saberTime = 0;
        AstraRenderer.draw(c, s);
        const without = c.getImageData(bx, by, W, H);
        p.x = keepX; p.saberTime = keepT;
        // anything the hero changed, painted onto white
        const out = document.createElement('canvas');
        out.width = W; out.height = H;
        const od = out.getContext('2d').createImageData(W, H);
        for (let i = 0; i < W * H * 4; i += 4) {
          const d = Math.abs(withHero.data[i] - without.data[i])
                  + Math.abs(withHero.data[i + 1] - without.data[i + 1])
                  + Math.abs(withHero.data[i + 2] - without.data[i + 2]);
          const on = d > 26;
          od.data[i] = on ? withHero.data[i] : 255;
          od.data[i + 1] = on ? withHero.data[i + 1] : 255;
          od.data[i + 2] = on ? withHero.data[i + 2] : 255;
          od.data[i + 3] = 255;
        }
        out.getContext('2d').putImageData(od, 0, 0);
        return out.toDataURL();
      }

      const dt = 1 / 60, out = [];
      let t = -0.16, fired = false, i = 0;
      for (let step = 0; step < 90; step++) {
        s.camera.x = Math.max(0, x0 - 250);
        while (i < AT.length && t >= AT[i] - dt / 2) {
          out.push({ at: AT[i], png: shoot(), y: Math.round(p.y), combo: p.saberCombo || 0,
                     sT: +(p.saberTime || 0).toFixed(3) });
          i++;
        }
        if (!fired && t >= -dt / 2) {
          game.setInput('up', true); game.setInput('saber', true);
          game._tick(dt);
          game.setInput('saber', false); game.setInput('up', false);
          fired = true;
        } else {
          game._tick(dt);
        }
        t += dt;
      }

      const sh = document.createElement('canvas');
      sh.width = W * out.length; sh.height = H;
      const x = sh.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, sh.width, sh.height);
      for (let k = 0; k < out.length; k++) {
        const im = new Image(); im.src = out[k].png; await im.decode();
        x.drawImage(im, k * W, 0);
      }
      return { strip: sh.toDataURL(), log: out.map(o => ({ at: o.at, y: o.y, combo: o.combo, sT: o.sT })) };
    }, { AT, W, H });

    res.log.forEach(o => console.log(`at ${o.at.toFixed(2)}  y${o.y}  combo${o.combo}  saberTime ${o.sT}`));
    fs.writeFileSync('qa/rising-ref/mine11.png', Buffer.from(res.strip.split(',')[1], 'base64'));
    console.log(`wrote qa/rising-ref/mine11.png  (${W}x${H} cells)`);
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
