// Puts every boss in the arena and photographs it mid wind-up, so the roster can be compared
// at a glance: size, colour, and the warning each one puts on the floor.
//
//   node server.cjs
//   node qa/boss-roster.cjs
const fs = require('fs');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(URL);
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(900);

    const shots = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas'), out = [];
      // the artwork loads on demand, so wait for it before photographing anything
      await Promise.all(AstraBosses.list.filter(b => b.sprite).map(b => new Promise(done => {
        const im = new Image(); im.onload = im.onerror = done; im.src = b.sprite;
      })));
      for (const def of AstraBosses.list) {
        game.start({ stage: 'gauntlet' });
        const s = game.state, p = s.player, C = AstraCombat;
        game.running = false; cancelAnimationFrame(game.raf);
        s.enemies = []; s.bullets = []; s.particles = [];
        p.x = C.arena.gate + 30; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9;
        game._spawnBoss(def.id);
        // hold the wind-up of its signature move, which is the first in its pool
        s.boss.attack = 'tell-' + def.pool[0];
        s.boss.timer = 9;
        s.time = 0.143;
        s.camera.x = Math.max(0, Math.min(p.x - 230, s.worldWidth - 640));
        AstraRenderer.draw(canvas.getContext('2d'), s);
        AstraRenderer.draw(canvas.getContext('2d'), s);
        out.push({ label: `${def.number}. ${def.name}  ${def.jp}`,
          note: `HP ${def.hp}  ${def.w}x${def.h}  ${def.pool.join(' ')}`,
          png: canvas.toDataURL() });
      }
      return out;
    });

    const sheet = await page.evaluate(async (shots) => {
      const W = 640, H = 360, pad = 34, cols = 2;
      const c = document.createElement('canvas');
      c.width = cols * W; c.height = Math.ceil(shots.length / cols) * (H + pad);
      const x = c.getContext('2d');
      x.fillStyle = '#06131c'; x.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < shots.length; i++) {
        const im = new Image(); im.src = shots[i].png; await im.decode();
        const ox = (i % cols) * W, oy = Math.floor(i / cols) * (H + pad);
        x.fillStyle = '#eaf6ff'; x.font = 'bold 15px monospace';
        x.fillText(shots[i].label, ox + 10, oy + 16);
        x.fillStyle = '#7fa2ad'; x.font = '12px monospace';
        x.fillText(shots[i].note, ox + 10, oy + 30);
        x.drawImage(im, ox, oy + pad);
        x.strokeStyle = '#2b4b5c'; x.strokeRect(ox + .5, oy + pad + .5, W - 1, H - 1);
      }
      return c.toDataURL();
    }, shots);

    fs.writeFileSync('qa/boss-roster.png', Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('photographed ' + shots.length + ' bosses to qa/boss-roster.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
