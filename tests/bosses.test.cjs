const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

function harness() {
  const box = { console, performance: { now: () => 0 }, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {},
    navigator: { getGamepads: () => [] } };
  vm.createContext(box);
  for (const f of ['assets/bosses.js', 'assets/stages.js', 'assets/run-rig-v6.js', 'assets/saber-rig.js', 'game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box);
  return { NeonGame: box.NeonGame, api: box.AstraCombat, bosses: box.AstraBosses, stages: box.AstraStages };
}

// Puts one boss on the floor of an arena and hands back the game plus the body.
function arena(h, bossId, stage) {
  const g = new h.NeonGame(null);
  g.start({ stage: stage || 'gauntlet' });
  g._roll = () => 1;                  // hold the scurry still: these tests are about the moves
  const p = g.state.player;
  // where the frozen baseline stood, so aimed attacks compare like for like
  p.x = h.api.arena.gate + 80; p.y = 270; p.vx = 0; p.vy = 0; p.invuln = 1e9;
  const b = g._spawnBoss(bossId);
  g.state.bullets = []; g.state.particles = [];
  return { g, b };
}
// Skips the wind-up and fires one named attack.
function fire(g, b, move) {
  g.state.bullets = []; g.state.particles = [];
  b.attack = 'tell-' + move; b.timer = 0; b.dashTime = 0; b.vy = 0; b.slammed = false;
  g._boss(1 / 60);
  return g.state.bullets;
}

test('the roster holds eight bosses, each describable on a select screen', () => {
  const h = harness();
  const list = Array.from(h.bosses.list);
  assert.equal(list.length, 8, `eight bosses: ${list.map(b => b.name).join(', ')}`);
  const ids = list.map(b => b.id), names = list.map(b => b.name);
  assert.equal(new Set(ids).size, 8, 'ids are unique');
  assert.equal(new Set(names).size, 8, 'names are unique');
  for (const b of list) {
    for (const field of ['id', 'name', 'title', 'jp', 'blurb', 'hp', 'easyHp', 'w', 'h', 'tuning'])
      assert.ok(b[field] !== undefined && b[field] !== '', `${b.id} has ${field}`);
    assert.ok(b.pool.length >= 3, `${b.id} owns enough attacks to cycle: ${b.pool.length}`);
    assert.ok(b.easyHp < b.hp, `${b.id} is softer on easy`);
    for (const move of Array.from(b.pool))
      assert.ok(h.api.bossPatterns[move], `${b.id}'s ${move} is a real attack`);
  }
  assert.equal(h.bosses.has('nobody'), false);
  assert.equal(h.bosses.get('nobody').id, h.bosses.first, 'an unknown id falls back');
});

test('no two bosses fight the same way', () => {
  const h = harness();
  const list = Array.from(h.bosses.list);
  const shapes = list.map(b => Array.from(b.pool).join('>') + '|' + b.tempo +
    '|' + Object.keys(b.tuning).map(k => b.tuning[k]).join(','));
  assert.equal(new Set(shapes).size, list.length, 'every boss has its own pool, tempo or numbers');
  // and they should not all look alike either
  const looks = list.map(b => b.look || 'plain');
  assert.equal(new Set(looks).size, list.length, 'every boss reads differently on screen');
  // the roster should span a real range of armour
  const hp = list.map(b => b.hp);
  assert.ok(Math.max(...hp) >= Math.min(...hp) * 1.6, `armour spans a range: ${Math.min(...hp)}..${Math.max(...hp)}`);
});

test('the Warden still does exactly what it did before the roster existed', () => {
  const frozen = JSON.parse(fs.readFileSync(path.join(__dirname, 'warden-baseline.json'), 'utf8'));
  const h = harness();
  const warden = h.bosses.get('warden');
  assert.deepEqual(Array.from(warden.pool), frozen.order.slice(0, 6), 'same six attacks in the same order');
  assert.equal(warden.hp, 72); assert.equal(warden.easyHp, 48);
  assert.equal(warden.w, frozen.fire.volley.body.w); assert.equal(warden.h, frozen.fire.volley.body.h);
  assert.equal(warden.tempo, 1, 'unchanged tempo');
  for (const move of frozen.order.slice(0, 6)) {
    // the frozen numbers are absolute, so this has to be the arena they were taken in
    const { g, b } = arena(h, 'warden', 'signal-yard');
    const shots = fire(g, b, move).map(x => ({ x: Math.round(x.x), y: Math.round(x.y),
      vx: Math.round(x.vx), vy: Math.round(x.vy), r: x.r, power: x.power,
      kind: x.kind || null, g: x.g || 0 }));
    assert.deepEqual(shots, frozen.fire[move].bullets, `${move} fires the same shots`);
    assert.equal(b.dashTime || 0, frozen.fire[move].dashTime, `${move} dash hold`);
    assert.equal(Math.round(b.vy || 0), frozen.fire[move].vy, `${move} leap`);
  }
});

test('a boss is barely bigger than the player, and never plants itself', () => {
  const h = harness();
  const { g } = arena(h, 'warden');
  const p = g.state.player;
  for (const def of Array.from(h.bosses.list)) {
    assert.ok(def.w > p.w && def.h > p.h, `${def.id} outsizes the player: ${def.w}x${def.h}`);
    assert.ok(def.w <= p.w * 2 && def.h <= p.h * 1.6,
      `${def.id} is only a little bigger: ${def.w}x${def.h} against ${p.w}x${p.h}`);
    for (const knob of ['stepSpeed', 'hopLift', 'hopChance', 'restless'])
      assert.ok(def.tuning[knob] > 0, `${def.id} has a ${knob}`);
  }
});

test('a boss keeps moving between attacks, and hops without shaking the floor', () => {
  const h = harness();
  const { g, b } = arena(h, 'warden');
  const seen = new Set();
  let airborne = 0, waves = 0, landings = 0, wasUp = false;
  // hold it between moves so nothing but the scurry can touch the body
  b.attack = 'tell-volley'; b.timer = 999;
  let roll = 0;
  g._roll = () => [.5, .15, .1][roll++ % 3];      // picks a side, a short hop away, and hops
  for (let i = 0; i < 240; i++) {
    g._boss(1 / 60);
    seen.add(Math.round(b.x));
    assert.ok(b.y <= b.baseY, `never sinks through the floor, frame ${i}`);
    if (b.y < b.baseY) airborne++;
    if (wasUp && b.y === b.baseY) landings++;
    wasUp = b.y < b.baseY;
    waves += g.state.bullets.filter(x => x.kind === 'wave').length;
    g.state.bullets = [];
  }
  assert.ok(seen.size > 40, `it covers ground rather than standing still: ${seen.size} places`);
  assert.ok(airborne > 20, `and leaves the floor on the way: ${airborne} frames in the air`);
  assert.equal(waves, 0, 'a hop is not a slam, so the floor stays quiet');
  assert.ok(b.x >= h.api.arena.bossMin && b.x <= h.api.arena.bossMax, 'and stays in the arena');
  assert.ok(landings >= 3, `every hop comes back down: ${landings} landings`);
});

test('the scurry gives way to a move that owns the body', () => {
  const h = harness();
  const { g, b } = arena(h, 'warden');
  g._roll = () => 0;                              // every chance to fidget is taken
  const dashFrom = fire(g, b, 'dash') && b.x;
  for (let i = 0; i < 30; i++) g._boss(1 / 60);
  assert.ok(b.y === b.baseY, 'no hopping mid-charge');
  assert.ok(Math.abs(b.x - dashFrom) > 60, 'the charge still covers ground');
  const { g: g2, b: b2 } = arena(h, 'warden');
  g2._roll = () => 0;
  fire(g2, b2, 'slam');
  assert.ok(b2.leap, 'the slam takes the wheel');
  let frames = 0;
  while (!b2.slammed && frames < 120) { g2._boss(1 / 60); frames++; }
  assert.ok(b2.slammed && !b2.leap, 'and gives it back on landing');
  assert.equal(g2.state.bullets.filter(x => x.kind === 'wave').length, 2, 'the real slam waves');
});

test('each attack does something, for every boss that owns it', () => {
  const h = harness();
  for (const def of Array.from(h.bosses.list)) {
    for (const move of Array.from(def.pool)) {
      const { g, b } = arena(h, def.id);
      const shots = fire(g, b, move);
      if (move === 'dash') assert.ok(b.dashTime > 0, `${def.id} charges`);
      else if (move === 'slam') assert.ok(b.vy < 0, `${def.id} leaves the floor`);
      else assert.ok(shots.length > 0, `${def.id}'s ${move} puts something on the board`);
    }
  }
});

test('the new attacks behave the way their wind-up promises', () => {
  const h = harness();
  // a wall is a column with exactly one hole in it
  const coil = arena(h, 'coilhead');
  const wall = fire(coil.g, coil.b, 'wall');
  assert.equal(wall.length, h.bosses.get('coilhead').tuning.wallRows - 1, 'one row is missing');
  assert.ok(wall.every(s => s.vy === 0), 'the column travels flat');
  const heights = wall.map(s => Math.round(s.y)).sort((a, z) => a - z);
  const steps = heights.slice(1).map((y, i) => y - heights[i]);
  assert.equal(steps.filter(d => d > h.bosses.get('coilhead').tuning.wallStep + 1).length, 1,
    `exactly one gap in the column: ${steps.join(', ')}`);

  // mines arc out, settle where they land, then throw a fan when the fuse runs out
  const ash = arena(h, 'ashmaw');
  const lobbed = fire(ash.g, ash.b, 'mines');
  assert.equal(lobbed.length, h.bosses.get('ashmaw').tuning.mineShells, 'every mine is lobbed');
  assert.ok(lobbed.every(s => s.g > 0 && s.mine), 'they arc, and they are mines');
  let laid = [];
  for (let i = 0; i < 200 && !laid.length; i++) {
    ash.g._bullets(1 / 60);
    laid = Array.from(ash.g.state.bullets).filter(s => s.kind === 'mine');
  }
  assert.ok(laid.length > 0, 'a mine is left sitting where it landed');
  assert.ok(laid.every(s => s.vx === 0 && s.vy === 0), 'and it stays put');
  for (let i = 0; i < 200; i++) ash.g._bullets(1 / 60);
  const fan = Array.from(ash.g.state.bullets).filter(s => s.pops);
  assert.ok(fan.length >= h.bosses.get('ashmaw').tuning.mineBurst, `the fuse throws a fan: ${fan.length}`);
});

test('the numbers on a roster entry actually reach the attack', () => {
  const h = harness();
  const wide = arena(h, 'nullpriest'), plain = arena(h, 'warden');
  assert.ok(fire(wide.g, wide.b, 'ring').length > fire(plain.g, plain.b, 'ring').length,
    'a wider spread means more shots');
  const heavy = arena(h, 'ashmaw');
  assert.equal(fire(heavy.g, heavy.b, 'mortar').length, h.bosses.get('ashmaw').tuning.mortarShells,
    'the shell count is the entry\'s own');
  const flood = arena(h, 'tidebreaker');
  assert.equal(fire(flood.g, flood.b, 'wave').length, h.bosses.get('tidebreaker').tuning.waveCount,
    'more than one wave leaves at once');
  // tempo scales the wind-up rather than the attack
  const quick = h.bosses.get('sparkwidow'), slow = h.bosses.get('gravelock');
  assert.ok(quick.tempo < 1 && slow.tempo > 1, 'the roster spans fast and slow');
});

test('a gauntlet sends the next frame in instead of ending the run', () => {
  const h = harness();
  const g = new h.NeonGame(null);
  g.start({ stage: 'gauntlet' });
  const order = Array.from(h.api.stage.bosses);
  const p = g.state.player;
  p.x = h.api.arena.spawn + 40; p.y = 270; p.invuln = 1e9;
  g._tick(1 / 60);
  assert.ok(g.state.boss, 'the first frame arrives');
  const met = [];
  for (let n = 0; n < order.length + 2 && g.state.mode === 'playing'; n++) {
    met.push(g.state.boss.id);
    p.hp = 1;                                   // the heal between frames must be worth something
    g.state.boss.hp = 0;
    for (let i = 0; i < 200 && g.state.mode === 'playing' && g.state.boss.id === met[met.length - 1]; i++) {
      p.invuln = 1e9; g._boss(1 / 60);
    }
    if (g.state.mode === 'playing') assert.equal(p.hp, 3, 'two armour back between frames');
  }
  assert.deepEqual(met, order, `all eight in order: ${met.join(', ')}`);
  assert.equal(g.state.mode, 'victory', 'the last one ends the run');
});

test('a run stage still ends when its single boss goes down', () => {
  const h = harness();
  const g = new h.NeonGame(null);
  g.start({ stage: 'signal-yard' });
  const p = g.state.player;
  p.x = h.api.arena.spawn + 40; p.y = 270; p.invuln = 1e9;
  g._tick(1 / 60);
  assert.equal(g.state.boss.id, 'warden');
  g.state.boss.hp = 0;
  for (let i = 0; i < 300 && g.state.mode === 'playing'; i++) { p.invuln = 1e9; g._boss(1 / 60); }
  assert.equal(g.state.mode, 'victory');
});
