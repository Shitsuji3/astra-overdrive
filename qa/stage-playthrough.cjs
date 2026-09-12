// Runs every stage in a real browser from the stage select screen: launches it, walks the
// sector readout from one end to the other, reaches the arena, fights the boss down and checks
// the record comes back on the select screen. Catches anything the static audit cannot.
//
//   node server.cjs            (or: node server.cjs release 4174 && set GAME_URL)
//   node qa/stage-playthrough.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';

(async () => {
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 1100, height: 620 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(600);

    const ids = await page.evaluate(() => AstraStages.list.map(s => s.id));
    const kinds = await page.evaluate(() => {
      const out = {};
      for (const s of AstraStages.list) out[s.id] = s.kind;
      return out;
    });
    const expected = await page.evaluate(() => {
      const out = {};
      for (const s of AstraStages.list) out[s.id] = s.bosses.map(b => AstraBosses.get(b).name);
      return out;
    });
    assert.ok(ids.length >= 2, 'the select screen has more than one stage');
    const results = [];

    for (const id of ids) {
      await page.locator('[data-action=stage-select]').click();
      await page.waitForTimeout(250);
      await page.locator(`.stage-node[data-stage="${id}"]`).click();
      await page.waitForTimeout(1200);

      const run = await page.evaluate(async (id) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const s = () => game.state;
        if (s().stage.id !== id) return { error: `launched ${s().stage.id}, wanted ${id}` };
        const world = s().worldWidth, arena = AstraCombat.arena;
        // walk the whole run, collecting the sector readout as it changes
        const sectors = [];
        for (let x = 20; x < arena.gate; x += 40) {
          s().player.x = x; s().player.y = 270; s().player.vy = 0; s().player.invuln = 1e9;
          game._tick(1 / 60);
          const last = sectors[sectors.length - 1];
          if (s().section && (!last || last !== s().section)) sectors.push(s().section);
        }
        // into the arena, then take the boss down
        s().player.x = arena.spawn + 60; s().player.invuln = 1e9;
        await wait(500);
        if (!s().boss) return { error: 'the boss never spawned' };
        const first = s().boss, bossHp = first.maxHp;
        const pool = AstraBosses.get(first.id).pool;
        const moves = new Set();
        const t0 = performance.now();
        // a full rotation takes about 2.5s per attack it owns, so watch for a couple of turns
        while (performance.now() - t0 < 2600 * pool.length) {
          s().player.invuln = 1e9; s().boss.hp = bossHp;
          const a = String(s().boss.attack || '');
          if (a.indexOf('tell-') !== 0 && a !== 'down') moves.add(a);
          await wait(25);
        }
        // then take down every frame the stage sends, however many that is
        const felled = [];
        while (s().mode === 'playing' && felled.length < 12) {
          const was = s().boss.id;
          felled.push(s().boss.name);
          s().boss.hp = 0;
          const t1 = performance.now();
          while (s().mode === 'playing' && s().boss.id === was && performance.now() - t1 < 6000) {
            s().player.invuln = 1e9; await wait(25);
          }
        }
        return { world, bossHp, sectors, pool: pool.length, moves: [...moves],
          felled, mode: s().mode, score: s().score };
      }, id);

      assert.ok(!run.error, `${id}: ${run.error}`);
      // a gauntlet has a staging corridor and an arena, nothing to walk through
      const wantSectors = kinds[id] === 'gauntlet' ? 1 : 4;
      assert.ok(run.sectors.length >= wantSectors, `${id}: the sector readout moves through the run: ${run.sectors.join(' / ')}`);
      assert.equal(run.moves.length, run.pool, `${id}: the boss used every attack it owns: ${run.moves.join(', ')}`);
      assert.equal(run.mode, 'victory', `${id}: every boss can be finished`);
      assert.deepEqual(run.felled, expected[id], `${id}: the frames arrive in order`);
      results.push({ id, ...run });

      // back to the title, and the record must be on the select screen
      await page.locator('[data-action=title]').click();
      await page.waitForTimeout(400);
      await page.locator('[data-action=stage-select]').click();
      await page.waitForTimeout(250);
      const row = await page.locator(`.stage-node[data-stage="${id}"] .stage-rec`).textContent();
      assert.ok(/CLEAR/.test(row), `${id}: the clear is recorded on the select screen, saw "${row}"`);
      await page.locator('[data-action=select-back]').click();
      await page.waitForTimeout(200);
    }

    // the records survive a reload, which is the whole point of saving them
    await page.reload();
    await page.waitForTimeout(500);
    await page.locator('[data-action=stage-select]').click();
    await page.waitForTimeout(300);
    const cleared = await page.locator('.stage-rec b').allTextContents();
    fs.writeFileSync(path.join(__dirname, 'stage-playthrough.png'), await page.screenshot());

    assert.equal(cleared.length, ids.length, 'every stage shows a saved clear after a reload');
    assert.deepEqual(errors, [], 'no script errors while playing every stage');
    console.log(JSON.stringify(results.map(r => ({
      id: r.id, world: r.world, score: r.score, bosses: r.felled.join(' > '),
      sectors: r.sectors.join(' / ')
    })), null, 1));
    console.log('every stage launches, runs, and is beatable; records persist');
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
