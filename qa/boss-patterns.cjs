// Captures the wind-up of every Warden pattern, plus a mob blowing up and the cell it leaves,
// so the six attacks and the new feedback can be checked by eye in one sheet.
const fs = require('fs');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(700);

    const shots = await page.evaluate(async () => {
      const out = [];
      const canvas = document.querySelector('canvas');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const C = window.AstraCombat;

      // 1) the six wind-ups, each held at the moment its warning is brightest
      for (const move of C.bossPatternOrder) {
        game.start();
        const s = game.state, p = s.player;
        p.x = C.arena.gate + 90; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 999;
        s.boss = { x: C.arena.bossX, y: 200, baseY: 200, w: 100, h: 110, hp: 30, maxHp: 72,
                   active: true, phase: 0, healthPhase: 3, attack: 'tell-' + move, timer: 9, flash: 0, facing: -1 };
        s.enemies = []; s.bullets = []; s.particles = [];
        s.time = 0.143;                       // the pulse is near its peak here
        s.camera.x = Math.max(0, Math.min(p.x - 230, s.worldWidth - 640));
        game.running = false; cancelAnimationFrame(game.raf);
        AstraRenderer.draw(canvas.getContext('2d'), s);
        out.push({ label: 'wind-up: ' + move, png: canvas.toDataURL() });
      }

      // 2) the same six, one frame into the attack itself
      for (const move of C.bossPatternOrder) {
        game.start();
        const s = game.state, p = s.player;
        p.x = C.arena.gate + 90; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 999;
        s.boss = { x: C.arena.bossX, y: 200, baseY: 200, w: 100, h: 110, hp: 30, maxHp: 72,
                   active: true, phase: 0, healthPhase: 3, attack: 'tell-' + move, timer: 0, flash: 0, facing: -1 };
        s.enemies = []; s.bullets = []; s.particles = [];
        game.running = false; cancelAnimationFrame(game.raf);
        s.camera.x = Math.max(0, Math.min(p.x - 230, s.worldWidth - 640));
        const held = move === 'slam' ? 34 : move === 'mortar' ? 40 : move === 'dash' ? 30 : 14;
        for (let i = 0; i < held; i++) { game._boss(1 / 60); game._bullets(1 / 60); }
        AstraRenderer.draw(canvas.getContext('2d'), s);
        out.push({ label: 'firing: ' + move, png: canvas.toDataURL() });
      }

      // 3) a mob blowing up, caught a few frames in
      game.start();
      let s = game.state;
      s.enemies = []; s.bullets = []; s.particles = []; s.pickups = [];
      game.running = false; cancelAnimationFrame(game.raf);
      s.player.x = 300; s.player.y = 270; s.player.invuln = 999;
      s.camera.x = Math.max(0, Math.min(s.player.x - 230, s.worldWidth - 640));
      const target = { id: 1, type: 'walker', x: 420, y: 276, w: 30, h: 34, hp: 2, maxHp: 2,
                       facing: -1, flash: 0, dead: false, baseX: 420, baseY: 276, phase: 0, fireTimer: 9 };
      s.enemies.push(target);
      game._roll = () => 0;                     // force the drop so both can be seen
      game._killEnemy(target);
      for (let i = 0; i < 5; i++) { game._tick(1 / 60); }
      s.camera.x = Math.max(0, Math.min(s.player.x - 230, s.worldWidth - 640));
      AstraRenderer.draw(canvas.getContext('2d'), s);
      out.push({ label: 'mob explosion', png: canvas.toDataURL() });

      // 4) the repair cell it left, settled on the floor
      for (let i = 0; i < 80; i++) game._tick(1 / 60);
      s.camera.x = Math.max(0, Math.min(s.player.x - 230, s.worldWidth - 640));
      AstraRenderer.draw(canvas.getContext('2d'), s);
      out.push({ label: 'repair cell dropped', png: canvas.toDataURL() });
      await wait(1);
      return out;
    });

    const sheet = await page.evaluate(async (shots) => {
      const cols = 2, W = 640, H = 360, pad = 26;
      const c = document.createElement('canvas');
      c.width = cols * W; c.height = Math.ceil(shots.length / cols) * (H + pad);
      const x = c.getContext('2d');
      x.fillStyle = '#06131c'; x.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < shots.length; i++) {
        const im = new Image(); im.src = shots[i].png; await im.decode();
        const ox = (i % cols) * W, oy = Math.floor(i / cols) * (H + pad);
        x.fillStyle = '#eaf6ff'; x.font = '15px monospace';
        x.fillText(shots[i].label, ox + 10, oy + 18);
        x.drawImage(im, ox, oy + pad);
        x.strokeStyle = '#2b4b5c'; x.strokeRect(ox + .5, oy + pad + .5, W - 1, H - 1);
      }
      return c.toDataURL();
    }, shots);

    fs.writeFileSync('qa/boss-patterns.png', Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('captured ' + shots.length + ' frames to qa/boss-patterns.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
