// Plays the rising cut on whatever GAME_URL points at and reports the arc, when its flame can bite, and
// whether the ride-down pose actually appears - the things the eleven-frame sheet changed.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(process.env.GAME_URL);
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(1400);

    const out = await page.evaluate(() => {
      const C = AstraCombat;
      game.start({ stage: 'signal-yard' });
      const s = game.state, p = s.player;
      game.running = false; cancelAnimationFrame(game.raf);
      s.enemies = []; s.bullets = []; s.boss = null;
      let x0 = 400;
      for (let x = 40; x < 3000; x += 10) {
        const floor = s.platforms.some(q => q.y === 310 && q.x <= x && q.x + q.w >= x + 24);
        const roof = s.platforms.some(q => q.y < 310 && q.y > 110 && q.x < x + 40 && q.x + q.w > x - 12);
        if (floor && !roof) { x0 = x; break; }
      }
      p.x = x0; p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.onGround = true;
      const y0 = p.y;
      game.setInput('up', true); game.setInput('saber', true);
      game._tick(1 / 60);
      game.setInput('saber', false); game.setInput('up', false);
      const combo = p.saberCombo;
      let apex = 0, apexAt = 0, land = null, held = 0, stages = new Set(), t = 1 / 60;
      // the flame bites on contact now, so what matters is how long its hit shape is out
      let fireFrom = null, fireTo = null;
      // the flame has to reach behind, then along the floor, then up
      const aim = [];
      for (let i = 1; i <= 150; i++) {
        if (p.saberTime > 0 || C.risingHeld(p)) stages.add(C.saberStage(p));
        if (C.risingHeld(p)) held++;
        if (C.risingFire && C.risingFire(p)) { if (fireFrom === null) fireFrom = t; fireTo = t; }
        if (p.saberTime > 0) {
          const segs = C.saberSweep(p) || [];
          if (segs.length) {
            const g = segs[segs.length - 1];
            aim.push({ t: +t.toFixed(2), dx: +(g.bx - g.ax).toFixed(1), dy: +(g.by - g.ay).toFixed(1) });
          }
        }
        game._tick(1 / 60);
        t += 1 / 60;
        const up = y0 - p.y;
        if (up > apex) { apex = up; apexAt = i; }
        if (land === null && i > 12 && p.onGround) land = i;
      }
      const back = aim.find(a => a.dx < -8);
      const floorward = aim.find(a => a.dx > 8 && Math.abs(a.dy) < .7 * Math.abs(a.dx));
      const upward = aim.find(a => a.dy < -14 && a.dx > 0);
      return { combo, apex, apexAt: +(apexAt / 60).toFixed(2), land: +(land / 60).toFixed(2),
               fire: [fireFrom === null ? null : +fireFrom.toFixed(2), fireTo === null ? null : +fireTo.toFixed(2)],
               span: C.rising.span, hold: C.rising.hold,
               heldFrames: held, stages: Array.from(stages).sort(),
               aimBack: !!back, aimFloor: !!floorward, aimUp: !!upward };
    });
    console.log(JSON.stringify(out));
    console.log('page errors', errs.length, errs.slice(0, 3).join(' | '));
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
