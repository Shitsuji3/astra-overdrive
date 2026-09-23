/* ASTRA // OVERDRIVE procedural pixel-art renderer. */
(function (g) {
  'use strict';
  var W = 640,
    H = 360;
  var P = {
    ink: '#06131c',
    navy: '#0b2230',
    deep: '#102f3a',
    steel: '#2c6670',
    cyan: '#a8f7f0',
    ice: '#5ee6e1',
    blue: '#326ca4',
    cobalt: '#183e70',
    white: '#e9ffff',
    amber: '#ffb84a',
    orange: '#ff754d',
    coral: '#ed4c5c',
    pink: '#d43d72',
    violet: '#702a69'
  };
  function R(c, x, y, w, h, f) {
    c.fillStyle = f;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  function L(c, a, b, d, e, f, w) {
    c.strokeStyle = f;
    c.lineWidth = w || 1;
    c.beginPath();
    c.moveTo(a | 0, b | 0);
    c.lineTo(d | 0, e | 0);
    c.stroke();
  }
  function Q(c, a, f) {
    c.fillStyle = f;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    for (var i = 2; i < a.length; i += 2) c.lineTo(a[i], a[i + 1]);
    c.closePath();
    c.fill();
  }
  function T(c, s, x, y, z, f, a) {
    c.font = (z || 8) + 'px monospace';
    c.textAlign = a || 'left';
    c.textBaseline = 'top';
    c.fillStyle = f;
    c.fillText(s, x, y);
  }
  function C(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function gx(s, x) {
    return x - ((s.camera && s.camera.x) || 0);
  }
  function G(c, x, y, r, col, a) {
    var q = c.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, col);
    q.addColorStop(1, 'transparent');
    c.globalAlpha = a;
    c.fillStyle = q;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalAlpha = 1;
  }
  function background(c, s, t) {
    var cam = (s.camera && s.camera.x) || 0,
      gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#061722');
    gr.addColorStop(1, '#07131e');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);
    var sec = s.section || '';
    for (var i = 0; i < 25; i++) {
      var x = i * 48 - ((cam * 0.12) % 48),
        h = 35 + ((i * 37) % 85);
      R(c, x, 128 - h, 34, h, P.navy);
      R(c, x + 5, 132 - h, 24, 3, P.deep);
      for (var j = 0; j < 3; j++)
        if ((i + j) % 3) R(c, x + 9 + j * 7, 140 - h + j * 10, 3, 2, j % 2 ? P.amber : P.ice);
    }
    for (i = 0; i < 9; i++) {
      x = i * 94 - ((cam * 0.22) % 94);
      R(c, x, 58, 17, 204, P.deep);
      R(c, x + 4, 64, 9, 190, P.navy);
      L(c, x + 5, 70, x + 5, 247, P.steel, 1);
      L(c, x + 13, 70, x + 13, 247, P.ink, 2);
    }
    if (/reactor|boss|core/i.test(sec)) {
      for (i = 0; i < 4; i++) {
        x = 92 + i * 157 - ((cam * 0.15) % 157);
        R(c, x, 42, 54, 119, P.navy);
        R(c, x + 5, 47, 44, 108, P.deep);
        c.strokeStyle = P.steel;
        c.beginPath();
        c.arc(x + 27, 98, 29, 0, 7);
        c.stroke();
        c.beginPath();
        c.arc(x + 27, 98, 19, 0, 7);
        c.stroke();
        G(c, x + 27, 98, 27, P.cyan, 0.12);
      }
    } else if (/pipe|plant|power/i.test(sec)) {
      for (i = 0; i < 7; i++) {
        x = 18 + i * 105 - ((cam * 0.24) % 105);
        R(c, x, 150, 78, 53, P.navy);
        R(c, x + 5, 155, 68, 42, P.deep);
        for (j = 0; j < 4; j++) L(c, x + 11 + j * 15, 160, x + 11 + j * 15, 190, j % 2 ? P.steel : P.ice, 2);
      }
    }
    L(c, -20, 94, W + 20, 94, P.steel, 5);
    L(c, -20, 99, W + 20, 99, P.ink, 2);
    for (i = 0; i < 10; i++) {
      x = i * 79 - ((cam * 0.4) % 79);
      L(c, x, 158, x + 37, 129, P.steel, 3);
      L(c, x + 38, 129, x + 38, 190, P.ink, 5);
      R(c, x + 43, 145, 24, 20, P.deep);
      R(c, x + 46, 149, 18, 3, P.steel);
      L(c, x + 47, 158, x + 63, 158, P.ice, 1);
    }
    for (i = 0; i < 45; i++) {
      x = ((i * 83 + t * 5) % 680) - 20;
      var y = (i * 47 + t * 17) % 270;
      L(c, x, y, x - 2, y + 7, 'rgba(95,207,211,.28)', 1);
    }
    G(c, 520 - ((cam * 0.18) % 640), 145, 100, P.cyan, 0.07);
  }
  function platform(c, s, p) {
    var x = gx(s, p.x),
      y = p.y,
      h = p.h || 14;
    R(c, x, y, p.w, h, P.ink);
    R(c, x, y, p.w, 4, '#42858a');
    R(c, x, y + 5, p.w, h - 5, '#102a35');
    L(c, x, y, x + p.w, y, P.cyan, 1);
    for (var q = 8; q < p.w; q += 26) {
      R(c, x + q, y + 8, 12, 2, P.ink);
      L(c, x + q, y + 11, x + q + 9, y + 11, P.steel, 1);
    }
    if (p.type === 'floor')
      for (q = 0; q < p.w; q += 44) {
        var z = Math.min(18, p.w - q);
        Q(c, [x + q, y + 14, x + q + z, y + 14, x + q + z, y + 19, x + q, y + 19], P.amber);
      }
  }
  function player(c, s, p, ghost) {
    if (p.saberTime > 0 && !ghost) {
      c.save();
      c.translate(gx(s, p.x + p.w / 2), p.y + p.h - 3);
      if ((p.saberFacing || p.facing) < 0) c.scale(-1, 1);
      drawComboTrail(c, p);
      c.restore();
    }
    var x = gx(s, p.x),
      y = p.y,
      flip = p.facing < 0,
      run = Math.abs(p.vx || 0) > 1 && p.onGround,
      air = !p.onGround,
      wall = !!p.wallDir,
      dash = (p.dashTime || 0) > 0,
      ph = (p.animTime || s.time || 0) * 11,
      a = run ? Math.sin(ph) * 3 : 0;
    if (air) a = 0;
    if (wall) a = p.wallDir > 0 ? 3 : -3;
    c.save();
    c.globalAlpha = ghost ? 0.22 : 1;
    c.translate(flip ? x + p.w : x, y);
    if (flip) c.scale(-1, 1);
    if (dash) {
      Q(c, [-8, 18, -32, 10, -17, 27, -39, 25, -13, 34], P.cyan);
      Q(c, [-5, 25, -27, 36, -10, 39], P.ice);
    }
    Q(c, [3 + a, 27, 13 + a, 27, 14 - a, 40, 10 - a, 43, 1 + a, 42, -1 + a, 38], P.cobalt);
    R(c, 3 + a, 29, 8, 5, P.blue);
    Q(c, [1 + a, 39, 15 + a, 39, 17 + a, 44, 0 + a, 44], P.ink);
    Q(c, [16 - a, 27, 25 - a, 27, 28 - a, 40, 25 - a, 43, 16 - a, 42, 14 - a, 38], P.cobalt);
    R(c, 17 - a, 29, 8, 5, P.blue);
    Q(c, [14 - a, 39, 28 - a, 39, 32 - a, 44, 14 - a, 44], P.ink);
    Q(c, [5, 12, 11, 8, 23, 9, 29, 16, 26, 30, 8, 30, 3, 24], P.ink);
    Q(c, [7, 12, 12, 10, 22, 11, 26, 16, 24, 27, 9, 27, 6, 23], P.blue);
    Q(c, [10, 13, 22, 13, 24, 18, 8, 18], P.steel);
    R(c, 12, 19, 8, 6, P.cobalt);
    R(c, 14, 20, 5, 2, P.cyan);
    Q(c, [7, 3, 12, -1, 22, 0, 27, 5, 25, 14, 8, 14, 4, 10], P.ink);
    Q(c, [9, 3, 13, 1, 21, 2, 24, 6, 23, 11, 8, 11, 7, 8], P.blue);
    Q(c, [10, 5, 22, 4, 24, 8, 21, 10, 9, 9], P.cyan);
    R(c, 13, 5, 8, 2, P.white);
    R(c, 12, 12, 8, 2, P.orange);
    if (p.saberTime > 0) {
      L(c, 26, 18, 42, 7, P.ink, 5);
      L(c, 27, 17, 44, 5, P.white, 2);
      Q(c, [43, 6, 50, 2, 45, 10], P.cyan);
      c.strokeStyle = P.cyan;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(27, 18, 23, -1.15, 0.55);
      c.stroke();
    } else {
      Q(c, [25, 14, 34, 16, 38, 21, 34, 25, 25, 22], P.ink);
      Q(c, [26, 16, 33, 17, 35, 21, 32, 23, 25, 20], P.blue);
      R(c, 34, 19, 7, 4, P.orange);
    }
    c.restore();
  }
  function foe(c, s, e) {
    if (e.dead) return;
    if (g.AstraEnemyArt && g.AstraEnemyArt.draw(c, s, e)) return;
    var x = gx(s, e.x),
      y = e.y,
      w = e.w || 30,
      f = e.facing || -1,
      col = e.flash > 0 ? P.white : e.type === 'drone' ? P.pink : P.coral;
    c.save();
    c.translate(f > 0 ? x + w : x, y);
    if (f > 0) c.scale(-1, 1);
    if (e.type === 'drone') {
      G(c, 14, 10, 22, col, 0.18);
      Q(c, [2, 7, 9, 1, 24, 1, 31, 8, 25, 16, 8, 16], P.ink);
      Q(c, [5, 7, 11, 3, 23, 4, 27, 8, 22, 13, 9, 13], P.violet);
      R(c, 11, 7, 11, 3, col);
      L(c, 3, 16, 0, 23, col, 2);
      L(c, 27, 16, 31, 23, col, 2);
    } else if (e.type === 'turret') {
      R(c, 2, 7, 27, 14, P.ink);
      Q(c, [5, 7, 26, 7, 31, 14, 27, 20, 4, 20], P.steel);
      R(c, 8, 10, 15, 6, P.deep);
      R(c, 22, 11, 14, 4, col);
    } else {
      Q(c, [3, 13, 9, 4, 24, 3, 31, 12, 26, 26, 7, 26], P.ink);
      Q(c, [7, 13, 11, 6, 22, 6, 27, 13, 23, 22, 9, 22], P.coral);
      R(c, 12, 8, 11, 3, P.amber);
      R(c, 7, 23, 5, 7, P.steel);
      R(c, 22, 23, 5, 7, P.steel);
    }
    c.restore();
    if (e.hp < e.maxHp) {
      var bx = gx(s, e.x);
      R(c, bx, y - 6, w, 2, P.ink);
      R(c, bx, y - 6, w * C(e.hp / e.maxHp, 0, 1), 2, col);
    }
  }
  function boss(c, s, b) {
    if (!b || !b.active) return;
    var x = gx(s, b.x),
      y = b.y,
      tele = b.attack && (/charge|slam|laser|tele/i.test(b.attack) || (b.timer || 0) % 2 < 0.35);
    var fk = b.h / 110;
    if (!b.gone) {
      G(c, x + b.w / 2, y + b.h * 0.43, 85 * fk, b.flash > 0 ? P.white : P.pink, 0.16);
      c.save();
      c.translate(b.facing < 0 ? x + b.w : x, y);
      c.scale(b.facing < 0 ? -fk : fk, fk);
      for (var i = 0; i < 3; i++) {
        var ly = 70 + i * 7;
        Q(c, [10 + i * 4, ly, 27 + i * 3, ly, 23 + i, 105, 7 + i * 2, 105], P.ink);
        L(c, 14 + i * 4, ly + 4, 11 + i * 3, 101, P.steel, 3);
      }
      Q(c, [12, 28, 28, 11, 75, 6, 94, 25, 91, 75, 75, 90, 27, 87, 8, 68], P.ink);
      Q(
        c,
        [18, 28, 31, 16, 72, 13, 87, 27, 84, 69, 70, 81, 30, 78, 15, 63],
        b.flash > 0 ? P.white : P.violet
      );
      Q(c, [27, 30, 73, 27, 80, 41, 74, 61, 27, 63, 20, 49], P.deep);
      R(c, 36, 35, 29, 15, P.navy);
      R(c, 42, 39, 17, 5, P.cyan);
      R(c, 46, 40, 9, 2, P.white);
      R(c, 40, 55, 21, 3, P.coral);
      Q(c, [11, 32, -10, 19, -3, 11, 19, 22, 17, 38], P.ink);
      Q(c, [8, 31, -5, 20, 0, 16, 19, 27], P.coral);
      Q(c, [88, 30, 108, 17, 103, 9, 83, 22, 82, 39], P.ink);
      Q(c, [91, 29, 103, 18, 101, 14, 83, 27], P.coral);
      R(c, 24, 22, 7, 4, P.amber);
      R(c, 69, 20, 7, 4, P.amber);
      if (tele) {
        L(c, 0, 16, -28, 5, P.coral, 2);
        L(c, 98, 15, 130, 5, P.coral, 2);
        c.strokeStyle = P.amber;
        c.setLineDash([3, 3]);
        c.strokeRect(-8, 5, 120, 100);
        c.setLineDash([]);
      }
      c.restore();
    }
    R(c, 150, 335, 340, 7, P.ink);
    R(c, 152, 337, 336 * C(b.hp / b.maxHp, 0, 1), 3, P.coral);
    T(c, (b.name || 'WARDEN') + '  //  ' + (b.title || ''), 150, 324, 8, P.cyan);
  }
  // Render-only signatures. Solid cores mark the projectile; low-opacity tails are decoration.
  var BOSS_FX_COLORS = {
    warden: ['#ff547c', '#ffcf79'],
    tidebreaker: ['#30cbef', '#b6fff4'],
    coilhead: ['#8d86ff', '#d6ff86'],
    ashmaw: ['#ff6934', '#ffe5a3'],
    nullpriest: ['#ae68ff', '#ffb6f8'],
    gravelock: ['#dda160', '#fff0c0'],
    sparkwidow: ['#ff59b3', '#b8edff'],
    'obsidian-crown': ['#bd91ff', '#ffe4aa']
  };
  function nextBossMarker(c, s) {
    var m = s.nextBossMarker;
    if (!m || !s.boss || !s.boss.down) return;
    var actual = gx(s, m.x),
      x = C(actual, 48, W - 48),
      edge = x !== actual,
      y = m.y,
      co = bossColors(m.id),
      left = Math.max(0, g.AstraCombat.bossDeath.end - (s.boss.downTime || 0));
    c.save();
    if (!edge) {
      c.globalAlpha = s.reducedMotion ? 0.16 : 0.12 + 0.06 * Math.sin((s.time || 0) * 5);
      R(c, x - m.w / 2, y - m.h, m.w, m.h, co[0]);
      c.globalAlpha = 0.85;
      c.setLineDash([3, 3]);
      c.strokeStyle = co[1];
      c.lineWidth = 1;
      c.strokeRect(x - m.w / 2, y - m.h, m.w, m.h);
      c.setLineDash([]);
      c.strokeStyle = co[0];
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x, y - 2, m.w * 0.7, 5, 0, 0, Math.PI * 2);
      c.stroke();
      Q(c, [x - 5, y - m.h - 9, x + 5, y - m.h - 9, x, y - m.h - 4], co[1]);
    }
    var label = (edge ? (actual < 0 ? '◀ ' : '▶ ') : '') + 'NEXT / ' + m.name;
    var labelX = C(x, 108, W - 108),
      labelY = edge ? 92 : y - m.h - 35;
    R(c, labelX - 104, labelY - 3, 208, 27, P.ink);
    T(c, label, labelX, labelY, 8, co[1], 'center');
    T(c, left.toFixed(1) + 's', labelX, labelY + 12, 8, P.white, 'center');
    c.restore();
  }
  var deathPictures = new WeakMap();
  function playerBreak(c, s) {
    var f = s.deathFx;
    if (!f) return;
    var t = f.time,
      x = gx(s, f.x),
      y = f.y,
      reduced = !!s.reducedMotion,
      art = deathPictures.get(f);
    if (!art && g.document) {
      art = g.document.createElement('canvas');
      art.width = 80;
      art.height = 80;
      var ac = art.getContext('2d'),
        p = Object.assign({}, s.player, {
          x: 28,
          y: 22,
          vx: 0,
          vy: 0,
          onGround: true,
          invuln: 0,
          saberTime: 0,
          dashTime: 0,
          shootPoseTime: 0,
          wallDir: 0
        });
      if (playerSheet && playerSheet.complete && playerSheet.naturalWidth)
        drawPlayerSprite(ac, { time: 0, camera: { x: 0 }, reducedMotion: reduced }, p);
      else player(ac, { time: 0, camera: { x: 0 } }, p, false);
      deathPictures.set(f, art);
    }
    c.save();
    if (t < 0.16) {
      if (art) c.drawImage(art, x - 40, y - 42);
      G(c, x, y, 24, P.cyan, reduced ? 0.12 : 0.45);
      L(c, x - 10, y - 9, x + 9, y + 10, P.white, 2);
    } else {
      var a = t - 0.16,
        fade = C((1.12 - t) / 0.35, 0, 1),
        travel = reduced ? 0.4 : 1;
      // Actual armour pixels break into twelve pieces, instead of replacing the hero with generic sparks.
      for (var i = 0; i < 12; i++) {
        var col = i % 3,
          row = (i / 3) | 0,
          dx = (col - 1) * 50 + [-70, 65, -85, 90][row],
          dy = -95 + row * 27;
        c.save();
        c.globalAlpha = fade;
        c.translate(x + (col - 1) * 20 + dx * a * travel, y - 28 + row * 16 + dy * a * travel + 65 * a * a);
        c.rotate((i % 2 ? 1 : -1) * a * (reduced ? 0.4 : 3.2));
        if (art) c.drawImage(art, 10 + col * 20, 10 + row * 16, 20, 16, -10, -8, 20, 16);
        else R(c, -3, -3, 6, 6, i % 2 ? P.blue : P.cyan);
        c.restore();
      }
      var rad = 8 + a * (reduced ? 30 : 85);
      c.globalAlpha = C(1 - a * 1.4, 0, 1) * 0.75;
      fxArc(c, x, y, rad, 0, Math.PI * 2, P.ice, 2);
      if (!reduced)
        for (var k = 0; k < 8; k++) {
          var angle = (k * Math.PI) / 4;
          var rr = 12 + a * 110;
          var ex = x + Math.cos(angle) * rr,
            ey = y + Math.sin(angle) * rr;
          L(c, ex - Math.cos(angle) * 8, ey - Math.sin(angle) * 8, ex, ey, P.cyan, 2);
          R(c, ex - 1, ey - 1, 3, 3, P.white);
        }
      if (a < 0.16) G(c, x, y, 28 * (1 - a / 0.16) + 3, P.white, reduced ? 0.12 : 0.65 * (1 - a / 0.16));
    }
    c.restore();
  }
  function bossColors(id) {
    return BOSS_FX_COLORS[id] || BOSS_FX_COLORS.warden;
  }
  function fxArc(c, x, y, r, start, end, col, width) {
    c.strokeStyle = col;
    c.lineWidth = width;
    c.beginPath();
    c.arc(x, y, r, start, end);
    c.stroke();
  }
  function fanProjectile(c, s, b) {
    if (b.kind !== 'fan-orb') return false;
    var x = gx(s, b.x),
      y = b.y,
      r = b.r || 6,
      angle = Math.atan2(b.vy, b.vx),
      t = s.reducedMotion ? 0 : (s.time || 0) * 8;
    c.save();
    G(c, x, y, r * 2.4, '#81bcff', s.reducedMotion ? 0.12 : 0.23);
    c.translate(x, y);
    c.rotate(angle);
    c.globalAlpha = 0.4;
    Q(
      c,
      [-r * 2.3, -r * 0.45, -r * 0.5, -r * 0.8, r, 0, -r * 0.5, r * 0.8, -r * 2.3, r * 0.45, -r * 1.5, 0],
      '#467dc7'
    );
    c.globalAlpha = 1;
    var colors = ['#163c79', '#397bce', '#8bbdf1'];
    for (var layer = 0; layer < 3; layer++) {
      var radius = r - layer;
      c.fillStyle = colors[layer];
      for (var dx = -radius; dx <= radius; dx++) {
        var h = Math.floor(Math.sqrt(Math.max(0, radius * radius - dx * dx)));
        R(c, dx, -h, 1, h * 2 + 1, colors[layer]);
      }
    }
    fxArc(c, 0, 0, r - 1, -1.35, 0.6, '#e5f7ff', 2);
    fxArc(c, -1, 0, r * 0.5, 0.4 + Math.sin(t) * 0.15, 2.7 + Math.sin(t) * 0.15, '#224c96', 2);
    R(c, 0, -r + 2, 3, 2, '#ffffff');
    c.restore();
    return true;
  }
  function bossProjectile(c, s, b) {
    if (!b.fxBoss || b.team === 'player') return false;
    if (b.kind === 'hazard') return bossHazardShape(c, s, b);
    var x = gx(s, b.x),
      y = b.y,
      r = b.r || 4,
      t = s.time || 0,
      co = bossColors(b.fxBoss),
      reduced = !!s.reducedMotion;
    if (x < -65 || x > W + 65 || y < -65 || y > H + 65) return true;
    // a rock still held over the arena shows only as dust trickling down where it will fall
    if (b.hold && b.armIn > 0) {
      if (!reduced)
        for (var hd = 0; hd < 3; hd++) {
          var hp = (t * 1.7 + hd / 3) % 1;
          R(c, x - 5 + hd * 5, hp * 60, 2, 2, '#9c8f80');
        }
      return true;
    }
    c.save();
    G(c, x, y, r * 2.7, co[0], reduced ? 0.12 : 0.25);
    if (BOSS_SHOTS[b.kind]) {
      BOSS_SHOTS[b.kind](c, b, x, y, r, t, co, reduced);
      c.restore();
      return true;
    }
    if (b.kind === 'saw') {
      // a spinning blade that reads against the dark floor: bright teeth with a dark edge, a dark disc ringed in
      // the boss's colour, and sparks thrown off behind it where it bites the floor
      var dirS = b.vx < 0 ? -1 : 1,
        spin = (reduced ? 0 : t * 18) * dirS,
        teeth = 10,
        tt,
        an,
        ra;
      if (!reduced)
        for (var sp = 0; sp < 3; sp++) {
          var ph = (t * 9 + sp / 3) % 1;
          R(
            c,
            x - dirS * (r + 3 + ph * 14),
            y + r - 1 - (sp % 2) * 2 - ph * 3,
            2,
            2,
            sp % 2 ? co[1] : '#ffd27a'
          );
        }
      c.translate(x, y);
      c.rotate(spin);
      c.fillStyle = '#10161b';
      c.beginPath();
      for (tt = 0; tt < teeth * 2; tt++) {
        ra = tt % 2 ? r : r + 3;
        an = (tt * Math.PI) / teeth;
        c.lineTo(Math.cos(an) * ra, Math.sin(an) * ra);
      }
      c.closePath();
      c.fill();
      c.fillStyle = '#e6ecef';
      c.beginPath();
      for (tt = 0; tt < teeth * 2; tt++) {
        ra = tt % 2 ? r - 1 : r + 2;
        an = (tt * Math.PI) / teeth;
        c.lineTo(Math.cos(an) * ra, Math.sin(an) * ra);
      }
      c.closePath();
      c.fill();
      c.fillStyle = '#4f5a61';
      c.beginPath();
      c.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = co[0];
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = co[1];
      c.beginPath();
      c.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      c.fill();
      R(c, -1, -1, 2, 2, P.white);
      c.restore();
      return true;
    }
    if (b.kind === 'mine') {
      var left = C(b.life / (b.fuse || 1.2), 0, 1);
      Q(
        c,
        [x - r, y - r * 0.5, x, y - r, x + r, y - r * 0.5, x + r, y + r * 0.5, x, y + r, x - r, y + r * 0.5],
        P.ink
      );
      fxArc(c, x, y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, co[0], 2);
      R(c, x - 2, y - 2, 4, 4, co[1]);
      for (var m = 0; m < 3; m++) {
        var a = (m * Math.PI * 2) / 3 + (reduced ? 0 : t * 1.8);
        L(
          c,
          x + Math.cos(a) * (r + 2),
          y + Math.sin(a) * (r + 2),
          x + Math.cos(a) * (r + 4),
          y + Math.sin(a) * (r + 4),
          co[0],
          1
        );
      }
    } else if (b.kind === 'wall') {
      // Independent cells: never bridge the safe hole in the barrier.
      Q(
        c,
        [x - r, y - r, x + r * 0.4, y - r, x + r, y, x + r * 0.4, y + r, x - r, y + r, x - r * 0.4, y],
        co[0]
      );
      L(c, x, y - r + 2, x + 2, y, co[1], 2);
      L(c, x + 2, y, x, y + r - 2, P.white, 1);
      c.globalAlpha = 0.25;
      L(c, x - (b.vx < 0 ? -1 : 1) * r * 2, y - r * 0.7, x, y - r * 0.7, co[0], 1);
    } else if (b.kind === 'wave') {
      var d = b.vx < 0 ? -1 : 1;
      c.translate(x, y);
      c.scale(d, 1);
      c.globalAlpha = reduced ? 0.18 : 0.32;
      Q(c, [-r * 3.5, r, -r * 2, -r * 0.7, -r * 0.7, -r, r * 0.5, -r, r, r, -r * 3.5, r], co[0]);
      c.globalAlpha = 1;
      Q(c, [-r, r, r * 0.35, -r, r, -r * 0.65, r * 0.75, r], co[0]);
      Q(c, [-r * 0.4, r, r * 0.32, -r * 0.7, r * 0.52, r], co[1]);
      L(c, r * 0.35, -r, r * 0.8, r, P.white, 1);
      for (var w = 0; w < (reduced ? 1 : 3); w++) {
        var n = (t * 5 + w * 0.33) % 1;
        R(c, -r - 25 * n, r + 2, 5 * (1 - n) + 1, 1, co[0]);
      }
    } else {
      var angle = Math.atan2(b.vy || 0, b.vx || 1),
        len = b.kind === 'shell' ? r * 4 : r * 3;
      c.translate(x, y);
      c.rotate(angle);
      c.globalAlpha = reduced ? 0.16 : 0.35;
      Q(c, [-len, -r * 0.5, -r, -r * 0.8, r * 0.4, 0, -r, r * 0.8], co[0]);
      c.globalAlpha = 1;
      Q(
        c,
        [-r, 0, -r * 0.4, -r * 0.8, r * 0.6, -r * 0.65, r, 0, r * 0.6, r * 0.65, -r * 0.4, r * 0.8],
        co[0]
      );
      Q(c, [-r * 0.55, 0, 0, -r * 0.4, r * 0.65, 0, 0, r * 0.4], co[1]);
      R(c, 0, -1, 2, 2, P.white);
      if (b.kind === 'shell') {
        fxArc(c, 0, 0, r + 2, -1.1, 1.1, co[1], 1);
      }
    }
    c.restore();
    return true;
  }
  // What each boss throws, drawn as the thing it is: a slug from a cannon, a thrown scythe, water, a needle, a
  // rock, an orb of the void, an ember, an obsidian shard.
  function crescentPath(c, ox, r) {
    c.beginPath();
    c.moveTo(ox - r * 0.2, -r * 1.5);
    c.quadraticCurveTo(ox + r * 2.2, 0, ox - r * 0.2, r * 1.5);
    c.quadraticCurveTo(ox + r * 0.9, 0, ox - r * 0.2, -r * 1.5);
    c.closePath();
  }
  function strokePoly(c, pts, col, w) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.stroke();
  }
  var BOSS_SHOTS = {
    slug: function (c, b, x, y, r, t, co, reduced) {
      var d = (b.vx || 0) < 0 ? -1 : 1;
      c.translate(x, y);
      c.scale(d, 1);
      c.globalAlpha = reduced ? 0.2 : 0.45;
      for (var i = 1; i < 4; i++) R(c, -r * 1.6 - i * 7, -1 - (i % 2), 5, 2 + (i % 2), '#8c8c8c');
      c.globalAlpha = 1;
      Q(
        c,
        [-r * 1.6, -r * 0.62, r * 0.4, -r * 0.62, r * 1.3, 0, r * 0.4, r * 0.62, -r * 1.6, r * 0.62],
        '#1b1d22'
      );
      Q(
        c,
        [-r * 1.3, -r * 0.4, r * 0.35, -r * 0.4, r * 1.05, 0, r * 0.35, r * 0.4, -r * 1.3, r * 0.4],
        co[0]
      );
      R(c, -r * 0.9, -r * 0.4, 2, r * 0.8, '#1b1d22');
      R(c, r * 0.1, -r * 0.25, r * 0.7, 2, co[1]);
    },
    crescent: function (c, b, x, y, r, t, co, reduced) {
      var d = (b.vx || 0) < 0 ? -1 : 1;
      c.translate(x, y);
      c.scale(d, 1);
      c.rotate(reduced ? 0 : Math.sin(t * 22) * 0.18);
      c.globalAlpha = reduced ? 0.15 : 0.3;
      crescentPath(c, -9, r);
      c.fillStyle = co[0];
      c.fill();
      c.globalAlpha = 1;
      crescentPath(c, 0, r);
      c.fillStyle = co[0];
      c.fill();
      crescentPath(c, 1.5, r * 0.78);
      c.fillStyle = co[1];
      c.fill();
    },
    drop: function (c, b, x, y, r, t, co, reduced) {
      c.translate(x, y);
      c.rotate(Math.atan2(b.vy || 0, b.vx || 1));
      Q(
        c,
        [-r * 2.6, 0, -r * 0.2, -r, r * 0.9, -r * 0.55, r * 1.1, 0, r * 0.9, r * 0.55, -r * 0.2, r],
        co[0]
      );
      Q(
        c,
        [
          -r * 1.6,
          0,
          -r * 0.1,
          -r * 0.55,
          r * 0.6,
          -r * 0.3,
          r * 0.7,
          0,
          r * 0.6,
          r * 0.3,
          -r * 0.1,
          r * 0.55
        ],
        co[1]
      );
      R(c, r * 0.1, -r * 0.45, 2, 2, P.white);
    },
    needle: function (c, b, x, y, r, t, co, reduced) {
      c.translate(x, y);
      c.rotate(Math.atan2(b.vy || 0, b.vx || 1));
      c.globalAlpha = reduced ? 0.2 : 0.4;
      L(c, -r * 6, 0, -r * 2, 0, co[1], 1);
      c.globalAlpha = 1;
      L(c, -r * 2.4, 0, r * 1.6, 0, '#141008', 4);
      L(c, -r * 2.2, 0, r * 1.2, 0, co[1], 2);
      Q(c, [r * 1.2, -1.5, r * 2.5, 0, r * 1.2, 1.5], P.white);
    },
    rock: function (c, b, x, y, r, t, co, reduced) {
      var molten = b.fxBoss === 'ashmaw',
        pts = [],
        inner = [],
        i;
      if (molten && !reduced) {
        c.globalAlpha = 0.55;
        for (i = 1; i < 4; i++)
          R(
            c,
            x - (b.vx || 0) * 0.012 * i - 1,
            y - (b.vy || 0) * 0.012 * i - 1,
            3,
            3,
            i % 2 ? '#ff9a3c' : '#ffe5a3'
          );
        c.globalAlpha = 1;
      }
      c.translate(x, y);
      c.rotate(reduced ? 0 : t * 7 * ((b.vx || 0) < 0 ? -1 : 1));
      for (i = 0; i < 7; i++) {
        var an = (i * Math.PI * 2) / 7,
          rr = r * (0.8 + 0.3 * sparkHash(i, 3));
        pts.push(Math.cos(an) * rr, Math.sin(an) * rr);
        inner.push(Math.cos(an) * rr * 0.55 - r * 0.15, Math.sin(an) * rr * 0.55 - r * 0.15);
      }
      Q(c, pts, molten ? '#2a1a16' : '#4a3d33');
      Q(c, inner, molten ? '#5a2a18' : '#8a7560');
      if (molten) {
        L(c, -r * 0.6, -r * 0.1, 0, r * 0.2, '#ff8a2a', 2);
        L(c, 0, r * 0.2, r * 0.55, -r * 0.25, '#ffd27a', 1);
        L(c, 0, r * 0.2, r * 0.1, r * 0.7, '#ff8a2a', 1);
      }
    },
    voidorb: function (c, b, x, y, r, t, co, reduced) {
      var beat = 1,
        cracks = 0,
        i;
      if (b.split) {
        var left = C((b.life - b.split.at) / 0.85, 0, 1);
        beat = 1 + (reduced ? 0 : 0.12 * Math.sin(t * (10 + 40 * (1 - left))));
        cracks = 1 - left;
      }
      var rr = r * beat;
      c.fillStyle = '#12081f';
      c.beginPath();
      c.arc(x, y, rr + 1, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = co[0];
      c.lineWidth = b.big ? 2.5 : 1.5;
      c.beginPath();
      c.arc(x, y, rr, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = co[1];
      c.beginPath();
      c.arc(x, y, rr * 0.35, 0, Math.PI * 2);
      c.fill();
      if (!reduced) {
        var an = t * 6 + b.x * 0.01;
        R(c, x + Math.cos(an) * rr * 0.65 - 1, y + Math.sin(an) * rr * 0.65 - 1, 2, 2, co[1]);
      }
      if (cracks > 0.4) {
        c.globalAlpha = (cracks - 0.4) / 0.6;
        for (i = 0; i < 8; i++) {
          var a = (i * Math.PI) / 4,
            out = rr + 4 + cracks * 4;
          L(
            c,
            x + Math.cos(a) * rr * 0.5,
            y + Math.sin(a) * rr * 0.5,
            x + Math.cos(a) * out,
            y + Math.sin(a) * out,
            co[1],
            1
          );
        }
      }
    },
    ember: function (c, b, x, y, r, t, co, reduced) {
      var f = reduced ? 1 : 0.8 + 0.4 * Math.abs(Math.sin(t * 30 + b.x * 0.1));
      if (!reduced) {
        c.globalAlpha = 0.45;
        R(c, x - (b.vx || 0) * 0.02 - 1, y - (b.vy || 0) * 0.02 - 1, 2, 2, '#ff9a3c');
        c.globalAlpha = 1;
      }
      G(c, x, y, r * 3 * f, '#ff8a2a', 0.4);
      R(c, x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6, '#ff6a2a');
      R(c, x - r * 0.4, y - r * 0.4, r * 0.8 + 1, r * 0.8 + 1, '#ffe5a3');
    },
    shard: function (c, b, x, y, r, t, co, reduced) {
      c.translate(x, y);
      c.rotate(Math.atan2(b.vy || 0, b.vx || 1));
      Q(c, [-r * 1.9, 0, -r * 0.1, -r * 0.75, r * 1.5, 0, -r * 0.1, r * 0.75], '#1c1430');
      L(c, -r * 1.6, 0, r * 1.3, 0, co[0], 1);
      L(c, -r * 0.1, -r * 0.7, r * 1.5, 0, co[1], 1);
    }
  };
  // The hazards a move leaves on the arena. While one is arming it only warns - a mark where it will be, getting
  // stronger - and once it is armed it is drawn as what it is: a water column, lightning, fire, a beam, jaws.
  function bossHazardShape(c, s, b) {
    var x = gx(s, b.x),
      y = b.y,
      hw = b.hw || 8,
      hh = b.hh || 8,
      t = s.time || 0,
      reduced = !!s.reducedMotion,
      co = bossColors(b.fxBoss),
      warn = b.armIn > 0,
      wu = warn ? C(1 - b.armIn / (b.armFor || 1), 0, 1) : 1,
      live = b.liveFor || 0.3,
      lu = warn ? 0 : C(1 - b.life / live, 0, 1),
      out = warn ? 1 : C(b.life / 0.12, 0, 1),
      bot = y + hh,
      top = y - hh,
      i,
      k,
      f;
    if (x + hw < -20 || x - hw > W + 20) return true;
    c.save();
    if (b.style === 'mark') {
      f = reduced ? 0.75 : 0.45 + 0.4 * Math.abs(Math.sin(t * 9));
      c.globalAlpha = f;
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x, bot - 3, hw, 4, 0, 0, Math.PI * 2);
      c.stroke();
      L(c, x - hw - 8, bot - 3, x - hw + 5, bot - 3, P.coral, 2);
      L(c, x + hw - 5, bot - 3, x + hw + 8, bot - 3, P.coral, 2);
      L(c, x, bot - 14, x, bot + 2, P.coral, 1);
    } else if (b.style === 'geyser') {
      if (warn) {
        c.globalAlpha = 0.35 + 0.55 * wu;
        c.fillStyle = co[0];
        c.beginPath();
        c.ellipse(x, bot - 2, hw * (0.7 + 0.8 * wu), 3, 0, 0, Math.PI * 2);
        c.fill();
        if (!reduced)
          for (i = 0; i < 4; i++) {
            k = (t * 2.6 + i * 0.25) % 1;
            R(c, x - hw + i * hw * 0.6, bot - 4 - k * 18 * wu, 2, 2, co[1]);
          }
        c.globalAlpha = 0.2 * wu;
        c.setLineDash([4, 4]);
        c.strokeStyle = co[0];
        c.lineWidth = 1;
        c.strokeRect(x - hw, top, hw * 2, hh * 2);
        c.setLineDash([]);
      } else {
        var hgt = hh * 2 * Math.min(1, lu / 0.14),
          wob = reduced ? 0 : Math.sin(t * 30) * 1.5;
        c.globalAlpha = 0.82 * out;
        Q(
          c,
          [
            x - hw - 2,
            bot,
            x - hw + wob,
            bot - hgt * 0.5,
            x - hw * 0.7,
            bot - hgt,
            x + hw * 0.7,
            bot - hgt,
            x + hw - wob,
            bot - hgt * 0.5,
            x + hw + 2,
            bot
          ],
          co[0]
        );
        Q(
          c,
          [
            x - hw * 0.5,
            bot,
            x - hw * 0.45 + wob,
            bot - hgt,
            x + hw * 0.45 - wob,
            bot - hgt,
            x + hw * 0.5,
            bot
          ],
          co[1]
        );
        if (!reduced)
          for (i = 0; i < 4; i++) {
            k = (t * 3.2 + i * 0.25) % 1;
            R(c, x - hw * 0.6 + i * hw * 0.4, bot - k * hgt, 2, 8, P.white);
          }
        c.fillStyle = P.white;
        for (i = -1; i <= 1; i++) {
          c.beginPath();
          c.arc(x + i * hw * 0.6, bot - hgt + 2, hw * 0.45, 0, Math.PI * 2);
          c.fill();
        }
        for (i = 0; i < 4; i++) {
          k = (t * 2 + i * 0.25) % 1;
          R(
            c,
            x + (i < 2 ? -1 : 1) * (hw + k * 14 + i * 2),
            bot - hgt + k * k * 30 - 8 * (1 - k),
            2,
            2,
            co[1]
          );
        }
      }
    } else if (b.style === 'bolt') {
      if (warn) {
        f = reduced ? 0.6 : 0.3 + 0.6 * wu * Math.abs(Math.sin(t * (12 + 30 * wu)));
        c.globalAlpha = f;
        c.setLineDash([3, 6]);
        L(c, x, top, x, bot - 4, '#fff9b0', 1);
        c.setLineDash([]);
        c.strokeStyle = co[1];
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(x, bot - 3, hw * (2.2 - wu), 3, 0, 0, Math.PI * 2);
        c.stroke();
        G(c, x, top, 10 + 10 * wu, co[1], 0.35);
      } else {
        var step = reduced ? 0 : Math.floor(t * 28),
          pts = [],
          n = 12;
        for (i = 0; i <= n; i++)
          pts.push(
            x + (i === 0 || i === n ? 0 : (sparkHash(i * 1.7 + b.x * 0.01, step) - 0.5) * hw * 2.2),
            top + ((bot - top) * i) / n
          );
        c.globalAlpha = 0.45 * out;
        strokePoly(c, pts, co[0], 7);
        c.globalAlpha = out;
        strokePoly(c, pts, co[1], 3);
        strokePoly(c, pts, P.white, 1);
        G(c, x, bot - 4, 24, co[1], 0.5 * out);
        c.globalAlpha = out;
        c.fillStyle = P.white;
        c.beginPath();
        c.ellipse(x, bot - 2, hw * 1.6, 3, 0, 0, Math.PI * 2);
        c.fill();
      }
    } else if (b.style === 'flame' || b.style === 'embers') {
      var fire = b.style === 'flame';
      if (warn) {
        c.globalAlpha = 0.25 + 0.6 * wu;
        c.strokeStyle = P.coral;
        c.lineWidth = 2;
        c.setLineDash([4, 3]);
        c.beginPath();
        c.ellipse(x, bot - 2, hw * (1.8 - 0.8 * wu), 4, 0, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
      } else {
        var env = fire ? (lu < 0.15 ? lu / 0.15 : 1 - ((lu - 0.15) / 0.85) * 0.55) : Math.min(1, lu / 0.1),
          tall = (fire ? hh * 2.6 : hh * 2) * env;
        c.globalAlpha = (fire ? 0.92 : 0.8) * out;
        c.fillStyle = '#3a0d06';
        c.beginPath();
        c.ellipse(x, bot - 1, hw * 1.1, 3, 0, 0, Math.PI * 2);
        c.fill();
        G(c, x, bot - tall * 0.4, hw * 2.2, '#ff6934', 0.45 * out);
        for (i = 0; i < 3; i++) {
          var fx = x + (i - 1) * hw * 0.62,
            fl = reduced ? 1 : 0.75 + 0.35 * Math.abs(Math.sin(t * (17 + i * 5) + b.x * 0.05 + i)),
            h1 = tall * fl * (i === 1 ? 1 : 0.75),
            w1 = hw * 0.5,
            sw = reduced ? 0 : Math.sin(t * 13 + i * 2) * 2;
          Q(
            c,
            [
              fx - w1,
              bot,
              fx - w1 * 0.7,
              bot - h1 * 0.45,
              fx + sw,
              bot - h1,
              fx + w1 * 0.7,
              bot - h1 * 0.45,
              fx + w1,
              bot
            ],
            '#ff5a24'
          );
          Q(
            c,
            [
              fx - w1 * 0.6,
              bot,
              fx - w1 * 0.4,
              bot - h1 * 0.35,
              fx + sw * 0.6,
              bot - h1 * 0.7,
              fx + w1 * 0.4,
              bot - h1 * 0.35,
              fx + w1 * 0.6,
              bot
            ],
            '#ffb347'
          );
          Q(c, [fx - w1 * 0.25, bot, fx + sw * 0.3, bot - h1 * 0.35, fx + w1 * 0.25, bot], '#ffe5a3');
        }
      }
    } else if (b.style === 'beam') {
      var dir = b.dir || 1,
        ox = x - dir * hw,
        ex = x + dir * hw,
        l0 = Math.min(ox, ex),
        w0 = Math.abs(ex - ox);
      if (warn) {
        f = reduced ? 0.6 : 0.3 + 0.45 * wu + 0.2 * Math.abs(Math.sin(t * 20));
        c.globalAlpha = f;
        c.setLineDash([6, 5]);
        L(c, ox, y, ex, y, b.low ? P.coral : P.amber, wu > 0.6 ? 2 : 1);
        c.setLineDash([]);
        G(c, ox, y, 6 + 12 * wu, co[1], 0.6);
        R(c, ox - 2, y - 2, 4, 4, P.white);
      } else {
        var th = hh * Math.min(1, lu / 0.1) * (reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 50));
        c.globalAlpha = 0.4 * out;
        R(c, l0, y - th - 3, w0, th * 2 + 6, co[0]);
        c.globalAlpha = out;
        R(c, l0, y - th, w0, th * 2, co[0]);
        R(c, l0, y - th * 0.55, w0, th * 1.1, co[1]);
        R(c, l0, y - 1, w0, 2, P.white);
        G(c, ox, y, 18, co[1], 0.7 * out);
        G(c, ex, y, 14, co[0], 0.5 * out);
      }
    } else if (b.style === 'jaws') {
      var gap = hh * (1 - Math.min(1, lu * 1.6));
      c.globalAlpha = out;
      G(c, x, y, hw * 1.6, co[0], 0.4);
      for (k = -1; k <= 1; k += 2) {
        var jy = y + k * gap;
        Q(
          c,
          [x - hw, jy + k * 8, x + hw, jy + k * 8, x + hw * 0.8, jy + k * 2, x - hw * 0.8, jy + k * 2],
          '#3a1a12'
        );
        for (i = 0; i < 4; i++) {
          var tx0 = x - hw * 0.8 + i * hw * 0.53;
          Q(c, [tx0 - 3.5, jy + k * 2, tx0 + 3.5, jy + k * 2, tx0, jy - k * 9], '#f3e6c8');
        }
      }
    } else if (b.style === 'sweep') {
      var ph = reduced ? 0.5 : (t * 6) % 1;
      c.globalAlpha = (reduced ? 0.4 : 0.75) * out;
      for (i = 0; i < 3; i++) {
        c.strokeStyle = i === 1 ? co[1] : co[0];
        c.lineWidth = 3 - i;
        c.beginPath();
        c.ellipse(
          x,
          bot - hh * 0.6,
          hw * (0.6 + 0.4 * ((ph + i / 3) % 1)),
          hh * 0.55,
          0,
          Math.PI * 1.05,
          Math.PI * 1.95
        );
        c.stroke();
      }
      if (!reduced)
        for (i = 0; i < 4; i++) {
          k = (t * 4 + i * 0.25) % 1;
          R(c, x - hw + k * hw * 2, bot - 2 - k * (1 - k) * 20, 2, 2, '#b9a58a');
        }
    } else {
      c.globalAlpha = warn ? 0.3 + 0.5 * wu : 0.8 * out;
      c.setLineDash(warn ? [4, 4] : []);
      c.strokeStyle = co[0];
      c.lineWidth = 2;
      c.strokeRect(x - hw, top, hw * 2, hh * 2);
      c.setLineDash([]);
    }
    c.restore();
    return true;
  }
  function bossImpact(c, s, q) {
    if (q.type !== 'boss-impact') return false;
    var age = 1 - C(q.life / q.maxLife, 0, 1),
      x = gx(s, q.x),
      y = q.y,
      co = bossColors(q.fxBoss),
      size = q.size || 38;
    c.save();
    c.globalAlpha = (1 - age) * (s.reducedMotion ? 0.4 : 0.8);
    c.strokeStyle = co[0];
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, y, size * (0.2 + age), 3 + age * 7, 0, 0, Math.PI * 2);
    c.stroke();
    if (!s.reducedMotion) {
      for (var i = 0; i < 7; i++) {
        var a = -Math.PI + ((i + 0.5) * Math.PI) / 7,
          reach = size * (0.22 + age * 0.85),
          sx = x + Math.cos(a) * reach,
          sy = y + Math.sin(a) * reach * 0.6;
        L(
          c,
          sx,
          sy,
          sx + Math.cos(a) * 7 * (1 - age),
          sy + Math.sin(a) * 12 * (1 - age),
          i % 2 ? co[0] : co[1],
          2
        );
      }
      c.globalAlpha = Math.max(0, 1 - age * 3) * 0.6;
      Q(c, [x - 12, y, x - 6, y - 10, x, y - 30 * (1 - age), x + 6, y - 10, x + 12, y], co[1]);
    }
    c.restore();
    return true;
  }
  // Which way each boss's own picture was drawn looking. Most look left; ASHMAW's jaws and NULLPRIEST's head
  // and claws are at the right of theirs. A picture is mirrored whenever its boss faces the other way, so every
  // boss looks at the player.
  var BOSS_DRAWN_RIGHT = { ashmaw: 1, nullpriest: 1 };
  function bossDrawnFacing(b, own) {
    return own && b && BOSS_DRAWN_RIGHT[b.id] ? 1 : -1;
  }
  // How a boss's picture leans for what it is doing. The lean is worked out in the picture's own frame, after
  // any mirroring: pf is the way the head points there, so a turn of -pf lifts the head and one of +pf dips it.
  // A lean that belongs to the world - the swing hangs from a line over the arena - is turned into the
  // picture's frame, while one that belongs to the body - the sting is at the right end of COILHEAD's picture,
  // and a turn of BOSS_STING_TURN points it at the floor - is used as it is.
  var BOSS_STING_TURN = 0.6;
  // How much of the bottom of a boss's cut-out is floor rather than machine, as a share of its height: the strip
  // of factory floor the cut-out kept under its feet. Measured on the webp: COILHEAD's bright floor edge and the
  // plate under it are its last 12 of 336 rows, SPARKWIDOW's floor plate and hazard stripes its last 40 of 290;
  // TIDEBREAKER's floor edge its last 5 of 301, NULLPRIEST's its last 4 of 338, GRAVELOCK's its last 8 of 264.
  var BOSS_FLOOR_BAND = {
    coilhead: 12 / 336,
    sparkwidow: 40 / 290,
    tidebreaker: 5 / 301,
    nullpriest: 4 / 338,
    gravelock: 8 / 264
  };
  // The body language of the signature moves: lean (head up is positive), push forward, squash and shake.
  var BOSS_POSES = {
    crouch: { lean: -0.03, sx: 1.05, sy: 0.92 },
    rear: { lean: 0.14, sy: 1.02 },
    strike: { lean: -0.11, push: 4, sy: 0.97 },
    slam: { lean: -0.05, sx: 1.08, sy: 0.88, shake: 1.4 },
    recoil: { lean: 0.08, push: -3 },
    aim: { lean: 0.05 },
    lunge: { lean: -0.08, push: 4, sx: 1.03 },
    air: { lean: -0.06, sx: 0.95, sy: 1.06 },
    charge: { sy: 1.03, shake: 1 },
    sting: {},
    spin: { sy: 0.95 }
  };
  // the pose each move winds up into while it is telegraphed; the move itself takes it the rest of the way
  var BOSS_TELL_POSES = {
    pincer: 'crouch',
    cannon: 'aim',
    clawrush: 'crouch',
    quake: 'crouch',
    geyser: 'rear',
    crescent: 'rear',
    leapslash: 'crouch',
    rain: 'rear',
    needles: 'sting',
    arcbolt: 'charge',
    breath: 'rear',
    eruption: 'crouch',
    tackle: 'crouch',
    bite: 'crouch',
    voidstep: 'charge',
    crossorb: 'rear',
    voidring: 'charge',
    tailbeam: 'charge',
    hornflip: 'strike',
    stomp: 'rear',
    anvil: 'crouch',
    sawrush: 'crouch',
    sawtoss: 'crouch',
    embers: 'crouch',
    crownbeam: 'aim',
    barrage: 'aim',
    tailspin: 'crouch',
    pounce: 'crouch'
  };
  function bossPose(b, t, reduced, pf, flip) {
    var m = b && b.move,
      o = { rot: 0, dx: 0, dy: 0, jx: 0, jy: 0, sx: 1, sy: 1, px: 0.5, py: 0.5, alpha: 1, exact: false },
      name = null,
      amount = 1,
      raw;
    pf = pf > 0 ? 1 : -1;
    if (!b || b.down) return o;
    // a flier cruising between moves drifts gently up and down; the body it collides with does not
    if (b.flies && !b.grounded && !m) o.dy = reduced ? 0 : Math.sin(t * 5.2) * 2.2;
    if (m && m.kind === 'dive') {
      o.exact = true;
      if (m.phase === 'rise') o.rot = -0.1;
      else if (m.phase === 'hover') {
        o.dy = reduced ? 0 : Math.sin(t * 40) * 1.2;
        o.rot = m.lockX !== null ? BOSS_STING_TURN * 0.5 : 0;
      } else if (m.phase === 'fall') o.rot = BOSS_STING_TURN;
      else if (m.phase === 'stuck') {
        o.rot = BOSS_STING_TURN * 0.85;
        o.dx = reduced ? 0 : Math.sin(t * 55) * 1.5;
      }
      return o;
    }
    if (m && m.kind === 'swing') {
      o.exact = true;
      if (m.phase === 'climb' || m.phase === 'sweep') o.rot = (flip ? -1 : 1) * (-(m.th || 0) * 0.55);
      return o;
    }
    if (m) {
      if (m.alpha !== undefined) o.alpha = C(m.alpha, 0, 1);
      name = m.pose;
    } else {
      raw = String(b.attack || '');
      if (raw.indexOf('tell-') === 0) {
        name = BOSS_TELL_POSES[raw.slice(5)];
        amount = 0.6;
      }
    }
    var S = name && BOSS_POSES[name];
    if (!S) return o;
    if (name === 'sting') {
      if (b.id === 'coilhead') o.rot = BOSS_STING_TURN * 0.4 * amount;
      return o;
    }
    o.rot = -pf * (S.lean || 0) * amount;
    o.dx = pf * (S.push || 0) * amount;
    o.sx = 1 + ((S.sx || 1) - 1) * amount;
    o.sy = 1 + ((S.sy || 1) - 1) * amount;
    if (S.shake && !reduced) {
      o.jx = Math.sin(t * 61) * S.shake;
      o.jy = Math.cos(t * 47) * S.shake * 0.5;
    }
    // a spin is the picture turning edge-on and round again, twice
    if (name === 'spin') {
      var turn = Math.cos(((m && m.poseU) || 0) * Math.PI * 4);
      o.sx = (turn < 0 ? -1 : 1) * Math.max(0.14, Math.abs(turn));
      o.spin = true;
    }
    return o;
  }
  // One pose flows into the next instead of snapping, remembered per boss outside the game's own state. A
  // walker turns on its hind feet while its head is up and on its front feet while its head is down; a flier
  // turns about its middle.

  // Art-space joints: centre, influence radii, and hinge. These deform only a local
  // part of the original artwork; the torso and planted feet remain independent.
  var BOSS_JOINTS = {
    warden: [
      [0.22, 0.38, 0.27, 0.26, 0.43, 0.39],
      [0.38, 0.66, 0.28, 0.27, 0.55, 0.59],
      [0.72, 0.2, 0.21, 0.24, 0.7, 0.39]
    ],
    tidebreaker: [
      [0.18, 0.48, 0.22, 0.34, 0.31, 0.31],
      [0.49, 0.61, 0.24, 0.32, 0.59, 0.4],
      [0.4, 0.18, 0.22, 0.22, 0.47, 0.35]
    ],
    coilhead: [
      [0.74, 0.22, 0.29, 0.26, 0.58, 0.41],
      [0.81, 0.68, 0.22, 0.27, 0.65, 0.54],
      [0.28, 0.62, 0.23, 0.29, 0.39, 0.43]
    ],
    ashmaw: [
      [0.83, 0.42, 0.23, 0.24, 0.65, 0.37],
      [0.83, 0.72, 0.23, 0.25, 0.68, 0.6],
      [0.39, 0.16, 0.27, 0.22, 0.46, 0.34]
    ],
    nullpriest: [
      [0.4, 0.2, 0.37, 0.29, 0.25, 0.42],
      [0.83, 0.68, 0.23, 0.25, 0.71, 0.57],
      [0.35, 0.73, 0.23, 0.23, 0.44, 0.59]
    ],
    gravelock: [
      [0.16, 0.36, 0.23, 0.4, 0.28, 0.6],
      [0.26, 0.79, 0.22, 0.23, 0.35, 0.66],
      [0.73, 0.8, 0.23, 0.22, 0.65, 0.65]
    ],
    sparkwidow: [
      [0.25, 0.67, 0.23, 0.28, 0.33, 0.47],
      [0.63, 0.72, 0.23, 0.26, 0.6, 0.48],
      [0.5, 0.17, 0.26, 0.24, 0.49, 0.37]
    ],
    'obsidian-crown': [
      [0.27, 0.22, 0.3, 0.26, 0.51, 0.37],
      [0.83, 0.3, 0.22, 0.37, 0.76, 0.62],
      [0.25, 0.62, 0.25, 0.25, 0.42, 0.55]
    ]
  };
  // Contact times mirror the existing simulation. No attack clocks or hitboxes change.
  var BOSS_ART_BEATS = {
    pincer: [0.25],
    cannon: [0.1, 0.38, 0.66],
    clawrush: [0.22, 0.6, 0.98],
    quake: [0.45],
    geyser: [0.3],
    crescent: [0.05, 0.45],
    leapslash: [0.75],
    rain: [0.2],
    needles: [0.05, 0.25, 0.45],
    arcbolt: [0.5, 0.7, 0.9],
    swoop: [0.25],
    dive: [0.15],
    breath: [0.2],
    eruption: [0.25],
    tackle: [1],
    bite: [0.18],
    voidstep: [0.47],
    crossorb: [0.15],
    voidring: [0.05, 0.37],
    tailbeam: [0.47],
    hornflip: [0.6],
    stomp: [0.3, 0.9],
    anvil: [0.9],
    sawrush: [0.08, 0.3, 0.52],
    sawtoss: [0.12, 0.46],
    embers: [0.15],
    swing: [0.2],
    crownbeam: [0.37, 1.12],
    barrage: [0.05, 0.23, 0.41, 1.11, 1.29, 1.47],
    tailspin: [0.1, 0.6],
    pounce: [0.75]
  };
  function bossArtTarget(b, time, reduced) {
    var raw = String(b.attack || ''),
      tell = raw.indexOf('tell-') === 0,
      m = b.move,
      name = tell ? raw.slice(5) : m && !m.done ? m.kind : '',
      out = [0, 0, 0, 0],
      beats = BOSS_ART_BEATS[name];
    if (b.down || !beats) return out;
    var a = 0,
      kick = 0,
      tt = m ? m.t || 0 : 0;
    if (tell) {
      var def = g.AstraBosses && g.AstraBosses.get(b.id),
        pat = g.AstraCombat && g.AstraCombat.bossPatterns[name];
      var span = b.tellDuration || (pat ? pat.tell : 1) * ((def && def.tempo) || 1),
        u = C(1 - (b.timer || 0) / span, 0, 1);
      a = u * u * (3 - 2 * u);
    } else {
      a = 1;
      for (var i = 0; i < beats.length; i++) {
        var d = tt - beats[i];
        if (d >= -0.1 && d < 0.24)
          kick = Math.max(kick, d < 0 ? Math.pow(1 + d / 0.1, 2) : Math.exp(-d * 13));
      }
      var last = beats[beats.length - 1];
      a *= 1 - C((tt - last - 0.12) / 0.32, 0, 1);
    }
    // Each boss uses its own weapon: positive/negative rotations are in the source image.
    var q = a * 0.36,
      hit = kick * 0.72;
    switch (b.id) {
      case 'warden':
        out = [-q + hit, -q * 0.8 + hit * 0.9, q * 0.22];
        if (name === 'cannon') out = [q * 0.22 - kick * 0.22, q * 0.15 - kick * 0.16, kick * 0.12];
        break;
      case 'tidebreaker':
        out = [q - hit, q * 0.8 - hit * 1.1, -q * 0.18 + hit * 0.18];
        break;
      case 'coilhead':
        out = [q * 0.4, q - hit, -q * 0.35 + hit * 0.3];
        break;
      case 'ashmaw':
        out = [-q + hit * 0.55, q * 0.8 - hit * 0.75, -q * 0.45 + hit * 0.5];
        if (name === 'breath')
          out[0] = tell ? -q * 0.7 : tt < 0.9 ? -0.26 : -0.26 * (1 - C((tt - 0.9) / 0.3, 0, 1));
        break;
      case 'nullpriest':
        out = [-q + hit * 0.8, q * 0.65 - hit * 0.6, -q * 0.5 + hit * 0.45];
        break;
      case 'gravelock':
        out = [q - hit, q * 0.65 - hit * 0.7, -q * 0.28 + hit * 0.25];
        break;
      case 'sparkwidow':
        out = [q - hit, -q + hit, q * 0.5 - hit * 0.4];
        break;
      case 'obsidian-crown':
        out = [q * 0.6 - hit * 0.45, -q + hit, q * 0.3 - hit * 0.6];
        break;
    }
    out[3] = kick;
    return out;
  }
  var bossJointMemo = new WeakMap();
  function bossArtMotion(b, time, reduced) {
    var target = bossArtTarget(b, time, reduced),
      old = bossJointMemo.get(b);
    if (!old || time < old.t || time - old.t > 0.25) {
      old = { t: time, v: target.slice() };
      bossJointMemo.set(b, old);
    } else {
      var k = 1 - Math.exp(-Math.max(0, time - old.t) * 32);
      for (var i = 0; i < 4; i++) old.v[i] += (target[i] - old.v[i]) * k;
      old.t = time;
    }
    return old.v.slice();
  }
  function bossMeshPoint(id, x, y, angles) {
    var parts = BOSS_JOINTS[id],
      dx = 0,
      dy = 0,
      total = 0;
    for (var i = 0; i < parts.length; i++) {
      var j = parts[i],
        r = Math.hypot((x - j[0]) / j[2], (y - j[1]) / j[3]);
      if (r >= 1) continue;
      var w = 1 - r * r;
      w *= w;
      var a = angles[i],
        co = Math.cos(a),
        si = Math.sin(a),
        vx = x - j[4],
        vy = y - j[5];
      dx += (vx * co - vy * si - vx) * w;
      dy += (vx * si + vy * co - vy) * w;
      total += w;
    }
    // Bounded blend keeps joints continuous and never shifts the ground contact.
    var floor = 1 - C((y - 0.87) / 0.1, 0, 1),
      den = Math.max(1, total);
    return { x: x + (dx / den) * floor, y: y + (dy / den) * floor };
  }
  function bossArtDraw(c, b, frame, x, y, w, h, keep, time, reduced) {
    if (!BOSS_JOINTS[b.id]) return false;
    var angles = bossArtMotion(b, time, reduced);
    if (
      angles.slice(0, 3).every(function (a) {
        return Math.abs(a) < 0.001;
      })
    )
      return false;
    var nx = 12,
      ny = 12,
      points = [],
      sw = frame.naturalWidth,
      sh = frame.naturalHeight;
    for (var iy = 0; iy <= ny; iy++)
      for (var ix = 0; ix <= nx; ix++) {
        var u = ix / nx,
          v = (iy / ny) * keep,
          d = bossMeshPoint(b.id, u, v, angles);
        points.push({ u: u * sw, v: v * sh, x: x + d.x * w, y: y + d.y * h });
      }
    function tri(a, b, d) {
      var ux = b.u - a.u,
        uy = b.v - a.v,
        vx = d.u - a.u,
        vy = d.v - a.v,
        det = ux * vy - uy * vx,
        X = b.x - a.x,
        Y = b.y - a.y,
        U = d.x - a.x,
        V = d.y - a.y,
        aa = (X * vy - U * uy) / det,
        bb = (Y * vy - V * uy) / det,
        cc = (U * ux - X * vx) / det,
        dd = (V * ux - Y * vx) / det;
      // A small overlap closes subpixel rasterisation cracks between neighbouring triangles.
      var cx = (a.x + b.x + d.x) / 3,
        cy = (a.y + b.y + d.y) / 3;
      c.save();
      c.beginPath();
      [a, b, d].forEach(function (p, i) {
        var dx = p.x - cx,
          dy = p.y - cy,
          l = Math.hypot(dx, dy) || 1;
        if (i) c.lineTo(p.x + (dx / l) * 0.25, p.y + (dy / l) * 0.25);
        else c.moveTo(p.x + (dx / l) * 0.25, p.y + (dy / l) * 0.25);
      });
      c.closePath();
      c.clip();
      c.transform(aa, bb, cc, dd, a.x - aa * a.u - cc * a.v, a.y - bb * a.u - dd * a.v);
      c.drawImage(frame, 0, 0);
      c.restore();
    }
    for (var yy = 0; yy < ny; yy++)
      for (var xx = 0; xx < nx; xx++) {
        var n = yy * (nx + 1) + xx;
        tri(points[n], points[n + 1], points[n + nx + 1]);
        tri(points[n + 1], points[n + nx + 2], points[n + nx + 1]);
      }
    return true;
  }
  var bossPoseMemo = typeof WeakMap === 'function' ? new WeakMap() : null;
  function bossPoseEased(b, t, reduced, pf, flip) {
    var o = bossPose(b, t, reduced, pf, flip),
      e = bossPoseMemo && b ? bossPoseMemo.get(b) : null;
    if (bossPoseMemo && b) {
      if (!e || o.exact || t < e.t || t - e.t > 0.25)
        bossPoseMemo.set(b, { t: t, rot: o.rot, dx: o.dx, sx: o.sx, sy: o.sy });
      else {
        var k = 1 - Math.exp(-(t - e.t) * 20),
          keys = ['rot', 'dx', 'sx', 'sy'];
        e.t = t;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (key === 'sx' && o.spin) {
            e.sx = o.sx;
            continue;
          }
          var v = e[key] + (o[key] - e[key]) * k;
          if (Math.abs(v - o[key]) < 1e-3) v = o[key];
          e[key] = v;
          o[key] = v;
        }
      }
    }
    // its feet are the bottom of the picture less any strip of floor the cut-out kept; a spin turns about its middle
    if (!o.exact && !b.flies) {
      var lean = -o.rot * (pf > 0 ? 1 : -1);
      o.px = o.spin ? 0.5 : 0.5 + (lean >= 0 ? -(pf > 0 ? 1 : -1) : pf > 0 ? 1 : -1) * 0.34;
      o.py = 1 - (BOSS_FLOOR_BAND[b.id] || 0);
    }
    return o;
  }
  // What a move throws off around the body while it happens, drawn over the picture.
  function bossStreaks(c, b, x, dir, co, reduced, low) {
    c.globalAlpha = reduced ? 0.22 : 0.5;
    for (var j = 0; j < 3; j++) {
      var yy = b.y + b.h * ((low ? 0.45 : 0.25) + j * (low ? 0.18 : 0.24)),
        tail = reduced ? 12 : 24 + j * 9;
      L(c, x - dir * b.w * 0.8, yy, x - dir * (b.w * 0.8 + tail), yy + 2, co[j % 2], 2);
    }
    c.globalAlpha = 1;
  }
  function bossFlicker(t, reduced, rate) {
    return reduced ? 0.8 : 0.55 + 0.45 * Math.abs(Math.sin(t * (rate || 23)));
  }
  function bossAirTrail(c, s, b, m, x, dir, co, t, reduced) {
    if (m.pose !== 'air') return;
    c.globalAlpha = reduced ? 0.18 : 0.4;
    for (var j = 0; j < 3; j++) {
      var lx = x - b.w * 0.4 + j * b.w * 0.4;
      L(c, lx, b.y + b.h + 2, lx, b.y + b.h + 12 + (j % 2) * 8, co[j % 2], 2);
    }
  }
  var BOSS_MOVE_FX = {
    cannon: function (c, s, b, m, x, dir, co, t, reduced) {
      if (!(m.kick > 0)) return;
      var mx = x + dir * b.w * 0.55,
        my = b.y + b.h * 0.36,
        u = C(m.kick / 0.12, 0, 1);
      c.globalAlpha = u;
      G(c, mx, my, 20, co[1], 0.6);
      Q(c, [mx, my - 7 * u, mx + dir * 20 * u, my, mx, my + 7 * u], co[1]);
      Q(c, [mx, my - 3 * u, mx + dir * 11 * u, my, mx, my + 3 * u], P.white);
    },
    clawrush: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.pose === 'lunge') bossStreaks(c, b, x, dir, co, reduced);
    },
    bite: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.pose === 'lunge') bossStreaks(c, b, x, dir, co, reduced);
    },
    tackle: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.pose === 'lunge') bossStreaks(c, b, x, dir, co, reduced, true);
    },
    hornflip: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.pose === 'lunge') bossStreaks(c, b, x, dir, co, reduced, true);
    },
    sawrush: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.pose === 'lunge') bossStreaks(c, b, x, dir, co, reduced, true);
    },
    sawtoss: function (c, s, b, m, x, dir, co, t, reduced) {
      // the front leg's saw spins up and throws sparks off the floor before it goes
      if (m.t > 0.5) return;
      var fx = x + dir * b.w * 0.4,
        fy = b.baseY + b.h - 3,
        ph = reduced ? 0 : (t * 9) % 1;
      G(c, fx, fy - 6, 12 * bossFlicker(t, reduced, 40), '#ffd27a', 0.45);
      for (var i = 0; i < 3; i++) {
        var q = (ph + i / 3) % 1;
        R(c, fx - dir * (4 + q * 14), fy - q * (1 - q) * 24, 2, 2, i % 2 ? co[1] : '#ffd27a');
      }
    },
    leapslash: bossAirTrail,
    anvil: bossAirTrail,
    pounce: bossAirTrail,
    breath: function (c, s, b, m, x, dir, co, t, reduced) {
      // a jet of fire from the jaws down to the front of the flames it lays along the floor
      if (m.t < 0.18 || m.t > 0.98) return;
      var mx = x + dir * b.w * 0.52,
        my = b.y + b.h * 0.3,
        fx = x + dir * (b.w * 0.5 + 30),
        fy = b.baseY + b.h - 8,
        f = bossFlicker(t, reduced, 29);
      G(c, mx, my, 16 * f, '#ff9a3c', 0.55);
      c.globalAlpha = 0.85;
      Q(c, [mx, my - 3, fx + dir * 8, fy - 10 * f, fx + dir * 14, fy + 4, mx, my + 4], '#ff6934');
      Q(c, [mx, my - 1, fx + dir * 4, fy - 5 * f, fx + dir * 8, fy + 2, mx, my + 2], '#ffb347');
      L(c, mx, my, fx, fy - 2, '#ffe5a3', 1);
    },
    eruption: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t > 0.6) return;
      var vx = x - dir * b.w * 0.2,
        vy = b.y + b.h * 0.02,
        u = m.t < 0.25 ? m.t / 0.25 : 1 - (m.t - 0.25) / 0.35,
        f = bossFlicker(t, reduced, 31);
      G(c, vx, vy, 22 * u * f, '#ff6934', 0.6);
      if (!reduced)
        for (var i = 0; i < 4; i++) {
          var ph = (t * 3 + i * 0.25) % 1;
          R(c, vx - 6 + i * 4, vy - ph * 26 * u, 2, 2, i % 2 ? '#ffe5a3' : '#ff9a3c');
        }
    },
    embers: function (c, s, b, m, x, dir, co, t, reduced) {
      // the smokestacks on its back cough
      if (m.t > 0.45) return;
      var sy = b.y - b.h * 0.12,
        u = 1 - m.t / 0.45;
      c.globalAlpha = 0.5 * u;
      c.fillStyle = '#6d6a70';
      for (var i = 0; i < 3; i++) {
        var rise = reduced ? 0 : m.t * 40 * (1 + i * 0.3);
        c.beginPath();
        c.arc(x - 8 + i * 8, sy - rise - i * 3, 4 + m.t * 14, 0, Math.PI * 2);
        c.fill();
      }
      G(c, x, sy, 14 * u, '#ff9a3c', 0.5);
    },
    needles: function (c, s, b, m, x, dir, co, t, reduced) {
      G(c, x - dir * b.w * 0.35, b.y + b.h * 0.72, 8 + 6 * bossFlicker(t, reduced, 40), co[1], 0.45);
    },
    arcbolt: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t > 0.9) return;
      var step = reduced ? 0 : Math.floor(t * 24),
        cy = b.y + b.h * 0.45;
      G(c, x, cy, 26, co[1], 0.2 * bossFlicker(t, reduced, 17));
      c.globalAlpha = 0.9;
      for (var i = 0; i < (reduced ? 2 : 4); i++) {
        var a = sparkHash(i * 3.1, step) * Math.PI * 2,
          x0 = x + Math.cos(a) * b.w * 0.5,
          y0 = cy + Math.sin(a) * b.h * 0.4;
        pixelBolt(
          c,
          x0,
          y0,
          x0 + Math.cos(a) * 13,
          y0 + Math.sin(a) * 13,
          i * 7 + 1,
          step,
          i % 2 ? co[1] : '#fff9b0'
        );
      }
    },
    voidstep: function (c, s, b, m, x, dir, co, t, reduced) {
      // a rift where it is fading out, and where it comes back
      var a = m.alpha === undefined ? 1 : m.alpha;
      if (a >= 1) return;
      var cy = b.y + b.h * 0.5,
        h = b.h * 0.62 * (1 - a * 0.5),
        w = Math.max(2, b.w * 0.2 * (1 - a));
      c.globalAlpha = 0.85 * (1 - a);
      c.fillStyle = '#12081f';
      c.beginPath();
      c.ellipse(x, cy, w, h, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = co[0];
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x, cy, w + 3, h + 3, 0, 0, Math.PI * 2);
      c.stroke();
      if (!reduced)
        for (var i = 0; i < 6; i++) {
          var an = t * 5 + (i * Math.PI) / 3,
            rr = b.w * 0.9 * (1 - ((t * 2 + i / 6) % 1));
          R(c, x + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.8, 2, 2, i % 2 ? co[1] : co[0]);
        }
    },
    crossorb: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t < 0.2)
        G(c, x + dir * b.w * 0.3, b.y + b.h * 0.1, 16 * bossFlicker(t, reduced, 30), co[0], 0.55);
    },
    voidring: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t > 0.45) return;
      var cy = b.y + b.h / 2,
        rr = b.w * 0.9 * (1 - ((m.t * 3.1) % 1) * 0.5);
      c.globalAlpha = 0.6;
      c.strokeStyle = co[0];
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x, cy, rr, rr * 0.7, 0, 0, Math.PI * 2);
      c.stroke();
      G(c, x, cy, 22, co[1], 0.25);
    },
    tailbeam: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t > 0.8) return;
      var tx = x + dir * b.w * 0.5,
        ty = b.baseY + b.h - 24,
        u = C(m.t / 0.45, 0, 1);
      G(c, tx, ty, 6 + 14 * u * bossFlicker(t, reduced, 35), co[0], 0.6);
      R(c, tx - 2, ty - 2, 4, 4, P.white);
    },
    crownbeam: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t > 1.55) return;
      var tx = x + dir * b.w * 0.5,
        ty = b.baseY + b.h - (m.t < 0.8 ? 66 : 14),
        f = bossFlicker(t, reduced, 35);
      G(c, tx, ty, 9 + 9 * f, co[1], 0.6);
      R(c, tx - 2, ty - 2, 4, 4, P.white);
    },
    barrage: function (c, s, b, m, x, dir, co, t, reduced) {
      var times = [0.05, 0.23, 0.41, 1.11, 1.29, 1.47];
      for (var i = 0; i < 6; i++) {
        var d = m.t - times[i];
        if (d < 0 || d >= 0.08) continue;
        var mx = x + dir * b.w * 0.5,
          my = b.baseY + b.h - (i >= 3 ? 62 : 14),
          u = 1 - d / 0.08;
        c.globalAlpha = u;
        G(c, mx, my, 16, co[1], 0.7);
        Q(c, [mx, my - 5 * u, mx + dir * 15 * u, my, mx, my + 5 * u], co[1]);
      }
    },
    tailspin: function (c, s, b, m, x, dir, co, t, reduced) {
      if (m.t > 0.6) return;
      var cy = b.baseY + b.h - 16,
        u = m.t / 0.6;
      c.globalAlpha = (reduced ? 0.35 : 0.75) * (1 - u * 0.4);
      for (var i = 0; i < 2; i++) {
        var a0 = (reduced ? 0 : t * 14) + i * Math.PI;
        c.strokeStyle = i ? co[1] : co[0];
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(x, cy, 100, 13, 0, a0, a0 + 1.9);
        c.stroke();
      }
    }
  };
  function bossEnergy(c, s, b) {
    if (!b || !b.active || b.down || b.gone) return;
    var raw = String(b.attack || ''),
      tell = raw.indexOf('tell-') === 0,
      co = bossColors(b.id),
      t = s.time || 0,
      x = gx(s, b.x + b.w / 2),
      y = b.y + b.h * 0.32,
      dir = b.facing < 0 ? -1 : 1,
      reduced = !!s.reducedMotion;
    c.save();
    if (b.baseY !== undefined && b.y < b.baseY - 4) {
      var alt = Math.min(1, (b.baseY - b.y) / 160),
        shadowY = b.baseY + b.h - 2;
      c.globalAlpha = (reduced ? 0.2 : 0.3) * (1 - alt * 0.45);
      c.fillStyle = '#02080c';
      c.beginPath();
      c.ellipse(x, shadowY, b.w * (0.8 - alt * 0.3), 3.5 - alt * 1.2, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (tell) {
      var r = 10 + Math.min(0.8, Math.max(0, b.timer || 0)) * 17,
        spin = reduced ? 0 : t * 2;
      G(c, x, y, 23, co[0], 0.12);
      for (var i = 0; i < 3; i++) {
        var a = spin + (i * Math.PI * 2) / 3;
        c.globalAlpha = 0.65;
        fxArc(c, x, y, r, a, a + 0.8, co[0], 1);
        if (!reduced) {
          var f = (t * 1.4 + i / 3) % 1,
            rr = 7 + (1 - f) * 25;
          R(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2, 2, co[1]);
        }
      }
      c.globalAlpha = 0.85;
      R(c, x - 2, y - 2, 4, 4, co[1]);
    } else if (raw === 'dash' && b.dashTime > 0) {
      c.globalAlpha = reduced ? 0.22 : 0.5;
      for (var j = 0; j < 3; j++) {
        var yy = b.y + b.h * (0.25 + j * 0.24),
          tail = reduced ? 12 : 28 + j * 8;
        L(c, x - dir * b.w * 0.4, yy, x - dir * (b.w * 0.4 + tail), yy + 3, co[j % 2], 2);
      }
      c.globalAlpha = 0.7;
      fxArc(
        c,
        x + dir * b.w * 0.35,
        b.y + b.h * 0.5,
        b.h * 0.44,
        dir > 0 ? -1.1 : 2.04,
        dir > 0 ? 1.1 : 4.24,
        co[1],
        2
      );
    } else if (raw === 'slam' && b.leap) {
      c.globalAlpha = reduced ? 0.18 : 0.42;
      fxArc(c, x, b.y + b.h * 0.5, b.w * 0.72, 0.1, 3.04, co[0], 2);
    } else if ((raw === 'dash' || raw === 'swoop') && b.move && b.move.kind === 'swoop') {
      c.globalAlpha = reduced ? 0.22 : 0.5;
      for (var sj = 0; sj < 3; sj++) {
        var syy = b.y + b.h * (0.25 + sj * 0.24),
          stail = reduced ? 12 : 26 + sj * 8;
        L(c, x - dir * b.w * 0.4, syy, x - dir * (b.w * 0.4 + stail), syy - 3, co[sj % 2], 2);
      }
    } else if (raw === 'dive' && b.move) {
      // where the sting will land: a ring on the floor that follows it, then turns solid when it locks
      var m = b.move,
        floorY = b.baseY + b.h,
        locked = m.lockX !== null,
        fx0 = gx(s, (locked ? m.lockX : b.x) + b.w / 2);
      if (m.phase !== 'stuck') {
        c.globalAlpha = locked ? 0.9 : reduced ? 0.6 : 0.45 + 0.35 * Math.abs(Math.sin(t * 14));
        c.strokeStyle = locked ? P.coral : co[0];
        c.lineWidth = locked ? 2 : 1;
        c.beginPath();
        c.ellipse(fx0, floorY - 3, b.w * 0.75, 5, 0, 0, Math.PI * 2);
        c.stroke();
        if (locked) {
          L(c, fx0 - b.w * 1.05, floorY - 3, fx0 - b.w * 0.82, floorY - 3, P.coral, 2);
          L(c, fx0 + b.w * 0.82, floorY - 3, fx0 + b.w * 1.05, floorY - 3, P.coral, 2);
        }
        c.globalAlpha = locked ? 0.35 : 0.18;
        c.setLineDash([3, 5]);
        L(c, fx0, b.y + b.h, fx0, floorY - 6, locked ? P.coral : co[0], 1);
        c.setLineDash([]);
      }
      if (m.phase === 'fall' && !reduced) {
        c.globalAlpha = 0.5;
        for (var k = 0; k < 4; k++) {
          var sx = x - b.w * 0.3 + k * b.w * 0.2;
          L(c, sx, b.y - 4 - (k % 2) * 6, sx, b.y - 30 - k * 6, k % 2 ? co[1] : co[0], 2);
        }
      }
      if (m.phase === 'stuck') {
        var fyy = b.y + b.h,
          st = reduced ? 0 : Math.floor(t * 20);
        c.globalAlpha = 0.85;
        for (var q = 0; q < (reduced ? 2 : 4); q++) {
          var aa = -Math.PI + ((q + 0.5) * Math.PI) / 4 + (reduced ? 0 : Math.sin(st + q) * 0.3),
            r2 = 16 + ((st + q) % 3) * 4;
          L(
            c,
            x + Math.cos(aa) * 6,
            fyy + Math.sin(aa) * 3,
            x + Math.cos(aa) * r2,
            fyy + Math.sin(aa) * r2 * 0.5,
            q % 2 ? co[1] : co[0],
            2
          );
        }
      }
    } else if (raw === 'swing' && b.move && (b.move.phase === 'climb' || b.move.phase === 'sweep')) {
      // the silk line, from its anchor over the arena to the top of the body
      var mv = b.move,
        axs = gx(s, mv.ax),
        topY = b.y + b.h * 0.18;
      c.globalAlpha = reduced ? 0.12 : 0.22;
      L(c, axs, mv.ay, x, topY, co[1], 3);
      c.globalAlpha = reduced ? 0.5 : 0.8;
      L(c, axs, mv.ay, x, topY, '#eef8ff', 1);
      c.globalAlpha = 0.9;
      R(c, axs - 2, mv.ay - 2, 4, 4, '#eef8ff');
    } else if (b.move && BOSS_MOVE_FX[b.move.kind]) {
      BOSS_MOVE_FX[b.move.kind](c, s, b, b.move, x, dir, co, t, reduced);
    }
    c.restore();
  }

  var BOSS_MOVE_NAMES = {
    volley: 'VOLLEY',
    wave: 'GROUND WAVE',
    dash: 'CHARGE',
    mortar: 'MORTAR',
    ring: 'SPREAD',
    slam: 'SLAM',
    mines: 'MINES',
    wall: 'BARRIER',
    dive: 'DIVE STING',
    swing: 'SILK SWING',
    swoop: 'SWOOP',
    pincer: 'PINCER QUAKE',
    cannon: 'ARM CANNON',
    clawrush: 'CLAW RUSH',
    quake: 'ROCKFALL',
    geyser: 'GEYSER',
    crescent: 'CRESCENT',
    leapslash: 'LEAP SLASH',
    rain: 'TIDE RAIN',
    needles: 'NEEDLES',
    arcbolt: 'ARC BOLT',
    breath: 'FIRE BREATH',
    eruption: 'ERUPTION',
    tackle: 'TACKLE',
    bite: 'BITE',
    voidstep: 'VOID STEP',
    crossorb: 'SPLIT ORB',
    voidring: 'VOID RING',
    tailbeam: 'TAIL BEAM',
    hornflip: 'HORN FLIP',
    stomp: 'STOMP',
    anvil: 'ANVIL DROP',
    sawrush: 'SAW RUSH',
    sawtoss: 'SAW TOSS',
    embers: 'EMBERS',
    crownbeam: 'CROWN BEAM',
    barrage: 'BARRAGE',
    tailspin: 'TAIL SPIN',
    pounce: 'POUNCE'
  };
  // Where each signature move will arrive, drawn while it winds up. Amber is a line or a path, coral is where
  // it hurts; a line along the floor is jumped, one at head height is ducked. Positions are in the world.
  function tellChevron(c, x, y, d, size, col) {
    L(c, x, y - size, x + d * size * 0.8, y, col, 2);
    L(c, x, y + size, x + d * size * 0.8, y, col, 2);
  }
  function tellRing(c, x, y, rx, col) {
    c.strokeStyle = col;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, y, rx, Math.max(3, rx * 0.3), 0, 0, Math.PI * 2);
    c.stroke();
  }
  function tellArenaX(b, x) {
    var A = g.AstraCombat.arena;
    return Math.max(A.gate + 10, Math.min(A.bossMax + b.w - 10, x));
  }
  function tellBodyX(b, x) {
    var A = g.AstraCombat.arena;
    return Math.max(A.bossMin, Math.min(A.bossMax, x - b.w / 2)) + b.w / 2;
  }
  function tellArrowUp(c, x, y, col) {
    L(c, x, y, x, y - 28, col, 3);
    L(c, x - 9, y - 16, x, y - 29, col, 3);
    L(c, x + 9, y - 16, x, y - 29, col, 3);
  }
  var BOSS_TELLS = {
    pincer: function (c, s, b, k) {
      var A = g.AstraCombat.arena,
        el = Math.max(8, gx(s, A.gate - 10)),
        er = Math.min(W - 8, gx(s, A.bossMax + b.w + 24));
      c.setLineDash([]);
      for (var i = 0; i < 3; i++) {
        tellChevron(c, el + 6 + i * 13, k.floorY - 12, 1, 9, P.coral);
        tellChevron(c, er - 6 - i * 13, k.floorY - 12, -1, 9, P.coral);
      }
    },
    cannon: function (c, s, b, k) {
      var yy = b.y + b.h * 0.36,
        x0 = gx(s, k.cx + k.dir * b.w * 0.55);
      L(c, x0, yy, x0 + k.dir * 170, yy, P.amber, 2);
      c.setLineDash([]);
      for (var i = 0; i < 3; i++) tellChevron(c, x0 + k.dir * (30 + i * 45), yy, k.dir, 6, P.amber);
    },
    clawrush: function (c, s, b, k) {
      c.setLineDash([]);
      var x0 = gx(s, k.cx + k.dir * b.w * 0.9);
      for (var i = 0; i < 3; i++) tellChevron(c, x0 + k.dir * i * 22, b.y + b.h * 0.5, k.dir, 12, P.amber);
    },
    quake: function (c, s, b, k) {
      c.setLineDash([]);
      for (var i = -1; i < 2; i++) {
        var tx = gx(s, tellArenaX(b, k.px + i * 70));
        tellRing(c, tx, k.floorY - 3, 14, P.coral);
        L(c, tx - 6, 14, tx, 22, P.coral, 2);
        L(c, tx + 6, 14, tx, 22, P.coral, 2);
      }
    },
    geyser: function (c, s, b, k) {
      c.strokeStyle = P.coral;
      c.lineWidth = 1;
      for (var i = 0; i < 3; i++) {
        var tx = gx(s, tellArenaX(b, k.cx + k.dir * (b.w * 0.5 + 60 + i * 70)));
        c.strokeRect(tx - 12, k.floorY - 140, 24, 138);
      }
    },
    crescent: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * b.w * 0.6);
      L(c, x0, k.floorY - 12, x0 + k.dir * 220, k.floorY - 12, P.coral, 3);
      L(c, x0, k.floorY - 62, x0 + k.dir * 220, k.floorY - 62, P.amber, 2);
    },
    leapslash: function (c, s, b, k) {
      var side = k.cx < k.px ? 1 : -1,
        x0 = gx(s, k.cx),
        x1 = gx(s, tellBodyX(b, k.px + side * 80)),
        y0 = b.y + b.h * 0.3;
      c.strokeStyle = P.amber;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, y0 - 220, x1, k.floorY - b.h * 0.5);
      c.stroke();
      c.setLineDash([]);
      tellRing(c, x1, k.floorY - 3, b.w * 0.7, P.coral);
    },
    rain: function (c, s, b, k) {
      c.setLineDash([]);
      for (var i = 0; i < 5; i++)
        tellRing(c, gx(s, tellArenaX(b, k.px + (i - 2) * 55)), k.floorY - 3, 9, P.amber);
    },
    needles: function (c, s, b, k) {
      L(c, gx(s, k.cx - k.dir * b.w * 0.35), b.y + b.h * 0.72, gx(s, k.px), k.py, P.amber, 1);
    },
    arcbolt: function (c, s, b, k) {
      for (var i = 0; i < 3; i++) {
        var tx = gx(s, tellArenaX(b, k.px + (i - 1) * 60 * k.dir));
        L(c, tx, 34, tx, k.floorY - 4, P.amber, 1);
      }
    },
    breath: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * (b.w * 0.5 + 15));
      L(c, x0, k.floorY - 9, x0 + k.dir * 225, k.floorY - 9, P.coral, 3);
    },
    eruption: function (c, s, b, k) {
      c.setLineDash([]);
      for (var i = 0; i < 5; i++)
        tellRing(c, gx(s, tellArenaX(b, k.px + (i - 2) * 64)), k.floorY - 3, 13, P.coral);
    },
    tackle: function (c, s, b, k) {
      c.setLineDash([]);
      var x0 = gx(s, k.cx + k.dir * b.w * 0.9);
      for (var i = 0; i < 4; i++) tellChevron(c, x0 + k.dir * i * 55, b.y + b.h * 0.62, k.dir, 11, P.amber);
    },
    bite: function (c, s, b, k) {
      var jx = gx(s, k.cx + k.dir * (b.w * 0.6 + 104)),
        jy = b.y + b.h * 0.5;
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      c.strokeRect(jx - 20, jy - 22, 40, 44);
    },
    voidstep: function (c, s, b, k) {
      var A = g.AstraCombat.arena,
        side = k.cx < k.px ? -1 : 1,
        to = k.px - side * 80 - b.w / 2;
      if (to < A.bossMin || to > A.bossMax) to = k.px + side * 110 - b.w / 2;
      var tx = gx(s, Math.max(A.bossMin, Math.min(A.bossMax, to)) + b.w / 2);
      tellRing(c, tx, k.floorY - 3, b.w * 0.7, P.amber);
      L(c, tx, k.floorY - 8, tx, k.floorY - b.h * 0.9, P.amber, 1);
    },
    crossorb: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * b.w * 0.3),
        y0 = b.y + b.h * 0.1,
        x1 = gx(s, k.px);
      L(c, x0, y0, x1, k.py, P.amber, 1);
      c.setLineDash([]);
      for (var i = 0; i < 8; i++) {
        var a = (i * Math.PI) / 4;
        L(
          c,
          x1 + Math.cos(a) * 16,
          k.py + Math.sin(a) * 16,
          x1 + Math.cos(a) * 24,
          k.py + Math.sin(a) * 24,
          P.amber,
          1
        );
      }
    },
    voidring: function (c, s, b, k) {
      var cx = gx(s, k.cx),
        cy = b.y + b.h / 2;
      c.strokeStyle = P.amber;
      c.lineWidth = 2;
      for (var i = 0; i < 2; i++) {
        c.beginPath();
        c.ellipse(cx, cy, b.w * (1.1 + i * 0.45), b.h * (0.75 + i * 0.3), 0, 0, Math.PI * 2);
        c.stroke();
      }
    },
    tailbeam: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * b.w * 0.5);
      L(c, x0, k.floorY - 24, x0 + k.dir * 360, k.floorY - 24, P.coral, 2);
    },
    hornflip: function (c, s, b, k) {
      c.setLineDash([]);
      var x0 = gx(s, k.cx + k.dir * b.w * 0.9);
      for (var i = 0; i < 3; i++) tellChevron(c, x0 + k.dir * i * 50, b.y + b.h * 0.62, k.dir, 11, P.amber);
      tellArrowUp(c, x0 + k.dir * 150, b.y + b.h * 0.2, P.coral);
    },
    stomp: function (c, s, b, k) {
      c.setLineDash([]);
      var cx = gx(s, k.cx);
      for (var d = -1; d <= 1; d += 2)
        for (var i = 0; i < 3; i++)
          tellChevron(c, cx + d * (b.w * 0.8 + i * 30), k.floorY - 12, d, 10, P.coral);
      tellArrowUp(c, cx, b.y - 6, P.coral);
    },
    anvil: function (c, s, b, k) {
      var tx = gx(s, tellBodyX(b, k.px));
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      c.strokeRect(tx - b.w * 0.8, k.floorY - 16, b.w * 1.6, 14);
      c.setLineDash([]);
      tellArrowUp(c, gx(s, k.cx), b.y - 6, P.coral);
    },
    sawrush: function (c, s, b, k) {
      c.setLineDash([]);
      var x0 = gx(s, k.cx + k.dir * b.w * 0.9);
      for (var i = 0; i < 4; i++) tellChevron(c, x0 + k.dir * i * 60, k.floorY - 14, k.dir, 10, P.amber);
    },
    sawtoss: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * b.w * 0.4),
        yy = k.floorY - 10,
        S = g.AstraCombat.bossSwing,
        far = S.sawSpeed * S.sawTurn;
      L(c, x0, yy, x0 + k.dir * far, yy, P.coral, 2);
      c.setLineDash([]);
      tellChevron(c, x0 + k.dir * far, yy, k.dir, 7, P.coral);
      tellChevron(c, x0 + k.dir * (far - 40), yy - 12, -k.dir, 6, P.amber);
    },
    embers: function (c, s, b, k) {
      c.setLineDash([]);
      for (var i = 0; i < 7; i++)
        tellRing(c, gx(s, tellArenaX(b, k.px + (i - 3) * 44)), k.floorY - 3, 6, P.amber);
    },
    crownbeam: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * b.w * 0.5);
      L(c, x0, k.floorY - 66, x0 + k.dir * 480, k.floorY - 66, P.amber, 2);
      L(c, x0, k.floorY - 14, x0 + k.dir * 480, k.floorY - 14, P.coral, 2);
    },
    barrage: function (c, s, b, k) {
      var x0 = gx(s, k.cx + k.dir * b.w * 0.5);
      L(c, x0, k.floorY - 14, x0 + k.dir * 260, k.floorY - 14, P.coral, 3);
      L(c, x0, k.floorY - 62, x0 + k.dir * 260, k.floorY - 62, P.amber, 2);
    },
    tailspin: function (c, s, b, k) {
      var cx = gx(s, k.cx);
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      c.strokeRect(cx - 105, k.floorY - 32, 90, 30);
      c.strokeRect(cx + 15, k.floorY - 32, 90, 30);
    },
    pounce: function (c, s, b, k) {
      var tx = gx(s, tellBodyX(b, k.px)),
        cx = gx(s, k.cx),
        y0 = b.y + b.h * 0.3;
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      c.strokeRect(tx - b.w * 0.8, k.floorY - 16, b.w * 1.6, 14);
      c.strokeStyle = P.amber;
      c.beginPath();
      c.moveTo(cx, y0);
      c.quadraticCurveTo((cx + tx) / 2, y0 - 240, tx, k.floorY - b.h * 0.5);
      c.stroke();
    }
  };
  // Six patterns only work if the player can read which one is coming, so each wind-up draws
  // its own warning where the attack will actually arrive.
  function bossTell(c, s, b) {
    if (!b || !b.active) return;
    var raw = String(b.attack || ''),
      telling = raw.indexOf('tell-') === 0,
      move = telling ? raw.slice(5) : raw,
      label = move === 'dash' && b.flies ? 'SWOOP' : BOSS_MOVE_NAMES[move],
      stuck = raw === 'dive' && !!b.move && b.move.phase === 'stuck';
    // The recovery after an attack is the window the fight is built around, so it is said out
    // loud rather than left for the player to infer from a boss that has gone quiet.
    if (raw === 'rest' || stuck) {
      var beat = 0.55 + 0.45 * Math.abs(Math.sin((s.time || 0) * 7));
      c.save();
      c.globalAlpha = beat;
      T(c, '\u25bd OPEN', 490, 322, 8, P.cyan, 'right');
      c.restore();
    }
    if (label && !stuck)
      T(
        c,
        (telling ? '\u25b8 ' : '') + label,
        490,
        telling ? 322 : 323,
        telling ? 8 : 7,
        telling ? P.amber : P.steel,
        'right'
      );
    if (!telling || !label) return;
    var pl = s.player || {},
      pw = pl.w || 24,
      t = s.time || 0,
      pulse = 0.32 + 0.42 * Math.abs(Math.sin(t * 11)),
      cx = gx(s, b.x + b.w / 2),
      top = b.y,
      dir = b.facing < 0 ? -1 : 1,
      px = pl.x === undefined ? cx : gx(s, pl.x + pw / 2),
      floorY = (b.baseY === undefined ? b.y : b.baseY) + b.h,
      i,
      y,
      ax,
      tx;
    c.save();
    c.globalAlpha = pulse;
    c.setLineDash([5, 4]);
    if (move === 'volley') {
      for (i = 0; i < 3; i++) {
        y = top + b.h * 0.24 + i * b.h * 0.13;
        L(c, cx + dir * (b.w * 0.6), y, cx + dir * (b.w * 0.6 + 84), y - 16 + i * 16, P.amber, 2);
      }
    } else if (move === 'wave') {
      L(c, cx + dir * (b.w * 0.6), floorY - 7, cx + dir * 250, floorY - 7, P.coral, 3);
    } else if ((move === 'dash' && b.flies) || move === 'swoop') {
      // the path the swoop will take: its own length, dipping to a standing player's height half way
      var tu = g.AstraBosses.get(b.id).tuning,
        span = tu.dashSpeed * tu.dashHold,
        cy0 = top + b.h / 2,
        lowC = b.baseY - g.AstraCombat.bossFlight.swoopClear + b.h / 2;
      c.strokeStyle = P.amber;
      c.lineWidth = 2;
      c.beginPath();
      for (i = 0; i <= 14; i++) {
        var su = i / 14,
          spx = cx + dir * span * su,
          spy = cy0 + (lowC - cy0) * Math.sin(Math.PI * su);
        if (i) c.lineTo(spx, spy);
        else c.moveTo(spx, spy);
      }
      c.stroke();
    } else if (move === 'dash') {
      c.setLineDash([]);
      for (i = 0; i < 3; i++) {
        ax = cx + dir * (b.w * 0.7 + i * 20);
        L(c, ax, top + b.h * 0.27, ax + dir * 11, top + b.h * 0.5, P.amber, 2);
        L(c, ax, top + b.h * 0.73, ax + dir * 11, top + b.h * 0.5, P.amber, 2);
      }
    } else if (move === 'mortar') {
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      for (i = -1; i < 2; i++) {
        tx = px + i * 72;
        c.beginPath();
        c.arc(tx, floorY - 5, 11, 0, 7);
        c.stroke();
        L(c, tx - 16, floorY - 5, tx + 16, floorY - 5, P.coral, 1);
        L(c, tx, floorY - 21, tx, floorY + 11, P.coral, 1);
      }
    } else if (move === 'ring') {
      c.strokeStyle = P.amber;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, top + b.h / 2, b.w * 0.8 + pulse * 20, 0, 7);
      c.stroke();
    } else if (move === 'slam') {
      c.setLineDash([]);
      L(c, cx, top - 6, cx, top - 34, P.coral, 3);
      L(c, cx - 9, top - 22, cx, top - 35, P.coral, 3);
      L(c, cx + 9, top - 22, cx, top - 35, P.coral, 3);
      c.setLineDash([5, 4]);
      c.strokeStyle = P.coral;
      c.lineWidth = 2;
      c.strokeRect(px - 46, floorY - 15, 92, 13);
    } else if (move === 'mines') {
      c.strokeStyle = P.amber;
      c.lineWidth = 2;
      for (i = -1; i < 2; i++) {
        tx = px + i * 90;
        c.strokeRect(tx - 13, floorY - 17, 26, 15);
        L(c, tx - 19, floorY - 9, tx + 19, floorY - 9, P.amber, 1);
      }
    } else if (move === 'wall') {
      ax = cx + dir * (b.w * 0.5 + 10);
      c.strokeStyle = P.coral;
      c.lineWidth = 3;
      L(c, ax, floorY - 16, ax, floorY - 186, P.coral, 3);
      L(c, ax, floorY - 16, ax + dir * 30, floorY - 16, P.coral, 1);
      L(c, ax, floorY - 186, ax + dir * 30, floorY - 186, P.coral, 1);
    } else if (move === 'dive') {
      c.setLineDash([]);
      for (i = 0; i < 3; i++) {
        y = top - 8 - i * 14;
        L(c, cx - 9, y + 8, cx, y, P.amber, 2);
        L(c, cx + 9, y + 8, cx, y, P.amber, 2);
      }
      c.setLineDash([5, 4]);
      L(c, cx, top - 4, cx, top - g.AstraCombat.bossDive.lift, P.amber, 1);
    } else if (move === 'swing') {
      var an = g.AstraCombat.bossSwingAnchor(b),
        SW = g.AstraCombat.bossSwing,
        axs = gx(s, an.x),
        th = (SW.swingDeg * Math.PI) / 180;
      L(c, cx, top + 2, axs, an.y, P.coral, 2);
      c.strokeStyle = P.coral;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(axs, an.y, SW.rope, Math.PI / 2 - th, Math.PI / 2 + th);
      c.stroke();
      c.setLineDash([]);
      R(c, axs - 3, an.y - 3, 6, 6, P.coral);
    } else if (BOSS_TELLS[move] && g.AstraCombat && g.AstraCombat.arena)
      BOSS_TELLS[move](c, s, b, {
        cx: b.x + b.w / 2,
        dir: dir,
        floorY: floorY,
        px: pl.x === undefined ? b.x + b.w / 2 : pl.x + pw / 2,
        py: pl.y === undefined ? top + b.h / 2 : pl.y + (pl.h || 44) * 0.5
      });
    c.setLineDash([]);
    c.restore();
  }
  function drawSaberCore(c, fr, rx, gy, scale, reducedMotion) {
    var paths = [
        function (p) {
          p.moveTo(129, 356);
          p.quadraticCurveTo(101, 409, 51, 463);
        },
        function (p) {
          p.moveTo(139, 181);
          p.quadraticCurveTo(70, 200, 43, 258);
        },
        function (p) {
          p.moveTo(151, 175);
          p.quadraticCurveTo(143, 90, 178, 36);
        },
        function (p) {
          p.moveTo(218, 382);
          p.quadraticCurveTo(398, 400, 376, 303);
          p.quadraticCurveTo(365, 255, 329, 232);
        },
        function (p) {
          p.moveTo(159, 297);
          p.quadraticCurveTo(248, 374, 350, 372);
        },
        function (p) {
          p.moveTo(196, 350);
          p.quadraticCurveTo(265, 389, 358, 390);
        },
        function (p) {
          p.moveTo(170, 268);
          p.quadraticCurveTo(245, 300, 301, 314);
        },
        function (p) {
          p.moveTo(130, 305);
          p.quadraticCurveTo(100, 363, 64, 400);
        }
      ],
      path = paths[Math.max(0, Math.min(paths.length - 1, fr | 0))],
      a = (reducedMotion ? 0.62 : 0.82) * c.globalAlpha;
    c.save();
    c.scale(scale, scale);
    c.translate(-rx, -gy);
    function stroke(w, col, alpha) {
      c.beginPath();
      path(c);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = w;
      c.strokeStyle = col;
      c.globalAlpha = alpha;
      c.stroke();
    }
    stroke(13, P.ice, a * 0.42);
    stroke(7, P.white, a);
    c.globalAlpha = 1;
    c.restore();
  }
  function drawComboTrail(c, p) {
    var stage = Math.max(1, Math.min(3, p.saberCombo || 1)),
      elapsed = g.AstraCombat.saberPhase(p) * 0.32,
      fade =
        elapsed < 0.05
          ? 0
          : Math.min(1, Math.max(0, (elapsed - 0.05) / 0.03)) * Math.max(0, 1 - (elapsed - 0.08) / 0.32),
      a = (p.reducedMotion ? 0.45 : 0.72) * fade;
    if (!a) return;
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = stage === 3 ? P.amber : P.cyan;
    c.lineWidth = stage === 3 ? 3 : 2;
    c.lineCap = 'round';
    c.beginPath();
    if (stage === 1) c.arc(5, -28, 34, -1.2, 0.6);
    else if (stage === 2) c.ellipse(18, -24, 42, 10, 0, -Math.PI, 0);
    else {
      c.arc(5, -38, 48, -1.2, 0.85);
      c.lineTo(37, 0);
    }
    c.stroke();
    if (stage === 3) {
      c.globalAlpha = a * 0.8;
      c.fillStyle = P.amber;
      c.beginPath();
      c.arc(37, -2, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  function drawPlayerSprite(c, s, p) {
    var run =
        g.AstraCombat && g.AstraCombat.runPose
          ? g.AstraCombat.runPose(p)
          : Math.abs(p.vx || 0) > 20 && p.onGround && !(p.dashTime > 0) && !p.saberTime && !p.wallDir,
      held = !!(g.AstraCombat && g.AstraCombat.risingHeld && g.AstraCombat.risingHeld(p)),
      saber = p.saberTime > 0 || held,
      idle = g.AstraCombat && g.AstraCombat.idlePose && g.AstraCombat.idlePose(p);
    if (run || idle || saber) ensureAsset('run', 'assets/player-run-v4.svg');
    if (saber) ensureAsset('saber', 'assets/player-saber-v2.png');
    if (saber && g.AstraSaberRig && runAtlas && runAtlas.complete && runAtlas.naturalWidth) {
      c.save();
      c.globalAlpha = p.invuln > 0 && Math.floor((s.time || 0) * 16) % 2 ? 0.45 : 1;
      g.AstraSaberRig.draw(c, {
        x: gx(s, p.x + p.w / 2),
        y: p.y + p.h,
        facing: p.saberFacing,
        stage: g.AstraCombat.saberStage(p),
        phase: g.AstraCombat.saberPhase(p),
        image: runAtlas,
        reducedMotion: s.reducedMotion,
        fanLevel: g.AstraCombat.fanLevel(p),
        effectTime: s.time
      });
      c.restore();
      return;
    }
    var rigMode = g.AstraCombat && g.AstraCombat.rigMode ? g.AstraCombat.rigMode(p) : null;
    if (
      rigMode &&
      rigMode !== 'saber' &&
      g.AstraRunRig &&
      runAtlas &&
      runAtlas.complete &&
      runAtlas.naturalWidth
    ) {
      c.save();
      c.globalAlpha = p.invuln > 0 && Math.floor((s.time || 0) * 16) % 2 ? 0.45 : 1;
      c.translate(gx(s, p.x + p.w / 2), p.y + p.h - 3);
      var chargeFlash = saberFlash(p);
      if (chargeFlash) c.filter = chargeFlash;
      g.AstraRunRig.draw(c, {
        x: 0,
        y: 3,
        facing: p.facing,
        phase: g.AstraCombat.rigPhase(p),
        mode: rigMode,
        rise: g.AstraCombat.rigRise(p),
        aiming: g.AstraCombat.runAim(p),
        image: runAtlas
      });
      c.restore();
      return;
    }
    var atlas =
        saber && saberAtlas && saberAtlas.complete && saberAtlas.naturalWidth
          ? saberAtlas
          : run && runAtlas && runAtlas.complete && runAtlas.naturalWidth
            ? runAtlas
            : playerSheet,
      useSaber = atlas === saberAtlas,
      useRun = atlas === runAtlas,
      fr = useSaber ? g.AstraCombat.saberFrame(p) : useRun ? g.AstraCombat.runFrame(p) : combatFrame(p),
      scale = useSaber ? 0.15625 : useRun ? g.AstraCombat.runMetadata.scale : 0.135,
      rx = useSaber
        ? [200, 205, 178, 190, 174, 216, 178, 217]
        : useRun
          ? g.AstraCombat.runMetadata.rootX
          : null,
      gy = useSaber
        ? [470, 470, 470, 468, 391, 391, 405, 408]
        : useRun
          ? g.AstraCombat.runMetadata.virtualGroundY
          : null,
      rect = useSaber
        ? [
            [0, 0, 384, 512],
            [384, 0, 384, 512],
            [768, 0, 352, 512],
            [1120, 0, 416, 512],
            [0, 512, 384, 512],
            [384, 512, 384, 512],
            [768, 512, 352, 512],
            [1120, 512, 416, 512]
          ]
        : useRun
          ? g.AstraCombat.runMetadata.cells
          : null,
      cell = useRun ? g.AstraCombat.runCellOrder[fr] : fr,
      r = rect ? rect[cell] : [(fr % 4) * 384, Math.floor(fr / 4) * 512, 384, 512],
      center = gx(s, p.x + p.w / 2),
      baseline = p.y + p.h - 3;
    c.save();
    c.globalAlpha = p.invuln > 0 && Math.floor((s.time || 0) * 16) % 2 ? 0.45 : 1;
    c.translate(center, baseline);
    if ((saber ? p.saberFacing : p.facing) < 0) c.scale(-1, 1);
    if (saber) drawComboTrail(c, p);
    if (useSaber) {
      drawSaberCore(c, fr, rx[fr], gy[fr], scale, !!s.reducedMotion);
      c.drawImage(
        atlas,
        r[0],
        r[1],
        r[2],
        r[3],
        -rx[cell] * scale,
        -gy[cell] * scale,
        r[2] * scale,
        r[3] * scale
      );
    } else if (useRun)
      c.drawImage(
        atlas,
        r[0],
        r[1],
        r[2],
        r[3],
        -rx[cell] * scale,
        -gy[cell] * scale,
        r[2] * scale,
        r[3] * scale
      );
    else {
      var oy = playerIdleOffset(p),
        dx = -24,
        dy = -55,
        split = 36;
      c.drawImage(atlas, r[0], r[1] + split * 8, r[2], (64 - split) * 8, dx, dy + split, 48, 64 - split);
      c.drawImage(atlas, r[0], r[1], r[2], split * 8, dx, dy + oy, 48, split - oy);
    }
    c.restore();
  }
  function combatFrame(p) {
    var old =
      p.saberTime > 0
        ? 7
        : p.wallDir
          ? 6
          : p.dashTime > 0
            ? 5
            : !p.onGround
              ? 4
              : Math.abs(p.vx || 0) > 1
                ? 1 + (Math.floor((p.animTime || 0) * 12) % 3)
                : 0;
    var api = g.AstraCombat;
    if (api && typeof api.frame === 'function') {
      var f = api.frame(p);
      if (f >= 0 && f <= 7) return f;
    }
    return old;
  }
  function combatMuzzle(s, p) {
    var api = g.AstraCombat;
    if (api && typeof api.muzzle === 'function') {
      var m = api.muzzle(p);
      if (m && isFinite(m.x) && isFinite(m.y)) return { x: gx(s, m.x), y: m.y };
    }
    var left = p.facing < 0,
      oy = api && typeof api.idleOffset === 'function' ? api.idleOffset(p) : 0;
    return { x: gx(s, p.x + (left ? p.w - 41 : 41)), y: p.y + 19 + oy };
  }
  function playerIdleOffset(p) {
    var api = g.AstraCombat;
    return api && typeof api.idleOffset === 'function' ? api.idleOffset(p) : 0;
  }
  // The saber's charge, drawn the way the thrust sheet's first row is: nothing at first, a white flash
  // the moment it is ready, and blue lightning crawling over the body that gathers in front of the
  // fist once it is. Pixel by pixel, like the thrust's own light.
  function sparkHash(a, b) {
    var x = Math.sin(a * 127.1 + b * 311.7 + 1.3) * 43758.5453;
    return x - Math.floor(x);
  }
  function pixelBolt(c, x0, y0, x1, y1, seed, step, col) {
    var px = x0,
      py = y0,
      dx = x1 - x0,
      dy = y1 - y0,
      len = Math.hypot(dx, dy) || 1,
      nx = -dy / len,
      ny = dx / len;
    c.fillStyle = col;
    for (var j = 1; j <= 4; j++) {
      var u = j / 4,
        off = j === 4 ? 0 : (sparkHash(seed + j, step) - 0.5) * len * 0.45,
        qx = x0 + dx * u + nx * off,
        qy = y0 + dy * u + ny * off,
        m = Math.max(1, Math.round(Math.hypot(qx - px, qy - py)));
      for (var k = 0; k <= m; k++)
        c.fillRect(Math.round(px + ((qx - px) * k) / m), Math.round(py + ((qy - py) * k) / m), 1, 1);
      px = qx;
      py = qy;
    }
  }
  function saberFlash(p) {
    var api = g.AstraCombat;
    if (!api || !api.saberChargeShown || !api.thrust) return '';
    var ch = api.saberChargeShown(p),
      T = api.thrust;
    if (ch < T.ready) return '';
    var since = (ch - T.ready) / T.rate;
    return since < 0.05 ? 'brightness(0) invert(1)' : since < 0.11 ? 'brightness(1.8) saturate(.35)' : '';
  }
  function saberChargeEffects(c, s, p) {
    var api = g.AstraCombat;
    if (!p || !api || !api.saberChargeShown || !api.thrust || s.mode === 'paused' || s.paused) return;
    var ch = api.saberChargeShown(p);
    if (ch <= 0.12 || p.saberCombo === 7) return;
    var T = api.thrust,
      ready = ch >= T.ready,
      rm = !!s.reducedMotion,
      f = p.facing < 0 ? -1 : 1,
      cx = gx(s, p.x + p.w / 2),
      cy = p.y + p.h * 0.55,
      hx = Math.round(cx + f * 12),
      hy = Math.round(p.y + p.h * 0.42),
      step = rm ? 0 : Math.floor((s.time || 0) * 18),
      n = ready ? 5 : 1 + Math.round(Math.min(1, (ch - 0.12) / (T.ready - 0.12)) * 3);
    c.save();
    c.imageSmoothingEnabled = false;
    for (var k = 0; k < n; k++) {
      var a = sparkHash(k * 7.3, step),
        b = sparkHash(k * 2.9 + 40, step),
        ang = a * Math.PI * 2,
        rx = 10 + 5 * b,
        ry = 15 + 5 * b,
        x0 = cx + Math.cos(ang) * rx,
        y0 = cy + Math.sin(ang) * ry,
        x1,
        y1;
      if (ready && k < 3) {
        x1 = hx;
        y1 = hy;
      } else {
        var ang2 = ang + (b < 0.5 ? 1 : -1) * (0.7 + 0.6 * a);
        x1 = cx + Math.cos(ang2) * rx;
        y1 = cy + Math.sin(ang2) * ry;
      }
      pixelBolt(c, x0, y0, x1, y1, k * 13 + 1, step, k % 2 ? '#a8d8f8' : '#40a0f8');
    }
    if (ready) {
      var r = 1 + Math.round(ch * 1.5);
      c.fillStyle = '#2058d8';
      c.fillRect(hx - r - 1, hy - r, r * 2 + 3, r * 2 + 1);
      c.fillRect(hx - r, hy - r - 1, r * 2 + 1, r * 2 + 3);
      c.fillStyle = '#f8f8f8';
      c.fillRect(hx - r, hy - r + 1, r * 2 + 1, r * 2 - 1);
      c.fillRect(hx - r + 1, hy - r, r * 2 - 1, r * 2 + 1);
    }
    c.restore();
  }
  function draw(c, s) {
    s = s || {};
    var t = s.time || 0;
    c.save();
    c.imageSmoothingEnabled = false;
    var sh = s.shake || 0;
    c.translate((Math.sin(t * 70) * sh) | 0, (Math.cos(t * 53) * sh * 0.5) | 0);
    background(c, s, t);
    (s.platforms || []).forEach(function (p) {
      platform(c, s, p);
    });
    (s.pickups || []).forEach(function (k) {
      if (k.taken) return;
      var col = k.type === 'health' ? P.coral : P.cyan,
        x = gx(s, k.dropped ? k.x + 9 : k.x),
        y =
          (k.dropped ? k.y + 9 : k.y) +
          (k.dropped && k.rest ? Math.sin((s.time || 0) * 4 + k.x * 0.07) * 1.6 : 0);
      if (k.dropped) {
        G(c, x, y, 13, col, 0.3);
        R(c, x - 6, y - 6, 12, 12, P.ink);
        R(c, x - 5, y - 5, 10, 10, col);
        R(c, x - 4, y - 1, 8, 2, P.white);
        R(c, x - 1, y - 4, 2, 8, P.white);
      } else {
        G(c, x, y, 18, col, 0.25);
        Q(c, [x, y - 7, x + 6, y, x, y + 7, x - 6, y], col);
      }
    });
    (s.enemies || []).forEach(function (e) {
      foe(c, s, e);
    });
    boss(c, s, s.boss);
    (s.bullets || []).forEach(function (b) {
      if (fanProjectile(c, s, b) || bossProjectile(c, s, b)) return;
      var x = gx(s, b.x),
        co = b.team === 'player' ? P.orange : P.pink;
      if (b.kind === 'wave') {
        var wr = b.r || 7;
        G(c, x, b.y, wr * 3, P.coral, 0.34);
        c.save();
        c.globalAlpha = 0.9;
        c.fillStyle = P.coral;
        c.beginPath();
        c.ellipse(x, b.y, wr, wr * 1.7, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = P.amber;
        c.beginPath();
        c.ellipse(x, b.y, wr * 0.45, wr * 1.1, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      } else if (b.kind === 'mine') {
        var mr = b.r || 7,
          fuse = b.fuse || 1.2,
          left = C(b.life / fuse, 0, 1),
          hot = Math.floor((s.time || 0) * (7 + (1 - left) * 22)) % 2;
        G(c, x, b.y, mr * 2.6, hot ? P.white : P.coral, 0.32);
        c.save();
        c.fillStyle = P.ink;
        c.beginPath();
        c.arc(x, b.y, mr, 0, 7);
        c.fill();
        c.fillStyle = hot ? P.white : P.coral;
        c.beginPath();
        c.arc(x, b.y, mr * 0.55, 0, 7);
        c.fill();
        c.restore();
      } else if (b.kind === 'wall') {
        var br = b.r || 6;
        G(c, x, b.y, br * 2.6, P.pink, 0.3);
        R(c, x - br, b.y - br * 1.5, br * 2, br * 3, P.pink);
        R(c, x - br * 0.4, b.y - br, br * 0.8, br * 2, P.white);
      } else if (b.kind === 'shell') {
        var sr = b.r || 5;
        G(c, x, b.y, sr * 3, P.amber, 0.34);
        c.save();
        c.fillStyle = P.coral;
        c.beginPath();
        c.arc(x, b.y, sr, 0, 7);
        c.fill();
        c.fillStyle = P.amber;
        c.beginPath();
        c.arc(x, b.y, sr * 0.5, 0, 7);
        c.fill();
        c.restore();
      } else {
        G(c, x, b.y, 12, co, 0.3);
        R(c, x - (b.r || 3), b.y - 1, (b.r || 3) * 2, 3, co);
      }
    });
    (s.particles || []).forEach(function (q) {
      if (bossImpact(c, s, q)) return;
      var a = C(q.life / (q.maxLife || 1), 0, 1),
        x = gx(s, q.x),
        z = q.size || 2,
        col = q.color || q.col || P.orange;
      if (q.type === 'flash') {
        G(c, x, q.y, z, col, a * 0.85);
        return;
      }
      if (q.type === 'ring') {
        c.save();
        c.globalAlpha = a * 0.85;
        c.strokeStyle = col;
        c.lineWidth = q.width || 2;
        c.beginPath();
        c.arc(x, q.y, z, 0, 7);
        c.stroke();
        c.restore();
        return;
      }
      if (q.type === 'smoke') {
        c.globalAlpha = a * 0.4;
        R(c, x - z / 2, q.y - z / 2, z, z, col);
        return;
      }
      c.globalAlpha = a;
      R(c, x, q.y, z, z, col);
    });
    c.globalAlpha = 1;
    if (s.player && !s.deathFx) {
      if (s.player.dashTime > 0)
        for (var i = 1; i < 4; i++)
          player(
            c,
            s,
            {
              x: s.player.x - s.player.vx * i * 3,
              y: s.player.y,
              w: s.player.w,
              facing: s.player.facing,
              vx: 0,
              onGround: s.player.onGround,
              animTime: s.player.animTime
            },
            true
          );
      if (!(s.player.invuln > 0 && Math.floor(t * 16) % 2)) player(c, s, s.player, false);
    }
    c.restore();
  }
  var rushPortraits = {};
  function rushPortrait(id) {
    if (!rushPortraits[id]) {
      var img = new Image();
      img.src = 'assets/bosses/' + id + '-portrait.webp';
      rushPortraits[id] = img;
    }
    return rushPortraits[id];
  }
  function hud(c, s) {
    var p = s.player || {},
      combat = g.AstraCombat || {
        saberChargeShown: function () {
          return 0;
        },
        thrust: { ready: 0.55 },
        fanLevel: function () {
          return 1;
        },
        stage: { bosses: [] }
      },
      hp = Math.max(0, p.hp || 0),
      max = p.maxHp || 8,
      f = s.feedback || {},
      m = s.mastery || {},
      charge = C(combat.saberChargeShown(p), 0, 1),
      fan = p.saberCombo === 7,
      ready = !fan && charge >= combat.thrust.ready;
    c.save();
    c.globalAlpha = 0.95;
    R(c, 9, 9, 184, 49, P.ink);
    L(c, 9, 9, 193, 9, P.cyan, 1);
    T(c, 'ARMOR', 16, 14, 7, P.cyan);
    T(c, hp + ' / ' + max, 184, 14, 7, P.white, 'right');
    for (var i = 0; i < max; i++) {
      var xx = 16 + i * 21,
        full = i < hp,
        trail = C((f.hpTrail || hp) - i, 0, 1);
      R(c, xx, 26, 17, 9, P.deep);
      if (trail > 0) R(c, xx, 26, 17 * trail, 9, P.coral);
      if (full) {
        R(c, xx, 26, 17, 9, hp <= 2 ? P.amber : P.cyan);
        R(c, xx + 2, 28, 13, 2, P.ice);
      }
    }
    T(c, m.ready > 0 ? 'COUNTER READY' : 'COUNTER', 16, 42, 7, m.ready > 0 ? P.amber : P.steel);
    R(c, 112, 44, 70, 3, P.deep);
    if (m.ready > 0) R(c, 112, 44, 70 * C(m.ready / 1.5, 0, 1), 3, P.amber);
    R(c, 202, 9, 194, 49, P.ink);
    L(c, 202, 9, 396, 9, P.cyan, 1);
    T(c, fan ? 'FAN / ' + combat.fanLevel(p) + ' VOLLEY' : 'THRUST', 210, 14, 7, P.cyan);
    T(
      c,
      fan ? (charge >= 1 ? 'MAX' : 'CHARGING') : ready ? 'READY' : 'HOLD SABER',
      387,
      14,
      7,
      ready || charge >= 1 ? P.amber : P.steel,
      'right'
    );
    R(c, 210, 27, 178, 8, P.deep);
    R(c, 210, 27, 178 * charge, 8, ready || charge >= 1 ? P.amber : P.cyan);
    var mark = fan ? 0.5 : combat.thrust.ready;
    R(c, 210 + 178 * mark, 26, 1, 10, P.white);
    T(
      c,
      fan ? '1 > 2 > 3 / RELEASE TO FIRE' : ready ? 'RELEASE TO THRUST' : 'HOLD TO CHARGE',
      210,
      42,
      7,
      ready ? P.amber : P.steel
    );
    if (s.stage && s.stage.id === 'gauntlet' && !s.practice) {
      var order = combat.stage.bosses || [],
        current = s.bossIndex || 0,
        done = m.clears || [];
      R(c, 404, 9, 227, 49, P.ink);
      T(c, 'RUSH ' + Math.min(current + 1, order.length) + ' / ' + order.length, 411, 14, 7, P.cyan);
      T(c, done.length + ' CLEARED', 625, 14, 7, P.white, 'right');
      order.forEach(function (id, n) {
        var x = 411 + n * 27,
          cleared = done.some(function (r) {
            return r.id === id;
          }),
          active = n === current && !cleared,
          img = rushPortrait(id);
        R(c, x - 1, 25, 24, 26, active ? P.amber : cleared ? P.cyan : P.deep);
        R(c, x, 26, 22, 24, P.ink);
        c.globalAlpha = cleared ? 0.45 : active ? 1 : 0.4;
        if (img.complete && img.naturalWidth) c.drawImage(img, x, 26, 22, 22);
        else T(c, String(n + 1), x + 11, 31, 8, P.white, 'center');
        c.globalAlpha = 0.95;
        if (cleared) {
          L(c, x + 6, 40, x + 10, 44, P.cyan, 2);
          L(c, x + 10, 44, x + 17, 35, P.cyan, 2);
        } else if (active) R(c, x + 6, 51, 10, 2, P.amber);
        else if (n === current + 1) T(c, 'NEXT', x + 11, 51, 5, P.cyan, 'center');
      });
    } else {
      T(
        c,
        s.practice ? 'PRACTICE' : 'SCORE ' + String(s.score || 0).padStart(7, '0'),
        W - 12,
        14,
        8,
        P.white,
        'right'
      );
      T(
        c,
        s.practice ? 'R / RESTART' : 'SECTOR ' + (s.section || 'SIGNAL YARD'),
        W - 12,
        29,
        7,
        P.cyan,
        'right'
      );
    }
    c.restore();
  }
  function recoveryNotice(c, s) {
    var r = s.feedback && s.feedback.recovery,
      b = s.boss;
    if (!r || !b || !b.down || s.mode !== 'playing') return;
    var t = b.downTime || 0,
      heading =
        t < 0.65
          ? 'FRAME DESTROYED'
          : t < 1.45
            ? 'ARMOR RESTORED'
            : r.next
              ? 'NEXT CHALLENGER'
              : 'ALL FRAMES CLEARED';
    var detail =
      t < 0.65
        ? b.name
        : t < 1.45
          ? (r.healed ? 'LIFE +' + r.healed : 'LIFE FULL') + ' / ' + r.hp + ' OF ' + r.maxHp
          : r.next
            ? g.AstraBosses.get(r.next).name
            : 'MISSION COMPLETE';
    c.save();
    R(c, 190, 119, 260, 44, P.ink);
    L(c, 190, 119, 450, 119, P.cyan, 1);
    T(c, heading, 320, 127, 8, P.cyan, 'center');
    T(c, detail, 320, 143, 10, P.white, 'center');
    c.restore();
  }
  var baseDraw = draw,
    stageImg = null,
    stageCanvas = null,
    playerSheet = null,
    bossSprite = null,
    runAtlas = null,
    saberAtlas = null,
    assetRetry = { stage: 0, player: 0, boss: 0, run: 0, saber: 0 },
    assetDelay = { stage: 1000, player: 1000, boss: 1000, run: 1000, saber: 1000 },
    assetLoading = { stage: false, player: false, boss: false, run: false, saber: false };
  function ensureAsset(name, url) {
    var current =
      name === 'stage'
        ? stageImg
        : name === 'player'
          ? playerSheet
          : name === 'boss'
            ? bossSprite
            : name === 'run'
              ? runAtlas
              : saberAtlas;
    if (current && current.complete && current.naturalWidth) return;
    var now = Date.now();
    if (assetLoading[name] || now < assetRetry[name]) return;
    assetLoading[name] = true;
    var im = new Image();
    im.onload = function () {
      assetLoading[name] = false;
      assetDelay[name] = 1000;
      if (name === 'stage') stageImg = im;
      else if (name === 'player') playerSheet = im;
      else if (name === 'boss') bossSprite = im;
      else if (name === 'run') runAtlas = im;
      else saberAtlas = im;
    };
    im.onerror = function () {
      assetLoading[name] = false;
      assetRetry[name] = Date.now() + assetDelay[name];
      assetDelay[name] = Math.min(10000, assetDelay[name] * 2);
    };
    im.src = url;
    if (name === 'stage') stageImg = im;
    else if (name === 'player') playerSheet = im;
    else if (name === 'boss') bossSprite = im;
    else if (name === 'run') runAtlas = im;
    else saberAtlas = im;
  }
  // Each boss may bring its own picture. They are small and only one is ever on screen, so a
  // plain cache keyed by path is enough; a boss with no picture falls back to the shared frame.
  var bossArt = {};
  function bossPicture(src) {
    if (!src) return null;
    var slot = bossArt[src];
    if (!slot) {
      slot = bossArt[src] = { img: new Image(), failed: false };
      slot.img.onerror = function () {
        slot.failed = true;
      };
      slot.img.src = src;
    }
    return !slot.failed && slot.img.complete && slot.img.naturalWidth ? slot.img : null;
  }
  var proceduralBackground = background;
  background = function (c, s, t) {
    var cam = (s.camera && s.camera.x) || 0;
    ensureAsset('stage', 'assets/stage-city.png');
    if (stageImg.complete && stageImg.naturalWidth) {
      c.drawImage(stageImg, -32 - ((cam * 0.04) % 64), -18, 768, 432);
      c.fillStyle = 'rgba(4,18,28,.12)';
      c.fillRect(0, 0, W, H);
      for (var i = 0; i < 32; i++) {
        var x = ((i * 83 + t * 5) % 680) - 20,
          y = (i * 47 + t * 17) % 270;
        L(c, x, y, x - 2, y + 7, 'rgba(95,207,211,.28)', 1);
      }
      return;
    }
    proceduralBackground(c, s, t);
  };
  var BOSS_ENTRANCE = {
    warden: { x: 38, y: -90, color: '#ffbd65', kind: 'drop' },
    tidebreaker: { x: 80, y: 0, color: '#69eaff', kind: 'surf' },
    coilhead: { x: 92, y: -68, color: '#71eeff', kind: 'flight' },
    ashmaw: { x: 58, y: -42, color: '#ff8852', kind: 'drop' },
    nullpriest: { x: 0, y: 0, color: '#cd9dff', kind: 'warp' },
    gravelock: { x: 0, y: -140, color: '#e7b47c', kind: 'drop' },
    sparkwidow: { x: 120, y: 0, color: '#ffda63', kind: 'surf' },
    'obsidian-crown': { x: 0, y: -88, color: '#c39fff', kind: 'warp' }
  };
  function entrancePose(s) {
    var i = s.bossIntro,
      b = s.boss,
      e = BOSS_ENTRANCE[b.id] || BOSS_ENTRANCE.warden;
    var u = C(i.time / (i.duration * 0.46), 0, 1),
      ease = 1 - Math.pow(1 - u, 3),
      settle = C((i.time / i.duration - 0.46) / 0.22, 0, 1);
    return {
      spec: e,
      u: u,
      x: s.reducedMotion ? 0 : e.x * (1 - ease),
      y: s.reducedMotion ? 0 : e.y * (1 - ease),
      alpha: C(u * 3, 0, 1),
      squash:
        s.reducedMotion || e.kind === 'flight' || e.kind === 'warp' ? 0 : Math.sin(settle * Math.PI) * 0.12
    };
  }
  function bossEntrance(c, s) {
    var i = s.bossIntro,
      b = s.boss;
    if (!i || !b) return;
    var e = entrancePose(s),
      co = e.spec.color,
      t = i.time / i.duration,
      x = gx(s, b.x + b.w / 2),
      floor = b.baseY + b.h;
    c.save();
    // A ground signature stays at the real spawn point while the body arrives.
    var ring = C(1 - Math.abs(t - 0.46) * 2, 0, 1);
    c.globalAlpha = ring * 0.7;
    c.strokeStyle = co;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, floor, 24 + ring * 48, 5 + ring * 7, 0, 0, Math.PI * 2);
    c.stroke();
    if (!s.reducedMotion && t < 0.65) {
      c.globalAlpha = (1 - t / 0.65) * 0.4;
      if (e.spec.kind === 'warp') {
        G(c, x, b.y + b.h / 2, 70, co, 0.4);
        for (var k = 0; k < 3; k++) {
          c.beginPath();
          c.ellipse(x, b.y + b.h / 2, 22 + k * 14, 50 + k * 8, t * 5 + k, 0, Math.PI * 2);
          c.stroke();
        }
      } else {
        for (var k = 0; k < 5; k++) {
          var xx = x + (k - 2) * 15;
          L(c, xx, floor - 12, xx + e.spec.x * 0.3, floor - 24 - Math.abs(e.spec.y) * 0.7, co, 1);
        }
      }
    }
    c.globalAlpha = 1;
    R(c, 0, 0, 640, 10, P.ink);
    R(c, 0, 350, 640, 10, P.ink);
    var a = Math.min(1, t * 7, (1 - t) * 8);
    c.globalAlpha = a;
    R(c, 174, 65, 292, 51, '#06151f');
    L(c, 174, 65, 466, 65, co, 2);
    T(c, t < 0.76 ? 'FRAME DETECTED' : 'ENGAGE', 320, 71, 7, co, 'center');
    T(c, b.name, 320, 84, 12, P.white, 'center');
    T(c, b.title || '', 320, 102, 7, co, 'center');
    c.restore();
  }
  draw = function (c, s) {
    s = s || {};
    // Render-only arrival pose; never move the real hitbox or change the first attack.
    if (s.bossIntro && s.boss) {
      var ep = entrancePose(s);
      s = Object.assign({}, s, {
        boss: Object.assign({}, s.boss, { attack: 'entrance', move: null, entryPose: ep })
      });
    }
    ensureAsset('stage', 'assets/stage-city.png');
    if (!stageCanvas) {
      stageCanvas = document.createElement('canvas');
      stageCanvas.width = W;
      stageCanvas.height = H;
    }
    var q = stageCanvas.getContext('2d'),
      d = s;
    ensureAsset('player', 'assets/player-sheet.png');
    ensureAsset('boss', 'assets/boss-warden.png');
    if (s.mode === 'playing') {
      ensureAsset('run', 'assets/player-run-v4.svg');
      ensureAsset('saber', 'assets/player-saber-v2.png');
    }
    if (s.shake) {
      d = Object.assign({}, s, { shake: s.reducedMotion ? 0 : s.shake * 14 });
    }
    if (s.player && playerSheet.complete && playerSheet.naturalWidth) {
      d = Object.assign({}, d, { player: null, enemyTarget: s.player });
    }
    if (s.boss && s.boss.active && bossSprite.complete && bossSprite.naturalWidth) {
      d = Object.assign({}, d, { boss: null });
    }
    q.clearRect(0, 0, W, H);
    baseDraw(q, d);
    c.clearRect(0, 0, W, H);
    c.drawImage(stageCanvas, 0, 0);
    if (s.player && !s.deathFx && playerSheet.complete && playerSheet.naturalWidth) {
      drawPlayerSprite(c, s, s.player);
      saberChargeEffects(c, s, s.player);
    }
    if (s.player && !s.deathFx && s.player.dashTime > 0 && playerSheet.complete && playerSheet.naturalWidth) {
      var gp = s.player,
        gf = combatFrame(gp),
        gsw = 384,
        gsh = 512;
      for (var gi = 1; gi < 4; gi++) {
        var gdx = gx(s, gp.x + gp.w / 2) - 24 - (gp.vx || 0) * gi * 0.022;
        c.save();
        c.globalAlpha = 0.15;
        if (gp.facing < 0) {
          c.translate(gdx + 48, 0);
          c.scale(-1, 1);
          gdx = 0;
        }
        c.drawImage(
          playerSheet,
          (gf % 4) * gsw,
          Math.floor(gf / 4) * gsh,
          gsw,
          gsh,
          gdx,
          gp.y + gp.h - 58,
          48,
          64
        );
        c.restore();
      }
    }
    if (s.boss && s.boss.active && bossSprite.complete && bossSprite.naturalWidth) {
      var bb = s.boss,
        fk = bb.h / 110,
        dw = 140 * fk,
        dh = 130 * fk,
        bx = gx(s, bb.x) + bb.w / 2 - dw / 2,
        by = bb.y - 12 * fk,
        recoil = bb.down
          ? Math.sin((s.time || 0) * 44) * 2.5
          : bb.attack && String(bb.attack).indexOf('tell-') === 0
            ? Math.sin((s.time || 0) * 18) * 2
            : 0;
      var own = bossPicture(bb.sprite);
      // fit its own picture around the body it collides with, keeping the picture's proportions
      // The body is the machine's core, not its wingspan, so a picture is sized by height and
      // hung on the middle of it: feet on the body's floor, head a little over the top.
      if (own) {
        var k = (bb.h * 1.16) / own.naturalHeight;
        dw = own.naturalWidth * k;
        dh = own.naturalHeight * k;
        bx = gx(s, bb.x) + bb.w / 2 - dw / 2;
        by = bb.y + bb.h - dh;
      }
      if (!bb.gone) {
        // mirrored whenever it faces away from the way its picture was drawn, so it always looks at the player
        var pf = bossDrawnFacing(bb, own),
          flip = (bb.facing < 0 ? -1 : 1) !== pf,
          pose = bossPoseEased(bb, s.time || 0, !!s.reducedMotion, pf, flip);
        c.save();
        if (bb.entryPose) {
          var ent = bb.entryPose;
          bx += ent.x;
          by += ent.y;
          pose.alpha = ent.alpha;
          pose.sy = 1 - ent.squash;
          pose.sx = 1 + ent.squash * 0.6;
          pose.py = 1;
        }
        c.globalAlpha = (bb.flash > 0 ? 0.72 : 1) * pose.alpha;
        if (!own && bb.look) c.filter = bb.look;
        if (flip) {
          c.translate(bx + dw, 0);
          c.scale(-1, 1);
          bx = 0;
        }
        var frame = own || bossSprite,
          // the strip of floor a cut-out still carries would tilt into a slab while it leans, stretch or slide while it
          // crouches or lunges, and hang in the air under it while it flies or leaps; it is left off whenever any is true
          keep =
            own && (pose.rot || pose.dx || pose.sx !== 1 || pose.sy !== 1 || bb.y < bb.baseY - 1)
              ? 1 - (BOSS_FLOOR_BAND[bb.id] || 0)
              : 1;
        if (pose.rot || pose.dx || pose.dy || pose.jx || pose.jy || pose.sx !== 1 || pose.sy !== 1) {
          var pcx = bx + dw * pose.px,
            pcy = by + recoil + dh * pose.py;
          c.translate(pcx + pose.dx + pose.jx, pcy + pose.dy + pose.jy);
          c.rotate(pose.rot);
          c.scale(pose.sx, pose.sy);
          c.translate(-pcx, -pcy);
        }
        if (!bossArtDraw(c, bb, frame, bx, by + recoil, dw, dh, keep, s.time || 0, !!s.reducedMotion))
          c.drawImage(
            frame,
            0,
            0,
            frame.naturalWidth,
            frame.naturalHeight * keep,
            bx,
            by + recoil,
            dw,
            dh * keep
          );
        c.restore();
      }
      R(c, 146, 317, 348, 32, P.ink);
      T(c, (bb.name || 'WARDEN').split('').join(' ') + '  //  ' + (bb.title || ''), 150, 322, 8, P.cyan);
      R(c, 150, 334, 340, 7, P.deep);
      R(c, 152, 336, 336 * C(bb.hp / bb.maxHp, 0, 1), 3, P.coral);
    }
    if (s.boss && s.boss.active && !s.bossIntro) {
      bossEnergy(c, s, s.boss);
      bossTell(c, s, s.boss);
    }
    nextBossMarker(c, s);
    playerBreak(c, s);
    if (s.checkpoint && s.checkpoint.active) {
      var cx = gx(s, s.checkpoint.x);
      G(c, cx, s.checkpoint.y - 18, 20, P.cyan, 0.2);
      R(c, cx - 2, s.checkpoint.y - 18, 4, 18, P.steel);
      R(c, cx - 5, s.checkpoint.y - 20, 10, 4, P.cyan);
      T(c, 'CP', cx - 7, s.checkpoint.y - 31, 7, P.cyan);
    }
    if (s.flash > 0 && !s.reducedMotion) {
      c.save();
      c.globalAlpha = Math.min(0.85, s.flash);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, W, H);
      c.restore();
    }
    if (s.mode === 'playing' && !s.bossIntro && s.message && s.messageTimer > 0) {
      R(c, 180, 62, 280, 24, P.ink);
      L(c, 180, 62, 460, 62, P.amber, 1);
      T(c, s.message, 320, 70, 8, P.white, 'center');
    }
    hud(c, s);
    bossEntrance(c, s);
    recoveryNotice(c, s);
    if (s.mastery && s.mode === 'playing' && !s.bossIntro) {
      var mm = s.mastery;
      c.save();

      if (mm.ready <= 0 && mm.notice > 0) T(c, mm.text, 16, 70, 8, P.cyan);
      var mb = s.boss;
      if (mb && mb.active && !mb.down) {
        var tell = String(mb.attack || '').indexOf('tell-') === 0,
          key = tell ? mb.attack.slice(5) : '';
        if (tell && g.AstraMastery) {
          var hint = g.AstraMastery.hints[key] || 'WATCH THE ATTACK';
          R(c, 186, 94, 268, 20, P.ink);
          T(c, hint, 320, 98, 8, P.amber, 'center');
          R(c, 188, 113, 264 * (1 - C(mb.timer / (mb.tellDuration || 1), 0, 1)), 2, P.amber);
        } else if (mb.attack === 'rest') {
          T(c, 'OPEN / THRUST BONUS', 320, 98, 8, P.cyan, 'center');
        }
      }
      c.restore();
    }
  };
  g.AstraRenderer = {
    draw: draw,
    moveNames: BOSS_MOVE_NAMES,
    bossArtTarget: bossArtTarget,
    bossMeshPoint: bossMeshPoint
  };
})(window);
