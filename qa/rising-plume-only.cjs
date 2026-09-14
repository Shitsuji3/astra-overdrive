// Photographs the rising cut's fire on its own - no hero, no drips - by recording the one canvas
// blit the saber rig makes of the baked fire and replaying it onto a blank sheet. The normal shots
// subtract the background but keep the hero, whose warm trim sits right at the root of the plume
// and can make the fire measure fat at the hand.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);

const AT = [-0.08, -0.02, 0.05, 0.09, 0.20, 0.36, 0.52, 0.66, 0.74, 0.86, 0.98];
const W = 150, H = 200;

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(1400);

    const strip = await page.evaluate(async (a) => {
      const AT = a.AT, W = a.W, H = a.H;
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

      // Record canvas-to-canvas blits made while the saber rig is drawing. Inside the rig the only
      // offscreen canvas ever blitted is the baked fire; the armour comes from image atlases.
      let inRig = false, rec = [];
      const origDraw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (img) {
        if (inRig && img instanceof HTMLCanvasElement && img !== this.canvas) {
          rec.push({ img: img, m: this.getTransform(), args: Array.prototype.slice.call(arguments, 1),
                     alpha: this.globalAlpha });
        }
        return origDraw.apply(this, arguments);
      };
      const rigDraw = AstraSaberRig.draw;
      AstraSaberRig.draw = function () {
        inRig = true;
        try { return rigDraw.apply(this, arguments); } finally { inRig = false; }
      };

      const main = canvas.getContext('2d');
      function shoot() {
        rec = [];
        AstraRenderer.draw(main, s);
        const sheet = document.createElement('canvas');
        sheet.width = canvas.width; sheet.height = canvas.height;
        const sc = sheet.getContext('2d');
        sc.fillStyle = '#ffffff'; sc.fillRect(0, 0, sheet.width, sheet.height);
        for (const r of rec) {
          sc.save();
          sc.setTransform(r.m);
          sc.globalAlpha = r.alpha;
          sc.imageSmoothingEnabled = false;
          origDraw.apply(sc, [r.img].concat(r.args));
          sc.restore();
        }
        const bx = Math.round(x0 - s.camera.x - 52), by = 112;
        const cut = document.createElement('canvas');
        cut.width = W; cut.height = H;
        const cc = cut.getContext('2d');
        cc.fillStyle = '#ffffff'; cc.fillRect(0, 0, W, H);
        origDraw.apply(cc, [sheet, bx, by, W, H, 0, 0, W, H]);
        return cut;
      }

      const dt = 1 / 60, cells = [];
      let t = -0.16, fired = false, i = 0;
      for (let step = 0; step < 90; step++) {
        s.camera.x = Math.max(0, x0 - 250);
        while (i < AT.length && t >= AT[i] - dt / 2) {
          cells.push(shoot());
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
      CanvasRenderingContext2D.prototype.drawImage = origDraw;
      AstraSaberRig.draw = rigDraw;
      const sh = document.createElement('canvas');
      sh.width = W * cells.length; sh.height = H;
      const x = sh.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, sh.width, sh.height);
      cells.forEach((c, k) => x.drawImage(c, k * W, 0));
      return sh.toDataURL();
    }, { AT: AT, W: W, H: H });

    fs.writeFileSync('qa/rising-ref/plume-only11.png', Buffer.from(strip.split(',')[1], 'base64'));
    console.log('wrote qa/rising-ref/plume-only11.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
