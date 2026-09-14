// Follows one mob blowing up frame by frame, zoomed in, so the blast and the repair cell it
// leaves can be judged at pixel scale rather than at arm's length.
const fs = require('fs');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(700);

    const shots = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas'), out = [];
      game.start();
      const s = game.state;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.particles = []; s.pickups = [];
      s.player.x = 300; s.player.y = 270; s.player.invuln = 999;
      const aim = () => { s.camera.x = Math.max(0, Math.min(s.player.x - 230, s.worldWidth - 640)); };
      aim();
      const target = { id: 1, type: 'walker', x: 420, y: 276, w: 30, h: 34, hp: 2, maxHp: 2,
                       facing: -1, flash: 0, dead: false, baseX: 420, baseY: 276, phase: 0, fireTimer: 9 };
      s.enemies.push(target);
      game._roll = () => 0;                       // force the drop so the cell is in shot
      game._killEnemy(target);
      const marks = [0, 2, 5, 9, 15, 24, 70];
      for (let f = 0, i = 0; f <= marks[marks.length - 1]; f++) {
        if (f) { game._tick(1 / 60); aim(); }
        if (marks[i] === f) {
          i++;
          AstraRenderer.draw(canvas.getContext('2d'), s);
          out.push({ label: 'frame ' + f + '  (' + (f / 60).toFixed(2) + 's)', png: canvas.toDataURL() });
        }
      }
      return out;
    });

    const sheet = await page.evaluate(async (shots) => {
      const CX = 250, CY = 165, CW = 260, CH = 165, Z = 3, cols = 2, pad = 24;
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

    fs.writeFileSync('qa/kill-fx.png', Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('captured ' + shots.length + ' frames to qa/kill-fx.png');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
