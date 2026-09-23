(function (g) {
  'use strict';
  // Original atlas, pre-rendered once at game resolution for consistent pixels.
  var image = null,
    pending = false,
    retryAt = 0,
    delay = 1000,
    frames = null,
    flashes = null,
    memory = new WeakMap();
  var definitions = {
    walker: {
      scale: [0.122, 0.122],
      anchorY: 62,
      rects: [
        [43, 34, 314, 334, 235, 366],
        [407, 32, 298, 335, 600, 365],
        [788, 34, 337, 333, 979, 365],
        [1169, 32, 313, 335, 1358, 365]
      ]
    },
    drone: {
      scale: [0.14, 0.12],
      anchorY: 32,
      rects: [
        [83, 394, 284, 244, 205, 520],
        [459, 392, 280, 247, 582, 520],
        [840, 411, 278, 227, 967, 520],
        [1152, 390, 357, 249, 1342, 520]
      ]
    },
    turret: {
      scale: [0.105, 0.125],
      anchorY: 62,
      rects: [
        [35, 671, 360, 288, 178, 955],
        [414, 671, 354, 288, 557, 955],
        [768, 670, 384, 289, 985, 955],
        [1154, 670, 380, 289, 1320, 955]
      ]
    }
  };
  function build() {
    frames = {};
    flashes = {};
    Object.keys(definitions).forEach(function (type) {
      var d = definitions[type];
      frames[type] = [];
      flashes[type] = [];
      d.rects.forEach(function (r) {
        var tile = document.createElement('canvas');
        tile.width = tile.height = 64;
        var c = tile.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.drawImage(
          image,
          r[0],
          r[1],
          r[2],
          r[3],
          32 + (r[0] - r[4]) * d.scale[0],
          d.anchorY + (r[1] - r[5]) * d.scale[1],
          r[2] * d.scale[0],
          r[3] * d.scale[1]
        );
        frames[type].push(tile);
        var white = document.createElement('canvas');
        white.width = white.height = 64;
        var q = white.getContext('2d');
        q.drawImage(tile, 0, 0);
        q.globalCompositeOperation = 'source-in';
        q.fillStyle = '#eaffff';
        q.fillRect(0, 0, 64, 64);
        flashes[type].push(white);
      });
    });
  }
  function load() {
    if (frames || pending || Date.now() < retryAt) return;
    pending = true;
    image = new Image();
    image.onload = function () {
      pending = false;
      delay = 1000;
      build();
      if (g.AstraArt) g.AstraArt.changed();
    };
    image.onerror = function () {
      pending = false;
      retryAt = Date.now() + delay;
      delay = Math.min(10000, delay * 2);
    };
    image.src = 'assets/enemy-atlas-v2.png';
  }
  function draw(c, s, e) {
    if (e.dead) return true;
    load();
    if (!frames || !frames[e.type]) return false;
    var x = e.x - ((s.camera && s.camera.x) || 0),
      w = e.w || 30,
      h = e.h || 34,
      time = s.time || 0;
    if (x < -70 || x > 710) return true;
    var m = memory.get(e);
    if (!m) {
      m = { timer: e.fireTimer, fireAt: -100 };
      memory.set(e, m);
    }
    if (e.fireTimer > m.timer + 0.1) m.fireAt = time;
    m.timer = e.fireTimer;
    var since = time - m.fireAt,
      frame = 0,
      facing = e.facing || -1,
      baseY = e.y + h;
    if (e.type === 'walker') {
      facing = Math.cos(time * 2 + (e.phase || 0)) >= 0 ? 1 : -1;
      frame = s.reducedMotion ? 0 : Math.floor((time / 0.56 + (e.phase || 0)) * 4) % 4;
    } else {
      var target = s.enemyTarget || s.player;
      if (target) facing = target.x + target.w / 2 < e.x + w / 2 ? -1 : 1;
      if (e.type === 'drone') {
        baseY = e.y + h / 2;
        frame = since < 0.1 ? 3 : s.reducedMotion ? 0 : Math.floor(time * 7 + (e.phase || 0)) % 3;
      } else frame = since < 0.09 ? 2 : since < 0.2 ? 3 : e.fireTimer < 0.28 ? 1 : 0;
    }
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(Math.round(x + w / 2), Math.round(baseY));
    if (facing > 0) c.scale(-1, 1);
    c.drawImage(frames[e.type][frame], -32, -definitions[e.type].anchorY);
    if (e.flash > 0) {
      c.globalAlpha = 0.7;
      c.drawImage(flashes[e.type][frame], -32, -definitions[e.type].anchorY);
    }
    c.restore();
    if (e.hp < e.maxHp) {
      c.fillStyle = '#06131c';
      c.fillRect(Math.round(x), e.y - 11, w, 3);
      c.fillStyle = '#ffbd6e';
      c.fillRect(Math.round(x) + 1, e.y - 10, (w - 2) * Math.max(0, Math.min(1, e.hp / e.maxHp)), 1);
    }
    return true;
  }
  // Fetched when a stage with enemies starts (preload) or when the first enemy is drawn. The boss
  // rush has no enemies, so it never downloads the atlas.
  g.AstraEnemyArt = {
    draw: draw,
    preload: load,
    get ready() {
      return !!frames;
    }
  };
})(window);
