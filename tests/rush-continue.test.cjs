// Carrying on after a defeat in the boss rush (mastery.js continueRush).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const c = {
    console,
    performance: { now: () => 0 },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame() {},
    cancelAnimationFrame() {}
  };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['assets/bosses.js', 'assets/stages.js', 'assets/run-rig-v6.js', 'assets/saber-rig.js', 'game.js', 'mastery.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
  const g = new c.NeonGame(null);
  g.start({ stage: 'gauntlet' });
  return { g, order: c.AstraCombat.stage.bosses };
}
// beat the boss on screen and bring on the next, the way the rush does between fights
function beat(g) {
  g._bossDown(g.state.boss);
  g._nextBoss();
  g.state.bossIntro = null;
}
function lose(g) {
  g.state.player.hp = 0;
  g._die();
}

test('nothing to continue when the first boss wins', () => {
  const { g } = setup();
  lose(g);
  assert.equal(g.state.mode, 'dead');
  assert.equal(g.rushContinueBoss(), null);
  assert.equal(g.continueRush(), false);
});

test('continuing restarts the boss that won and keeps what the run earned', () => {
  const { g, order } = setup();
  beat(g);
  const s = g.state;
  s.timeElapsed = 50;
  s.mastery.hits = 3;
  s.mastery.deflects = 2;
  s.mastery.counters = 1;
  lose(g);
  assert.equal(g.rushContinueBoss().id, order[1]);
  assert.equal(g.continueRush(), true);
  const t = g.state;
  assert.equal(t.mode, 'playing');
  assert.equal(t.bossIndex, 1);
  assert.equal(t.boss.id, order[1]);
  assert.equal(t.boss.hp, t.boss.maxHp, 'the boss that won starts over');
  assert.equal(t.player.hp, t.player.maxHp, 'and so does the player');
  assert.ok(t.bossIntro, 'with its entrance');
  assert.equal(t.mastery.clears.map(r => r.id).join(), order[0], 'the bosses already beaten stay beaten');
  assert.equal(t.mastery.hits, 3);
  assert.equal(t.mastery.deflects, 2);
  assert.equal(t.mastery.counters, 1);
  assert.equal(t.timeElapsed, 50);
  t.bossIntro = null;
  g._boss = () => {};
  g._tick(1 / 60);
  assert.ok(t.timeElapsed > 50 && t.timeElapsed < 50.1, 'the time of the run carries on from where it stopped');
  assert.equal(t.continues, 1, 'the run is marked as continued');
  assert.equal(g.rushContinueBoss(), null, 'the save is used up');
});

test('each continue is counted', () => {
  const { g } = setup();
  beat(g);
  lose(g);
  g.continueRush();
  g.state.bossIntro = null;
  beat(g);
  lose(g);
  g.continueRush();
  assert.equal(g.state.continues, 2);
  assert.equal(g.state.bossIndex, 2);
  assert.equal(g.state.mastery.clears.length, 2);
});

test('lost while the beaten boss is going down: carry on from the next one', () => {
  const { g, order } = setup();
  beat(g);
  g._bossDown(g.state.boss);
  lose(g);
  assert.equal(g.rushContinueBoss().id, order[2]);
});

test('no continue after the last boss has fallen', () => {
  const { g, order } = setup();
  for (let i = 1; i < order.length; i++) beat(g);
  g._bossDown(g.state.boss);
  lose(g);
  assert.equal(g.rushContinueBoss(), null);
});

test('practice in between keeps the save; the rush carries on from it', () => {
  const { g, order } = setup();
  beat(g);
  lose(g);
  g.startPractice(order[1]);
  lose(g);
  assert.equal(g.rushContinueBoss().id, order[1], 'losing a practice fight leaves the save alone');
  g.continueRush();
  assert.equal(g.state.practice, undefined, 'back in the rush, not in practice');
  assert.equal(g.state.boss.id, order[1]);
  assert.equal(g.state.mastery.clears.length, 1);
});

test('a full restart and the title drop the save', () => {
  const { g } = setup();
  beat(g);
  lose(g);
  g.retry();
  assert.equal(g.rushContinueBoss(), null, 'restarting from the first boss is a new run');
  assert.equal(g.state.continues, undefined);
  beat(g);
  lose(g);
  g.toTitle();
  assert.equal(g.rushContinueBoss(), null);
});
