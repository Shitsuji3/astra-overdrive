// A hidden page is silent and a running fight pauses (audio.js setHidden, game.js _visibility).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function pageStub() {
  const docListeners = {},
    winListeners = {};
  const document = {
    visibilityState: 'visible',
    addEventListener: (t, f) => (docListeners[t] = docListeners[t] || []).push(f),
    removeEventListener: (t, f) => (docListeners[t] = (docListeners[t] || []).filter(x => x !== f))
  };
  const fire = (list, t) => (list[t] || []).forEach(f => f({ type: t }));
  return {
    document,
    winListeners,
    hide() {
      document.visibilityState = 'hidden';
      fire(docListeners, 'visibilitychange');
    },
    show() {
      document.visibilityState = 'visible';
      fire(docListeners, 'visibilitychange');
    },
    pagehide: () => fire(winListeners, 'pagehide'),
    pageshow: () => fire(winListeners, 'pageshow'),
    docListeners
  };
}

function audioSetup() {
  const page = pageStub(),
    medias = [],
    contexts = [];
  class Audio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.plays = 0;
      medias.push(this);
    }
    play() {
      this.paused = false;
      this.plays++;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  const node = () => ({
    gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
    frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect(n) {
      return n || this;
    },
    disconnect() {},
    start() {},
    stop() {}
  });
  class AudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.destination = node();
      this.resumes = 0;
      contexts.push(this);
    }
    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }
    resume() {
      this.state = 'running';
      this.resumes++;
      return Promise.resolve();
    }
    createGain() {
      return node();
    }
    createOscillator() {
      return node();
    }
  }
  const c = {
    console,
    document: page.document,
    Audio,
    AudioContext,
    addEventListener: (t, f) => (page.winListeners[t] = page.winListeners[t] || []).push(f)
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'audio.js'), 'utf8'), c);
  return { A: c.AstraAudio, page, medias, contexts };
}

test('the title music stops while the page is hidden and picks up when it is shown', () => {
  const { A, page, medias } = audioSetup();
  A.startTitle();
  const m = medias[medias.length - 1];
  assert.equal(m.paused, false, 'playing on the title');
  page.hide();
  assert.equal(m.paused, true, 'silent once hidden');
  page.show();
  assert.equal(m.paused, false, 'back when shown');
});

test('the effects context is suspended while hidden, and a sound does not wake it', () => {
  const { A, page, contexts } = audioSetup();
  A.start();
  A.sound('select');
  const ac = contexts[0];
  assert.equal(ac.state, 'running');
  page.hide();
  assert.equal(ac.state, 'suspended');
  A.sound('select');
  assert.equal(ac.state, 'suspended', 'an effect asked for while hidden does not resume it');
  page.show();
  assert.equal(ac.state, 'running');
});

test('starting a track while hidden waits until the page is shown', () => {
  const { A, page, medias } = audioSetup();
  page.hide();
  A.start();
  const m = medias[medias.length - 1];
  assert.equal(m.paused, true);
  page.show();
  assert.equal(m.paused, false);
});

test('a page put away without a visibility change (pagehide) is silenced too', () => {
  const { A, page, medias } = audioSetup();
  A.startTitle();
  const m = medias[medias.length - 1];
  page.pagehide();
  assert.equal(m.paused, true);
  page.pageshow();
  assert.equal(m.paused, false);
});

test('music that was stopped stays stopped when the page comes back', () => {
  const { A, page, medias } = audioSetup();
  A.startTitle();
  A.stop();
  const m = medias[medias.length - 1];
  page.hide();
  page.show();
  assert.equal(m.paused, true);
});

test('a running fight pauses when the page is hidden; the menu and a pause are left alone', () => {
  const page = pageStub(),
    events = [];
  const c = {
    console,
    document: page.document,
    performance: { now: () => 0 },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame() {},
    cancelAnimationFrame() {}
  };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['assets/bosses.js', 'assets/stages.js', 'game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
  const g = new c.NeonGame(null, { onEvent: t => events.push(t) });
  page.hide();
  assert.equal(g.state.mode, 'menu', 'the title is not touched');
  page.show();
  g.start({});
  page.hide();
  assert.equal(g.state.mode, 'paused');
  assert.ok(events.includes('pause-request'), 'the pause panel is asked for');
  page.show();
  assert.equal(g.state.mode, 'paused', 'coming back leaves it paused');
  g.destroy();
  assert.equal((page.docListeners.visibilitychange || []).length, 0, 'destroy removes the listener');
});
