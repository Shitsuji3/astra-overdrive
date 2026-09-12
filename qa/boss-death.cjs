// Walks the Warden's death sequence frame by frame so the run of bursts and the final blast
// can be judged by eye.
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
      const canvas = document.querySelector('canvas'), out = [];
      const C = window.AstraCombat;
      game.start();
      const s = game.state, p = s.player;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.particles = [];
      p.x = C.arena.gate + 90; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9;
      s.boss = { x: C.arena.bossX, y: 200, baseY: 200, w: 100, h: 110, hp: 6, maxHp: 72,
                 active: true, phase: 0, healthPhase: 3, attack: 'tell-volley', timer: 99, flash: 0, facing: -1 };
      const aim = () => { s.camera.x = Math.max(0, Math.min(p.x - 230, s.worldWidth - 640)); };
      s.boss.hp = 0;
      const marks = [6, 30, 60, 84, 93, 96, 102, 128];
      for (let f = 0, i = 0; f <= marks[marks.length - 1]; f++) {
        game._tick(1 / 60); aim();
        if (marks[i] === f) {
          i++;
          AstraRenderer.draw(canvas.getContext('2d'), s);
          out.push({ label: (f / 60).toFixed(2) + 's', png: canvas.toDataURL() });
        }
      }
      return out;
    });

    const sheet = await page.evaluate(async (shots) => {
      const CX = 300, CY = 90, CW = 340, CH = 230, Z = 2, cols = 2, pad = 24;
      const c = document.createElement('canvas');
      c.width = cols * CW * Z; c.height = Math.ceil(shots.length / cols) * (CH * Z + pad);
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.fillStyle = '#06131c'; x.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < shots.length; i++) {
        const im = new Image(); im.src = shots[i].png; await im.decode();
        const ox = (i % cols) * CW * Z, oy = Math.floor(i / cols) * (CH * Z + pad);
        x.fillStyle = '#eaf6ff'; x.font = '15px monospace';
        x.fillText(shots[i].label, ox + 8, oy + 17);
        x.drawImage(im, CX, CY, CW, CH, ox, oy + pad, CW * Z, CH * Z);
        x.strokeStyle = '#2b4b5c'; x.strokeRect(ox + .5, oy + pad + .5, CW * Z - 1, CH * Z - 1);
      }
      return c.toDataURL();
    }, shots);

    fs.writeFileSync('qa/boss-death.png', Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('captured ' + shots.length + ' frames to qa/boss-death.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
