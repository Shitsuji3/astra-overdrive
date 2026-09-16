// COILHEAD over one full loop of its routine, in its own arena, with the player standing still: how much of
// the time it is in the air, how high it is when each attack goes off, how low the swoop gets, and a
// photograph of each attack as it fires plus the landing and the take-off after it.
// Writes qa/coilhead-flight/loop.png and verification.json.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=stage-select]').click();
    await page.locator('.stage-node.active').click();
    await page.waitForTimeout(1200);
    fs.mkdirSync('qa/coilhead-flight', { recursive: true });

    const res = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas'), c = canvas.getContext('2d');
      game.start({ stage: 'magnet-spine' });
      game.running = false; cancelAnimationFrame(game.raf);
      const s = game.state, p = s.player, C = AstraCombat, A = C.arena, dt = 1 / 60;
      s.enemies = []; s.pickups = []; s.bullets = []; s.particles = [];
      const centre = (A.bossMin + A.bossMax) / 2;
      p.x = centre - 60; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9;
      const b = game._spawnBoss('coilhead');
      const cam = centre + 20 - 320;
      s.camera.x = cam; AstraRenderer.draw(c, s); await new Promise(r => setTimeout(r, 150));
      const loopLen = AstraBosses.get('coilhead').routine.length;
      const shots = [], fired = [], log = [];
      let air = 0, total = 0, last = String(b.attack), swoopLow = null, beats = 0, landedAt = -1, tookOffShot = false, mutated = 0;
      function snap(label) {
        const before = JSON.stringify(s);
        AstraRenderer.draw(c, s);
        if (JSON.stringify(s) !== before) mutated++;
        const cell = document.createElement('canvas'); cell.width = 320; cell.height = 180;
        const cc = cell.getContext('2d'); cc.imageSmoothingEnabled = false;
        cc.drawImage(canvas, 0, 0, 640, 360, 0, 0, 320, 180);
        cc.fillStyle = '#000'; cc.fillRect(0, 0, 200, 14); cc.fillStyle = '#fff'; cc.font = '10px monospace';
        cc.fillText(label, 3, 10);
        shots.push(cell.toDataURL());
      }
      for (let i = 0; i < 60 * 40 && beats <= loopLen; i++) {
        p.invuln = 1e9;
        game._tick(dt); s.camera.x = cam;
        total++; if (b.y < b.baseY - .5) air++;
        const now = String(b.attack);
        if (now !== last) {
          if (last.indexOf('tell-') === 0 && now === last.slice(5)) {
            fired.push({ move: now, t: +(i / 60).toFixed(2), altitude: Math.round(b.baseY - b.y) });
            snap(now + ' fires, up ' + Math.round(b.baseY - b.y) + 'px');
          }
          if (now.indexOf('walk-') === 0) beats++;
          if (now === 'rest' && b.grounded) { landedAt = i; snap('rest on the floor after the dive'); }
          last = now;
        }
        if (b.move && b.move.kind === 'swoop') {
          if (swoopLow === null || b.y > swoopLow.y) swoopLow = { y: b.y, bottom: Math.round(b.y + b.h), t: +(i / 60).toFixed(2) };
          if (Math.abs(b.move.t - AstraBosses.get('coilhead').tuning.dashHold / 2) < dt / 2) snap('swoop, bottom of the dip');
        }
        if (b.move && b.move.kind === 'dive' && b.move.phase === 'stuck' && b.move.t < dt) snap('dive: stuck in the floor');
        if (landedAt >= 0 && !tookOffShot && i - landedAt > 0 && now.indexOf('walk-') === 0 && b.y < b.baseY - 45) { tookOffShot = true; snap('taking off again'); }
        if (i % 30 === 0) log.push({ t: +(i / 60).toFixed(1), state: now, altitude: Math.round(b.baseY - b.y) });
      }
      const cols = 4, rows = Math.ceil(shots.length / cols), board = document.createElement('canvas');
      board.width = 320 * cols; board.height = 180 * rows;
      const bc = board.getContext('2d'); bc.fillStyle = '#111'; bc.fillRect(0, 0, board.width, board.height);
      for (let k = 0; k < shots.length; k++) { const im = new Image(); im.src = shots[k]; await im.decode(); bc.drawImage(im, (k % cols) * 320, Math.floor(k / cols) * 180); }
      return { sheet: board.toDataURL(), inAirShare: +(air / total).toFixed(3), seconds: +(total / 60).toFixed(1), fired, swoopLow,
               playerTop: p.y, rendererMutatedState: mutated, log };
    });
    fs.writeFileSync('qa/coilhead-flight/loop.png', Buffer.from(res.sheet.split(',')[1], 'base64'));
    delete res.sheet;
    res.errors = errors;
    fs.writeFileSync('qa/coilhead-flight/verification.json', JSON.stringify(res, null, 1));
    console.log(JSON.stringify({ seconds: res.seconds, inAirShare: res.inAirShare, fired: res.fired, swoopLow: res.swoopLow,
      playerTop: res.playerTop, rendererMutatedState: res.rendererMutatedState, errors: errors.length }));
    if (errors.length) process.exitCode = 1;
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
