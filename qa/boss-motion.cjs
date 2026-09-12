// Measures how much ground a boss actually covers, and photographs a strip of one fight so the
// footwork can be read at a glance.
//
//   node server.cjs
//   node qa/boss-motion.cjs
//
// For every boss it runs the fight headless for twelve seconds with the player parked, then
// reports the ground covered, how long it spends off the floor, and how it compares with the
// player's own body. Nothing here judges the numbers; it prints them so they can be judged.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE
  || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const SECONDS = 12;

(async () => {
  const br = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(URL);
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(900);

    const rows = await page.evaluate(async (seconds) => {
      const out = [];
      for (const def of AstraBosses.list) {
        game.start({ stage: 'gauntlet' });
        const s = game.state, p = s.player, C = AstraCombat;
        game.running = false; cancelAnimationFrame(game.raf);
        s.enemies = []; s.bullets = []; s.particles = [];
        p.x = C.arena.gate + 60; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9; p.hp = 99; p.maxHp = 99;
        const b = game._spawnBoss(def.id);
        b.hp = b.maxHp = 1e6;                       // let the whole window be fighting, not dying
        let ground = 0, air = 0, last = b.x, far = b.x, near = b.x, still = 0;
        for (let i = 0; i < seconds * 60; i++) {
          game._boss(1 / 60);
          const moved = Math.abs(b.x - last);
          ground += moved; last = b.x;
          if (moved < .2) still++;
          if (b.y < b.baseY) air++;
          far = Math.max(far, b.x); near = Math.min(near, b.x);
        }
        out.push({ id: def.id, body: def.w + 'x' + def.h,
          player: p.w + 'x' + p.h,
          ground: Math.round(ground), span: Math.round(far - near),
          airPct: Math.round(air / (seconds * 60) * 100),
          stillPct: Math.round(still / (seconds * 60) * 100) });
      }
      return out;
    }, SECONDS);

    for (const r of rows)
      console.log(`${r.id.padEnd(15)} body ${r.body.padEnd(6)} vs player ${r.player}   ` +
        `covers ${String(r.ground).padStart(5)}px in ${SECONDS}s   ` +
        `range ${String(r.span).padStart(3)}px   airborne ${String(r.airPct).padStart(2)}%   ` +
        `still ${String(r.stillPct).padStart(2)}%`);

    // a strip of one fight, evenly spaced, so the footwork is visible rather than only counted
    const strip = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas'), shots = [];
      await Promise.all(AstraBosses.list.filter(b => b.sprite).map(b => new Promise(done => {
        const im = new Image(); im.onload = im.onerror = done; im.src = b.sprite;
      })));
      game.start({ stage: 'anvil-depth' });
      const s = game.state, p = s.player, C = AstraCombat;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.particles = [];
      p.x = C.arena.gate + 60; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9;
      const b = game._spawnBoss('gravelock');
      b.hp = b.maxHp = 1e6;
      for (let frame = 0; frame < 8 * 60; frame++) {
        game._boss(1 / 60); game._bullets(1 / 60); s.time += 1 / 60;
        s.camera.x = Math.max(0, Math.min(p.x - 230, s.worldWidth - 640));
        if (frame % 48 === 0 && shots.length < 10) {
          AstraRenderer.draw(canvas.getContext('2d'), s);
          AstraRenderer.draw(canvas.getContext('2d'), s);
          shots.push({ at: (frame / 60).toFixed(1) + 's', png: canvas.toDataURL() });
        }
      }
      const W = 640, H = 360, pad = 18, cols = 2;
      const sheet = document.createElement('canvas');
      sheet.width = cols * W; sheet.height = Math.ceil(shots.length / cols) * (H + pad);
      const x = sheet.getContext('2d');
      x.fillStyle = '#06131c'; x.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < shots.length; i++) {
        const im = new Image(); im.src = shots[i].png; await im.decode();
        const ox = (i % cols) * W, oy = Math.floor(i / cols) * (H + pad);
        x.fillStyle = '#eaf6ff'; x.font = 'bold 13px monospace';
        x.fillText('GRAVELOCK  ' + shots[i].at, ox + 10, oy + 13);
        x.drawImage(im, ox, oy + pad);
        x.strokeStyle = '#2b4b5c'; x.strokeRect(ox + .5, oy + pad + .5, W - 1, H - 1);
      }
      return sheet.toDataURL();
    });
    fs.writeFileSync('qa/boss-motion.png', Buffer.from(strip.split(',')[1], 'base64'));
    console.log('\nstrip written to qa/boss-motion.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
