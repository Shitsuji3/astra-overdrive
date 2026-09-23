// Just dodge (game.js _dodges): a dash pressed within two frames of a hit means the hit is not taken.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STEP = 1 / 60;
function setup() {
  const rafs = [],
    sounds = [];
  const c = {
    console,
    performance: { now: () => 0 },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: f => {
      rafs.push(f);
      return rafs.length;
    },
    cancelAnimationFrame() {}
  };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of [
    'assets/bosses.js',
    'assets/stages.js',
    'assets/run-rig-v6.js',
    'assets/saber-rig.js',
    'game.js'
  ])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
  c.AstraRenderer = { draw() {} };
  const g = new c.NeonGame(null, {
    onEvent: (t, p) => {
      if (t === 'sound') sounds.push(p.name);
    }
  });
  g.start({});
  const s = g.state;
  // an empty arena: only what a test puts there can hit
  s.enemies = [];
  s.bullets = [];
  s.boss = null;
  s.player.onGround = true;
  return { g, s, p: s.player, sounds, rafs, J: c.AstraCombat.justDodge };
}
function step(g, n = 1) {
  for (let i = 0; i < n; i++) g._tick(STEP);
}
function dash(g) {
  g.setInput('dash', true);
  step(g);
  g.setInput('dash', false);
}
// a still bullet on the player's middle
function shoot(g) {
  const p = g.state.player;
  g._spawn(p.x + p.w / 2, p.y + p.h / 2, 0, 0, 'enemy', false, 1);
  g._bullets(0);
}

test('the window is two frames', () => {
  const { J } = setup();
  assert.ok(Math.abs(J.window - 2 / 60) < 1e-12);
});

test('a hit in the frame the dash starts, or up to two frames after, is dodged', () => {
  for (const late of [0, 1, 2]) {
    const { g, s, p, sounds } = setup();
    const hp = p.hp;
    dash(g);
    step(g, late);
    shoot(g);
    assert.equal(p.hp, hp, late + ' frames after the dash: no damage');
    assert.ok(s.justDodge, 'the dodge is recorded for the renderer');
    assert.ok(s.slowmo > 0, 'the world slows');
    assert.ok(sounds.includes('just-dodge'), 'its sound plays');
    assert.equal(p.invuln, 0, 'no damage blink');
  }
});

test('three frames after the dash is too late', () => {
  const { g, s, p } = setup();
  const hp = p.hp;
  dash(g);
  step(g, 3);
  shoot(g);
  assert.equal(p.hp, hp - 1);
  assert.equal(s.justDodge, undefined);
});

test('without a dash the hit lands', () => {
  const { g, p } = setup();
  const hp = p.hp;
  step(g, 30);
  shoot(g);
  assert.equal(p.hp, hp - 1);
});

test('the guard keeps the dodged attack from landing a frame later, then lifts', () => {
  const { g, p, J } = setup();
  const hp = p.hp;
  dash(g);
  shoot(g);
  step(g);
  shoot(g);
  assert.equal(p.hp, hp, 'still covered');
  step(g, Math.ceil(J.guard / STEP) + 1);
  shoot(g);
  assert.equal(p.hp, hp - 1, 'the guard has lifted');
});

test('one dodge per dash', () => {
  const { g, s, p, sounds } = setup();
  dash(g);
  shoot(g);
  const first = s.justDodge;
  step(g, 40);
  shoot(g);
  assert.equal(s.justDodge, first, 'no second dodge from the same dash');
  assert.equal(sounds.filter(n => n === 'just-dodge').length, 1);
  assert.ok(p.hp < p.maxHp);
});

test('the boss body is dodged too', () => {
  const { g } = setup();
  g.start({ stage: 'gauntlet' });
  const s = g.state,
    p = s.player,
    b = g._spawnBoss('warden');
  s.bossIntro = null;
  s.bullets = [];
  const hp = p.hp;
  dash(g);
  // put the player on the boss, wherever the arena keeps it
  p.x = b.x + b.w / 2 - p.w / 2;
  p.y = b.y + b.h - p.h;
  g._boss(0);
  assert.equal(p.hp, hp);
  assert.ok(s.justDodge);
});

test('the slow-down runs fewer steps per real second, then ends', () => {
  const { g, s, rafs, J } = setup();
  let now = 0;
  const frame = ms => {
    now += ms;
    rafs.shift()(now);
  };
  g.last = 0;
  frame(16);
  s.slowmo = J.slow;
  const t0 = s.time;
  for (let i = 0; i < 30; i++) frame(1000 / 60);
  const slowed = s.time - t0;
  assert.ok(slowed < 0.5 * 30 * STEP, 'half a second of real time ran well under half a second of game time');
  for (let i = 0; i < 120; i++) frame(1000 / 60);
  assert.equal(s.slowmo, 0, 'the slow-down wears off');
  const t1 = s.time;
  for (let i = 0; i < 30; i++) frame(1000 / 60);
  assert.ok(s.time - t1 > 0.9 * 30 * STEP, 'and full speed returns');
});
