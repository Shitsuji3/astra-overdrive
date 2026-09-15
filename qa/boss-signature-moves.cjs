// Plays COILHEAD's dive and SPARKWIDOW's swing in the real game and renderer, in their own stages' arenas,
// and photographs each move every quarter of a second from the wind-up to the rest. Also checks that the
// renderer leaves the simulation untouched, and that reduced motion draws without errors.
// Writes qa/boss-signature/dive.png, swing.png and verification.json.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

const SCENES = [
  { name: 'dive', boss: 'coilhead', stage: 'magnet-spine' },
  { name: 'swing', boss: 'sparkwidow', stage: 'filament-run' }
];

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
    fs.mkdirSync('qa/boss-signature', { recursive: true });
    const report = { errors };

    for (const scene of SCENES) {
      for (const reduced of [false, true]) {
        const res = await page.evaluate(async ({ scene, reduced }) => {
          const canvas = document.querySelector('canvas'), c = canvas.getContext('2d');
          game.start({ stage: scene.stage });
          game.running = false; cancelAnimationFrame(game.raf);
          const s = game.state, p = s.player, C = AstraCombat, A = C.arena, dt = 1 / 60;
          s.enemies = []; s.pickups = []; s.bullets = []; s.particles = [];
          s.reducedMotion = reduced; game.setOptions && game.setOptions({ reducedMotion: reduced });
          const centre = (A.bossMin + A.bossMax) / 2;
          p.x = scene.name === 'dive' ? centre - 40 : A.bossMin + 30; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9; p.hp = p.maxHp;
          const b = game._spawnBoss(scene.boss);
          b.x = scene.name === 'dive' ? Math.min(A.bossMax, p.x + 160) : A.bossMax;
          b.attack = 'tell-' + scene.name; b.timer = C.bossPatterns[scene.name].tell * (AstraBosses.get(scene.boss).tempo || 1);
          b.facing = p.x < b.x ? -1 : 1;
          // settle the picture before photographing it
          s.camera.x = centre + 20 - 320; AstraRenderer.draw(c, s); await new Promise(r => setTimeout(r, 150));
          const shots = [], log = [], seen = new Set();
          let top = b.y, minX = b.x, maxX = b.x, mutated = 0, lowest = 0;
          for (let i = 0; i < 60 * 4.2; i++) {
            p.invuln = 1e9;
            game._tick(dt);
            s.camera.x = centre + 20 - 320;
            const phase = String(b.attack) + (b.move ? '/' + b.move.phase : '');
            seen.add(phase);
            top = Math.min(top, b.y); minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x); lowest = Math.max(lowest, b.y + b.h);
            if (i % 15 === 0) {
              const before = JSON.stringify(s);
              AstraRenderer.draw(c, s);
              if (JSON.stringify(s) !== before) mutated++;
              if (!reduced) {
                const cell = document.createElement('canvas'); cell.width = 320; cell.height = 180;
                const cc = cell.getContext('2d'); cc.imageSmoothingEnabled = false;
                cc.drawImage(canvas, 0, 0, 640, 360, 0, 0, 320, 180);
                cc.fillStyle = '#000'; cc.fillRect(0, 0, 150, 14); cc.fillStyle = '#fff'; cc.font = '10px monospace';
                cc.fillText((i / 60).toFixed(2) + 's ' + phase, 3, 10);
                shots.push(cell.toDataURL());
              }
              log.push({ t: +(i / 60).toFixed(2), phase, x: Math.round(b.x), y: Math.round(b.y), bullets: s.bullets.map(q => q.kind || 'shot').join(',') });
            }
            if (String(b.attack).indexOf('walk-') === 0) break;
          }
          let sheet = null;
          if (!reduced) {
            const cols = 4, rows = Math.ceil(shots.length / cols), board = document.createElement('canvas');
            board.width = 320 * cols; board.height = 180 * rows;
            const bc = board.getContext('2d'); bc.fillStyle = '#111'; bc.fillRect(0, 0, board.width, board.height);
            for (let k = 0; k < shots.length; k++) { const im = new Image(); im.src = shots[k]; await im.decode(); bc.drawImage(im, (k % cols) * 320, Math.floor(k / cols) * 180); }
            sheet = board.toDataURL();
          }
          return { phases: Array.from(seen), top: Math.round(top), baseY: b.baseY, minX: Math.round(minX), maxX: Math.round(maxX),
                   lowestBottom: Math.round(lowest), arena: [A.bossMin, A.bossMax], mutated, frames: log.length, log, sheet };
        }, { scene, reduced });
        if (res.sheet) fs.writeFileSync(`qa/boss-signature/${scene.name}.png`, Buffer.from(res.sheet.split(',')[1], 'base64'));
        delete res.sheet;
        report[scene.name + (reduced ? '-reduced' : '')] = res;
        console.log(scene.name + (reduced ? ' (reduced motion)' : ''), JSON.stringify({ phases: res.phases, top: res.top, baseY: res.baseY,
          x: [res.minX, res.maxX], arena: res.arena, lowestBottom: res.lowestBottom, rendererMutatedState: res.mutated }));
      }
    }
    fs.writeFileSync('qa/boss-signature/verification.json', JSON.stringify(report, null, 1));
    console.log('page errors', errors.length, errors.slice(0, 3).join(' | '));
    if (errors.length) process.exitCode = 1;
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
