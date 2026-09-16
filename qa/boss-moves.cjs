// Plays every boss's own moves in the real game and renderer, in its own stage's arena, and photographs each
// one: late in the wind-up, then five moments spread over the move itself, the arena at full size. One sheet
// per boss, two rows of three per move.
// Also checks that every move comes back to rest, that the renderer leaves the simulation untouched, that the
// boss faces the player while it winds up, and that reduced motion draws every frame without errors.
// Writes qa/boss-moves/<boss>.png and qa/boss-moves/verification.json.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

const STAGES = { warden: 'signal-yard', tidebreaker: 'tidal-refinery', coilhead: 'magnet-spine', ashmaw: 'cinder-flats',
  gravelock: 'anvil-depth', nullpriest: 'void-choir', sparkwidow: 'filament-run', 'obsidian-crown': 'crown-vault' };
const ONLY = process.argv[2];

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
    fs.mkdirSync('qa/boss-moves', { recursive: true });
    const report = { errors, bosses: {} };

    for (const [id, stage] of Object.entries(STAGES)) {
      if (ONLY && ONLY !== id) continue;
      const res = await page.evaluate(async ({ id, stage }) => {
        const canvas = document.querySelector('canvas'), c = canvas.getContext('2d'), dt = 1 / 60;
        const def = AstraBosses.get(id), C = AstraCombat;
        const moves = Array.from(new Set(C.bossRoutine(def).map(beat => beat.move)));
        const rows = [], facts = {};
        const setup = reduced => {
          game.start({ stage });
          game.running = false; cancelAnimationFrame(game.raf);
          const s = game.state, p = s.player, A = C.arena;
          s.enemies = []; s.pickups = []; s.bullets = []; s.particles = [];
          s.reducedMotion = reduced;
          const b = game._spawnBoss(id), centre = (A.bossMin + A.bossMax) / 2;
          b.x = Math.min(A.bossMax, centre + 90);
          p.x = b.x - 150; p.y = 310 - p.h; p.vx = 0; p.vy = 0; p.hp = p.maxHp;
          s.camera.x = centre + 20 - 320;
          return { s, p, b, A, centre };
        };
        for (const move of moves) {
          for (const reduced of [false, true]) {
            const { s, p, b, centre } = setup(reduced);
            const pat = C.bossPatterns[move], tell = pat.tell * (def.tempo || 1);
            b.attack = 'tell-' + move; b.timer = tell; b.move = null;
            AstraRenderer.draw(c, s); await new Promise(r => setTimeout(r, reduced ? 0 : 120));
            const want = [tell * .8], shots = [], labels = [];
            let fired = null, rest = null, mutated = 0, facedAway = 0, frames = 0, kinds = new Set();
            for (let i = 0; i < 60 * 6; i++) {
              p.invuln = 1e9; p.hp = p.maxHp;
              const t = i * dt;
              game._tick(dt);
              s.camera.x = centre + 20 - 320;
              const raw = String(b.attack);
              if (fired === null && raw.indexOf('tell-') !== 0) {
                fired = t; for (const f of [.06, .28, .5, .72, .94]) want.push(t + f * pat.active);
              }
              if (raw.indexOf('tell-') === 0 && (b.facing < 0) !== (p.x + p.w / 2 < b.x + b.w / 2)) facedAway++;
              s.bullets.forEach(q => q.fxBoss && kinds.add(q.kind === 'hazard' ? 'hazard:' + q.style : q.kind || 'shot'));
              if (fired !== null && rest === null && (raw === 'rest' || raw.indexOf('walk-') === 0)) rest = t;
              const snap = want.length && t >= want[0];
              if (reduced) { AstraRenderer.draw(c, s); frames++; }
              else if (snap) {
                want.shift();
                const before = JSON.stringify(s);
                AstraRenderer.draw(c, s); frames++;
                if (JSON.stringify(s) !== before) mutated++;
                const cell = document.createElement('canvas'); cell.width = 520; cell.height = 210;
                const cc = cell.getContext('2d'); cc.imageSmoothingEnabled = false;
                cc.drawImage(canvas, 60, 110, 520, 210, 0, 0, 520, 210);
                cc.fillStyle = '#000'; cc.fillRect(0, 0, 118, 12); cc.fillStyle = '#fff'; cc.font = '9px monospace';
                cc.fillText((fired === null ? 'tell ' : '+' + (t - fired).toFixed(2) + 's ') + raw.slice(0, 12), 2, 9);
                shots.push(cell); labels.push(raw);
              }
              if (rest !== null && !want.length) break;
            }
            if (!reduced) rows.push({ move, shots });
            facts[move + (reduced ? ' (reduced)' : '')] = { tell: +tell.toFixed(2), active: pat.active,
              firedAt: fired === null ? null : +fired.toFixed(2), restAfter: rest === null ? null : +(rest - fired).toFixed(2),
              facedAwayFramesInTell: facedAway, rendererMutatedState: mutated, framesDrawn: frames, kinds: Array.from(kinds) };
          }
        }
        const board = document.createElement('canvas'), cols = 3, cw = 520, ch = 210;
        board.width = cw * cols + 110; board.height = ch * 2 * rows.length;
        const bc = board.getContext('2d'); bc.fillStyle = '#111'; bc.fillRect(0, 0, board.width, board.height);
        rows.forEach((row, r) => {
          bc.fillStyle = '#ffd27a'; bc.font = 'bold 13px monospace'; bc.fillText(row.move, 6, r * ch * 2 + 20);
          bc.fillStyle = '#9ab'; bc.font = '10px monospace'; bc.fillText(id, 6, r * ch * 2 + 36);
          row.shots.forEach((cell, k) => bc.drawImage(cell, 110 + (k % cols) * cw, (r * 2 + Math.floor(k / cols)) * ch));
        });
        return { moves, facts, sheet: board.toDataURL() };
      }, { id, stage });
      fs.writeFileSync(`qa/boss-moves/${id}.png`, Buffer.from(res.sheet.split(',')[1], 'base64'));
      delete res.sheet;
      report.bosses[id] = res;
      for (const [move, f] of Object.entries(res.facts)) console.log(id.padEnd(15), move.padEnd(22), JSON.stringify(f));
    }
    fs.writeFileSync('qa/boss-moves/verification.json', JSON.stringify(report, null, 1));
    console.log('page errors', errors.length, errors.slice(0, 3).join(' | '));
    const bad = Object.values(report.bosses).flatMap(r => Object.entries(r.facts))
      .filter(([, f]) => f.firedAt === null || f.restAfter === null || f.rendererMutatedState || f.facedAwayFramesInTell > 1);
    if (bad.length) console.log('problems', JSON.stringify(bad));
    if (errors.length || bad.length) process.exitCode = 1;
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
