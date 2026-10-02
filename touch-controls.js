(function (global) {
  'use strict';
  // Each finger owns its input. Lifting one finger never releases another finger's button.
  function attach(root, options) {
    var stick = root.querySelector('.touch-stick'),
      knob = root.querySelector('.touch-stick-knob'),
      buttons = Array.from(root.querySelectorAll('[data-input]')),
      pointers = new Map(),
      held = {},
      stickPointer = null,
      directions = ['left', 'right', 'up', 'down'];
    function enabled() {
      var g = options.getGame();
      return g && g.state.mode === 'playing' && !g.hostPaused && options.isEnabled();
    }
    function capture(el, id) {
      try {
        el.setPointerCapture(id);
      } catch (e) {}
    }
    function paint() {
      buttons.forEach(function (b) {
        b.classList.toggle('is-pressed', !!held[b.dataset.input]);
      });
      directions.forEach(function (a) {
        stick.querySelector('[data-direction="' + a + '"]').classList.toggle('is-pressed', !!held[a]);
      });
    }
    function update(a, value, cancel) {
      if (!!held[a] === !!value) return;
      held[a] = !!value;
      var g = options.getGame();
      if (g) {
        if (cancel && !value) g.cancelTouchInput(a);
        else g.setTouchInput(a, value);
      }
    }
    function ownButton(entry, button, cancel) {
      var previous = entry.action;
      entry.action = button && button.dataset.input;
      if (previous && previous !== entry.action) {
        var stillHeld = Array.from(pointers.values()).some(function (p) {
          return p.action === previous;
        });
        update(previous, stillHeld, cancel);
      }
      if (entry.action) update(entry.action, true);
      paint();
    }
    function moveStick(e) {
      var r = stick.getBoundingClientRect(),
        x = e.clientX - r.left - r.width / 2,
        y = e.clientY - r.top - r.height / 2,
        radius = r.width * 0.29,
        length = Math.hypot(x, y),
        dead = r.width * 0.1,
        ax = Math.abs(x),
        ay = Math.abs(y);
      directions.forEach(function (a) {
        var value =
          length > dead &&
          (a === 'left'
            ? x < -dead && ax >= ay * 0.7
            : a === 'right'
              ? x > dead && ax >= ay * 0.7
              : a === 'up'
                ? y < -dead && ay >= ax * 0.7
                : y > dead && ay >= ax * 0.7);
        update(a, value);
      });
      if (length > radius) {
        x *= radius / length;
        y *= radius / length;
      }
      knob.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      stick.classList.add('is-pressed');
      paint();
    }
    function release(e, cancel) {
      var entry = pointers.get(e.pointerId);
      if (!entry) return;
      pointers.delete(e.pointerId);
      if (entry.stick) {
        stickPointer = null;
        directions.forEach(function (a) {
          update(a, false, cancel);
        });
        knob.style.transform = '';
        stick.classList.remove('is-pressed');
      } else ownButton(entry, null, cancel);
      paint();
    }
    function reset() {
      var old = Array.from(pointers.entries());
      pointers.clear();
      stickPointer = null;
      held = {};
      var g = options.getGame();
      if (g) g.cancelTouchInput();
      knob.style.transform = '';
      stick.classList.remove('is-pressed');
      paint();
      old.forEach(function (p) {
        try {
          p[1].element.releasePointerCapture(p[0]);
        } catch (e) {}
      });
    }
    root.addEventListener('pointerdown', function (e) {
      if ((e.pointerType === 'mouse' && e.button !== 0) || !enabled()) return;
      var b = e.target.closest('[data-input]'),
        s = e.target.closest('.touch-stick');
      if (!b && !s) return;
      e.preventDefault();
      if (b && b.dataset.input === 'pause') {
        reset();
        options.getGame().pause();
        return;
      }
      if (s && stickPointer !== null) return;
      var entry = { element: s || b, stick: !!s, action: null };
      pointers.set(e.pointerId, entry);
      capture(entry.element, e.pointerId);
      if (s) {
        stickPointer = e.pointerId;
        moveStick(e);
      } else ownButton(entry, b, false);
    });
    root.addEventListener('pointermove', function (e) {
      var entry = pointers.get(e.pointerId);
      if (!entry) return;
      e.preventDefault();
      if (!enabled()) {
        reset();
        return;
      }
      if (entry.stick) {
        moveStick(e);
        return;
      }
      // Small thumb drift stays held; sliding deliberately onto another action switches it.
      var target = root.ownerDocument.elementFromPoint(e.clientX, e.clientY),
        b = target && target.closest('.touch-actions [data-input]'),
        original = buttons.find(function (button) {
          return button.dataset.input === entry.action;
        });
      if (!b && original) {
        var r = original.getBoundingClientRect();
        if (
          e.clientX >= r.left - 14 &&
          e.clientX <= r.right + 14 &&
          e.clientY >= r.top - 14 &&
          e.clientY <= r.bottom + 14
        )
          b = original;
      }
      ownButton(entry, b, false);
    });
    root.addEventListener('pointerup', function (e) {
      release(e, false);
    });
    root.addEventListener('pointercancel', function (e) {
      release(e, true);
    });
    root.addEventListener('lostpointercapture', function (e) {
      release(e, true);
    });
    root.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
    global.addEventListener('blur', reset);
    global.addEventListener('resize', reset);
    global.addEventListener('pagehide', reset);
    root.ownerDocument.addEventListener('visibilitychange', function () {
      if (root.ownerDocument.visibilityState === 'hidden') reset();
    });
    return { reset: reset };
  }
  global.AstraTouchControls = { attach: attach };
})(window);
