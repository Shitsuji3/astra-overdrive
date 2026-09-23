(function (g) {
  'use strict';
  var TAU = Math.PI * 2,
    SCALE = 0.2,
    EXTENT = 11;
  // The redrawn idle sprite is taller and slimmer than the jointed run/saber atlas. BUILD stretches
  // the jointed rigs to the same proportions so the character does not thicken when he moves or
  // swings. Applied about the feet, so ground contact is unchanged; muzzle() scales to match.
  // limb narrows each bone across its own axis, which is what separates the redrawn idle's
  // slender legs and arms from the rounder jointed parts.
  var BUILD = { x: 0.96, y: 1.12, limb: 0.8 };
  var idleAtlas = null,
    idleReady = false,
    idleLoading = false,
    idleRetry = 0;
  function loadIdle() {
    if (idleReady || idleLoading || typeof Image === 'undefined' || Date.now() < idleRetry) return;
    idleLoading = true;
    var im = new Image();
    im.onload = function () {
      idleAtlas = im;
      idleReady = true;
      idleLoading = false;
    };
    im.onerror = function () {
      idleLoading = false;
      idleRetry = Date.now() + 2000;
    };
    im.src = 'assets/player-idle-v2.png';
  }
  // Only fetched if something asks for the single-frame idle art; nothing in the game does,
  // so the download no longer happens on every page load.
  var BODY = [
    [0, 0],
    [314, 0],
    [314, 140],
    [205, 140],
    [205, 185],
    [160, 185],
    [160, 126],
    [0, 126]
  ];
  var ARM = [
    [142, 126],
    [160, 124],
    [173, 137],
    [171, 151],
    [154, 161],
    [142, 170],
    [137, 189],
    [126, 204],
    [108, 207],
    [99, 195],
    [100, 180],
    [109, 157],
    [121, 143],
    [132, 143]
  ];
  var THIGH = [
    [146, 145],
    [163, 148],
    [178, 158],
    [187, 172],
    [187, 184],
    [176, 193],
    [166, 187],
    [148, 177],
    [137, 166],
    [137, 153]
  ];
  var SHIN = [
    [180, 179],
    [195, 183],
    [197, 196],
    [187, 211],
    [185, 232],
    [177, 244],
    [146, 246],
    [141, 235],
    [145, 219],
    [150, 206],
    [163, 199],
    [174, 197]
  ];
  var FOOT = [
    [146, 235],
    [164, 237],
    [174, 237],
    [183, 242],
    [199, 248],
    [200, 261],
    [137, 262],
    [132, 255],
    [136, 244]
  ];
  var CANNON = [
    [206, 147],
    [218, 144],
    [248, 146],
    [273, 155],
    [278, 178],
    [254, 188],
    [221, 188],
    [207, 178],
    [198, 165]
  ];
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  function rigidPart(ctx, img, origin, mask, sourcePivot, destPivot, scale, angle) {
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.translate(destPivot.x, destPivot.y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(mask[0][0] - sourcePivot.x, mask[0][1] - sourcePivot.y);
    for (var i = 1; i < mask.length; i++) ctx.lineTo(mask[i][0] - sourcePivot.x, mask[i][1] - sourcePivot.y);
    ctx.closePath();
    ctx.clip();
    var size = origin.x === 0 && origin.y === 0 ? 1254 : 313;
    ctx.drawImage(img, origin.x, origin.y, size, size, -sourcePivot.x, -sourcePivot.y, size, size);
    ctx.restore();
  }
  function bonePart(ctx, img, origin, mask, sourceA, sourceB, destA, destB, slim) {
    var sx = sourceB.x - sourceA.x,
      sy = sourceB.y - sourceA.y,
      dx = destB.x - destA.x,
      dy = destB.y - destA.y;
    var sl = Math.hypot(sx, sy),
      dl = Math.hypot(dx, dy),
      angle = Math.atan2(dy, dx) - Math.atan2(sy, sx);
    var thin = slim === undefined ? BUILD.limb : slim;
    if (thin === 1) {
      rigidPart(ctx, img, origin, mask, sourceA, destA, dl / sl, angle);
      return;
    }
    // Squeeze across the bone about the joint, so length and joint position are untouched.
    var along = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(destA.x, destA.y);
    ctx.rotate(along);
    ctx.scale(1, thin);
    ctx.rotate(-along);
    ctx.translate(-destA.x, -destA.y);
    rigidPart(ctx, img, origin, mask, sourceA, destA, dl / sl, angle);
    ctx.restore();
  }
  function ik(hip, ankle) {
    var dx = ankle.x - hip.x,
      dy = ankle.y - hip.y,
      d = Math.hypot(dx, dy),
      l1 = 11.5,
      l2 = 13.5,
      r = clamp(d, Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001),
      ux = dx / d,
      uy = dy / d,
      actual = { x: hip.x + ux * r, y: hip.y + uy * r },
      along = (l1 * l1 - l2 * l2 + r * r) / (2 * r),
      height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    return {
      knee: { x: hip.x + ux * along + uy * height, y: hip.y + uy * along - ux * height },
      ankle: actual
    };
  }
  function pose(phase) {
    phase = ((phase % 1) + 1) % 1;
    var bob = 1.2 * Math.sin(TAU * 2 * phase),
      keys = [
        [0, -12.75, -4],
        [0.18, -13, -10],
        [0.42, -7, -18],
        [0.65, 3, -16],
        [0.84, 11, -9],
        [1, 11, -4]
      ];
    function swing(u) {
      var i = 0;
      while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
      var a = keys[i],
        b = keys[i + 1],
        q = (u - a[0]) / (b[0] - a[0]),
        h00 = 2 * q * q * q - 3 * q * q + 1,
        h10 = q * q * q - 2 * q * q + q,
        h01 = -2 * q * q * q + 3 * q * q,
        h11 = q * q * q - q * q;
      function tan(j, k) {
        return [
          (keys[k][1] - keys[j][1]) / (keys[k][0] - keys[j][0]),
          (keys[k][2] - keys[j][2]) / (keys[k][0] - keys[j][0])
        ];
      }
      var ta = i ? tan(i - 1, i + 1) : [-71.25, 0],
        tb = i + 2 < keys.length ? tan(i, i + 2) : [-71.25, 0],
        d = b[0] - a[0];
      return {
        x: h00 * a[1] + h10 * ta[0] * d + h01 * b[1] + h11 * tb[0] * d,
        y: h00 * a[2] + h10 * ta[1] * d + h01 * b[2] + h11 * tb[1] * d
      };
    }
    function leg(t) {
      var stance = t < 0.25,
        u = stance ? t / 0.25 : (t - 0.25) / 0.75,
        v = stance ? { x: 11 - 95 * t, y: -4 } : swing(u),
        hip = { x: 0, y: -23 + bob },
        result = ik(hip, v);
      return { hip: hip, ankle: result.ankle, ik: result, stance: stance, t: t, u: u };
    }
    var l = leg(phase),
      r = leg((phase + 0.5) % 1);
    return { phase: phase, body: { bob: bob, lean: 0.055 }, left: l, right: r };
  } // Each arm is driven from its shoulder, with an independently bent elbow.
  var UPPER_ARM = [
    [144, 139],
    [155, 141],
    [161, 151],
    [153, 164],
    [143, 173],
    [127, 168],
    [123, 157],
    [132, 146]
  ];
  var FOREARM = [
    [134, 157],
    [150, 163],
    [145, 180],
    [138, 198],
    [127, 207],
    [108, 207],
    [99, 195],
    [100, 180],
    [112, 166]
  ];
  // Right forearm ends in a cuff and articulated glove, never the atlas's orange muzzle.
  function rightForearm(ctx, img, elbow, wrist, grip) {
    var angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x),
      ux = Math.cos(angle),
      uy = Math.sin(angle);
    var cuff = { x: wrist.x - ux * 3, y: wrist.y - uy * 3 };
    bonePart(
      ctx,
      img,
      { x: 0, y: 0 },
      [
        [134, 157],
        [150, 163],
        [145, 180],
        [126, 184],
        [110, 180],
        [112, 166]
      ],
      { x: 139, y: 164 },
      { x: 127, y: 179 },
      elbow,
      cuff
    );
    ctx.save();
    ctx.translate(wrist.x, wrist.y);
    ctx.rotate(angle);
    function polygon(points, color) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    polygon(
      [
        [-4, -3],
        [-1, -4],
        [3, -3],
        [4, -1],
        [4, 2],
        [1, 4],
        [-3, 3]
      ],
      '#10283f'
    );
    polygon(
      [
        [-3, -2],
        [-1, -3],
        [2, -2],
        [3, 0],
        [2, 2],
        [0, 3],
        [-2, 2]
      ],
      '#b8dce4'
    );
    polygon(
      [
        [-2, -2],
        [1, -2],
        [2, -1],
        [-1, 0]
      ],
      '#efffff'
    );
    ctx.strokeStyle = '#4c7e9b';
    ctx.lineWidth = 0.7;
    for (var k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(k - 0.6, 0);
      ctx.lineTo(k - 0.6, 2);
      ctx.stroke();
    }
    polygon(
      [
        [-2, 0],
        [0, 0],
        [1, 1],
        [0, 2],
        [-2, 2]
      ],
      '#e1f6ef'
    );
    if (grip) {
      ctx.fillStyle = '#132b3c';
      ctx.fillRect(0.5, -1, 1.5, 2);
    }
    ctx.restore();
  }
  function upperPose(phase, mode) {
    var q = TAU * phase;
    if (mode === true || mode === 'idle')
      return { lean: 0.025 + 0.012 * Math.sin(q), sway: 0.4 * Math.sin(q) };
    if (mode === 'air') return { lean: 0.15, sway: 0.35 };
    if (mode === 'dash') return { lean: 0.36, sway: 0.9 };
    if (mode === 'wall') return { lean: -0.11, sway: -0.5 };
    return { lean: 0.09 + 0.035 * Math.sin(2 * q - 0.35), sway: 0.6 * Math.sin(q) };
  }
  // Airborne, dash and wall stances. The far slot carries the leading leg, matching the idle stance.
  function placed(hip, farAnkle, nearAnkle, farU, nearU) {
    function leg(a, u) {
      var r = ik(hip, a);
      return { hip: hip, ankle: r.ankle, ik: r, stance: u === undefined, t: 0, u: u || 0 };
    }
    return { right: leg(farAnkle, farU), left: leg(nearAnkle, nearU) };
  }
  function airPose(phase, rise) {
    var r = clamp(rise === undefined ? 1 : rise, -1, 1),
      hip = { x: 0, y: -24 };
    var l = placed(hip, { x: 10 + 2 * r, y: -15 - 3 * r }, { x: -11 + 2 * r, y: -7 - 2 * r }, 0.34, 0.14);
    return { phase: ((phase % 1) + 1) % 1, body: { bob: 0 }, left: l.left, right: l.right, mode: 'air' };
  }
  function dashPose(phase) {
    var hip = { x: 1, y: -21 },
      l = placed(hip, { x: 16, y: -4 }, { x: -15, y: -9 }, undefined, 0.24);
    return { phase: ((phase % 1) + 1) % 1, body: { bob: 0 }, left: l.left, right: l.right, mode: 'dash' };
  }
  function wallPose(phase) {
    var hip = { x: -1, y: -22 },
      l = placed(hip, { x: 7, y: -4 }, { x: -5, y: -13 }, undefined, 0.3);
    return { phase: ((phase % 1) + 1) % 1, body: { bob: 0 }, left: l.left, right: l.right, mode: 'wall' };
  }
  function modeOf(o) {
    var m = o && o.mode;
    if (m) return m;
    return o && o.idle ? 'idle' : 'run';
  }
  function poseFor(mode, phase, rise) {
    if (mode === 'idle') return standingPose(phase || 0);
    if (mode === 'air') return airPose(phase || 0, rise);
    if (mode === 'dash') return dashPose(phase || 0);
    if (mode === 'wall') return wallPose(phase || 0);
    return pose(phase || 0);
  }
  function standingPose(phase) {
    phase = ((phase % 1) + 1) % 1;
    var bob = 0.55 * Math.sin(TAU * phase),
      hip = { x: 0, y: -23 + bob };
    function leg(x) {
      var r = ik(hip, { x: x, y: -4 });
      return { hip: hip, ankle: r.ankle, ik: r, stance: true, t: 0, u: 0 };
    }
    // draw() shades and draws `right` first, so that slot is the far leg: the anatomical left,
    // which the reference stands with forward while the near right foot waits behind.
    return { phase: phase, body: { bob: bob }, left: leg(-8), right: leg(8) };
  }
  function armPose(phase, aiming, idle) {
    var q = TAU * phase,
      w = clamp(Number(aiming) || 0, 0, 1);
    var frontShoulder = { x: 3.5, y: -9 },
      rearShoulder = { x: -2.5, y: -9 };
    var frontSwing = idle ? 0.1 + 0.23 * Math.sin(q) : -0.9 * Math.cos(q);
    var rearSwing = idle ? -0.6 - 0.3 * Math.sin(q) : 0.9 * Math.cos(q);
    function elbow(s, a) {
      return { x: s.x + 7.5 * Math.sin(a), y: s.y + 7.5 * Math.cos(a) };
    }
    var fe = elbow(frontShoulder, frontSwing),
      re = elbow(rearShoulder, rearSwing);
    // Raise the whole weapon arm to aim; the idle/run elbow is otherwise free.
    re.x += (8.2 - re.x) * w;
    re.y += (-3.8 - re.y) * w;
    var fa = idle ? 0.65 + 0.2 * Math.sin(q) : 0.45 + 0.85 * Math.cos(q);
    var ra = idle ? 1.35 - 0.22 * Math.sin(q) : 0.45 - 0.85 * Math.cos(q);
    return {
      front: {
        shoulder: frontShoulder,
        elbow: fe,
        angle: fa,
        wrist: { x: fe.x + 8 * Math.cos(fa), y: fe.y + 8 * Math.sin(fa) }
      },
      rear: {
        shoulder: rearShoulder,
        elbow: re,
        angle: ra,
        wrist: { x: re.x + 8 * Math.cos(ra), y: re.y + 8 * Math.sin(ra) }
      },
      aim: w
    };
  }
  function cannonTransform(phase, aiming, mode, rise) {
    var m = mode === true ? 'idle' : mode || 'run';
    var p = poseFor(m, phase, rise),
      u = upperPose(p.phase, m),
      arms = armPose(p.phase, aiming, m === 'idle');
    var c = Math.cos(u.lean),
      s = Math.sin(u.lean),
      e = arms.rear.elbow;
    var pivot = { x: c * (e.x + u.sway) - s * e.y, y: p.left.hip.y + s * (e.x + u.sway) + c * e.y };
    var a = (u.lean + arms.rear.angle) * (1 - arms.aim),
      ca = Math.cos(a),
      sa = Math.sin(a);
    return {
      angle: a,
      pivot: pivot,
      muzzle: { x: pivot.x + ca * 12.9 - sa * 0.6, y: pivot.y + sa * 12.9 + ca * 0.6 }
    };
  }
  function draw(ctx, o) {
    o = o || {};
    // The whole character comes from this rig now. The separately drawn idle sprite stays available
    // behind o.spriteIdle so the artwork is not lost, but nothing in the game asks for it.
    if (o.spriteIdle) {
      loadIdle();
      if (idleReady) return drawIdle(ctx, o);
    }
    var mode = modeOf(o);
    var p = poseFor(mode, o.phase || 0, o.rise),
      upper = upperPose(p.phase, mode),
      arms = armPose(p.phase, o.aiming, mode === 'idle'),
      img = o.image;
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0);
    if ((o.facing || 1) < 0) ctx.scale(-1, 1);
    ctx.scale(BUILD.x, BUILD.y);
    ctx.imageSmoothingEnabled = false;
    function limb(l) {
      bonePart(ctx, img, { x: 314, y: 627 }, THIGH, { x: 151, y: 154 }, { x: 177, y: 181 }, l.hip, l.ik.knee);
      bonePart(
        ctx,
        img,
        { x: 314, y: 627 },
        SHIN,
        { x: 184, y: 190 },
        { x: 164, y: 242 },
        l.ik.knee,
        l.ankle
      );
      ctx.save();
      ctx.translate(l.ankle.x, l.ankle.y);
      ctx.scale(1, BUILD.limb);
      ctx.translate(-l.ankle.x, -l.ankle.y);
      rigidPart(
        ctx,
        img,
        { x: 314, y: 627 },
        FOOT,
        { x: 164, y: 242 },
        l.ankle,
        SCALE,
        l.stance ? 0 : 0.9 * Math.sin(Math.PI * l.u)
      );
      ctx.restore();
    }
    function torsoSpace() {
      ctx.translate(0, p.left.hip.y);
      ctx.rotate(upper.lean);
      ctx.translate(upper.sway, 0);
    }
    function upperArm(a) {
      bonePart(
        ctx,
        img,
        { x: 0, y: 0 },
        UPPER_ARM,
        { x: 153, y: 144 },
        { x: 139, y: 164 },
        a.shoulder,
        a.elbow
      );
    }
    ctx.save();
    ctx.filter = 'brightness(.78)';
    limb(p.right);
    ctx.restore();
    ctx.save();
    torsoSpace();
    upperArm(arms.rear);
    ctx.restore();
    // Anatomical left arm (far side) carries the buster; right arm (near side) is a hand.
    var ct = cannonTransform(p.phase, o.aiming, mode, o.rise);
    rigidPart(ctx, img, { x: 0, y: 0 }, CANNON, { x: 202, y: 164 }, ct.pivot, SCALE, ct.angle);
    limb(p.left);
    ctx.save();
    torsoSpace();
    rigidPart(ctx, img, { x: 0, y: 0 }, BODY, { x: 161, y: 183 }, { x: 0, y: 0 }, SCALE, 0);
    upperArm(arms.front);
    rightForearm(ctx, img, arms.front.elbow, arms.front.wrist, false);
    ctx.restore();
    ctx.restore();
    return p;
  }
  function drawIdle(ctx, o) {
    var p = standingPose(o.phase || 0),
      scale = 48 / 986,
      breathe = 0.35 * Math.sin(TAU * p.phase);
    // One cohesive sprite. Torso and arms breathe together; the lower edge of both soles
    // stays fixed. The waist seam is continuous, with less than 2% leg compression.
    var left = (176 - 654) * scale,
      top = (160 - 1146) * scale,
      seam = (700 - 1146) * scale + breathe;
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0);
    if ((o.facing || 1) < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(idleAtlas, 176, 160, 803, 540, left, top + breathe, 803 * scale, 540 * scale);
    ctx.drawImage(idleAtlas, 176, 700, 803, 446, left, seam, 803 * scale, -seam);
    ctx.restore();
    return p;
  }
  g.AstraRunRig = g.AstraRunRigV6 = {
    pose: pose,
    standingPose: standingPose,
    airPose: airPose,
    dashPose: dashPose,
    wallPose: wallPose,
    poseFor: poseFor,
    armPose: armPose,
    upperPose: upperPose,
    draw: draw,
    drawAt: function (ctx, phase, o) {
      o = o || {};
      o.phase = phase;
      return draw(ctx, o);
    },
    muzzle: function (phase, o) {
      o = o || {};
      var q = cannonTransform(phase || 0, o.aiming, modeOf(o), o.rise);
      // The jointed rig is drawn through BUILD, so the gun barrel moves with it.
      var mx = q.muzzle.x * BUILD.x,
        my = q.muzzle.y * BUILD.y;
      return {
        x: (o.x || 0) + ((o.facing || 1) < 0 ? -mx : mx),
        y: (o.y || 0) + my,
        local: { x: mx, y: my }
      };
    },
    get idleReady() {
      return idleReady;
    },
    build: BUILD,
    cannonTransform: cannonTransform,
    rigidPart: rigidPart,
    bonePart: bonePart,
    rightForearm: rightForearm
  };
})(typeof window !== 'undefined' ? window : globalThis);
