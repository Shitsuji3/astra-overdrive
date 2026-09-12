const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

function harness() {
  const box = { console, performance: { now: () => 0 }, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {},
    navigator: { getGamepads: () => [] } };
  vm.createContext(box);
  for (const f of ['assets/bosses.js','assets/stages.js', 'assets/run-rig-v6.js', 'assets/saber-rig.js', 'game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box);
  const g = new box.NeonGame({ getContext: () => ({}) }, {});
  return { g, api: box.AstraCombat, stages: box.AstraStages, bosses: box.AstraBosses,
    ids: Array.from(box.AstraStages.list, s => s.id) };
}

test('the stage list is coherent enough to build a select screen from', () => {
  const { stages, ids } = harness();
  assert.ok(ids.length >= 2, `more than one stage: ${ids.join(', ')}`);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const def of Array.from(stages.list)) {
    for (const field of ['id', 'name', 'subtitle', 'blurb', 'worldWidth', 'spawn', 'arena', 'bosses', 'kind'])
      assert.ok(def[field], `${def.id} has ${field}`);
    assert.equal(typeof def.build, 'function', `${def.id} builds a layout`);
    assert.ok(def.sections.length >= 2, `${def.id} names its sectors`);
    assert.ok(def.pickups.length >= 4, `${def.id} lays out supplies`);
    assert.equal(def.sections[def.sections.length - 1].to, undefined,
      `${def.id}'s last sector catches everything past it`);
    assert.equal(def.checkpoints[def.checkpoints.length - 1].at, def.arena.gate,
      `${def.id} heals at the gate`);
  }
  assert.deepEqual(Array.from(stages.list, s => s.number), ids.map((_, i) => i + 1), 'numbering runs in order');
});

test('every mission has a spot on the select map, and no two share it', () => {
  const { stages } = harness();
  const list = Array.from(stages.list);
  const seen = [];
  for (const def of list) {
    assert.ok(def.site, `${def.id} has a place on the map`);
    // the frame the map is drawn in, with a margin so a pin is never half off the edge
    assert.ok(def.site.x >= 40 && def.site.x <= 860, `${def.id} sits inside the frame: x=${def.site.x}`);
    assert.ok(def.site.y >= 30 && def.site.y <= 200, `${def.id} sits inside the frame: y=${def.site.y}`);
    for (const other of seen) {
      const gap = Math.hypot(def.site.x - other.site.x, def.site.y - other.site.y);
      // two pins closer than this would overlap, since each one is 22px across
      assert.ok(gap >= 40 || other.kind === 'gauntlet' || def.kind === 'gauntlet',
        `${def.id} and ${other.id} are ${gap.toFixed(0)}px apart on the map`);
    }
    seen.push(def);
  }
  assert.equal(list.filter(d => d.kind === 'gauntlet').length, 1, 'one gauntlet, which takes the centre slot');
});

test('the opening stage is unchanged by the move into the stage list', () => {
  const frozen = JSON.parse(fs.readFileSync(path.join(__dirname, 'stage1-layout.json'), 'utf8'));
  const { g, api } = harness();
  g.start({ stage: 'signal-yard' });
  assert.equal(g.worldWidth, frozen.worldWidth);
  assert.deepEqual(JSON.parse(JSON.stringify(g.state.platforms)), frozen.platforms, 'same platforms');
  assert.deepEqual(JSON.parse(JSON.stringify(g.state.enemies)), frozen.enemies, 'same enemies');
  assert.deepEqual(JSON.parse(JSON.stringify(g.state.pickups)), frozen.pickups, 'same pickups');
  assert.deepEqual(JSON.parse(JSON.stringify(api.arena)), frozen.arena, 'same arena');
  assert.deepEqual(JSON.parse(JSON.stringify(api.checkpoints)), frozen.checkpoints, 'same checkpoints');
});

test('launching a stage swaps the whole run, not just the layout', () => {
  const { g, api, stages } = harness();
  const seen = [];
  for (const def of Array.from(stages.list)) {
    g.start({ stage: def.id });
    assert.equal(g.state.stage.id, def.id);
    assert.equal(g.worldWidth, def.worldWidth, `${def.id} sets the world width`);
    assert.equal(api.arena.gate, def.arena.gate, `${def.id} moves the arena`);
    assert.equal(api.checkpoints.length, def.checkpoints.length, `${def.id} brings its checkpoints`);
    assert.equal(g.state.player.x, def.spawn.x, `${def.id} starts him at its own spawn`);
    assert.equal(g.state.section, def.sections[0].name, `${def.id} opens on its first sector`);
    assert.equal(g.state.checkpoint.x, def.checkpoints[0].x, `${def.id} defaults the respawn to its own first mark`);
    seen.push({ world: def.worldWidth, gate: def.arena.gate });
  }
  assert.equal(new Set(seen.map(s => s.world)).size, seen.length, 'each stage is its own length');
  assert.equal(new Set(seen.map(s => s.gate)).size, seen.length, 'each arena sits somewhere different');
});

test('the boss carries the armour its stage asks for, on both difficulties', () => {
  const { g, stages, bosses } = harness();
  for (const def of Array.from(stages.list)) {
    const first = bosses.get(def.bosses[0]);
    for (const [difficulty, want] of [['normal', first.hp], ['easy', first.easyHp]]) {
      g.start({ stage: def.id, difficulty });
      const p = g.state.player;
      p.x = def.arena.spawn + 40; p.y = 270; p.invuln = 1e9;
      g._tick(1 / 60);
      assert.ok(g.state.boss, `${def.id} on ${difficulty}: the boss appears`);
      assert.equal(g.state.boss.id, first.id, `${def.id}: its own boss arrives`);
      assert.equal(g.state.boss.maxHp, want, `${def.id} on ${difficulty}: armour`);
    }
  }
});

test('a retry keeps you in the stage you were playing', () => {
  const { g, stages } = harness();
  const def = Array.from(stages.list)[1];
  g.start({ stage: def.id });
  g.state.checkpoint.active = true;
  g.state.checkpoint.x = def.checkpoints[0].x;
  g.state.player.hp = 0; g._die();
  g.retry();
  assert.equal(g.state.stage.id, def.id, 'same stage');
  assert.equal(g.state.player.x, def.checkpoints[0].x, 'back at its checkpoint');
  // and with no checkpoint reached he goes back to that stage's own start
  g.start({ stage: def.id });
  g.state.player.hp = 0; g._die(); g.retry();
  assert.equal(g.state.player.x, def.spawn.x, 'back at its spawn');
});

test('an unknown stage id falls back instead of breaking the boot', () => {
  const { g, stages } = harness();
  g.start({ stage: 'no-such-stage' });
  assert.equal(g.state.stage.id, stages.first, 'falls back to the opening stage');
  assert.equal(stages.has('no-such-stage'), false);
  assert.equal(stages.get('no-such-stage').id, stages.first);
});

test('sector names run out at the right places and prompts stop', () => {
  const { stages } = harness();
  const bands = [{ to: 100, name: 'A' }, { to: 300, name: 'B' }, { name: 'C' }];
  assert.equal(stages.bandAt(bands, 0).name, 'A');
  assert.equal(stages.bandAt(bands, 99).name, 'A');
  assert.equal(stages.bandAt(bands, 100).name, 'B');
  assert.equal(stages.bandAt(bands, 99999).name, 'C');
  const hints = [{ to: 50, text: 'first' }, { to: 120, text: 'second' }];
  assert.equal(stages.hintAt(hints, 10), 'first');
  assert.equal(stages.hintAt(hints, 60), 'second');
  assert.equal(stages.hintAt(hints, 200), '', 'past the last prompt there is nothing to say');
  assert.equal(stages.hintAt([], 5), '');
});

test('every stage reports a sector for every step of its run', () => {
  const { g, stages } = harness();
  for (const def of Array.from(stages.list)) {
    g.start({ stage: def.id });
    const p = g.state.player;
    for (let x = 0; x < def.worldWidth; x += 137) {
      g.state.mode = 'playing';
      p.x = x; p.y = 270; p.vy = 0; p.hp = 8; p.invuln = 1e9; g.state.boss = null;
      g._tick(1 / 600);
      assert.ok(g.state.section, `${def.id} names a sector at x=${x}`);
    }
  }
});
