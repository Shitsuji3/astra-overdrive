(function (g) {
  'use strict';
  // This adapter is also used by the ordinary web build; only Playables uses the SDK.
  var sdk = g.ytgame,
    doc = g.document,
    hosted = !!(sdk && sdk.IN_PLAYABLES_ENV),
    playable = hosted || !!(doc && doc.documentElement.hasAttribute('data-playables')),
    key = 'astra-overdrive-save',
    data = { version: 1, settings: {}, best: 0 },
    loaded = false,
    dirty = false,
    saving = null,
    loading = null,
    paused = false,
    audioEnabled = !hosted || sdk.system.isAudioEnabled(),
    listeners = [],
    ready = false,
    loader = null;

  function warn() {
    if (sdk && sdk.health && sdk.health.logWarning) sdk.health.logWarning();
  }
  function emit() {
    listeners.slice().forEach(function (f) {
      f(paused, audioEnabled);
    });
  }
  function pause(value) {
    if (paused === value) return;
    paused = value;
    if (doc) {
      doc.documentElement.classList.toggle('host-paused', value);
      var app = doc.getElementById('app');
      if (app) app.inert = value || !ready;
    }
    emit();
    // Save before the host tears down the iframe. Do not depend on browser lifecycle APIs.
    flush();
  }
  function accept(raw) {
    var parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid save data');
    if (parsed.version !== undefined) {
      if (
        parsed.version !== 1 ||
        !parsed.settings ||
        typeof parsed.settings !== 'object' ||
        Array.isArray(parsed.settings)
      )
        throw new Error('Unsupported save data');
      data = parsed;
    } else {
      // Also accept the original web save's settings structure.
      data = { version: 1, settings: parsed, best: 0 };
    }
    loaded = true;
    return data.settings;
  }
  function load() {
    if (loaded) return Promise.resolve(data.settings);
    if (loading) return loading;
    if (!playable) {
      try {
        accept(g.localStorage.getItem(key));
        data.best = +g.localStorage.getItem(key + '-best') || 0;
      } catch (e) {
        loaded = true;
      }
      return Promise.resolve(data.settings);
    }
    loading = Promise.resolve()
      .then(function () {
        if (!sdk) throw new Error('SDK unavailable');
        return sdk.game.loadData();
      })
      .then(accept)
      .finally(function () {
        loading = null;
      });
    return loading;
  }
  function flush() {
    if (!playable || !loaded || !dirty) return saving || Promise.resolve(true);
    if (saving) return saving;
    saving = (async function () {
      while (dirty) {
        var body = JSON.stringify(data);
        if (body.length * 2 > 3 * 1024 * 1024) {
          warn();
          return false;
        }
        dirty = false;
        try {
          await sdk.game.saveData(body);
        } catch (e) {
          dirty = true;
          warn();
          return false;
        }
      }
      return true;
    })().finally(function () {
      saving = null;
    });
    return saving;
  }
  function save(settings, best) {
    if (!loaded) return Promise.resolve(false);
    data.settings = settings;
    if (best !== undefined) data.best = best;
    if (!playable) {
      try {
        g.localStorage.setItem(key, JSON.stringify(settings));
        if (best !== undefined) g.localStorage.setItem(key + '-best', String(best));
      } catch (e) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    }
    dirty = true;
    return flush();
  }
  function waitForRetry(message) {
    loader.querySelector('p').textContent = message;
    var button = loader.querySelector('button');
    button.hidden = false;
    if (button.focus) button.focus();
    return new Promise(function (resolve) {
      button.onclick = function () {
        button.hidden = true;
        loader.querySelector('p').textContent = 'セーブデータを読み込み中…';
        resolve();
      };
    });
  }
  async function initialize() {
    if (!playable) return load();
    while (true) {
      try {
        return await load();
      } catch (e) {
        warn();
        await waitForRetry('セーブデータを読み込めませんでした。再試行してください。');
      }
    }
  }
  async function gameReady() {
    if (!playable || ready) return;
    // Do not report an interactive title while its main artwork is still decoding.
    var image = new g.Image();
    image.src = 'assets/title-art.png';
    try {
      await image.decode();
    } catch (e) {
      warn();
      await waitForRetry('画面を読み込めませんでした。再試行してください。');
      return gameReady();
    }
    do {
      if (paused)
        await new Promise(function (resolve) {
          function resumeOnly() {
            if (paused) return;
            listeners.splice(listeners.indexOf(resumeOnly), 1);
            resolve();
          }
          listeners.push(resumeOnly);
        });
      await new Promise(function (resolve) {
        g.requestAnimationFrame(resolve);
      });
    } while (paused);
    ready = true;
    loader.remove();
    doc.getElementById('app').inert = paused;
    sdk.game.gameReady();
  }
  g.AstraPlatform = {
    isPlayables: playable,
    isHosted: hosted,
    get paused() {
      return paused;
    },
    get best() {
      return +data.best || 0;
    },
    initialize: initialize,
    load: load,
    save: save,
    flush: flush,
    gameReady: gameReady,
    subscribe: function (f) {
      listeners.push(f);
      f(paused, audioEnabled);
    }
  };
  if (!playable) return;
  loader = doc.createElement('section');
  loader.id = 'platform-loading';
  loader.setAttribute('role', 'status');
  loader.innerHTML =
    '<strong>ASTRA // OVERDRIVE</strong><p>セーブデータを読み込み中…</p>' +
    '<button type="button" hidden>再試行</button>';
  doc.body.appendChild(loader);
  doc.getElementById('app').inert = true;
  // Capture input even when a keyboard event is dispatched at window rather than an inert node.
  [
    'keydown',
    'keyup',
    'pointerdown',
    'pointerup',
    'mousedown',
    'mouseup',
    'click',
    'input',
    'change'
  ].forEach(function (type) {
    g.addEventListener(
      type,
      function (e) {
        if (paused || (!ready && !loader.contains(e.target))) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true
    );
  });
  if (sdk) {
    // In standalone previews the SDK is a no-op, but its audio subscription can
    // emit its internal default (false) while isAudioEnabled() reports true.
    // Only a real SDK host may mute or suspend the game.
    if (hosted) {
      sdk.system.onAudioEnabledChange(function (enabled) {
        audioEnabled = !!enabled;
        emit();
      });
      sdk.system.onPause(function () {
        pause(true);
      });
      sdk.system.onResume(function () {
        pause(false);
      });
    }
    // The host may hide the iframe until this notification; waiting for its RAF can deadlock.
    // The stylesheet and loading overlay are already present. Force layout before notifying.
    if (loader.getBoundingClientRect) loader.getBoundingClientRect();
    sdk.game.firstFrameReady();
  }
})(window);
