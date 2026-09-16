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
  // His routine is now his own moves. What stays frozen is the classic catalogue, fired on his body.
  assert.ok(Array.from(warden.pool).every(m => h.api.bossMoves[m]), 'he fights with his own moves');
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

test('a boss is barely bigger than the player', () => {
  const h = harness();
  const { g } = arena(h, 'warden');
  const p = g.state.player;
  for (const def of Array.from(h.bosses.list)) {
    assert.ok(def.w > p.w && def.h > p.h, `${def.id} outsizes the player: ${def.w}x${def.h}`);
    assert.ok(def.w <= p.w * 2 && def.h <= p.h * 1.6,
      `${def.id} is only a little bigger: ${def.w}x${def.h} against ${p.w}x${p.h}`);
    assert.ok(def.tuning.stepSpeed > 0, `${def.id} has a walking speed`);
  }
});

test('between attacks a boss walks to one spot and then holds it', () => {
  const h = harness();
  const { g, b } = arena(h, 'warden');
  const C = h.api;
  let walkedTo = null, still = 0, drifted = 0;
  for (let i = 0; i < 60 * 30; i++) {
    // judge each frame by the state it began in: a frame can both finish a walk and start a
    // wind-up, and the movement in it belonged to the walk
    const was = { x: b.x, state: String(b.attack), dashing: b.dashTime > 0, air: b.leap || b.y < b.baseY, moving: !!b.move };
    g._boss(1 / 60);
    if (was.state.indexOf('walk-') === 0) walkedTo = b.walkTo;
    // outside a walk, only a move may move him - a charge, a leap, a lunge
    else if (b.x !== was.x && !was.dashing && !was.air && !was.moving) drifted++;
    if (b.x === was.x) still++;
  }
  assert.equal(drifted, 0, 'he never wanders: every step he takes is on his way somewhere');
  assert.ok(still > 60 * 12, `and he spends real time planted: ${(still / 60).toFixed(1)}s`);
  assert.ok(walkedTo !== null && walkedTo >= C.arena.bossMin && walkedTo <= C.arena.bossMax,
    'the spot he walks to is inside the arena');
  assert.ok(b.y === b.baseY || b.move, 'he is on the floor unless a move has him in the air');
});

test('a beat walks him to the distance it asks for', () => {
  const h = harness();
  const C = h.api;
  for (const band of ['near', 'mid', 'far']) {
    const { g, b } = arena(h, 'warden');
    const p = g.state.player, mid = p.x + p.w / 2;
    // aim him at one band and let the walk run its course
    b.beat = undefined;
    g._bossBeat(b, h.bosses.get('warden'));
    b.walkTo = Math.max(C.arena.bossMin, Math.min(C.arena.bossMax, mid + C.bossBands[band] - b.w / 2));
    for (let i = 0; i < 200 && String(b.attack).indexOf('walk-') === 0; i++) g._boss(1 / 60);
    assert.ok(Math.abs(b.x - b.walkTo) <= C.bossWalk.settle,
      `${band}: he got to ${Math.round(b.x)} against ${Math.round(b.walkTo)}`);
    assert.equal(String(b.attack).indexOf('tell-'), 0, `${band}: and then winds up`);
  }
});

test('a charge and the slam leap own the body while they run', () => {
  const h = harness();
  const { g, b } = arena(h, 'warden');
  const dashFrom = fire(g, b, 'dash') && b.x;
  for (let i = 0; i < 30; i++) g._boss(1 / 60);
  assert.equal(b.y, b.baseY, 'no hopping mid-charge');
  assert.ok(Math.abs(b.x - dashFrom) > 60, 'the charge covers ground');
  const { g: g2, b: b2 } = arena(h, 'warden');
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
      if (move === 'dash') assert.ok(b.dashTime > 0 || (b.move && b.move.kind === 'swoop'),
        `${def.id} charges, or swoops if it is in the air`);
      else if (move === 'slam') assert.ok(b.vy < 0, `${def.id} leaves the floor`);
      else if (move === 'dive' || move === 'swing') assert.ok(b.move && b.fly, `${def.id} takes to the air for its ${move}`);
      else if (h.api.bossMoves[move] || move === 'swoop') {
        // a move plays out over time: run it to its rest and see that it did something
        const from = { x: b.x, y: b.y };
        let spawned = shots.length, moved = false;
        for (let i = 0; i < 60 * 5 && String(b.attack) === move; i++) {
          g._boss(1 / 60); g._bullets(1 / 60);
          spawned = Math.max(spawned, g.state.bullets.length);
          if (b.x !== from.x || b.y !== from.y) moved = true;
        }
        assert.ok(spawned > 0 || moved, `${def.id}'s ${move} puts something on the board or moves the body`);
      }
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
  assert.equal(g.state.enemies.length, 0, 'boss rush has no regular enemies');
  const p = g.state.player;
  p.x = h.api.arena.spawn + 40; p.y = 270; p.invuln = 1e9;
  g._tick(1 / 60);
  assert.ok(g.state.boss, 'the first frame arrives');
  const met = [];
  for (let n = 0; n < order.length + 2 && g.state.mode === 'playing'; n++) {
    met.push(g.state.boss.id);
    p.hp = 1;                                   // the heal between frames must be worth something
    g.state.boss.hp = 0;
    g._boss(1 / 60);
    assert.equal(p.hp, 5, 'each defeat immediately heals four, including the final boss');
    if(n<order.length-1){
      const marker=g.state.nextBossMarker, next=h.bosses.get(order[n+1]);
      assert.equal(marker.id,next.id);
      assert.equal(marker.x,h.api.arena.bossX+next.w/2);
      assert.equal(marker.y,310);
    }else assert.equal(g.state.nextBossMarker,null,'no ninth boss marker');
    for (let i = 0; i < 200 && g.state.mode === 'playing' && g.state.boss.id === met[met.length - 1]; i++) {
      p.invuln = 1e9; g._boss(1 / 60);
    }
    assert.equal(p.hp, 5, 'healing is applied once, not again at spawn');
    assert.equal(g.state.nextBossMarker,null,'marker clears when the next boss arrives');
  }
  assert.deepEqual(met, order, `all eight in order: ${met.join(', ')}`);
  assert.equal(g.state.mode, 'victory', 'the last one ends the run');
});

test('boss-rush recovery is capped, idempotent and does not affect ordinary stages', () => {
  const h=harness(),g=new h.NeonGame(null);
  g.start({stage:'gauntlet'});let b=g._spawnBoss('warden');
  g.state.player.hp=7;g._bossDown(b);assert.equal(g.state.player.hp,8);
  g.state.player.hp=2;g._bossDown(b);assert.equal(g.state.player.hp,2,'repeated down cannot heal again');
  g.start({stage:'signal-yard'});b=g._spawnBoss('warden');g.state.player.hp=2;
  g._bossDown(b);assert.equal(g.state.player.hp,2);assert.equal(g.state.nextBossMarker,null);
  g.start({stage:'gauntlet'});assert.equal(g.state.enemies.length,0);assert.ok(!g.state.nextBossMarker,'restart clears preview');
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

// The signature moves. A move is run through the real boss tick, a frame at a time.
function runMove(g, b, frames, each) {
  for (let i = 0; i < frames && (String(b.attack) === 'dive' || String(b.attack) === 'swing'); i++) {
    const was = { x: b.x, y: b.y, phase: b.move && b.move.phase };
    g._boss(1 / 60); g._bullets(1 / 60);
    if (each) each(was, i);
  }
}

test('signature: COILHEAD rises, hunts from overhead, locks, then drives its sting into the floor', () => {
  const h = harness(), C = h.api, D = C.bossDive;
  const def = h.bosses.get('coilhead');
  assert.equal(Array.from(def.routine).slice(-1)[0].move, 'dive', 'the dive closes its loop');
  const { g, b } = arena(h, 'coilhead');
  const p = g.state.player;
  b.x = Math.min(C.arena.bossMax, p.x + 160);
  fire(g, b, 'dive');
  assert.equal(String(b.attack), 'dive');
  let top = b.y, lockX = null, movedAfterLock = false, landed = null, stuckFrames = 0, shocks = null;
  runMove(g, b, 60 * 5, (was, i) => {
    top = Math.min(top, b.y);
    assert.ok(b.x >= C.arena.bossMin && b.x <= C.arena.bossMax, 'it stays inside the arena');
    const m = b.move;
    if (m && m.phase === 'hover' && m.lockX === null && i % 6 === 0) p.x += 6;     // the player keeps moving
    if (m && m.lockX !== null && lockX === null) lockX = m.lockX;
    if (lockX !== null && m && (m.phase === 'hover' || m.phase === 'fall')) {
      p.x += 12;                                                                   // and sidesteps after the lock
      if (b.x !== lockX) movedAfterLock = true;
    }
    if (landed === null && was.phase === 'fall' && m && m.phase === 'stuck') {
      landed = { x: b.x, y: b.y };
      shocks = Array.from(g.state.bullets).filter(s => s.kind === 'wave');
    }
    if (m && m.phase === 'stuck' && was.phase === 'stuck') {
      stuckFrames++;
      assert.equal(b.x, landed.x, 'stuck, it does not move');
      assert.equal(b.y, b.baseY, 'and it is on the floor');
    }
  });
  assert.ok(top <= b.baseY - D.lift + 1, `it rises ${D.lift}px: top ${Math.round(top)} against floor ${b.baseY}`);
  assert.ok(lockX !== null, 'it locks its position before the drop');
  assert.equal(movedAfterLock, false, 'after the lock it does not follow the player');
  assert.ok(landed && landed.x === lockX, 'it lands where it locked');
  assert.equal(shocks.length, 2, 'two shocks leave the landing');
  assert.ok(shocks.some(s => s.vx < 0) && shocks.some(s => s.vx > 0), 'one each way');
  assert.ok(shocks.every(s => s.power === 1 && s.life <= D.shockLife), 'short and light');
  assert.ok(stuckFrames / 60 >= D.stuck - 2 / 60, `it stays stuck ${(stuckFrames / 60).toFixed(2)}s`);
  assert.equal(String(b.attack), 'rest', 'then it rests as its beat asks');
  assert.equal(b.fly, false); assert.equal(b.move, null);
});

test('signature: the sting hits a player who stays under it and misses one who stepped aside after the lock', () => {
  for (const sidestep of [false, true]) {
    const h = harness(), C = h.api;
    const { g, b } = arena(h, 'coilhead');
    const p = g.state.player;
    // it starts beside him, not on top of him: a body it spawned inside would hurt before anything moved
    b.x = p.x + 70;
    fire(g, b, 'dive');
    let hpBeforeFall = null, hitAtLanding = false, armed = false;
    runMove(g, b, 60 * 5, (was) => {
      const m = b.move;
      if (m && m.phase === 'hover' && !armed) { armed = true; p.invuln = 0; p.hp = 8; }
      if (m && m.phase === 'hover' && m.lockX !== null && hpBeforeFall === null) {
        hpBeforeFall = p.hp;
        if (sidestep) p.x = m.lockX + b.w + 90;
      }
      if (m && m.phase === 'hover' && m.lockX === null) p.x = b.x + b.w / 2 - p.w / 2;   // stay right under it
      if (was.phase === 'fall' && m && m.phase === 'stuck') {
        hitAtLanding = p.hp < hpBeforeFall;
        g.state.bullets = [];                       // only the body is being tested here, not the shocks
      }
    });
    assert.equal(hpBeforeFall, 8, 'nothing lands before the drop');
    assert.equal(hitAtLanding, !sidestep, sidestep ? 'stepping aside after the lock is safe' : 'staying under it is not');
  }
});

test('signature: SPARKWIDOW swings across the arena on a silk line, grazing the floor, and lands without a slam', () => {
  const h = harness(), C = h.api, S = C.bossSwing;
  const def = h.bosses.get('sparkwidow');
  const routine = Array.from(def.routine);
  assert.ok(routine.some(x => x.move === 'swing'), 'the swing is in its loop');
  assert.ok(routine.length <= 6, 'and the loop is still six beats');
  const { g, b } = arena(h, 'sparkwidow');
  const p = g.state.player;
  b.x = C.arena.bossMax;
  fire(g, b, 'swing');
  const anchor = C.bossSwingAnchor(b);
  assert.equal(b.move.ax, anchor.x, 'the line hangs over the middle of the arena');
  const startSide = Math.sign(b.x + b.w / 2 - anchor.x);
  let lowest = 0, minX = b.x, maxX = b.x, slamWaves = 0, saws = null, sweepEndSide = 0;
  runMove(g, b, 60 * 5, (was) => {
    assert.ok(b.x >= C.arena.bossMin && b.x <= C.arena.bossMax, 'it stays inside the arena');
    minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x);
    const m = b.move;
    if (m && (m.phase === 'sweep' || m.phase === 'climb')) lowest = Math.max(lowest, b.y + b.h);
    if (was.phase === 'sweep' && m && m.phase === 'drop') sweepEndSide = Math.sign(b.x + b.w / 2 - anchor.x);
    slamWaves += Array.from(g.state.bullets).filter(s => s.kind === 'wave').length;
    if (!saws && m && m.phase === 'saws') saws = Array.from(g.state.bullets).filter(s => s.kind === 'saw').map(s => s);
  });
  assert.ok(lowest >= 310 - 6 && lowest <= 310, `at the bottom its feet brush the floor: ${Math.round(lowest)}`);
  assert.equal(sweepEndSide, -startSide, 'it lets go on the far side');
  assert.ok(maxX - minX >= 300, `it crosses the arena: ${Math.round(maxX - minX)}px`);
  assert.equal(slamWaves, 0, 'the landing throws no slam wave');
  assert.equal(String(b.attack), 'rest');
  assert.ok(saws && saws.length === 2, 'two saws are thrown on landing');
  assert.ok(saws.some(s => s.vx < 0) && saws.some(s => s.vx > 0), 'one each way');
});

test('signature: a saw rolls out along the floor and comes back once', () => {
  const h = harness(), C = h.api, S = C.bossSwing;
  const { g, b } = arena(h, 'sparkwidow');
  g.state.bullets = [];
  g._spawn(b.x, 300, S.sawSpeed, 0, 'enemy', false, 1, { r: S.sawR, kind: 'saw', life: S.sawLife, turn: S.sawTurn, fxBoss: b.id });
  const saw = g.state.bullets[0], from = saw.x;
  let flips = 0, last = Math.sign(saw.vx), far = 0;
  for (let i = 0; i < 60 * 2 && g.state.bullets.length; i++) {
    g._bullets(1 / 60);
    far = Math.max(far, saw.x - from);
    if (Math.sign(saw.vx) !== last) { flips++; last = Math.sign(saw.vx); }
  }
  assert.equal(flips, 1, 'it turns round exactly once');
  assert.ok(far >= 180, `it goes out ${Math.round(far)}px first`);
  assert.equal(g.state.bullets.length, 0, 'and is gone at the end of its life');
  assert.equal(saw.y, 300, 'it keeps to the floor');
});

test('signature: a standing player in the swing path is struck by the body', () => {
  const h = harness(), C = h.api;
  const { g, b } = arena(h, 'sparkwidow');
  const p = g.state.player;
  b.x = C.arena.bossMax;
  fire(g, b, 'swing');
  const anchor = C.bossSwingAnchor(b);
  p.x = anchor.x - p.w / 2; p.y = 270; p.invuln = 0; p.hp = 8;
  let hit = false;
  runMove(g, b, 60 * 5, () => { const m = b.move; if (m && m.phase === 'sweep' && p.hp < 8) hit = true; p.x = anchor.x - p.w / 2; p.y = 270; });
  assert.ok(hit, 'the bottom of the swing hits someone standing there');
});

test('signature: a boss downed mid-move comes back to the floor', () => {
  const h = harness();
  for (const [id, move] of [['coilhead', 'dive'], ['sparkwidow', 'swing']]) {
    const { g, b } = arena(h, id);
    fire(g, b, move);
    for (let i = 0; i < 40; i++) g._boss(1 / 60);
    assert.ok(b.y < b.baseY - 20, `${id} is in the air`);
    b.hp = 0; g._boss(1 / 60);
    assert.equal(b.fly, false); assert.equal(b.move, null);
    for (let i = 0; i < 60 && b.y < b.baseY; i++) g._boss(1 / 60);
    assert.equal(b.y, b.baseY, `${id} falls back to the floor as it dies`);
  }
});

// COILHEAD flies: up between moves, down only for the dive.
function loop(g, b, seconds, each) {
  for (let i = 0; i < 60 * seconds; i++) {
    const was = { state: String(b.attack), y: b.y, move: b.move && b.move.kind, phase: b.move && b.move.phase };
    g._boss(1 / 60); g._bullets(1 / 60);
    if (each) each(was, i);
  }
}

test('flight: COILHEAD enters in the air and cruises over a standing player, within reach of a jump', () => {
  const h = harness();
  const def = h.bosses.get('coilhead');
  assert.ok(def.flies && def.flies.cruise > 0, 'the roster says it flies');
  const { g, b } = arena(h, 'coilhead');
  assert.equal(b.y, b.baseY - def.flies.cruise, 'it arrives at cruising height');
  assert.equal(b.fly, true);
  const p = g.state.player;
  // a standing player's top, and a jumping player's top at the height of the jump
  const standingTop = 310 - p.h, jumpTop = 310 - p.h - 84;
  let cruising = 0;
  loop(g, b, 12, (was) => {
    if (b.move || String(b.attack).indexOf('dive') >= 0 || String(b.attack).indexOf('dash') >= 0 || b.grounded) return;
    if (Math.abs(b.y - (b.baseY - def.flies.cruise)) > .5) return;              // taking off or settling
    cruising++;
    assert.ok(b.y + b.h < standingTop, `it clears a standing player's head: bottom ${b.y + b.h} against ${standingTop}`);
    assert.ok(b.y + b.h > jumpTop, `and a jump reaches it: bottom ${b.y + b.h} against ${jumpTop}`);
  });
  assert.ok(cruising > 60 * 4, `it spends most of its time cruising: ${(cruising / 60).toFixed(1)}s of 12`);
});

test('flight: it only comes down for the dive, stays down through the sting and rest, then takes off', () => {
  const h = harness(), C = h.api;
  const { g, b } = arena(h, 'coilhead');
  const cruiseY = b.baseY - b.flies;
  let downFrames = 0, downOutsideDive = 0, landedAfterDive = false, tookOff = false, sawDive = false, lastDiveEnd = -1;
  loop(g, b, 40, (was, i) => {
    if (String(b.attack) === 'dive') sawDive = true;
    const down = b.y >= b.baseY - .5;
    if (down) {
      downFrames++;
      // the frame it sets off for its next beat still starts on the floor; the climb begins the frame after
      const takingOff = was.state === 'rest' && String(b.attack).indexOf('walk-') === 0;
      const diving = String(b.attack) === 'dive' || (String(b.attack) === 'rest' && b.grounded) || takingOff;
      if (!diving) downOutsideDive++;
      if (String(b.attack) === 'rest' && b.grounded) landedAfterDive = true;
    }
    if (was.state === 'rest' && String(b.attack).indexOf('walk-') === 0 && landedAfterDive) lastDiveEnd = i;
    if (lastDiveEnd >= 0 && i - lastDiveEnd < 60 && b.y <= cruiseY + .5) tookOff = true;
  });
  assert.ok(sawDive, 'a full loop includes the dive');
  assert.ok(landedAfterDive, 'after the sting it rests on the floor');
  assert.equal(downOutsideDive, 0, 'it is never on the floor for anything else');
  assert.ok(downFrames / (60 * 40) < .2, `and it is down only now and then: ${(100 * downFrames / (60 * 40)).toFixed(0)}% of the time`);
  assert.ok(tookOff, 'it is back at cruising height within a second of setting off again');
});

test('flight: in the air its charge is a swoop that dips to a standing player and climbs back', () => {
  const h = harness(), C = h.api;
  const { g, b } = arena(h, 'coilhead');
  const p = g.state.player, tu = h.bosses.get('coilhead').tuning;
  b.x = C.arena.bossMin; p.x = C.arena.bossMax;
  fire(g, b, 'dash');
  assert.equal(b.dashTime, 0, 'no straight charge');
  assert.ok(b.move && b.move.kind === 'swoop', 'a swoop');
  const fromY = b.move.fromY, fromX = b.x;
  let lowest = b.y, lowestAt = 0, frames = 0;
  while (String(b.attack) === 'dash' && frames < 120) {
    g._boss(1 / 60); frames++;
    if (b.y > lowest) { lowest = b.y; lowestAt = frames; }
  }
  const standingTop = 310 - p.h, jumpFeet = 310 - 84;
  assert.ok(lowest + b.h > standingTop, `at the bottom it is at a standing player's height: ${lowest + b.h} against ${standingTop}`);
  assert.ok(lowest >= jumpFeet, `and low enough to be jumped over: top ${lowest} against feet at ${jumpFeet}`);
  assert.ok(Math.abs(lowestAt / 60 - tu.dashHold / 2) <= 2 / 60, `the bottom is half way through: ${(lowestAt / 60).toFixed(2)}s`);
  assert.ok(Math.abs(b.x - fromX) >= tu.dashSpeed * tu.dashHold * .9, 'it covers the charge\'s ground');
  assert.equal(b.y, fromY, 'and it climbs back to where it started');
  assert.equal(String(b.attack), 'rest'); assert.equal(b.fly, true, 'resting in the air');
});

test('flight: its volley from the air is aimed down at the player', () => {
  const h = harness(), C = h.api;
  const { g, b } = arena(h, 'coilhead');
  const p = g.state.player;
  b.x = p.x + 220;
  const shots = fire(g, b, 'volley');
  const target = p.y + p.h / 2, mid = shots[Math.floor(shots.length / 2)];
  const arrive = mid.y + mid.vy * Math.abs((p.x + p.w / 2 - mid.x) / mid.vx);
  assert.ok(Math.abs(arrive - target) < 24, `the middle of the fan reaches the player's chest: ${Math.round(arrive)} against ${Math.round(target)}`);
  assert.ok(shots.every(s => s.vy > -120), 'nothing is thrown up and away');
  // and on the floor the same boss fires the flat fan every other boss does
  b.fly = false; b.y = b.baseY; b.grounded = true;
  const flat = fire(g, b, 'volley'), tu = h.bosses.get('coilhead').tuning;
  assert.deepEqual(flat.map(s => s.vy), flat.map((s, i) => tu.volleyRise + i * tu.volleyFall), 'grounded, it is unchanged');
});

// ---- Each boss's own moves ---------------------------------------------------------------------------
const CLASSIC = ['volley', 'wave', 'dash', 'mortar', 'ring', 'slam', 'mines', 'wall'];
function runToRest(g, b, move, each) {
  let frames = 0;
  for (; frames < 60 * 6 && String(b.attack) === move; frames++) {
    g._boss(1 / 60); g._bullets(1 / 60);
    if (each) each(frames);
  }
  return frames;
}
function overlap(a, z) { return a.x < z.x + z.w && a.x + a.w > z.x && a.y < z.y + z.h && a.y + a.h > z.y; }
function box(q) { return q.hw ? { x: q.x - q.hw, y: q.y - q.hh, w: q.hw * 2, h: q.hh * 2 } : { x: q.x - q.r, y: q.y - q.r, w: q.r * 2, h: q.r * 2 }; }

test('moves: every boss fights only with moves drawn from its own body, and no two share one', () => {
  const h = harness(), own = {};
  for (const def of Array.from(h.bosses.list)) {
    for (const move of Array.from(def.pool)) {
      assert.ok(CLASSIC.indexOf(move) < 0, `${def.id} no longer uses the classic ${move}`);
      assert.ok(h.api.bossMoves[move] || ['dive', 'swing', 'swoop'].indexOf(move) >= 0, `${def.id}'s ${move} is a move of its own`);
      assert.ok(!own[move] || own[move] === def.id, `${move} belongs to ${own[move]}, not also to ${def.id}`);
      own[move] = def.id;
    }
    assert.ok(def.pool.length >= 3, `${def.id} has at least three moves`);
  }
});

test('moves: every move runs to a rest inside the arena, on time, and leaves the boss on its feet', () => {
  const h = harness(), C = h.api;
  for (const def of Array.from(h.bosses.list)) {
    for (const move of Array.from(def.pool)) {
      const { g, b } = arena(h, def.id);
      fire(g, b, move);
      const frames = runToRest(g, b, move, () => {
        assert.ok(b.x >= C.arena.bossMin && b.x <= C.arena.bossMax, `${def.id}'s ${move} stays inside the arena`);
      });
      assert.equal(String(b.attack), 'rest', `${def.id}'s ${move} ends in its rest`);
      assert.ok(frames / 60 <= C.bossPatterns[move].active + .3, `${def.id}'s ${move} takes ${(frames / 60).toFixed(2)}s`);
      assert.equal(b.move, null); assert.equal(!!b.phaseOut, false, 'nothing is left faded');
      if (!def.flies) { assert.equal(b.y, b.baseY, `${def.id} is back on the floor after its ${move}`); assert.equal(b.fly, false); }
    }
  }
});

test('moves: a hazard only hurts once it is armed, and it is not used up by the hit', () => {
  const h = harness();
  const { g, b } = arena(h, 'coilhead');
  const p = g.state.player;
  p.invuln = 0; p.hp = 8; g.state.bullets = [];
  g._spawn(p.x + p.w / 2, p.y + p.h / 2, 0, 0, 'enemy', false, 1,
    { kind: 'hazard', style: 'bolt', hw: 9, hh: 60, r: 60, armIn: .3, life: .6, solid: true, fxBoss: 'coilhead' });
  for (let i = 0; i < 15; i++) g._bullets(1 / 60);
  assert.equal(p.hp, 8, 'while it only warns, standing in it is safe');
  for (let i = 0; i < 6; i++) g._bullets(1 / 60);
  assert.equal(p.hp, 7, 'armed, it hurts');
  assert.equal(g.state.bullets.length, 1, 'and it is still there');
});

test('moves: WARDEN closes the gate from both ends of the arena, and its rocks wait, then fall on their marks', () => {
  const h = harness(), C = h.api;
  let { g, b } = arena(h, 'warden');
  fire(g, b, 'pincer');
  runToRest(g, b, 'pincer', () => {});
  let shocks = Array.from(g.state.bullets).filter(q => q.kind === 'wave');
  ({ g, b } = arena(h, 'warden'));
  fire(g, b, 'pincer');
  for (let i = 0; i < 20; i++) { g._boss(1 / 60); g._bullets(1 / 60); }
  shocks = Array.from(g.state.bullets).filter(q => q.kind === 'wave');
  assert.equal(shocks.length, 2, 'two shocks');
  const left = shocks.find(q => q.vx > 0), right = shocks.find(q => q.vx < 0);
  assert.ok(left && right && left.x < C.arena.bossMin + 30 && right.x > C.arena.bossMax, 'one from each end, running inward');

  ({ g, b } = arena(h, 'warden'));
  fire(g, b, 'quake');
  for (let i = 0; i < 30; i++) { g._boss(1 / 60); g._bullets(1 / 60); }
  const rocks = Array.from(g.state.bullets).filter(q => q.kind === 'rock');
  const marks = Array.from(g.state.bullets).filter(q => q.style === 'mark');
  assert.equal(rocks.length, 3, 'three rocks'); assert.equal(marks.length, 3, 'three marks');
  assert.ok(rocks.every(r => marks.some(mk => mk.x === r.x)), 'each rock has its mark under it');
  assert.ok(marks.every(mk => mk.harmless), 'the marks are only marks');
  const held = rocks.filter(r => r.armIn > 0);
  assert.ok(held.length >= 2 && held.every(r => r.y === -20), 'the later rocks are still held at the top');
});

test('moves: TIDEBREAKER throws a low blade to jump and a high one that passes over a standing player', () => {
  const h = harness();
  const { g, b } = arena(h, 'tidebreaker');
  const p = g.state.player;
  fire(g, b, 'crescent');
  runToRest(g, b, 'crescent', () => {});
  const blades = Array.from(g.state.bullets).filter(q => q.kind === 'crescent');
  assert.equal(blades.length, 2);
  const standing = { x: 0, y: 310 - p.h, w: 1e5, h: p.h }, jumped = { x: 0, y: 310 - 84 - p.h, w: 1e5, h: p.h };
  const low = blades.find(q => !q.high), high = blades.find(q => q.high);
  assert.ok(overlap(box(low), standing), 'the low blade hits a standing player');
  assert.ok(!overlap(box(low), jumped), 'and a jump clears it');
  assert.ok(!overlap(box(high), standing), 'the high blade passes over a standing player');
});

test('moves: OBSIDIAN CROWN fires a beam at head height, then one along the floor', () => {
  const h = harness();
  const { g, b } = arena(h, 'obsidian-crown');
  const p = g.state.player;
  fire(g, b, 'crownbeam');
  for (let i = 0; i < 3; i++) { g._boss(1 / 60); g._bullets(1 / 60); }
  const beams = Array.from(g.state.bullets).filter(q => q.style === 'beam');
  assert.equal(beams.length, 2);
  const [first, second] = beams.slice().sort((a, z) => a.armIn - z.armIn);
  const standing = { x: 0, y: 310 - p.h, w: 1e5, h: p.h }, airborne = { x: 0, y: 310 - 26 - p.h, w: 1e5, h: p.h };
  assert.ok(!overlap(box(first), standing), 'standing still is safe from the first beam');
  assert.ok(overlap(box(second), standing), 'the second beam sweeps a standing player');
  assert.ok(!overlap(box(second), airborne), 'and a jump clears it');
  assert.ok(second.armIn - first.armIn >= .6, 'with time between them to see which is which');
});

test('moves: NULLPRIEST fades, comes back on the far side of the player, and nothing touches it while faded', () => {
  const h = harness(), C = h.api;
  const { g, b } = arena(h, 'nullpriest');
  const p = g.state.player;
  b.x = p.x + 150;
  const before = Math.sign(b.x + b.w / 2 - (p.x + p.w / 2));
  fire(g, b, 'voidstep');
  let faded = 0, hpLost = 0, bossHit = false;
  runToRest(g, b, 'voidstep', () => {
    if (!b.phaseOut) return;
    faded++;
    // stand in it and shoot it: neither should register
    const hp = p.hp; p.invuln = 0; p.x = b.x; p.y = b.y + b.h - p.h;
    const bossHp = b.hp;
    g._spawn(b.x + b.w / 2, b.y + b.h / 2, 0, 0, 'player', false, 1);
    g._bullets(0); g._boss(0);
    if (p.hp < hp) hpLost++;
    if (b.hp < bossHp) bossHit = true;
    p.invuln = 1e9; g.state.bullets = g.state.bullets.filter(q => q.team !== 'player');
  });
  assert.ok(faded > 5, 'it is faded for a while');
  assert.equal(hpLost, 0, 'touching it while faded does no harm');
  assert.equal(bossHit, false, 'and shots pass through it');
});

test('moves: NULLPRIEST ends up on the other side of a player who stands still', () => {
  const h = harness();
  const { g, b } = arena(h, 'nullpriest');
  const p = g.state.player;
  p.x = h.api.arena.bossMin + 200;
  b.x = p.x + 150;
  fire(g, b, 'voidstep');
  runToRest(g, b, 'voidstep', () => {});
  assert.ok(b.x + b.w / 2 < p.x + p.w / 2, 'it reappears behind the player');
});

test('moves: NULLPRIEST\'s orb splits into eight', () => {
  const h = harness();
  const { g, b } = arena(h, 'nullpriest');
  fire(g, b, 'crossorb');
  let most = 0;
  for (let i = 0; i < 60 * 2; i++) {
    g._boss(1 / 60); g._bullets(1 / 60);
    most = Math.max(most, Array.from(g.state.bullets).filter(q => q.kind === 'voidorb' && q.r === 4).length);
  }
  assert.equal(most, 8);
});

test('moves: ASHMAW\'s molten rocks leave the floor burning where they come down', () => {
  const h = harness();
  const { g, b } = arena(h, 'ashmaw');
  fire(g, b, 'eruption');
  for (let i = 0; i < 20; i++) { g._boss(1 / 60); g._bullets(1 / 60); }
  const rocks = Array.from(g.state.bullets).filter(q => q.kind === 'rock');
  const fires = Array.from(g.state.bullets).filter(q => q.style === 'embers');
  assert.equal(rocks.length, 5); assert.equal(fires.length, 5);
  assert.ok(fires.every(f => f.armIn > .8), 'the burning waits for the rock to land');
  // follow one rock down and check it lands on its fire
  const rock = rocks[2], fire0 = fires[2];
  let landedAt = null;
  for (let i = 0; i < 120 && landedAt === null; i++) { const y = rock.y; g._bullets(1 / 60); if (g.state.bullets.indexOf(rock) < 0) landedAt = rock.x; }
  assert.ok(landedAt !== null && Math.abs(landedAt - fire0.x) < 8, `the rock comes down on its fire: ${Math.round(landedAt)} against ${Math.round(fire0.x)}`);
});

test('moves: SPARKWIDOW stands its ground and its thrown saws roll out along the floor and come back', () => {
  const h = harness(), { g, b } = arena(h, 'sparkwidow');
  fire(g, b, 'sawtoss');
  const x0 = b.x, dir = b.facing;
  const seen = new Map();
  let throwing = true;
  for (let i = 0; i < 60 * 2.4; i++) {
    // after its rest it walks on to its next beat, so only the throw itself is held to standing still
    if (throwing && String(b.attack) !== 'sawtoss') { throwing = false; g.state.boss = null; }
    if (throwing) { g._boss(1 / 60); assert.equal(b.x, x0, 'it does not move while it throws'); }
    g._bullets(1 / 60);
    for (const q of Array.from(g.state.bullets).filter(q => q.kind === 'saw')) {
      const r = seen.get(q) || { from: q.x, far: 0, back: false, y: q.y };
      const out = (q.x - r.from) * dir;
      r.far = Math.max(r.far, out); if (r.far > 20 && out < r.far - 20) r.back = true;
      assert.equal(q.y, r.y, 'a saw keeps to the floor'); seen.set(q, r);
    }
  }
  const saws = Array.from(seen.values());
  assert.equal(saws.length, 2, 'two saws');
  assert.ok(saws.every(r => r.back), 'both come back');
  assert.ok(saws[0].far > saws[1].far + 40, `the first runs further: ${Math.round(saws[0].far)} against ${Math.round(saws[1].far)}`);
});

test('moves: COILHEAD keeps to the air for its own moves', () => {
  const h = harness();
  for (const move of ['needles', 'arcbolt']) {
    const { g, b } = arena(h, 'coilhead');
    const cruise = b.y;
    fire(g, b, move);
    runToRest(g, b, move, () => { assert.equal(b.y, cruise, `${move} is flown at cruising height`); });
  }
});

test('moves: a leap lands on the floor and hands the body back', () => {
  const h = harness();
  for (const [id, move] of [['warden', 'quake'], ['tidebreaker', 'leapslash'], ['gravelock', 'anvil'], ['obsidian-crown', 'pounce']]) {
    const { g, b } = arena(h, id);
    fire(g, b, move);
    let top = b.y;
    runToRest(g, b, move, () => { top = Math.min(top, b.y); });
    assert.ok(top < b.baseY - 30, `${id}'s ${move} leaves the floor`);
    assert.equal(b.y, b.baseY); assert.equal(b.fly, false);
  }
});
