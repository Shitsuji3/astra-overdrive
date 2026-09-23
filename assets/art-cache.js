// Image work that is done once instead of on every frame, shared by the renderer and the rigs.
//
//   bitmap(img, shades)  the picture copied into a canvas. The run atlas is an SVG with a chroma-key
//                        filter, which the browser re-renders, filter and all, each time it is
//                        drawn; a bitmap copy is drawn like any other picture. shades lists the
//                        shade() levels to make from the copy as soon as it exists.
//   shade(canvas, k)     a copy of a bitmap with every colour multiplied by k and alpha untouched:
//                        what the canvas filter brightness(k) does, made once. The rigs draw the far
//                        limbs with it.
//   ready(img)           loaded, and decoded if the browser can decode ahead of time.
//   decode(img, done)    decode off the main thread, then call done, so the first frame an image is
//                        drawn in does not stall while it is unpacked.
//   changed()            tell the game loop a picture arrived, so a still screen is redrawn with it.
//
// bitmap and shade never do the work on the spot. The first call queues it and returns null, and
// the caller draws the way it always has (straight from the SVG, or through the canvas filter)
// until the copy is ready. The queue runs one job per idle moment, because rasterising the SVG
// takes tens of milliseconds, which is long enough to swallow a quick gamepad tap if it happened
// at a busy time.
//
// The canvases carry complete / naturalWidth / naturalHeight so code written for an Image takes
// them as they are.
(function (g) {
  'use strict';
  var memo = typeof WeakMap === 'function' ? new WeakMap() : null,
    queue = [],
    waiting = false;
  function changed() {
    g.AstraArtRevision = (g.AstraArtRevision || 0) + 1;
  }
  function pump() {
    if (waiting || !queue.length) return;
    waiting = true;
    var run = function () {
      waiting = false;
      var job = queue.shift();
      if (job) job();
      pump();
    };
    if (g.requestIdleCallback) g.requestIdleCallback(run, { timeout: 1000 });
    else g.setTimeout(run, 16);
  }
  function make(img, paint) {
    var w = img.naturalWidth || img.width || 0,
      h = img.naturalHeight || img.height || 0;
    if (!w || !h || typeof document === 'undefined' || !document.createElement) return null;
    var cv = document.createElement('canvas'),
      q = cv.getContext ? cv.getContext('2d') : null;
    if (!q) return null;
    cv.width = w;
    cv.height = h;
    q.drawImage(img, 0, 0, w, h);
    if (paint) paint(q, w, h);
    cv.complete = true;
    cv.naturalWidth = w;
    cv.naturalHeight = h;
    return cv;
  }
  // the copy if it is made; otherwise queue it (once) and return null
  function derive(img, key, paint, then) {
    if (!memo || !img) return null;
    var slot = memo.get(img);
    if (!slot) memo.set(img, (slot = {}));
    if (slot[key]) return slot[key];
    if (slot[key] === undefined) {
      slot[key] = null;
      queue.push(function () {
        var made = make(img, paint);
        if (!made) {
          delete slot[key];
          return;
        }
        slot[key] = made;
        if (then) then(made);
        changed();
      });
      pump();
    }
    return null;
  }
  function shade(img, k) {
    // only bitmaps are shaded: a shaded copy of the SVG would be thrown away once its bitmap exists
    if (!img || !img.getContext) return null;
    return derive(img, 'shade' + k, function (q, w, h) {
      // Black laid over the picture's own pixels only: colour times k, alpha kept.
      q.globalCompositeOperation = 'source-atop';
      q.fillStyle = 'rgba(0,0,0,' + (1 - k) + ')';
      q.fillRect(0, 0, w, h);
    });
  }
  g.AstraArt = {
    bitmap: function (img, shades) {
      if (!img || img.complete === false) return null;
      return derive(img, 'bitmap', null, function (made) {
        for (var i = 0; shades && i < shades.length; i++) shade(made, shades[i]);
      });
    },
    shade: shade,
    ready: function (img) {
      return !!(img && img.complete && img.naturalWidth && !img.astraDecoding);
    },
    decode: function (img, done) {
      if (!img || typeof img.decode !== 'function') {
        done();
        return;
      }
      img.astraDecoding = true;
      var finish = function () {
        img.astraDecoding = false;
        done();
      };
      img.decode().then(finish, finish);
    },
    changed: changed
  };
})(window);
