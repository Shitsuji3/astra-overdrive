// Compare the fetched upstream baseline with the release: pixels and simulation, not source text.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const baseline = process.env.BASELINE_REF || 'd42ac8e';
const url = process.env.GAME_URL || 'http://127.0.0.1:4174/';
const source = new Map();
for (const f of fs.readdirSync('release', { recursive: true }).filter(f => f.endsWith('.js'))) {
  const name = f.replaceAll('\\', '/');
  // Added later for Playables; the older ordinary web build has no platform adapter.
  if (name === 'platform.js') continue;
  source.set(name, cp.execFileSync('git', ['show', baseline + ':' + name], { encoding: 'utf8' }));
}
async function sample(browser, original) {
  const p = await browser.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  if (original) await p.route('**/*.js', route => {
    const name = new URL(route.request().url()).pathname.slice(1);
    const body = source.get(name);
    if (!body) return route.continue();
    return route.fulfill({ contentType: 'application/javascript', body: body.replace(/assets\/([\w-]+)\.png/g, 'assets/$1.webp') });
  });
  await p.goto(url);
  await p.locator('[data-action=boss-rush]').click();
  await p.evaluate(() => { game.running = false; cancelAnimationFrame(game.raf); AstraRenderer.preload(); });
  await p.waitForTimeout(1200);
  // Same seeded randomness, same assets and fixed game state in both runs.
  const result = await p.evaluate(async () => {
    let seed = 12345;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    const ctx = c.getContext('2d'), pictures = [], simulation = [];
    for (const def of AstraBosses.list) {
      game.startPractice(def.id); game.running = false; cancelAnimationFrame(game.raf);
      game.state.bossIntro = null;
      AstraRenderer.draw(ctx, game.state);
      await new Promise(r => setTimeout(r, 180));
      const s = game.state, b = s.boss;
      for (const beat of AstraCombat.bossRoutine(def)) {
        game._bossWind(b, def, beat.move);
        s.time = 2; s.shake = 0; s.particles = []; s.bullets = [];
        for (const combo of [0, 1, 2, 3, 4, 6, 7]) {
          s.player.saberCombo = combo; s.player.saberTime = combo ? .2 : 0;
          s.player.saberFacing = 1; s.player.fanCharge = 1.4;
          seed = 12345; AstraRenderer.draw(ctx, s);
          pictures.push(c.toDataURL());
        }
      }
      game.startPractice(def.id); game.running = false; cancelAnimationFrame(game.raf);
      game.state.bossIntro = null; seed = 12345;
      for (let tick = 0; tick < 180; tick++) {
        game.setInput('right', tick < 30);
        game.setInput('saber', tick % 30 < 10);
        game.setInput('jump', tick % 60 < 2);
        game._tick(1 / 60);
      }
      simulation.push(JSON.parse(JSON.stringify(game.state)));
    }
    return { pictures, simulation };
  });
  assert.deepEqual(errors, []);
  await p.close();
  return result;
}
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const before = await sample(b, true), after = await sample(b, false);
    const hash = data => crypto.createHash('sha256').update(data).digest('hex');
    assert.deepEqual(after.pictures.map(hash), before.pictures.map(hash), 'rendered pixels match');
    assert.deepEqual(after.simulation, before.simulation, 'simulation states match');
    let oldBytes = 0, bytes = 0, oldGzip = 0, gzip = 0;
    for (const [name, body] of source) {
      const built = fs.readFileSync('release/' + name);
      oldBytes += Buffer.byteLength(body); bytes += built.length;
      oldGzip += zlib.gzipSync(body).length; gzip += zlib.gzipSync(built).length;
    }
    console.log(JSON.stringify({ pixelFrames: before.pictures.length, bossSimulations: before.simulation.length, oldBytes, bytes, oldGzip, gzip }));
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
