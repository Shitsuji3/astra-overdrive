// Reads out the loop each boss runs, and times the opening it leaves after every attack, so
// the rhythm a player has to learn can be checked as numbers rather than felt for.
//
//   node server.cjs
//   node qa/boss-motion.cjs
//
// The opening is the part that matters: after an attack the boss stands still and starts
// nothing, and that is the window the player is meant to take. This prints how long that
// window actually is, and how much of each loop is spent walking rather than planted.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE
  || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';

(async () => {
  const br = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(URL);
    await page.locator('[data-action=start]').click();
    await page.waitForTimeout(900);

    const rows = await page.evaluate(() => {
      const out = [];
      for (const def of AstraBosses.list) {
        game.start({ stage: 'gauntlet' });
        const s = game.state, p = s.player, C = AstraCombat;
        game.running = false; cancelAnimationFrame(game.raf);
        s.enemies = []; s.bullets = []; s.particles = [];
        p.x = C.arena.gate + 60; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9; p.hp = p.maxHp = 99;
        const b = game._spawnBoss(def.id);
        b.hp = b.maxHp = 1e6;                     // hold it at full armour for one clean loop
        const beats = def.routine.length;
        let state = String(b.attack), open = null, walk = null;
        const opens = [], walks = [], order = [];
        let frames = 0, planted = 0, last = b.x, ground = 0, held = b.x;
        while (order.length < beats * 2 && frames < 60 * 180) {
          held = b.x;
          game._boss(1 / 60); frames++;
          ground += Math.abs(b.x - last); last = b.x;
          if (b.x === held) planted++;                      // it held its ground this frame
          const now = String(b.attack);
          if (now === state) continue;
          if (now === 'rest') open = frames;
          else if (open !== null) { opens.push((frames - open) / 60); open = null; }
          if (now.indexOf('walk-') === 0) walk = frames;
          else if (walk !== null) { walks.push((frames - walk) / 60); walk = null; }
          if (AstraCombat.bossPatterns[now]) order.push(now);
          state = now;
        }
        const mean = xs => xs.reduce((a, z) => a + z, 0) / (xs.length || 1);
        out.push({ id: def.id, beats,
          loop: def.routine.map(x => x.move + '@' + x.from).join(' > '),
          repeats: order.slice(0, beats).join(' ') === order.slice(beats, beats * 2).join(' '),
          opening: mean(opens), shortest: Math.min.apply(null, opens),
          walking: mean(walks), planted: planted / frames,
          loopSeconds: frames / 60 / 2, ground: ground / (frames / 60) });
      }
      return out;
    });

    const bad = [];
    for (const r of rows) {
      console.log(`${r.id.padEnd(15)} ${r.beats} beats  ${r.loop}`);
      console.log(`${''.padEnd(15)} loop ${r.loopSeconds.toFixed(1)}s   ` +
        `opening ${r.opening.toFixed(2)}s (shortest ${r.shortest.toFixed(2)}s)   ` +
        `walking ${r.walking.toFixed(2)}s   planted ${Math.round(r.planted * 100)}%   ` +
        `moves ${Math.round(r.ground)}px/s`);
      if (!r.repeats) bad.push(`${r.id} did not repeat its loop`);
      // a saber swing lands 0.16s in and runs 0.40s: a window under this cannot be used
      if (r.shortest < 0.55) bad.push(`${r.id}'s shortest opening is only ${r.shortest.toFixed(2)}s`);
      // every step it takes now has a destination, so what is left is travel time. Most of the
      // loop should still be spent planted, or there is nothing to read.
      if (r.planted < 0.7) bad.push(`${r.id} holds its ground only ${Math.round(r.planted * 100)}% of the time`);
    }
    if (bad.length) throw new Error(bad.join('\n  '));
    console.log('\nevery boss repeats its written loop and leaves an opening after each attack');
  } finally { await br.close(); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
