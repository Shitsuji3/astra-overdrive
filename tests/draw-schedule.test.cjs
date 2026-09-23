// When the game loop draws. The simulation steps at 60 Hz; the picture is only redrawn when it can
// have changed, so a fast screen does not repeat identical frames and the hidden menu canvas is
// never drawn.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const rafs = [];
  const box = {
    console,
    performance: { now: () => 0 },
    requestAnimationFrame: f => {
      rafs.push(f);
      return rafs.length;
    },
    cancelAnimationFrame() {},
    addEventListener() {},
    removeEventListener() {}
  };
  box.globalThis = box;
  vm.createContext(box);
  for (const f of ['assets/bosses.js', 'assets/stages.js', 'game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box);
  let draws = 0;
  box.AstraRenderer = { draw: () => draws++ };
  const game = new box.NeonGame({ getContext: () => ({}) }, {});
  let now = 0;
  // run one animation frame `ms` after the previous one and report whether it drew
  const frame = ms => {
    now += ms;
    const before = draws;
    rafs.shift()(now);
    return draws > before;
  };
  return { box, game, frame };
}

test('the menu canvas is never drawn', () => {
  const { frame } = setup();
  for (let i = 0; i < 20; i++) assert.equal(frame(16), false);
  assert.equal(frame(1000), false, 'not even by the heartbeat');
});

test('a new game draws at once, then only on frames that step the simulation', () => {
  const { game, frame } = setup();
  frame(16);
  game.start({});
  game.last = 0;
  assert.equal(frame(1), true, 'the replaced state is drawn even before the first step');
  // 7 ms apart, like a 144 Hz screen: some frames step, some only repeat the picture
  const results = [];
  for (let i = 0; i < 12; i++) results.push({ drew: frame(7), time: game.state.time });
  let previous = results[0].time;
  for (const r of results.slice(1)) {
    assert.ok(r.drew || r.time === previous, 'a frame that stepped is always drawn');
    previous = r.time;
  }
  assert.ok(
    results.some(r => !r.drew),
    'frames that did not step are skipped'
  );
  assert.ok(
    results.some(r => r.drew),
    'frames that stepped are drawn'
  );
});

test('a pause is drawn once, then held until something changes', () => {
  const { box, game, frame } = setup();
  frame(16);
  game.start({});
  frame(17);
  game.pause();
  assert.equal(frame(16), true, 'the change of mode is drawn');
  for (let i = 0; i < 10; i++) assert.equal(frame(16), false, 'a still picture is not redrawn');
  game.setOptions({ reducedMotion: true });
  assert.equal(frame(16), true, 'a changed motion setting is drawn');
  assert.equal(frame(16), false);
  box.AstraArtRevision = (box.AstraArtRevision || 0) + 1;
  assert.equal(frame(16), true, 'an image that finished loading is drawn');
  assert.equal(frame(300), true, 'the slow heartbeat redraws a still picture');
  game.resume();
  game.last = 0;
});

test('the death animation is drawn to its end, then held', () => {
  const { game, frame } = setup();
  frame(16);
  game.start({});
  frame(17);
  game._die();
  let drawn = 0;
  for (let i = 0; i < 90; i++) if (frame(16)) drawn++;
  assert.ok(game.state.deathFx.done, 'the break effect finished');
  assert.ok(drawn >= 70, 'every frame of the effect was drawn');
  for (let i = 0; i < 10; i++) assert.equal(frame(16), false, 'the finished effect is not redrawn');
});
