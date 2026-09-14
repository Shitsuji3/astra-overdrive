// Photographs the charged thrust at the thirty moments of the user's frame sheet, laid out in the
// sheet's own rows (11, 6, 4, 4, 5), so the two can be put side by side.
// Row one is the hold: the swing the press makes, then the charge, the ready flash and the lightning,
// then the release with the light forming in the fist. Rows two to five are phases through the thrust.
// Like qa/rising-sheet-shoot.cjs, each moment is drawn twice, with and without the hero, and only what
// the hero changed is kept, painted onto light grey so the white of the ready flash and of the lance
// still shows.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);

const HOLD = [0.44, 0.52, 0.66, 0.69, 0.78, 0.88, 0.98, 1.08, 1.20];   // seconds held, row one
const RELEASE = 1.25;
const ROWS = [[0.04, 0.09], [0.14, 0.18, 0.22, 0.27, 0.30, 0.34], [0.40, 0.47, 0.54, 0.60],
              [0.64, 0.69, 0.74, 0.78], [0.83, 0.87, 0.91, 0.95, 1.0]];
const W = 240, H = 96;

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(1200);

    const res = await page.evaluate(async (a) => {
      const { HOLD, RELEASE, ROWS, W, H } = a;
      const canvas = document.querySelector('canvas');
      game.start({ stage: 'signal-yard' });
      const s = game.state, p = s.player;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.particles = []; s.boss = null;
      let x0 = 400;
      for (let x = 60; x < 3000; x += 10) {
        const floor = s.platforms.some(q => q.y === 310 && q.x <= x - 40 && q.x + q.w >= x + 150);
        const wall = s.platforms.some(q => q.y < 310 && q.y > 150 && q.x < x + 150 && q.x + q.w > x - 40);
        if (floor && !wall) { x0 = x; break; }
      }
      p.x = x0; p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.onGround = true;
      const c = canvas.getContext('2d');

      function shoot() {
        s.camera.x = Math.max(0, x0 - 250);
        const bx = Math.round(x0 - s.camera.x - 48), by = 222;
        AstraRenderer.draw(c, s);
        const withHero = c.getImageData(bx, by, W, H);
        const keepX = p.x;
        p.x = x0 + 90000;
        AstraRenderer.draw(c, s);
        const without = c.getImageData(bx, by, W, H);
        p.x = keepX;
        const out = document.createElement('canvas');
        out.width = W; out.height = H;
        const od = out.getContext('2d').createImageData(W, H);
        for (let i = 0; i < W * H * 4; i += 4) {
          const d = Math.abs(withHero.data[i] - without.data[i]) + Math.abs(withHero.data[i + 1] - without.data[i + 1])
                  + Math.abs(withHero.data[i + 2] - without.data[i + 2]);
          const on = d > 26;
          for (let k = 0; k < 3; k++) od.data[i + k] = on ? withHero.data[i + k] : 200;
          od.data[i + 3] = 255;
        }
        out.getContext('2d').putImageData(od, 0, 0);
        return out.toDataURL();
      }

      const dt = 1 / 60, span = AstraCombat.thrust.span, shots = [], log = [];
      // row one: the hold
      let held = 0, h = 0;
      game.setInput('saber', true);
      while (held < RELEASE - dt / 2) {
        game._tick(dt); held += dt;
        while (h < HOLD.length && held >= HOLD[h] - dt / 2) {
          shots.push(shoot());
          log.push(`hold ${HOLD[h].toFixed(2)}s  charge ${(p.saberCharge || 0).toFixed(2)}  shown ${AstraCombat.saberChargeShown(p).toFixed(2)}  combo ${p.saberCombo}`);
          h++;
        }
      }
      game.setInput('saber', false);
      game._tick(dt);
      log.push(`released: combo ${p.saberCombo}  saberTime ${p.saberTime.toFixed(3)}`);
      // the thrust
      const moments = [].concat(...ROWS);
      let m = 0, x = p.x;
      for (let step = 0; step < 90 && m < moments.length; step++) {
        const phase = p.saberCombo === 6 ? (span - p.saberTime) / span : 1;
        while (m < moments.length && phase >= moments[m] - dt / span / 2) {
          shots.push(shoot());
          log.push(`t ${moments[m].toFixed(2)}  x+${(p.x - x).toFixed(1)}  combo ${p.saberCombo}`);
          m++;
        }
        game._tick(dt);
      }

      const rows = [HOLD.length + ROWS[0].length].concat(ROWS.slice(1).map(r => r.length));
      const cols = Math.max(...rows);
      const sh = document.createElement('canvas');
      sh.width = W * cols; sh.height = H * rows.length;
      const g2 = sh.getContext('2d');
      g2.fillStyle = '#c8c8c8'; g2.fillRect(0, 0, sh.width, sh.height);
      let k = 0;
      for (let r = 0; r < rows.length; r++) {
        for (let q = 0; q < rows[r]; q++, k++) {
          if (k >= shots.length) break;
          const im = new Image(); im.src = shots[k]; await im.decode();
          g2.drawImage(im, q * W, r * H);
        }
      }
      return { sheet: sh.toDataURL(), log };
    }, { HOLD, RELEASE, ROWS, W, H });

    res.log.forEach(l => console.log(l));
    fs.mkdirSync('qa/thrust-ref', { recursive: true });
    fs.writeFileSync('qa/thrust-ref/mine30.png', Buffer.from(res.sheet.split(',')[1], 'base64'));
    console.log(`wrote qa/thrust-ref/mine30.png  (${W}x${H} cells)  page errors ${errors.length}`);
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
