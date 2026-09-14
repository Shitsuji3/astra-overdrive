// Stands the player beside every boss at the size the game actually draws them, then again at
// four times that, so the difference in scale can be judged rather than guessed.
//
//   node server.cjs
//   node qa/boss-size.cjs
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE
  || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';

(async () => {
  const br = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(URL);
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(900);

    const png = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      await Promise.all(AstraBosses.list.filter(b => b.sprite).map(b => new Promise(done => {
        const im = new Image(); im.onload = im.onerror = done; im.src = b.sprite;
      })));
      // one strip per boss: the player on the left, the boss two body-widths to his right
      const cuts = [];
      for (const def of AstraBosses.list) {
        game.start({ stage: 'gauntlet' });
        const s = game.state, p = s.player, C = AstraCombat;
        game.running = false; cancelAnimationFrame(game.raf);
        s.enemies = []; s.bullets = []; s.particles = []; s.boss = null;
        p.x = C.arena.gate + 90; p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.invuln = 1e9;
        const b = game._spawnBoss(def.id);
        b.x = p.x + 90; b.attack = 'volley'; b.timer = 9; b.facing = -1;
        s.time = .143;
        s.camera.x = Math.max(0, Math.min(p.x - 120, s.worldWidth - 640));
        AstraRenderer.draw(canvas.getContext('2d'), s);
        AstraRenderer.draw(canvas.getContext('2d'), s);
        cuts.push({ label: `${def.name}  ${def.w}x${def.h}  (player ${p.w}x${p.h})`, png: canvas.toDataURL() });
      }
      // crop the strip each pair stands in, then show it at 1x and at 4x
      const CW = 300, CH = 120, TOP = 200, LEFT = 90, ZOOM = 4, pad = 22;
      const sheet = document.createElement('canvas');
      sheet.width = CW * ZOOM; sheet.height = cuts.length * (CH * ZOOM + pad);
      const x = sheet.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.fillStyle = '#06131c'; x.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < cuts.length; i++) {
        const im = new Image(); im.src = cuts[i].png; await im.decode();
        const oy = i * (CH * ZOOM + pad);
        x.fillStyle = '#eaf6ff'; x.font = 'bold 15px monospace';
        x.fillText(cuts[i].label, 8, oy + 15);
        x.drawImage(im, LEFT, TOP, CW, CH, 0, oy + pad, CW * ZOOM, CH * ZOOM);
        x.strokeStyle = '#2b4b5c'; x.strokeRect(.5, oy + pad + .5, CW * ZOOM - 1, CH * ZOOM - 1);
      }
      return sheet.toDataURL();
    });
    fs.writeFileSync('qa/boss-size.png', Buffer.from(png.split(',')[1], 'base64'));
    console.log('wrote qa/boss-size.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
