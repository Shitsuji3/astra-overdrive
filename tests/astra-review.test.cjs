const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness() {
  let next = 0;
  const frames = new Map(), handlers = {}, events = [], pad = { current: [] };
  const sandbox = {
    console, performance: { now: () => 0 },
    requestAnimationFrame(fn) { frames.set(++next, fn); return next; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(type, fn) { handlers[type] = fn; },
    removeEventListener(type) { delete handlers[type]; },
    navigator: { getGamepads: () => pad.current },
    AstraRenderer: { draw() {} },
  };
  vm.createContext(sandbox);
  for (const f of ['assets/bosses.js','assets/stages.js', 'game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox);
  const g = new sandbox.NeonGame({ getContext: () => ({}) }, { onEvent: (type, data) => events.push({ type, data }) });
  function frame(time) { const entry = frames.entries().next().value; assert.ok(entry, 'RAF is scheduled'); frames.delete(entry[0]); entry[1](time); }
  function step(n) { for (let i = 0; i < n; i++) g._tick(1 / 60); }
  function clean() { g.start(); g.state.enemies = []; g.state.pickups = []; }
  return { g, frame, step, clean, pad, handlers, events, arena: sandbox.AstraCombat.arena };
}

test('wall jump pushes away from a wall on the right', () => {
  const { g, clean, step } = harness(); clean();
  g.state.platforms = [{ x: 200, y: 100, w: 20, h: 210, type: 'platform' }];
  Object.assign(g.state.player, { x: 175, y: 170, vx: 190, vy: 0, onGround: false, coyote: 0 });
  g.setInput('right', true); g.setInput('jump', true); step(1);
  assert.ok(g.state.player.vx < 0, `Expected leftward wall jump, vx=${g.state.player.vx}`);
  assert.ok(g.state.player.vy < 0);
});

test('wall jump pushes away from a wall on the left', () => {
  const { g, clean, step } = harness(); clean();
  g.state.platforms = [{ x: 200, y: 100, w: 20, h: 210, type: 'platform' }];
  Object.assign(g.state.player, { x: 221, y: 170, vx: -190, vy: 0, onGround: false, coyote: 0 });
  g.setInput('left', true); g.setInput('jump', true); step(1);
  assert.ok(g.state.player.vx > 0, `Expected rightward wall jump, vx=${g.state.player.vx}`);
});

test('pre-boss checkpoint upgrades an existing checkpoint and survives repeated retry', () => {
  const { g, clean, step, arena } = harness(); clean();
  g.state.checkpoint.active = true;
  g.state.player.x = arena.gate + 5; step(1);
  assert.equal(g.state.checkpoint.x, arena.checkpoint, 'pre-boss checkpoint is recorded');
  const checkpoint = g.state.checkpoint.x;
  g._die(); g.retry(); assert.equal(g.state.player.x, checkpoint);
  g._die(); g.retry(); assert.equal(g.state.player.x, checkpoint);
  step(60); assert.equal(g.state.mode, 'playing', 'checkpoint stands on solid ground');
});

test('boss arena gate prevents retreat after engagement', () => {
  const { g, clean, step, arena } = harness(); clean();
  g.state.player.x = arena.spawn + 30; step(1); assert.ok(g.state.boss);
  g.state.player.x = arena.gate + 1; g.state.player.vx = -190; g.setInput('left', true); step(30);
  assert.ok(g.state.player.x >= arena.gate, `arena exit at x=${g.state.player.x}`);
});

test('boss gate also bounds airborne players without relying on platform collision', () => {
  const { g, clean, step, arena } = harness(); clean();
  g.state.player.x = arena.spawn + 30; step(1); assert.ok(g.state.boss);
  Object.assign(g.state.player, { x: arena.gate + 1, y: 50, vx: -190, vy: -40, onGround: false, coyote: 0 });
  g.setInput('left', true); step(30);
  assert.ok(g.state.player.x >= arena.gate, `airborne arena exit at x=${g.state.player.x}`);
});

test('menu arrow keys preserve native navigation', () => {
  const { handlers } = harness(); let prevented = false;
  handlers.keydown({ key: 'ArrowDown', preventDefault() { prevented = true; } });
  handlers.keydown({ key: 'ArrowUp', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});

test('gamepad Start can pause then resume', () => {
  const { g, frame, pad } = harness(); g.start();
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  pad.current = [{ axes: [0, 0], buttons }];
  buttons[9].pressed = true; frame(20); assert.equal(g.state.mode, 'paused');
  buttons[9].pressed = false; frame(40);
  buttons[9].pressed = true; frame(60); assert.equal(g.state.mode, 'playing');
});

test('neutral connected gamepad does not erase keyboard movement', () => {
  const { g, frame, pad } = harness(); g.start();
  pad.current = [{ axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }];
  g.setInput('right', true); frame(20); frame(40); frame(60); frame(80);
  assert.ok(g.state.player.vx > 70, `keyboard vx=${g.state.player.vx}`);
});

test('gamepad movement and charge release when controls return to neutral', () => {
  const { g, frame, pad } = harness(); g.start();
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  pad.current = [{ axes: [1, 0], buttons }]; buttons[2].pressed = true;
  for (let i = 1; i <= 65; i++) frame(i * 20);
  assert.ok(g.state.player.charge > .8);
  pad.current[0].axes[0] = 0; buttons[2].pressed = false;
  for (let i = 66; i <= 100; i++) frame(i * 20);
  assert.equal(g.state.player.charge, 0, 'charge must release with button');
  assert.ok(Math.abs(g.state.player.vx) < 5, 'movement must stop with stick');
});

test('disconnecting a gamepad releases its movement input', () => {
  const { g, frame, pad } = harness(); g.start();
  pad.current = [{ axes: [1, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }];
  for (let i = 1; i <= 10; i++) frame(i * 20);
  pad.current = [];
  for (let i = 11; i <= 50; i++) frame(i * 20);
  assert.ok(Math.abs(g.state.player.vx) < 5);
});

test('charged shot release, actual pit death, retry and second start remain functional', () => {
  const { g, frame, clean, step, events } = harness(); clean();
  g.setInput('shoot', true); step(75); g.setInput('shoot', false); step(1);
  assert.ok(g.state.bullets.some(b => b.charged));
  Object.assign(g.state.player, { x: 800, y: 300, vy: 200, vx: 0 }); step(90);
  assert.equal(g.state.mode, 'dead'); assert.ok(events.some(e => e.type === 'death'));
  g.retry(); step(60); assert.equal(g.state.mode, 'playing');
  g.toTitle(); frame(20); g.start(); frame(40); frame(60);
  assert.ok(g.state.time > 0);
});
