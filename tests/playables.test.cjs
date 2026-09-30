const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ cloud = true, hosted = cloud, load = async () => '', save = async () => {} } = {}) {
  const events = {},
    calls = [],
    frames = new Map(),
    stored = {},
    app = {},
    button = {};
  let next = 1;
  const loader = {
    setAttribute() {},
    contains() {
      return false;
    },
    querySelector(s) {
      return s === 'button' ? button : this;
    },
    remove() {
      this.removed = true;
    }
  };
  const docEvents = [],
    winEvents = [];
  const c = {
    console,
    performance: { now: () => 0 },
    document: {
      documentElement: { hasAttribute: () => cloud, classList: { toggle() {} } },
      getElementById: () => app,
      createElement: () => loader,
      body: { appendChild() {} },
      addEventListener(t) {
        docEvents.push(t);
      },
      removeEventListener() {}
    },
    addEventListener(t) {
      winEvents.push(t);
    },
    removeEventListener() {},
    requestAnimationFrame(f) {
      const id = next++;
      frames.set(id, f);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    localStorage: {
      getItem(k) {
        if (cloud) throw new Error('Forbidden localStorage');
        return stored[k];
      },
      setItem(k, v) {
        if (cloud) throw new Error('Forbidden localStorage');
        stored[k] = v;
      }
    },
    Image: class {
      async decode() {}
    }
  };
  c.window = c;
  if (cloud)
    c.ytgame = {
      IN_PLAYABLES_ENV: hosted,
      game: {
        async loadData() {
          calls.push('load');
          return load();
        },
        async saveData(raw) {
          calls.push(['save', raw]);
          return save(raw);
        },
        firstFrameReady() {
          calls.push('first');
        },
        gameReady() {
          calls.push('ready');
        }
      },
      system: {
        isAudioEnabled: () => false,
        onAudioEnabledChange(f) {
          events.audio = f;
        },
        onPause(f) {
          events.pause = f;
        },
        onResume(f) {
          events.resume = f;
        }
      },
      health: {
        logWarning() {
          calls.push('warning');
        }
      }
    };
  vm.createContext(c);
  function run(file) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), c);
  }
  run('platform.js');
  return {
    c,
    P: c.AstraPlatform,
    events,
    calls,
    frames,
    stored,
    app,
    loader,
    button,
    docEvents,
    winEvents,
    run,
    paint() {
      const pending = [...frames];
      frames.clear();
      pending.forEach(([, f]) => f(100));
    }
  };
}
const turns = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

test('standalone Playables preview ignores no-op SDK mute and pause subscriptions', async () => {
  const s = setup({ hosted: false });
  const state = [];
  s.P.subscribe((paused, enabled) => state.push({ paused, enabled }));
  await s.P.initialize();
  assert.equal(s.P.isPlayables, true);
  assert.deepEqual(state, [{ paused: false, enabled: true }]);
  assert.equal(s.events.audio, undefined);
  assert.equal(s.events.pause, undefined);
  assert.equal(s.events.resume, undefined);
});

test('web settings and legacy best retain the original storage keys', async () => {
  const s = setup({ cloud: false });
  s.stored['astra-overdrive-save'] = '{"music":0.2,"bossRecords":{"warden":{}}}';
  s.stored['astra-overdrive-save-best'] = '1250';
  const settings = await s.P.initialize();
  assert.equal(settings.music, 0.2);
  assert.equal(s.P.best, 1250);
  await s.P.save({ music: 0.3 }, 1500);
  assert.equal(s.stored['astra-overdrive-save'], '{"music":0.3}');
  assert.equal(s.stored['astra-overdrive-save-best'], '1500');
});
test('cloud load finishes before saves; localStorage is never accessed', async () => {
  let resolveLoad;
  const s = setup({
    load: () =>
      new Promise(r => {
        resolveLoad = r;
      })
  });
  const loading = s.P.load();
  assert.equal(await s.P.save({ music: 0 }), false);
  await turns();
  resolveLoad('{"version":1,"settings":{"music":0.2},"best":234}');
  const settings = await loading;
  assert.equal(settings.music, 0.2);
  assert.equal(s.P.best, 234);
  await s.P.save(settings);
  assert.equal(s.calls[0], 'first');
  assert.equal(s.calls[1], 'load');
  assert.equal(s.calls[2][0], 'save');
});
test('failed or unknown cloud saves cannot be overwritten with defaults', async () => {
  for (const raw of ['invalid', '{"version":2,"settings":{}}', '[]', 'null']) {
    const s = setup({ load: async () => raw });
    await assert.rejects(s.P.load());
    assert.equal(await s.P.save({}), false);
    assert.equal(s.calls.filter(c => Array.isArray(c)).length, 0);
  }
});
test('cloud load can be retried after a temporary error', async () => {
  let fail = true;
  const s = setup({
    load: async () => {
      if (fail) throw new Error();
      return '{"music":0.17}';
    }
  });
  const initial = s.P.initialize();
  await turns();
  assert.equal(s.button.hidden, false);
  fail = false;
  s.button.onclick();
  assert.equal((await initial).music, 0.17);
});
test('concurrent saves are serialized and the newest settings are sent', async () => {
  const resolves = [],
    received = [];
  const s = setup({
    save: raw =>
      new Promise(r => {
        received.push(JSON.parse(raw));
        resolves.push(r);
      })
  });
  await s.P.load();
  const a = s.P.save({ music: 0.1 });
  const b = s.P.save({ music: 0.2, bossRecords: { warden: { clears: 1 } } });
  await turns();
  assert.equal(received.length, 1);
  resolves.shift()();
  await turns();
  assert.equal(received.length, 2);
  assert.equal(received[1].settings.music, 0.2);
  resolves.shift()();
  await Promise.all([a, b]);
});
test('failed save remains pending and retries on SDK pause', async () => {
  let fail = true;
  const s = setup({
    save: async () => {
      if (fail) throw new Error();
    }
  });
  await s.P.load();
  assert.equal(await s.P.save({ stage: 'gauntlet' }), false);
  fail = false;
  s.events.pause();
  await turns();
  assert.equal(s.calls.filter(c => Array.isArray(c)).length, 2);
});
test('initial loading is inert; readiness follows decoding and firstFrameReady', async () => {
  const s = setup();
  assert.equal(s.app.inert, true);
  await s.P.load();
  const ready = s.P.gameReady();
  await turns();
  s.paint();
  await ready;
  assert.equal(s.app.inert, false);
  assert.equal(s.loader.removed, true);
  assert.ok(s.calls.indexOf('first') < s.calls.indexOf('ready'));
  s.events.pause();
  assert.equal(s.app.inert, true);
  s.events.resume();
  assert.equal(s.app.inert, false);
});
test('SDK pause during cloud loading delays gameReady until SDK resume', async () => {
  const s = setup();
  await s.P.load();
  s.events.pause();
  const ready = s.P.gameReady();
  await turns();
  s.paint();
  assert.equal(s.calls.includes('ready'), false);
  s.events.resume();
  await turns();
  s.paint();
  await ready;
  assert.equal(s.calls.includes('ready'), true);
});
test('host pause cancels frames, input and charge without changing a manual pause', async () => {
  const s = setup();
  for (const file of ['assets/bosses.js', 'assets/stages.js', 'game.js']) s.run(file);
  const g = new s.c.NeonGame(null);
  g.start({ stage: 'gauntlet' });
  g.pause();
  g.state.player.charge = 1;
  g._shootHeld = true;
  g.setHostPaused(true);
  assert.equal(g.raf, 0);
  assert.equal(g.state.player.charge, 0);
  assert.equal(g._shootHeld, false);
  g.resume();
  g.setInput('shoot', true);
  assert.equal(g.state.mode, 'paused');
  assert.equal(g.input.shoot, undefined);
  g.setHostPaused(false);
  assert.ok(g.raf);
  assert.equal(g.state.mode, 'paused');
  assert.equal(s.winEvents.includes('blur'), false);
  assert.equal(s.docEvents.includes('visibilitychange'), false);
});
test('SDK mute dominates in-game volumes and only SDK resumes audio', async () => {
  const s = setup(),
    medias = [],
    contexts = [];
  const node = () => ({
    gain: { value: 1 },
    connect(n) {
      return n || this;
    }
  });
  s.c.Audio = class {
    constructor() {
      medias.push(this);
      this.paused = true;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  };
  s.c.AudioContext = class {
    constructor() {
      this.state = 'running';
      contexts.push(this);
    }
    suspend() {
      this.state = 'suspended';
    }
    resume() {
      this.state = 'running';
    }
    createGain() {
      return node();
    }
  };
  s.run('audio.js');
  const A = s.c.AstraAudio;
  A.start();
  assert.equal(medias[0].muted, true);
  A.setMuted(false);
  A.setMaster(1);
  A.setMusic(1);
  A.setSfx(1);
  assert.equal(medias[0].muted, true);
  s.events.audio(true);
  assert.equal(medias[0].muted, false);
  s.events.pause();
  assert.equal(medias[0].paused, true);
  assert.equal(contexts[0].state, 'suspended');
  A.sound('shot');
  assert.equal(contexts[0].state, 'suspended');
  s.events.audio(true);
  assert.equal(contexts[0].state, 'suspended');
  s.events.resume();
  assert.equal(medias[0].paused, false);
  assert.equal(contexts[0].state, 'running');
  assert.equal(s.docEvents.includes('visibilitychange'), false);
  assert.equal(s.winEvents.includes('pagehide'), false);
});
