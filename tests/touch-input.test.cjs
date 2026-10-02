const test = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
function make() {
  const c = {
    console,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    addEventListener() {},
    navigator: { getGamepads: () => [] }
  };
  vm.createContext(c);
  for (const f of [
    'assets/bosses.js',
    'assets/stages.js',
    'assets/run-rig-v6.js',
    'assets/saber-rig.js',
    'game.js'
  ])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
  const g = new c.NeonGame({ addEventListener() {}, getContext: () => ({}) });
  g.start();
  g.state.enemies = [];
  g.state.boss = null;
  const p = g.state.player;
  p.x = 100;
  p.y = 310 - p.h;
  p.onGround = true;
  return {
    g,
    p,
    step(n = 1) {
      for (let i = 0; i < n; i++) g._tick(1 / 60);
    }
  };
}
test('sub-frame touch taps survive and a buster release fires once', () => {
  const { g, p, step } = make();
  g.setTouchInput('jump', true);
  g.setTouchInput('jump', false);
  step();
  assert.ok(p.vy < 0);
  g.setTouchInput('shoot', true);
  g.setTouchInput('shoot', false);
  step(2);
  assert.equal(g.state.shots, 1);
  step(30);
  assert.equal(g.state.shots, 1);
});
test('touch movement and jump work together, without erasing held keyboard input', () => {
  const { g, p, step } = make();
  g.setInput('right', true);
  g.setTouchInput('right', true);
  g.setTouchInput('jump', true);
  step(4);
  assert.ok(p.vx > 0 && p.vy < 0);
  g.setTouchInput('right', false);
  step();
  assert.equal(g.input.right, true);
  assert.ok(p.vx > 0);
  g.cancelTouchInput();
  assert.equal(g.input.right, true);
});
test('up and down stick chords activate the existing rising slash and fan burst', () => {
  for (const [direction, combo] of [
    ['up', 4],
    ['down', 7]
  ]) {
    const { g, p, step } = make();
    g.setTouchInput(direction, true);
    g.setTouchInput('saber', true);
    step();
    assert.equal(p.saberCombo, combo);
    if (combo === 7) {
      step(100);
      assert.equal(p.fanCharge, 1.4);
      g.setTouchInput('saber', false);
      step();
      assert.equal(p.fanReleased, true);
    }
  }
});
test('saber hold still charges and deliberate release performs charged thrust', () => {
  const { g, p, step } = make();
  g.setTouchInput('saber', true);
  step(100);
  assert.equal(p.saberCharge, 1);
  g.setTouchInput('saber', false);
  step();
  assert.equal(p.saberCombo, 6);
});
test('cancelled buster and saber holds do not fire on the next step', () => {
  for (const action of ['shoot', 'saber']) {
    const { g, p, step } = make();
    g.setTouchInput(action, true);
    step(100);
    g.cancelTouchInput(action);
    step();
    assert.equal(g.state.shots, 0);
    assert.notEqual(p.saberCombo, 6);
    assert.equal(p.saberCharge, 0);
  }
});
test('cancelled fan is put away; other fingers and keyboard firing remain independent', () => {
  const { g, p, step } = make();
  g.setTouchInput('down', true);
  g.setTouchInput('saber', true);
  g.setTouchInput('shoot', true);
  step(60);
  g.cancelTouchInput('saber');
  assert.equal(p.saberCombo, 0);
  assert.equal(p.fanCharge, 0);
  assert.equal(g.touchInput.shoot, true);
  assert.equal(g.touchInput.down, true);
  g.setTouchInput('shoot', false);
  step();
  assert.equal(g.state.shots, 1);
  const other = make();
  other.g.setInput('shoot', true);
  other.g.setTouchInput('shoot', true);
  other.step();
  other.g.cancelTouchInput('shoot');
  other.step();
  assert.equal(other.g.state.shots, 0);
  other.g.setInput('shoot', false);
  other.step();
  assert.equal(other.g.state.shots, 1);
});
test('pause, retry and host pause clear touch input and unconsumed taps', () => {
  for (const operation of ['pause', 'retry', 'host']) {
    const { g, step } = make();
    g.setTouchInput('right', true);
    g.setTouchInput('shoot', true);
    g.setTouchInput('jump', true);
    if (operation === 'pause') {
      g.pause();
      g.resume();
    }
    if (operation === 'retry') {
      g.state.mode = 'dead';
      g.retry();
    }
    if (operation === 'host') {
      g.setHostPaused(true);
      g.setHostPaused(false);
    }
    assert.equal(Object.keys(g.touchInput).length, 0);
    assert.equal(Object.keys(g.touchPressed).length, 0);
    step();
    assert.equal(g.state.shots, 0);
  }
});
