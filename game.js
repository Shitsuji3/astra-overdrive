(function (global) {
  'use strict';
  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
  var hit = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };
  // The saber is the main weapon and the buster only backs it up, so the buster does not charge: a press
  // fires one plain shot when it is let go. chargeThreshold is the saber's now, the charged thrust's ready
  // mark.
  var combat = { normalPower: 1, chargeThreshold: 0.55 };
  combat.saberRange = 72;
  // Four and a half plain shots. It used to be written as the charged shot's power times one and a half.
  combat.saberPower = 4.5;
  // Each of the rising cut's four bites is worth one of the finisher's cuts, so the four come to two and
  // a half plain swings. That is what it has dealt in play all along: the hit loop read the finisher's
  // row for it.
  combat.saberComboPower = [1, 1, 0.625, 0.625];
  combat.saberComboWindowStart = 0.12;
  combat.saberDuration = 0.4;
  // The rising cut is not a swing in place, it is a launch. Measured off the reference clip
  // at 20ms a frame: four frames crouched on the floor, then twenty-six rising while the flame
  // is out, which carries the body two of its own heights up and about half a width forward.
  // The rise gets its own weaker gravity so it takes as long as the reference's does; past the
  // top the world's own gravity takes over, which keeps the landing from floating.
  // hold is the ride down, which is a pose and not an attack: the sheet keeps a short blade
  // overhead from the moment the plume tears off until the feet touch the floor.
  combat.rising = {
    span: 0.78,
    crouch: 0.08,
    lift: 354,
    gravity: 680,
    drift: 34,
    apex: 92,
    hold: 0.46,
    bites: 4,
    biteEvery: 0.065
  };
  // The flame bites whatever it is drawn over, the moment it is drawn over it, then again every biteEvery
  // seconds while the target stays in the flame, bites times at most. Its hit shape is the flame's own
  // outline (combat.risingFire), so what it reaches is what is on screen.
  // The charged thrust, keyed off the user's thirty-frame sheet. Holding the saber charges it; the charge
  // meter, the charge hum and the ready flash are its alone, since the buster no longer charges. Letting
  // go at ready runs it. The sheet in order: the light
  // forms in the fist, a lunge drives it out ahead, it becomes a lance a little over two body heights
  // long, breaks up where it stands, and the body straightens. It bites once with the light still at
  // the fist and three times along the lance, each bite a full swing's worth.
  //   span            the whole move after the release, in seconds
  //   hits            elapsed seconds of each bite
  //   lunge           forward speed of the step into the lunge, between lungeFrom and lungeTo
  //   pad             how far from the drawn light a hit still counts
  //   reach           the old rectangle's range, only used if the rig is missing
  combat.thrust = {
    rate: 0.85,
    ready: combat.chargeThreshold,
    span: 0.9,
    hits: [0.2, 0.34, 0.43, 0.52],
    power: combat.saberPower * 1.5,
    pad: 13.5,
    lunge: 90,
    lungeFrom: 0.1,
    lungeTo: 0.26,
    reach: 165
  };
  // Just dodge: dash so that a hit lands within `window` seconds of the dash being pressed (two
  // frames, the same frame included) and it is not taken. The dodge is answered with `guard` seconds
  // in which nothing lands, so the attack that was dodged cannot connect a frame later, and with a
  // short slow-down: `slow` seconds of game time run at `slowScale` of real speed.
  combat.justDodge = {
    window: 2 / 60,
    guard: 0.5,
    slow: 0.14,
    slowScale: 0.3
  };
  // Down+saber: a grounded dome charge, then seven independent upward fan projectiles.
  combat.fan = {
    span: 1.02,
    fireAt: 0.72,
    count: 7,
    speed: 265,
    power: 4.5,
    radius: 6,
    life: 1.8,
    chargeMax: 1.4,
    chargeStep: 0.7,
    volleyGap: 0.12
  };
  combat.fanLevel = function (p) {
    return 1 + Math.min(2, Math.floor(((p.fanCharge || 0) + 1e-8) / combat.fan.chargeStep));
  };
  // How much of the thrust's charge is on show. The hold is counted from the press, but the press has
  // already swung, and the hum, the meter and the lightning wait for that blade to come back.
  combat.saberChargeShown = function (p) {
    if (p && p.saberCombo === 7 && p.saberTime > 0)
      return p.fanReleased ? 0 : Math.min(1, (p.fanCharge || 0) / combat.fan.chargeMax);
    return !p || p.saberTime > 0 ? 0 : Math.max(0, Math.min(1, p.saberCharge || 0));
  };
  // How long the swing on the books lasts. Every stage but the rising cut runs the short one.
  combat.saberSpan = function (p) {
    if (p && p.saberCombo === 7) return combat.fan.span;
    if (p && p.saberCombo === 6) return combat.thrust.span;
    return p && p.saberCombo === 4 ? combat.rising.span : combat.saberDuration;
  };
  // Which set of rig keys is on screen. Five is the ride down, which no input can ask for:
  // it is what the rising cut leaves behind while the player is still in the air.
  combat.saberStage = function (p) {
    if (p && !(p.saberTime > 0) && (p.risingHold || 0) > 0) return 5;
    // Six is the charged thrust, which only a released charge can ask for.
    if (p && p.saberCombo === 7) return 7;
    if (p && p.saberCombo === 6) return 6;
    return Math.max(1, Math.min(4, (p && p.saberCombo) || 1));
  };
  combat.risingHeld = function (p) {
    return !!(p && !(p.saberTime > 0) && (p.risingHold || 0) > 0);
  };
  // Keep the cutting response; give the follow-through twice as much time to settle.
  combat.saberPhase = function (p) {
    if (combat.risingHeld(p)) return Math.min(1, Math.max(0, 1 - p.risingHold / combat.rising.hold));
    var span = combat.saberSpan(p),
      elapsed = Math.max(0, span - (p.saberTime || 0));
    // the rising cut reads straight off its own clock; the chained swings keep the cut fast and
    // let the follow-through settle
    if (p && (p.saberCombo === 4 || p.saberCombo === 6 || p.saberCombo === 7))
      return Math.min(1, elapsed / span);
    return Math.min(1, elapsed <= 0.24 ? elapsed / 0.32 : 0.75 + ((elapsed - 0.24) / 0.16) * 0.25);
  };
  // Which stage is loaded. The arena and the checkpoints used to be constants here; they now
  // travel with the stage, so everything that reads combat.arena keeps working per stage.
  combat.stage = null;
  combat.useStage = function (def) {
    combat.stage = def;
    combat.arena = def.arena;
    combat.checkpoints = def.checkpoints;
    return def;
  };
  if (!global.AstraStages) throw new Error('assets/stages.js must load before game.js');
  if (!global.AstraBosses) throw new Error('assets/bosses.js must load before game.js');
  combat.useStage(global.AstraStages.get(global.AstraStages.first));
  combat.saberHitAt = 0.08;
  // Elapsed seconds at which each stage lands damage. The third swing is a multi-hit finisher.
  // Each entry is the elapsed second at which that stage lands a cut. They sit where the blade
  // has swung out, not where the input was pressed: stage 1 goes overhead first, stage 2 thrusts
  // straight away, and the finisher lands four cuts down its arc.
  // The rising cut is not on this table: its flame bites on contact (combat.rising, NeonGame._risingBites).
  combat.saberHitTimes = [[0.16], [0.08], [0.13, 0.17, 0.21, 0.25]];
  // Up and the saber are meant as one input, and nobody presses two keys on the same frame.
  // A recent up still counts when the saber arrives, and an up that arrives just after the
  // saber turns the swing that has barely started into the rising cut. Either order works.
  combat.risingGrace = 0.18;
  combat.risingConvert = 0.08;
  combat.saberDeflectEnd = 0.24;
  // The arc the drawn edge has travelled, in world coordinates. Null when the rig is absent,
  // in which case the callers fall back to the old rectangle.
  combat.saberSweep = function (p) {
    var rig = global.AstraSaberRig;
    if (!p || !(p.saberTime > 0) || !rig || !rig.sweep) return null;
    var build = global.AstraRunRig && global.AstraRunRig.build;
    var stage = combat.saberStage(p);
    var facing = p.saberFacing === undefined ? p.facing || 1 : p.saberFacing;
    var ox = p.x + p.w / 2,
      oy = p.y + p.h;
    var arc = rig.sweep(stage, combat.saberPhase(p), build);
    if (!arc.length) return null;
    return arc.map(function (seg) {
      return {
        ax: ox + facing * seg.root.x,
        ay: oy + seg.root.y,
        bx: ox + facing * seg.tip.x,
        by: oy + seg.tip.y
      };
    });
  };
  // The rising cut hits with its flame's drawn outline rather than the blade's sweep: slices across the
  // flame from its leading to its trailing edge and along both edges, at this moment of the rise, in world
  // coordinates. Null when no flame is out or the rig is absent. The pad is a sliver, because the outline
  // already is the flame.
  combat.risingFirePad = 3;
  combat.risingFire = function (p) {
    var rig = global.AstraSaberRig;
    if (!p || p.saberCombo !== 4 || !(p.saberTime > 0) || !rig || !rig.fireSlices) return null;
    var build = global.AstraRunRig && global.AstraRunRig.build;
    var facing = p.saberFacing === undefined ? p.facing || 1 : p.saberFacing;
    var ox = p.x + p.w / 2,
      oy = p.y + p.h;
    var slices = rig.fireSlices(4, combat.saberPhase(p), build);
    if (!slices.length) return null;
    return slices.map(function (s) {
      return { ax: ox + facing * s.a.x, ay: oy + s.a.y, bx: ox + facing * s.b.x, by: oy + s.b.y };
    });
  };
  // Liang-Barsky clip of one blade segment against a padded box.
  function segmentInBox(seg, x0, y0, x1, y1) {
    var dx = seg.bx - seg.ax,
      dy = seg.by - seg.ay,
      t0 = 0,
      t1 = 1;
    var edges = [
      [-dx, seg.ax - x0],
      [dx, x1 - seg.ax],
      [-dy, seg.ay - y0],
      [dy, y1 - seg.ay]
    ];
    for (var i = 0; i < 4; i++) {
      var pp = edges[i][0],
        qq = edges[i][1];
      if (pp === 0) {
        if (qq < 0) return false;
        continue;
      }
      var r = qq / pp;
      if (pp < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
    return true;
  }
  combat.bladeThickness = 7;
  // How far from the drawn edge a hit still counts. A sword is thin. The rising cut hits with its
  // flame's whole outline, so it needs no more than a sliver either.
  combat.saberPad = function (p) {
    if (p && p.saberCombo === 6) return combat.thrust.pad;
    return p && p.saberCombo === 4 ? combat.risingFirePad : combat.bladeThickness;
  };
  combat.bladeTouches = function (segs, box, pad) {
    if (!segs) return false;
    var grow = pad === undefined ? combat.bladeThickness : pad;
    var x0 = box.x - grow,
      y0 = box.y - grow,
      x1 = box.x + box.w + grow,
      y1 = box.y + box.h + grow;
    for (var i = 0; i < segs.length; i++) if (segmentInBox(segs[i], x0, y0, x1, y1)) return true;
    return false;
  };
  // A downed mob blows up, and one kill in four leaves a repair cell behind.
  combat.dropChance = 0.25;
  combat.dropHeal = 1;
  // The Warden's moves. He has all six from the opening bell; only his tempo changes as he
  // loses armour.
  combat.bossPatterns = {
    volley: { tell: 0.95, active: 1.6 },
    wave: { tell: 0.9, active: 1.7 },
    dash: { tell: 0.85, active: 1.5 },
    mortar: { tell: 1.0, active: 1.5 },
    ring: { tell: 0.85, active: 1.4 },
    slam: { tell: 0.75, active: 1.6 },
    mines: { tell: 0.95, active: 1.6 },
    wall: { tell: 0.85, active: 1.5 },
    // Signature moves, each owned by one boss. They run on their own phases (NeonGame._bossMove) and
    // hand over to the rest the moment they are done, so active is only their nominal length.
    dive: { tell: 0.9, active: 2.4 },
    swing: { tell: 0.9, active: 2.1 },
    // Each boss's own moves, run by BOSS_MOVES. active is their nominal length; a move ends when its script does.
    swoop: { tell: 0.85, active: 0.9 },
    pincer: { tell: 0.9, active: 1.0 },
    cannon: { tell: 0.95, active: 1.0 },
    clawrush: { tell: 0.85, active: 1.14 },
    quake: { tell: 0.9, active: 1.35 },
    geyser: { tell: 1.0, active: 1.3 },
    crescent: { tell: 0.9, active: 0.9 },
    leapslash: { tell: 0.9, active: 1.0 },
    rain: { tell: 0.95, active: 0.7 },
    needles: { tell: 0.8, active: 0.75 },
    arcbolt: { tell: 0.85, active: 1.2 },
    breath: { tell: 1.0, active: 1.25 },
    eruption: { tell: 0.95, active: 0.8 },
    tackle: { tell: 1.0, active: 1.25 },
    bite: { tell: 0.8, active: 0.7 },
    voidstep: { tell: 0.8, active: 0.8 },
    crossorb: { tell: 0.75, active: 0.55 },
    voidring: { tell: 0.8, active: 0.65 },
    tailbeam: { tell: 0.9, active: 0.85 },
    hornflip: { tell: 1.0, active: 1.2 },
    stomp: { tell: 1.05, active: 1.5 },
    anvil: { tell: 0.85, active: 1.2 },
    sawrush: { tell: 0.8, active: 0.9 },
    embers: { tell: 0.8, active: 0.6 },
    sawtoss: { tell: 0.8, active: 0.7 },
    crownbeam: { tell: 1.0, active: 1.6 },
    barrage: { tell: 0.8, active: 1.6 },
    tailspin: { tell: 0.85, active: 0.9 },
    pounce: { tell: 0.85, active: 1.0 }
  };
  // COILHEAD's dive. It rises lift px over the floor in rise seconds, hunts the player from overhead at
  // track px/s for hover seconds but holds still for the last lock of them, so the drop can be read and
  // sidestepped, falls at fall px/s^2, and sends a short shock out each way where it lands. Then it is
  // stuck for stuck seconds, which is the opening the move is built around.
  combat.bossDive = {
    rise: 0.45,
    lift: 150,
    hover: 0.55,
    lock: 0.18,
    track: 260,
    fall: 2600,
    stuck: 1.0,
    shockSpeed: 240,
    shockLife: 0.75,
    shockR: 7
  };
  // SPARKWIDOW's swing. A silk line is anchored anchorY px from the top of the screen over the middle of
  // the arena. It climbs to the end of the line on its own side in climb seconds, swings swingDeg either
  // side of straight down in sweep seconds - at the bottom its feet brush the floor, so it is jumped or
  // stood clear of - lets go on the far side, and on landing throws a saw blade each way that rolls out
  // and comes back once turn seconds are left of its life.
  // A boss whose roster entry flies cruises that high over the floor between moves. It changes height at
  // climb px/s, so it lifts off again after it has landed. In the air its charge is a swoop that dips to
  // swoopClear px over the floor at the middle of the pass - a standing player's height, and low enough
  // to be jumped - and climbs back.
  combat.bossFlight = { climb: 160, swoopClear: 24 };
  combat.bossSwing = {
    climb: 0.4,
    anchorY: 36,
    rope: 250,
    swingDeg: 55,
    sweep: 0.9,
    sawSpeed: 270,
    sawLife: 1.5,
    sawTurn: 0.75,
    sawR: 9
  };
  // Where the swing hangs from, in world coordinates of the body's centre, for the arena in use.
  combat.bossSwingAnchor = function (b) {
    return { x: (combat.arena.bossMin + combat.arena.bossMax) / 2 + b.w / 2, y: combat.bossSwing.anchorY };
  };
  // The whole catalogue. Which of these a boss owns is its own business.
  combat.bossPatternOrder = ['volley', 'wave', 'dash', 'mortar', 'ring', 'slam', 'mines', 'wall'];
  // How far from the player each beat can ask the boss to stand. Mixing these is what gives a
  // fight its shape: it backs off to shell you, then closes to sweep you.
  combat.bossBands = { near: 95, mid: 190, far: 300 };
  // Walking is bounded. If the arena will not give it the distance it wanted, it takes what it
  // got and winds up anyway rather than pressing into the wall.
  combat.bossWalk = { cap: 1.4, settle: 6 };
  // The opening. Every attack is followed by the boss standing still and starting nothing, and
  // this is the window the player is meant to take. It tightens as armour drops, never below
  // this, so there is always a way in.
  combat.bossRestFloor = 0.42;
  // Going down takes time: bursts walk over his frame, closing up as they go, and then he
  // goes up all at once.
  combat.bossDeath = { bursts: 9, blastAt: 1.55, end: 2.2 };
  combat.bossDeathBurstAt = function (i) {
    return combat.bossDeath.blastAt * Math.pow((i + 1) / (combat.bossDeath.bursts + 1), 0.72);
  };
  // Wounded, he winds up faster.
  combat.bossTellScale = [1, 0.82, 0.68];
  // Which attacks a boss owns, taken from the beats of its routine.
  combat.bossPool = function (def) {
    return def && def.pool && def.pool.length ? def.pool.slice() : combat.bossPatternOrder.slice();
  };
  // The loop a boss runs, and the beat that follows a given one. Nothing is chosen at random:
  // the order is written down in the roster and repeats forever.
  combat.bossRoutine = function (def) {
    return def && def.routine && def.routine.length ? def.routine : null;
  };
  combat.bossBeatAfter = function (def, at) {
    var routine = combat.bossRoutine(def);
    if (!routine) return 0;
    return ((at === undefined || at < 0 ? -1 : at) + 1) % routine.length;
  };
  combat.bossOf = function (b) {
    return global.AstraBosses.get(b && b.id);
  };
  combat.saberFrameDurations = [0.02, 0.03, 0.03, 0.04, 0.06, 0.06, 0.04, 0.04];
  combat.runFrameCount = 16;
  combat.runDuration = 0.5;
  combat.runFrameDuration = combat.runDuration / combat.runFrameCount;
  combat.runPhase = function (p) {
    return ((p.runTime || 0) / combat.runDuration) % 1;
  };
  // Hold the firing pose just after a shot, then ease back into the arm swing.
  combat.runAim = function (p) {
    var t = Math.max(0, Math.min(1, (p.shootPoseTime || 0) / 0.08));
    return t * t * (3 - 2 * t);
  };
  combat.runFrame = function (p) {
    return Math.floor((p.runTime || 0) / combat.runFrameDuration) % combat.runFrameCount;
  };
  combat.runPose = function (p) {
    return (
      !!p && p.onGround && Math.abs(p.vx || 0) > 20 && !(p.dashTime > 0) && !(p.saberTime > 0) && !p.wallDir
    );
  };
  combat.idlePose = function (p) {
    return (
      !!p &&
      !(p.shootPoseTime > 0) &&
      p.onGround &&
      Math.abs(p.vx || 0) <= 20 &&
      !(p.dashTime > 0) &&
      !(p.saberTime > 0) &&
      !p.wallDir
    );
  };
  // Every drawn state comes from the jointed rig. This picks which stance it poses.
  combat.rigMode = function (p) {
    if (!p) return null;
    if (p.saberTime > 0) return 'saber';
    if (p.wallDir) return 'wall';
    if (p.dashTime > 0) return 'dash';
    if (!p.onGround) return 'air';
    if (Math.abs(p.vx || 0) > 20) return 'run';
    return 'idle';
  };
  combat.rigPhase = function (p) {
    return combat.rigMode(p) === 'run' ? combat.runPhase(p) : combat.idlePhase(p);
  };
  // Positive while climbing, negative while dropping, so the airborne legs read the arc.
  combat.rigRise = function (p) {
    return Math.max(-1, Math.min(1, -(p.vy || 0) / 260));
  };
  combat.idlePhase = function (p) {
    return p.reducedMotion ? 0 : ((p.animTime || 0) / 2.8) % 1;
  };
  combat.runCellOrder = [0, 14, 5, 4, 8, 9, 7, 6, 10, 2, 3, 12, 11, 1, 13, 15];
  combat.runMetadata = {
    cells: [
      [0, 0, 314, 314],
      [314, 0, 313, 314],
      [627, 0, 313, 314],
      [940, 0, 314, 314],
      [0, 314, 314, 313],
      [314, 314, 313, 313],
      [627, 314, 313, 313],
      [940, 314, 314, 313],
      [0, 627, 314, 313],
      [314, 627, 313, 313],
      [627, 627, 313, 313],
      [940, 627, 314, 313],
      [0, 940, 314, 314],
      [314, 940, 313, 314],
      [627, 940, 313, 314],
      [940, 940, 314, 314]
    ],
    rootX: [176.5, 160, 153.5, 151.5, 170.5, 155, 154.5, 153.5, 176, 163, 152.5, 149, 171, 151.5, 159, 151],
    virtualGroundY: [300, 305, 303, 303, 285, 280, 280, 286, 268, 273, 274, 268, 248, 249, 244, 249],
    muzzleX: [266.5, 248, 247, 240.5, 264.5, 246.5, 244, 239, 264.5, 248, 241, 236.5, 258.5, 241, 247.5, 239],
    muzzleY: [
      167, 171.5, 167, 169, 146.5, 141.5, 142.5, 150, 134.5, 138, 140.5, 134.5, 113.5, 114, 110.5, 115.5
    ],
    scale: 0.19
  };
  combat.saberFrame = function (p) {
    var elapsed = combat.saberPhase(p) * 0.32,
      acc = 0;
    var maps = [
      [0, 1, 2, 3, 4, 5, 6, 7],
      [7, 6, 5, 4, 3, 4, 6, 7],
      [0, 1, 2, 2, 3, 4, 5, 7]
    ];
    if (elapsed <= 0) return maps[Math.max(0, Math.min(2, (p.saberCombo || 1) - 1))][0];
    for (var i = 0; i < combat.saberFrameDurations.length; i++) {
      acc += combat.saberFrameDurations[i];
      if (elapsed < acc) return maps[Math.max(0, Math.min(2, (p.saberCombo || 1) - 1))][i];
    }
    return maps[Math.max(0, Math.min(2, (p.saberCombo || 1) - 1))][7];
  };
  combat.idleOffset = function (p) {
    if (
      !p ||
      p.saberTime > 0 ||
      p.shootPoseTime > 0 ||
      p.dashTime > 0 ||
      !p.onGround ||
      p.wallDir ||
      Math.abs(p.vx || 0) > 1 ||
      p.reducedMotion
    )
      return 0;
    return Math.sin(((p.animTime || 0) * Math.PI * 2) / 2.8) * 1.5;
  };
  combat.frame = function (p) {
    if (p.saberTime > 0) return 7;
    if (p.shootPoseTime > 0) {
      if (p.dashTime > 0) return 5;
      if (p.onGround && Math.abs(p.vx || 0) > 1) {
        return Math.floor((p.animTime || 0) * 12) % 2 ? 3 : 1;
      }
      return 0;
    }
    return p.wallDir
      ? 6
      : p.dashTime > 0
        ? 5
        : !p.onGround
          ? 4
          : Math.abs(p.vx || 0) > 1
            ? 1 + (Math.floor((p.animTime || 0) * 12) % 3)
            : 0;
  };
  combat.muzzle = function (p) {
    var rigMode = combat.rigMode(p);
    if (global.AstraRunRig && rigMode && rigMode !== 'saber')
      return global.AstraRunRig.muzzle(combat.rigPhase(p), {
        x: p.x + p.w / 2,
        y: p.y + p.h,
        facing: p.facing,
        mode: rigMode,
        rise: combat.rigRise(p),
        aiming: combat.runAim(p)
      });
    if (combat.runPose(p)) {
      if (global.AstraRunRig)
        return global.AstraRunRig.muzzle(combat.runPhase(p), {
          x: p.x + p.w / 2,
          y: p.y + p.h,
          facing: p.facing,
          aiming: combat.runAim(p)
        });
      var m = combat.runMetadata,
        f = combat.runFrame(p),
        af = combat.runCellOrder[f],
        base = p.y + p.h - 3,
        dx = (m.muzzleX[af] - m.rootX[af]) * m.scale;
      return {
        x: p.x + p.w / 2 + (p.facing < 0 ? -dx : dx),
        y: base - (m.virtualGroundY[af] - m.muzzleY[af]) * m.scale
      };
    }
    var frame = combat.frame(p);
    var anchor = [
      [338, 198],
      [355, 252],
      [105, 263],
      [338, 254],
      [81, 196],
      [369, 325],
      [238, 46],
      [200, 265]
    ][frame];
    var anchorY = anchor[1] / 8,
      idle = combat.idleOffset(p);
    return {
      x: p.x + p.w / 2 - 24 + (p.facing < 0 ? 48 - anchor[0] / 8 : anchor[0] / 8),
      y: p.y + p.h - 58 + anchorY + (anchorY < 36 ? idle * (1 - anchorY / 36) : 0)
    };
  };
  global.AstraCombat = combat;
  var NeonGame = function (canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.onEvent = opts.onEvent || function () {};
    this.width = 640;
    this.height = 360;
    this.worldWidth = 9600;
    this.input = {};
    this.padInput = {};
    this.mouseInput = {};
    this.pressed = {};
    this.keys = {};
    this.stageId = opts.stage && global.AstraStages.has(opts.stage) ? opts.stage : global.AstraStages.first;
    this.options = { reducedMotion: false };
    this.acc = 0;
    this.last = performance.now();
    this.running = true;
    this.raf = 0;
    this._pauseLatch = false;
    this._padStartLatch = false;
    this._bind();
    this._bindMouse();
    this._reset('menu');
    this._loop();
  };
  NeonGame.prototype._bind = function () {
    var self = this;
    this._keydown = function (e) {
      var k = e.key.toLowerCase();
      if (
        self.state.mode === 'playing' &&
        [
          'arrowleft',
          'arrowright',
          'arrowup',
          'arrowdown',
          's',
          ' ',
          'shift',
          'z',
          'x',
          'j',
          'k',
          'a',
          'd',
          'p',
          'escape',
          'r'
        ].indexOf(k) >= 0
      )
        e.preventDefault();
      if (k === 'escape' || k === 'p') {
        if (e.repeat || self._pauseLatch) return;
        self._pauseLatch = true;
        if (self.state.mode === 'playing') self.pause();
        else if (self.state.mode === 'paused') self.resume();
        return;
      }
      if (k === 'r' && self.state.mode === 'dead') {
        self.retry();
        return;
      }
      self.keys[k] = true;
      self._mapKey(k, true);
    };
    this._keyup = function (e) {
      var k = e.key.toLowerCase();
      self.keys[k] = false;
      if (k === 'escape' || k === 'p') self._pauseLatch = false;
      self._mapKey(k, false);
    };
    this._blur = function () {
      self.keys = {};
      self.input = {};
      self._clearMouse();
      if (self.state.mode === 'playing') self.pause();
    };
    global.addEventListener('keydown', this._keydown);
    global.addEventListener('keyup', this._keyup);
    global.addEventListener('blur', this._blur);
    // Put away (another tab, a minimised window, a phone's screen switched off), a running fight
    // pauses, so coming back finds the pause panel rather than a fight that went on without the player.
    // A phone does not always blur the window first, so this does not rely on blur.
    this._visibility = function () {
      var d = global.document;
      if (d && d.visibilityState === 'hidden' && self.state.mode === 'playing') self.pause();
    };
    if (global.document && global.document.addEventListener)
      global.document.addEventListener('visibilitychange', this._visibility);
  };
  NeonGame.prototype._bindMouse = function () {
    var self = this,
      c = this.canvas;
    if (!c || !c.addEventListener) return;
    this._mouseDown = function (e) {
      if (self.state.mode !== 'playing') return;
      if (e.button === 0) {
        self.mouseInput.shoot = true;
        self.mouseInput.pendingShoot = true;
      }
      if (e.button === 2) {
        self.mouseInput.saber = true;
        self.mouseInput.pendingSaber = true;
      }
    };
    this._mouseUp = function (e) {
      if (e.button === 0) self.mouseInput.shoot = false;
      if (e.button === 2) self.mouseInput.saber = false;
    };
    this._contextMenu = function (e) {
      e.preventDefault();
    };
    c.addEventListener('mousedown', this._mouseDown);
    c.addEventListener('mouseup', this._mouseUp);
    c.addEventListener('contextmenu', this._contextMenu);
    this._globalMouseUp = function (e) {
      self._mouseUp(e);
    };
    global.addEventListener('mouseup', this._globalMouseUp);
  };
  NeonGame.prototype._clearMouse = function () {
    this.mouseInput = {};
    this._shootHeld = false;
    this._saberHeld = false;
    if (this.state && this.state.player) {
      this.state.player.saberCharge = 0;
      if (this.state.player.saberCombo === 7 && !this.state.player.fanReleased) {
        this.state.player.saberTime = 0;
        this.state.player.saberCombo = 0;
        this.state.player.fanCharge = 0;
      }
      this._emit('charge-state', { level: 0 });
    }
  };
  // Up is a direction rather than a second jump key: held with the saber it asks for the
  // rising cut, and jumping still has Space, Z and the pad's own button.
  NeonGame.prototype._mapKey = function (k, v) {
    var m = {
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
      ' ': 'jump',
      arrowup: 'up',
      w: 'up',
      s: 'down',
      arrowdown: 'down',
      z: 'jump',
      shift: 'dash',
      x: 'dash',
      j: 'shoot',
      k: 'saber'
    };
    if (m[k]) this.setInput(m[k], v);
  };
  NeonGame.prototype._reset = function (mode) {
    this.input = {};
    this.padInput = {};
    this.mouseInput = {};
    this.pressed = {};
    this.keys = {};
    this.acc = 0;
    this._jumpHeld = false;
    this._shootHeld = false;
    this._dashHeld = false;
    this._saberHeld = false;
    this._pauseLatch = false;
    this._padStartLatch = false;
    var def = global.AstraCombat.useStage(global.AstraStages.get(this.stageId));
    this.stageId = def.id;
    this.worldWidth = def.worldWidth;
    var p = [];
    function add(x, y, w, h, t) {
      p.push({ x: x, y: y, w: w, h: h, type: t || 'platform' });
    }
    var enemies = [],
      id = 0,
      e = function (type, x, y) {
        enemies.push({
          id: id++,
          type: type,
          x: x,
          y: y,
          w: type === 'turret' ? 28 : 30,
          h: type === 'drone' ? 24 : 34,
          hp: type === 'turret' ? 3 : 2,
          maxHp: type === 'turret' ? 3 : 2,
          facing: -1,
          flash: 0,
          dead: false,
          baseX: x,
          baseY: y,
          phase: id * 0.7,
          fireTimer: 1.6
        });
      };
    def.build(add, e);
    var pickups = def.pickups.map(function (k) {
      return { x: k.x, y: k.y, type: k.type, taken: false };
    });
    this.state = {
      mode: mode,
      time: 0,
      camera: { x: 0, y: 0 },
      width: 640,
      height: 360,
      worldWidth: this.worldWidth,
      player: {
        x: def.spawn.x,
        y: def.spawn.y,
        w: 24,
        h: 40,
        vx: 0,
        vy: 0,
        facing: 1,
        hp: 8,
        maxHp: 8,
        dashTime: 0,
        dashCooldown: 0,
        onGround: true,
        wallDir: 0,
        invuln: 0,
        animTime: 0,
        saberTime: 0,
        saberHits: 0,
        coyote: 0.1,
        jumpBuffer: 0,
        fireCooldown: 0,
        shootPoseTime: 0,
        reducedMotion: !!this.options.reducedMotion
      },
      platforms: p,
      enemies: enemies,
      bullets: [],
      particles: [],
      pickups: pickups,
      boss: null,
      bossIndex: 0,
      checkpoint: { x: def.checkpoints[0].x, y: 270, active: false },
      score: 0,
      kills: 0,
      shots: 0,
      timeElapsed: 0,
      stage: { id: def.id, name: def.name, number: def.number },
      section: def.sections[0].name,
      message: mode === 'menu' ? 'ASTRA // OVERDRIVE' : '',
      messageTimer: mode === 'menu' ? 4 : 0,
      shake: 0,
      flash: 0,
      reducedMotion: !!this.options.reducedMotion
    };
    this.state.player.runTime = 0;
    this.state.player.saberHit = false;
    this.state.player.saberHits = 0;
    this.state.player.saberFacing = this.state.player.facing;
    this.state.player.saberCombo = 0;
    this.state.player.saberQueued = false;
    this.state.player.upBuffer = 0;
    this.state.player.risingWind = 0;
    this.state.player.risingUp = false;
    this.state.player.risingHold = 0;
    this.state.player.saberCharge = 0;
    if (mode === 'playing' && this.difficulty === 'easy') {
      this.state.player.maxHp = 10;
      this.state.player.hp = 10;
    }
    this._jumpHeld = false;
    this._shootHeld = false;
    this._dashHeld = false;
    this._saberHeld = false;
  };
  NeonGame.prototype.start = function (o) {
    o = o || {};
    this.difficulty = o.difficulty || 'normal';
    this.character = o.character || 'astra';
    if (o.stage && global.AstraStages.has(o.stage)) this.stageId = o.stage;
    this._reset('playing');
    this.running = true;
    this.last = performance.now();
    this.onEvent('start', this.snapshot());
  };
  NeonGame.prototype.pause = function () {
    if (this.state.mode === 'playing') {
      this._clearMouse();
      this.state.mode = 'paused';
      this.onEvent('pause-request', this.snapshot());
    }
  };
  NeonGame.prototype.resume = function () {
    if (this.state.mode === 'paused') {
      this.state.mode = 'playing';
      this.last = performance.now();
      this.onEvent('resume', this.snapshot());
    }
  };
  NeonGame.prototype.retry = function () {
    if (this.state.mode !== 'dead') return;
    var c = { x: this.state.checkpoint.x, active: this.state.checkpoint.active };
    this._reset('playing');
    this.state.player.x = c.active ? c.x : global.AstraCombat.stage.spawn.x;
    this.state.player.y = 270;
    this.state.checkpoint.active = c.active;
    this.state.checkpoint.x = c.x;
    this.running = true;
    this.last = performance.now();
    this.onEvent('start', this.snapshot());
  };
  NeonGame.prototype.toTitle = function () {
    this.running = true;
    this._reset('menu');
    this.last = performance.now();
  };
  // A press is latched as well as held. The loop does not step once per animation frame, so a
  // tap can begin and end between two steps; without the latch that tap is simply never seen.
  // The latch is cleared by the step that reads it, so it can only ever add one frame.
  NeonGame.prototype.setInput = function (a, v) {
    this.input[a] = !!v;
    if (v) this.pressed[a] = true;
  };
  NeonGame.prototype.setOptions = function (o) {
    Object.assign(this.options, o || {});
    if (this.state) {
      this.state.reducedMotion = !!this.options.reducedMotion;
      this.state.player.reducedMotion = !!this.options.reducedMotion;
    }
  };
  NeonGame.prototype.snapshot = function () {
    return JSON.parse(JSON.stringify(this.state));
  };
  NeonGame.prototype._emit = function (t, p) {
    this.onEvent(t, p || this.snapshot());
  };
  // Asked at the moment a hit would land. True means it does not: either the dash was pressed within
  // the just-dodge window (the dodge happens now), or an earlier dodge's guard is still up.
  NeonGame.prototype._dodges = function () {
    var s = this.state,
      p = s.player,
      J = global.AstraCombat.justDodge;
    if (p.dodgeGuard > 0) return true;
    if (p.dashAt === undefined || s.time - p.dashAt > J.window + 1e-9) return false;
    p.dashAt = undefined;
    p.dodgeGuard = J.guard;
    s.slowmo = J.slow;
    s.flash = Math.max(s.flash || 0, 0.3);
    s.justDodge = { time: s.time, x: p.x + p.w / 2, y: p.y + p.h / 2, facing: p.facing };
    this._emit('sound', { name: 'just-dodge' });
    return true;
  };
  // Drawing is the expensive half of a frame, and the picture only changes when the simulation
  // stepped, the state was replaced or changed mode, the motion setting changed, or an image
  // finished loading (loaders bump AstraArtRevision). The simulation steps at 60 Hz, so on a
  // 144 Hz screen most animation frames would repeat the previous picture exactly; those are
  // skipped. In the menu the canvas sits hidden behind the title, so nothing is drawn at all.
  // A slow heartbeat redraws a still picture anyway, in case something changed it unannounced.
  var STILL_REDRAW_MS = 250;
  NeonGame.prototype._needsDraw = function (stepped, now) {
    var s = this.state,
      last = this._drawn,
      art = global.AstraArtRevision || 0;
    if (s.mode === 'menu') return false;
    if (
      !stepped &&
      last &&
      last.state === s &&
      last.mode === s.mode &&
      last.reduced === !!s.reducedMotion &&
      last.art === art &&
      now - last.at < STILL_REDRAW_MS
    )
      return false;
    this._drawn = { state: s, mode: s.mode, reduced: !!s.reducedMotion, art: art, at: now };
    return true;
  };
  NeonGame.prototype._loop = function () {
    var self = this;
    if (this.raf) return;
    var frame = function (now) {
      self.raf = 0;
      var dt = Math.min(0.1, (now - self.last) / 1000),
        stepped = false;
      self.last = now;
      self._pollGamepad();
      if (self.state.mode === 'playing') {
        self.acc += self.state.slowmo > 0 ? dt * global.AstraCombat.justDodge.slowScale : dt;
        while (self.acc >= 1 / 60) {
          self._tick(1 / 60);
          self.acc -= 1 / 60;
          stepped = true;
        }
      }
      if (self.state.mode === 'dead') {
        var fx = self.state.deathFx;
        if (fx && !fx.done) stepped = true;
        self._deathTick(dt);
      }
      if (global.AstraRenderer && self.canvas && self.canvas.getContext && self._needsDraw(stepped, now))
        global.AstraRenderer.draw(self.canvas.getContext('2d'), self.state);
      if (self.running) self.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  };
  NeonGame.prototype._spawn = function (x, y, vx, vy, team, charged, power, extra) {
    var b = {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      r: charged ? 6 : 4,
      team: team,
      charged: !!charged,
      power: power || 1,
      life: 4
    };
    if (extra) for (var k in extra) b[k] = extra[k];
    this.state.bullets.push(b);
    return b;
  };
  NeonGame.prototype._push = function (q) {
    if (this.state.particles.length > 320) return null;
    this.state.particles.push(q);
    return q;
  };
  NeonGame.prototype._particle = function (x, y, color, type) {
    return this._push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
      life: 0.35,
      maxLife: 0.35,
      color: color,
      size: 2 + Math.random() * 3,
      type: type || 'spark'
    });
  };
  NeonGame.prototype._roll = function () {
    return Math.random();
  };
  // A kill going up: a white core, rings pushing out, shrapnel that falls, and a little smoke.
  // power scales the whole thing down for smaller bursts, such as a mortar shell landing.
  NeonGame.prototype._explode = function (x, y, color, power) {
    var calm = !!this.state.reducedMotion,
      tint = color || '#ffb52e',
      k = power === undefined ? 1 : power,
      i,
      life;
    this._push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      life: 0.14,
      maxLife: 0.14,
      color: '#fff6d8',
      size: 13 * k,
      type: 'flash',
      gravity: 0,
      grow: 110 * k
    });
    this._push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      life: 0.3,
      maxLife: 0.3,
      color: tint,
      size: 4,
      type: 'ring',
      gravity: 0,
      grow: 130 * k,
      width: 2
    });
    if (!calm)
      this._push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        life: 0.44,
        maxLife: 0.44,
        color: '#ff754d',
        size: 2,
        type: 'ring',
        gravity: 0,
        grow: 78 * k,
        width: 1
      });
    var shards = Math.round((calm ? 7 : 14) * k);
    for (i = 0; i < shards; i++) {
      var a = (Math.PI * 2 * (i + Math.random() * 0.7)) / shards,
        sp = (110 + Math.random() * 170) * k;
      life = 0.28 + Math.random() * 0.3;
      this._push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 50 * k,
        life: life,
        maxLife: life,
        color: i % 3 ? tint : '#fff2c4',
        size: 2 + Math.random() * 2,
        type: 'spark',
        gravity: 560,
        drag: 0.3
      });
    }
    if (calm) return;
    var puffs = Math.round(6 * k);
    for (i = 0; i < puffs; i++) {
      life = 0.4 + Math.random() * 0.3;
      this._push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 40,
        vy: -24 - Math.random() * 36,
        life: life,
        maxLife: life,
        color: '#4c3a46',
        size: 5 + Math.random() * 5,
        type: 'smoke',
        gravity: -30,
        drag: 0.5,
        grow: 9
      });
    }
  };
  // Every mob death runs through here, whichever weapon landed the last hit.
  NeonGame.prototype._killEnemy = function (e) {
    var s = this.state;
    if (e.dead) return;
    e.dead = true;
    s.kills++;
    s.score += 100;
    this._explode(
      e.x + (e.w || 30) / 2,
      e.y + (e.h || 30) / 2,
      e.type === 'drone' ? '#ff5fa8' : e.type === 'turret' ? '#ffd06a' : '#ffb52e'
    );
    s.shake = Math.max(s.shake, 0.18);
    this._emit('sound', { name: 'explode' });
    this._drop(e);
  };
  // One kill in four leaves a repair cell where the mob stood. It falls to the nearest surface.
  NeonGame.prototype._drop = function (e) {
    var s = this.state,
      c = global.AstraCombat;
    if (this._roll() >= c.dropChance) return null;
    var k = {
      x: e.x + (e.w || 30) / 2 - 9,
      y: e.y + (e.h || 30) / 2 - 9,
      type: 'health',
      taken: false,
      dropped: true,
      heal: c.dropHeal,
      vy: -110,
      rest: false
    };
    s.pickups.push(k);
    return k;
  };
  NeonGame.prototype._burst = function (x, y, color) {
    for (var i = 0; i < 12; i++) this._particle(x, y, color, 'burst');
    this._particle(x, y, color, 'ring');
  };
  // While a menu owns the pad - a modal open over the pause panel - Start is the menu's, not the game's.
  NeonGame.prototype._pollGamepad = function () {
    this.padInput = {};
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    var g = navigator.getGamepads()[0];
    if (!g) return;
    var ax = (g.axes && g.axes[0]) || 0,
      ay = (g.axes && g.axes[1]) || 0;
    this.padInput.left = !!((g.buttons[14] && g.buttons[14].pressed) || ax < -0.35);
    this.padInput.right = !!((g.buttons[15] && g.buttons[15].pressed) || ax > 0.35);
    this.padInput.up = !!((g.buttons[12] && g.buttons[12].pressed) || ay < -0.35);
    this.padInput.down = !!((g.buttons[13] && g.buttons[13].pressed) || ay > 0.35);
    this.padInput.jump = !!(g.buttons[0] && g.buttons[0].pressed);
    this.padInput.dash = !!(g.buttons[1] && g.buttons[1].pressed);
    this.padInput.shoot = !!(g.buttons[2] && g.buttons[2].pressed);
    this.padInput.saber = !!(g.buttons[3] && g.buttons[3].pressed);
    var start = !!(g.buttons[9] && g.buttons[9].pressed);
    if (start && !this._padStartLatch) {
      this._padStartLatch = true;
      if (!this.menuOwnsPad) {
        if (this.state.mode === 'playing') this.pause();
        else if (this.state.mode === 'paused') this.resume();
      }
    }
    if (!start) this._padStartLatch = false;
  };
  NeonGame.prototype._tick = function (dt) {
    var s = this.state,
      p = s.player;
    if (s.mode !== 'playing') return;
    s.time += dt;
    s.timeElapsed = s.time;
    s.messageTimer = Math.max(0, s.messageTimer - dt);
    p.animTime += dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dodgeGuard = Math.max(0, (p.dodgeGuard || 0) - dt);
    s.slowmo = Math.max(0, (s.slowmo || 0) - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.saberTime = Math.max(0, p.saberTime - dt);
    p.coyote = Math.max(0, p.coyote - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.upBuffer = Math.max(0, (p.upBuffer || 0) - dt);
    p.risingHold = Math.max(0, (p.risingHold || 0) - dt);
    if (p.risingWind > 0) {
      p.risingWind -= dt;
      if (p.risingWind <= 0 && p.saberCombo === 4) {
        var R = global.AstraCombat.rising;
        p.vy = -R.lift;
        p.onGround = false;
        p.coyote = 0;
        p.risingUp = true;
        if (Math.abs(p.vx) < R.drift) p.vx = p.saberFacing * R.drift;
      }
    }
    var held = this.pressed;
    this.pressed = {};
    var left = !!(this.input.left || this.padInput.left || held.left),
      right = !!(this.input.right || this.padInput.right || held.right),
      up = !!(this.input.up || this.padInput.up || held.up),
      down = !!(this.input.down || this.padInput.down || held.down),
      jump = !!(this.input.jump || this.padInput.jump || held.jump),
      dash = !!(this.input.dash || this.padInput.dash || held.dash),
      shoot = !!(
        this.input.shoot ||
        this.padInput.shoot ||
        this.mouseInput.shoot ||
        this.mouseInput.pendingShoot ||
        held.shoot
      ),
      saber = !!(
        this.input.saber ||
        this.padInput.saber ||
        this.mouseInput.saber ||
        this.mouseInput.pendingSaber ||
        held.saber
      );
    this.mouseInput.pendingShoot = false;
    this.mouseInput.pendingSaber = false;
    var jumpPressed = jump && !this._jumpHeld;
    if (jumpPressed) p.jumpBuffer = 0.12;
    this._jumpHeld = jump;
    if (down) p.downBuffer = 0.18;
    else p.downBuffer = Math.max(0, (p.downBuffer || 0) - dt);
    if (up) p.upBuffer = global.AstraCombat.risingGrace;
    var wantsRising = up || p.upBuffer > 0;
    var dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (p.wallLock > 0) dir = 0;
    var thrusting = p.saberCombo === 6 && p.saberTime > 0;
    var fanning = p.saberCombo === 7 && p.saberTime > 0;
    if (thrusting || fanning) dir = 0;
    if (fanning) {
      p.vx = 0;
      jump = false;
      dash = false;
      p.jumpBuffer = 0;
    }
    if (dir) {
      p.facing = dir;
      p.vx += dir * 1500 * dt;
    } else if (!p.risingUp) p.vx *= Math.pow(0.0008, dt);
    if (p.dashTime <= 0) p.vx = clamp(p.vx, -190, 190);
    else p.vx = p.facing * 560;
    if (thrusting) {
      var TL = global.AstraCombat.thrust,
        thrustStep = TL.span - p.saberTime;
      if (thrustStep >= TL.lungeFrom && thrustStep < TL.lungeTo && p.dashTime <= 0)
        p.vx = p.saberFacing * TL.lunge;
    }
    if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = -430;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this._emit('sound', { name: 'jump' });
    }
    if (!jump && !p.risingUp && p.vy < -150) p.vy += 900 * dt;
    if (dash && !this._dashHeld && p.dashCooldown <= 0) {
      p.risingHold = 0;
      p.dashAt = s.time;
      p.dashTime = 0.16;
      p.dashCooldown = 0.65;
      p.vx = p.facing * 560;
      p.vy = 0;
      this._emit('sound', { name: 'dash' });
    }
    this._dashHeld = dash;
    shoot = shoot || this.input.shoot;
    p.fireCooldown = Math.max(0, p.fireCooldown - dt);
    p.shootPoseTime = Math.max(0, (p.shootPoseTime || 0) - dt);
    var fireNormal = false;
    if (shoot) this._shootHeld = true;
    if (!shoot && this._shootHeld) {
      fireNormal = p.fireCooldown <= 0;
      if (fireNormal) p.fireCooldown = 0.18;
      this._shootHeld = false;
    }
    this._emit('charge-state', { level: global.AstraCombat.saberChargeShown(p) });
    var saberElapsed = global.AstraCombat.saberSpan(p) - p.saberTime;
    if (p.saberTime <= 0 && p.saberCombo > 0) {
      if (p.saberQueued && p.saberCombo < 3) {
        p.saberCombo++;
        p.saberTime = global.AstraCombat.saberDuration;
        p.saberHit = false;
        p.saberHits = 0;
        p.saberQueued = false;
        p.saberFacing = p.facing;
        p.attackSerial = (p.attackSerial || 0) + 1;
        this._emit('sound', { name: 'saber', combo: p.saberCombo });
      } else {
        if (p.saberCombo === 4 && !p.onGround) p.risingHold = global.AstraCombat.rising.hold;
        p.saberCombo = 0;
        p.saberQueued = false;
      }
    }
    if (saber && !this._saberHeld) {
      if (p.saberTime > 0) {
        if (
          p.saberCombo < 3 &&
          saberElapsed >= global.AstraCombat.saberComboWindowStart &&
          saberElapsed < global.AstraCombat.saberDuration
        )
          p.saberQueued = true;
      } else {
        p.risingHold = 0;
        p.saberCombo = (down || p.downBuffer > 0) && p.onGround ? 7 : wantsRising ? 4 : 1;
        if (p.saberCombo === 7) {
          p.dashTime = 0;
          p.vx = 0;
          p.fanCharge = 0;
          p.fanReleased = false;
        }
        if (p.saberCombo === 4) p.risingSerial = (p.risingSerial || 0) + 1;
        p.saberTime = global.AstraCombat.saberSpan(p);
        if (p.saberCombo === 4 && p.onGround) p.risingWind = global.AstraCombat.rising.crouch;
        p.saberHit = false;
        p.saberHits = 0;
        p.saberQueued = false;
        p.saberFacing = p.facing;
        p.attackSerial = (p.attackSerial || 0) + 1;
        this._emit('sound', { name: 'saber', combo: p.saberCombo });
      }
    }
    if (
      down &&
      p.onGround &&
      p.saberCombo === 1 &&
      p.saberTime > 0 &&
      !p.saberHits &&
      saberElapsed < global.AstraCombat.risingConvert
    ) {
      p.saberCombo = 7;
      p.fanCharge = 0;
      p.fanReleased = false;
      p.dashTime = 0;
      p.vx = 0;
      p.saberQueued = false;
      p.saberTime = global.AstraCombat.fan.span - saberElapsed;
    }
    // the saber landed a frame or two before up did, and the blade has not left the hand yet
    if (
      up &&
      p.saberCombo === 1 &&
      p.saberTime > 0 &&
      !p.saberHits &&
      saberElapsed < global.AstraCombat.risingConvert
    ) {
      p.saberCombo = 4;
      p.risingSerial = (p.risingSerial || 0) + 1;
      p.saberQueued = false;
      p.saberTime = global.AstraCombat.rising.span - saberElapsed;
      if (p.onGround) p.risingWind = Math.max(0, global.AstraCombat.rising.crouch - saberElapsed);
    }
    // Holding the saber charges the thrust. The press has already swung, so a tap is still a tap and a
    // chain is still a chain; only a hold that reaches ready and is then let go asks for the thrust.
    // The rising cut and the thrust itself do not charge, and the second and third swings pause it, so
    // a charge is always let go with the blade already back in the hand.
    var TH = global.AstraCombat.thrust;
    if (saber && !this._saberHeld) p.saberCharge = 0;
    if (saber) {
      if (down || p.saberCombo === 4 || p.saberCombo === 6 || p.saberCombo === 7 || p.risingHold > 0)
        p.saberCharge = 0;
      else if (!(p.saberTime > 0) || p.saberCombo === 1)
        p.saberCharge = Math.min(1, (p.saberCharge || 0) + dt * TH.rate);
    } else if (this._saberHeld) {
      if ((p.saberCharge || 0) >= TH.ready && !(p.saberTime > 0)) {
        p.risingHold = 0;
        p.saberCombo = 6;
        p.saberTime = TH.span;
        p.saberHit = false;
        p.saberHits = 0;
        p.saberQueued = false;
        p.saberFacing = p.facing;
        p.attackSerial = (p.attackSerial || 0) + 1;
        this._emit('sound', { name: 'thrust' });
      }
      p.saberCharge = 0;
    }
    if (p.saberCombo === 7 && p.saberTime > 0 && !p.fanReleased) {
      var FC = global.AstraCombat.fan;
      if (saber) {
        p.fanCharge = Math.min(FC.chargeMax, (p.fanCharge || 0) + dt);
        p.saberTime = Math.max(p.saberTime, FC.span * 0.55);
      } else {
        p.fanReleased = true;
        this._emit('charge-state', { level: 0 });
      }
    }
    this._saberHeld = saber;
    // the rise has its own weight, which is what makes it take the reference's time
    p.vy += (p.risingUp && p.vy < 0 ? global.AstraCombat.rising.gravity : 1100) * dt;
    if (p.vy >= 0) p.risingUp = false;
    if (p.dashTime > 0) p.dashTime -= dt;
    var oldY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.onGround = false;
    p.wallDir = 0;
    this._resolve(p, oldY);
    if (p.onGround) p.risingHold = 0;
    if (global.AstraCombat.runPose(p))
      p.runTime = ((p.runTime || 0) + (dt * Math.abs(p.vx)) / 190) % global.AstraCombat.runDuration;
    else p.runTime = 0;
    if (fireNormal) {
      p.shootPoseTime = 0.12;
      var fm = global.AstraCombat.muzzle(p);
      this._spawn(fm.x, fm.y, p.facing * 500, 0, 'player', false, global.AstraCombat.normalPower);
      s.shots++;
      this._emit('sound', { name: 'shot' });
    }
    if (!p.onGround && p.wallDir && p.vy > 180) p.vy = 180;
    if (p.wallDir && jumpPressed) {
      p.vy = -390;
      p.vx = -p.wallDir * 260;
      p.wallLock = 0.12;
    }
    if (p.wallLock > 0) p.wallLock -= dt;
    if (p.y > 420) {
      this._die();
      return;
    }
    var marks = global.AstraCombat.checkpoints,
      reached = null;
    for (var ci = 0; ci < marks.length; ci++) if (p.x > marks[ci].at) reached = marks[ci];
    if (reached && (!s.checkpoint.active || s.checkpoint.x !== reached.x)) {
      s.checkpoint.active = true;
      s.checkpoint.x = reached.x;
      if (reached.heal) p.hp = p.maxHp;
      s.message = 'CHECKPOINT // ONLINE';
      s.messageTimer = 2;
      this._emit('checkpoint', this.snapshot());
      this._emit('sound', { name: 'checkpoint' });
    }
    if (p.x > global.AstraCombat.arena.gate) p.x = Math.max(p.x, global.AstraCombat.arena.gate);
    if (p.x > global.AstraCombat.arena.spawn && !s.boss) {
      s.bossIndex = 0;
      this._spawnBoss(global.AstraCombat.stage.bosses[0]);
    }
    if (s.bossIntro) return; // Newly triggered entrances also suppress combat on this spawn frame.
    saberElapsed = global.AstraCombat.saberDuration - p.saberTime;
    if (p.saberCombo === 7 && p.saberTime > 0) {
      var F = global.AstraCombat.fan;
      if (p.fanReleased)
        while (
          p.saberHits < global.AstraCombat.fanLevel(p) &&
          F.span - p.saberTime + 1e-8 >= F.fireAt + p.saberHits * F.volleyGap
        ) {
          this._fanBurst();
          p.saberHits++;
        }
    } else if (p.saberCombo === 6 && p.saberTime > 0) {
      var TB = global.AstraCombat.thrust,
        thrustAt = TB.span - p.saberTime,
        bite = 0;
      while (bite < TB.hits.length && thrustAt >= TB.hits[bite]) bite++;
      if (bite > (p.saberHits || 0)) {
        for (var tb = p.saberHits || 0; tb < bite; tb++)
          this._damageNearby(TB.reach, TB.power, p.saberFacing);
        p.saberHits = bite;
        p.saberHit = true;
      }
    } else if (p.saberCombo === 4 && p.saberTime > 0) {
      this._risingBites();
    } else if (p.saberTime > 0) {
      var stageIndex = Math.max(0, Math.min(2, (p.saberCombo || 1) - 1)),
        hitTimes = global.AstraCombat.saberHitTimes[stageIndex],
        landed = 0;
      while (landed < hitTimes.length && saberElapsed >= hitTimes[landed]) landed++;
      if (landed > (p.saberHits || 0)) {
        var cut = global.AstraCombat.saberPower * global.AstraCombat.saberComboPower[stageIndex];
        for (var hitIndex = p.saberHits || 0; hitIndex < landed; hitIndex++)
          this._damageNearby(global.AstraCombat.saberRange, cut, p.saberFacing);
        p.saberHits = landed;
        p.saberHit = true;
      }
    }
    var stage = global.AstraCombat.stage;
    s.message = global.AstraStages.hintAt(stage.hints, p.x);
    s.section = global.AstraStages.bandAt(stage.sections, p.x).name;
    this._enemies(dt);
    if (s.mode !== 'playing') return;
    this._bullets(dt);
    if (s.mode !== 'playing') return;
    this._pickups(dt);
    this._boss(dt);
    if (s.mode === 'dead') return;
    if (s.boss && s.boss.active) p.x = clamp(p.x, global.AstraCombat.arena.gate, this.worldWidth - p.w);
    s.camera.x = clamp(p.x - 230, 0, this.worldWidth - 640);
    s.camera.y = 0;
    s.shake = Math.max(0, s.shake - dt * 3);
    if (s.reducedMotion) s.shake = 0;
    s.flash = Math.max(0, s.flash - dt * 3);
    for (var i = s.particles.length - 1; i >= 0; i--) {
      var q = s.particles[i];
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += (q.gravity === undefined ? 200 : q.gravity) * dt;
      if (q.drag) {
        var qf = Math.pow(q.drag, dt);
        q.vx *= qf;
        q.vy *= qf;
      }
      if (q.grow) q.size = Math.max(0, (q.size || 0) + q.grow * dt);
      if (q.life <= 0) s.particles.splice(i, 1);
    }
  };
  // The rising cut's flame bites whatever it is drawn over, the moment it is drawn over it, and again every
  // biteEvery seconds while the target stays in it, up to rising.bites times each. It used to bite on a
  // fixed clock that ran about a third of a second late, with a band sixteen pixels either side of the
  // flame's axis that matched neither the flame's width nor its lopsided shape.
  NeonGame.prototype._saberImpact = function () {
    var s = this.state,
      now = s.time || 0;
    if (s.lastSaberImpact !== undefined && now - s.lastSaberImpact < 0.075) return;
    s.lastSaberImpact = now;
    this._emit('sound', { name: 'saber-hit' });
  };
  NeonGame.prototype._risingBites = function () {
    var s = this.state,
      p = s.player,
      C = global.AstraCombat,
      R = C.rising,
      segs = C.risingFire(p);
    if (!segs) return;
    var now = R.span - p.saberTime,
      cut = C.saberPower * C.saberComboPower[3];
    function bites(t) {
      if (t.risingSerial !== p.risingSerial) {
        t.risingSerial = p.risingSerial;
        t.risingBites = 0;
        t.risingBiteAt = -1;
      }
      if (t.risingBites >= R.bites || (t.risingBites > 0 && now - t.risingBiteAt < R.biteEvery - 1e-9))
        return false;
      if (!C.bladeTouches(segs, t, C.risingFirePad)) return false;
      t.risingBites++;
      t.risingBiteAt = now;
      p.saberHits = (p.saberHits || 0) + 1;
      p.saberHit = true;
      return true;
    }
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i];
      if (e.dead || !bites(e)) continue;
      e.hp -= this._masteryPower ? this._masteryPower(cut, 'rising') : cut;
      this._saberImpact();
      e.flash = 0.12;
      this._particle(e.x, e.y, '#ffb52e', 'burst');
      if (e.hp <= 0) this._killEnemy(e);
    }
    var b = s.boss;
    if (b && b.active && !b.down && !b.phaseOut && bites(b)) {
      b.hp = Math.max(0, b.hp - (this._masteryPower ? this._masteryPower(cut, 'rising') : cut));
      this._saberImpact();
      b.flash = 0.12;
    }
  };
  NeonGame.prototype._resolve = function (o, oldY) {
    var s = this.state;
    for (var i = 0; i < s.platforms.length; i++) {
      var q = s.platforms[i];
      if (!hit(o, q)) continue;
      if (oldY + o.h <= q.y && o.vy >= 0) {
        o.y = q.y - o.h;
        o.vy = 0;
        o.onGround = true;
        o.coyote = 0.1;
      } else if (oldY >= q.y + q.h && o.vy < 0) {
        o.y = q.y + q.h;
        o.vy = 20;
      } else if (o.x + o.w / 2 < q.x + q.w / 2) {
        o.x = q.x - o.w;
        o.vx = 0;
        o.wallDir = 1;
      } else {
        o.x = q.x + q.w;
        o.vx = 0;
        o.wallDir = -1;
      }
    }
    o.x = clamp(o.x, 0, this.worldWidth - o.w);
  };
  NeonGame.prototype._damageNearby = function (range, dmg, facing) {
    var s = this.state,
      p = s.player,
      attackFacing = facing === undefined ? p.facing : facing;
    var segs = global.AstraCombat.saberSweep(p);
    function reaches(box, cx, cy, wide) {
      if (segs) return global.AstraCombat.bladeTouches(segs, box, global.AstraCombat.saberPad(p));
      var dx = cx - p.x;
      return (
        Math.abs(dx) < range + (wide || 0) &&
        (dx > 0 ? 1 : -1) === attackFacing &&
        Math.abs(cy - (p.y + p.h / 2)) < (p.saberCombo === 6 ? 1.5 : 1) * (wide ? 75 : 55)
      );
    }
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i];
      if (!e.dead && reaches(e, e.x, e.y + e.h / 2, 0)) {
        e.hp -= this._masteryPower ? this._masteryPower(dmg, p.saberCombo === 6 ? 'thrust' : 'saber') : dmg;
        this._saberImpact();
        e.flash = 0.12;
        this._particle(e.x, e.y, '#ffb52e', 'burst');
        if (e.hp <= 0) this._killEnemy(e);
      }
    }
    if (
      s.boss &&
      s.boss.active &&
      !s.boss.down &&
      !s.boss.phaseOut &&
      reaches(s.boss, s.boss.x, s.boss.y + s.boss.h / 2, s.boss.w * 0.4)
    ) {
      s.boss.hp = Math.max(
        0,
        s.boss.hp -
          (this._masteryPower ? this._masteryPower(dmg, p.saberCombo === 6 ? 'thrust' : 'saber') : dmg)
      );
      this._saberImpact();
      s.boss.flash = 0.12;
    }
  };
  NeonGame.prototype._enemies = function (dt) {
    var s = this.state,
      p = s.player;
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i];
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      if (Math.abs(e.x - p.x) > 550) continue;
      e.fireTimer -= dt;
      if (e.type === 'walker') {
        e.x = e.baseX + Math.sin(s.time * 2 + e.phase) * 45;
        e.x = clamp(e.x, e.baseX - 45, e.baseX + 45);
      }
      if (e.type === 'drone') {
        e.y = e.baseY + Math.sin(s.time * 2 + e.phase) * 16;
        if (e.fireTimer <= 0) {
          var dx = p.x - e.x,
            dy = p.y - e.y,
            len = Math.sqrt(dx * dx + dy * dy) || 1;
          this._spawn(e.x, e.y, (dx / len) * 180, (dy / len) * 180, 'enemy', false, 1);
          e.fireTimer = 2.2;
        }
      }
      if (e.type === 'turret' && e.fireTimer <= 0) {
        this._spawn(e.x, e.y + 10, (p.x < e.x ? -1 : 1) * 170, 0, 'enemy', false, 1);
        e.fireTimer = 1.6;
      }
      if (hit(p, e) && p.invuln <= 0 && !this._dodges()) {
        p.hp--;
        if (this._registerHit) this._registerHit({ label: '雑魚との接触' });
        p.invuln = 0.9;
        s.shake = 0.2;
        this._emit('sound', { name: 'hurt' });
        if (p.hp <= 0) this._die();
      }
    }
  };
  NeonGame.prototype._fanBurst = function () {
    var s = this.state,
      p = s.player,
      F = global.AstraCombat.fan;
    for (var i = 0; i < F.count; i++) {
      var a = ((-165 + (150 * i) / (F.count - 1)) * Math.PI) / 180;
      this._spawn(
        p.x + p.w / 2,
        p.y + p.h - 12,
        Math.cos(a) * F.speed * p.saberFacing,
        Math.sin(a) * F.speed,
        'player',
        false,
        F.power * (1 + (global.AstraCombat.fanLevel(p) - 1) * 0.5),
        { kind: 'fan-orb', r: F.radius, life: F.life }
      );
    }
    this._emit('sound', { name: 'thrust' });
  };
  // The blade clears hostile projectiles only during the visible strike, before player damage.
  NeonGame.prototype._saberDeflects = function (b) {
    var p = this.state.player,
      c = global.AstraCombat;
    if (b.team === 'player' || p.saberTime <= 0 || p.saberCombo === 7) return false;
    var segs = p.saberCombo === 4 ? c.risingFire(p) : c.saberSweep(p);
    if (segs)
      return c.bladeTouches(segs, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, c.saberPad(p));
    if (p.saberCombo === 6 || p.saberCombo === 4) return false;
    var elapsed = c.saberDuration - p.saberTime;
    if (elapsed < c.saberHitAt || elapsed >= c.saberDeflectEnd) return false;
    var facing = p.saberFacing,
      dx = (b.x - p.x) * facing;
    return dx >= 0 && dx < c.saberRange + b.r && Math.abs(b.y - (p.y + p.h / 2)) < 55 + b.r;
  };
  // A shell with gravity bursts on whatever it lands on.
  NeonGame.prototype._shellLands = function (b) {
    var s = this.state;
    for (var i = 0; i < s.platforms.length; i++) {
      var q = s.platforms[i];
      if (b.x > q.x && b.x < q.x + q.w && b.y + b.r >= q.y && b.y - b.r <= q.y + q.h) {
        if (b.mine) {
          this._spawn(b.x, q.y - 8, 0, 0, 'enemy', false, 1, {
            r: 7,
            kind: 'mine',
            fxBoss: b.fxBoss,
            fuse: b.fuse || 1.2,
            burst: b.burst || 5,
            life: b.fuse || 1.2
          });
          this._explode(b.x, q.y - 4, '#ffb04a', 0.3);
          return true;
        }
        if (b.fxBoss) this._bossImpact(b.x, q.y - 4, b.fxBoss, 30);
        this._explode(b.x, q.y - 4, '#ff9a4a', 0.55);
        return true;
      }
    }
    return false;
  };
  NeonGame.prototype._bullets = function (dt) {
    var s = this.state,
      p = s.player;
    for (var i = s.bullets.length - 1; i >= 0; i--) {
      var b = s.bullets[i];
      if (b.hold && b.armIn > 0) {
        b.armIn -= dt;
        continue;
      }
      if (b.g) b.vy += b.g * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.turn && b.life <= b.turn) {
        b.vx = -b.vx;
        b.turn = 0;
      }
      if (b.armIn > 0) b.armIn -= dt;
      var remove = b.life <= 0 || b.x < 0 || b.x > this.worldWidth || b.y > 430 || b.y < -140;
      if (!remove && b.split && b.life <= b.split.at) {
        this._bossSplit(b);
        remove = true;
      }
      if (remove && b.fuse && b.life <= 0) this._mineBursts(b);
      if (!remove && b.floorOnly) {
        if (b.y + b.r >= 310) {
          remove = true;
          if (b.fxBoss) this._bossImpact(b.x, 310, b.fxBoss, 20);
        }
      } else if (!remove && (b.g || b.pops) && this._shellLands(b)) remove = true;
      if (!remove) {
        if (b.team === 'player') {
          for (var j = 0; j < s.enemies.length; j++) {
            var e = s.enemies[j];
            if (!e.dead && hit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, e)) {
              e.hp -= b.power;
              e.flash = 0.1;
              remove = true;
              for (var z = 0; z < 3; z++) this._particle(b.x, b.y, '#ffe36e');
              if (e.hp <= 0) this._killEnemy(e);
            }
          }
          if (
            s.boss &&
            s.boss.active &&
            !s.boss.down &&
            !s.boss.phaseOut &&
            hit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, s.boss)
          ) {
            s.boss.hp -= b.power;
            s.boss.flash = 0.1;
            remove = true;
            this._burst(b.x, b.y, '#ff4f9a');
          }
        } else if (!b.solid && this._saberDeflects(b)) {
          remove = true;
          if (this._registerDeflect) this._registerDeflect();
          for (var k = 0; k < 5; k++) this._particle(b.x, b.y, '#80fff0');
          this._particle(b.x, b.y, '#e5ffff', 'ring');
        } else if (
          !(b.armIn > 0) &&
          !b.harmless &&
          hit(
            b.hw
              ? { x: b.x - b.hw, y: b.y - b.hh, w: b.hw * 2, h: b.hh * 2 }
              : { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 },
            p
          ) &&
          p.invuln <= 0 &&
          !this._dodges()
        ) {
          p.hp--;
          if (this._registerHit) this._registerHit(b.source || { label: '敵弾' });
          p.invuln = 0.8;
          if (!b.hw) remove = true;
          s.shake = 0.25;
          this._emit('sound', { name: 'hurt' });
          if (p.hp <= 0) this._die();
        }
      }
      if (remove) s.bullets.splice(i, 1);
    }
  };
  NeonGame.prototype._pickups = function (dt) {
    var s = this.state,
      p = s.player;
    dt = dt || 0;
    for (var i = s.pickups.length - 1; i >= 0; i--) {
      var k = s.pickups[i];
      if (k.taken) continue;
      if (k.dropped && !k.rest) {
        var was = k.y;
        k.vy = (k.vy || 0) + 900 * dt;
        k.y += k.vy * dt;
        if (k.vy >= 0)
          for (var j = 0; j < s.platforms.length; j++) {
            var q = s.platforms[j];
            if (k.x + 18 > q.x && k.x < q.x + q.w && was + 18 <= q.y && k.y + 18 >= q.y) {
              k.y = q.y - 18;
              k.vy = 0;
              k.rest = true;
              break;
            }
          }
        if (k.y > 430) {
          s.pickups.splice(i, 1);
          continue;
        }
      }
      if (hit(p, { x: k.x, y: k.y, w: 18, h: 18 })) {
        k.taken = true;
        if (k.type === 'health') p.hp = Math.min(p.maxHp, p.hp + (k.heal || 2));
        else p.dashCooldown = 0;
        s.score += 25;
        this.onEvent('sound', { name: 'pickup' });
      }
    }
  };
  // Which entry in the roster this body is fighting as.
  function bossDef(b) {
    return global.AstraBosses.get(b && b.id);
  }
  function knob(b, name) {
    return bossDef(b).tuning[name];
  }
  // ---- Moves drawn from each boss's body --------------------------------------------------------------
  // A move is a script run a frame at a time by _bossMove, with the boss, its move state m, the step and
  // k = {s, p, A}. It moves the body, sets m.pose for the renderer to lean the picture into, and puts shots
  // and hazards on the board. When it is done it calls finish, and the boss rests as its beat asked.
  // Everything is timed, nothing is random, so a move always reads the same way.
  function sstep(u) {
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return u * u * (3 - 2 * u);
  }
  function once(m, key, at) {
    if (m.t >= at && !m.fired[key]) {
      m.fired[key] = true;
      return true;
    }
    return false;
  }
  function finish(b, m) {
    m.done = true;
    m.pose = null;
    b.timer = 0;
  }
  function bossShot(game, b, x, y, vx, vy, extra) {
    var o = { fxBoss: b.id };
    for (var key in extra) o[key] = extra[key];
    return game._spawn(x, y, vx, vy, 'enemy', false, 1, o);
  }
  // A hazard is a rectangle that hurts while it is armed: a geyser, a lightning strike, burning floor, a beam.
  // For armIn seconds it only warns. The saber cannot cut it away. A harmless one is a marker and nothing more.
  function bossHazard(game, b, x, y, hw, hh, armIn, live, style, extra) {
    var o = {
      fxBoss: b.id,
      kind: 'hazard',
      style: style,
      hw: hw,
      hh: hh,
      r: Math.max(hw, hh),
      armIn: armIn,
      armFor: armIn,
      liveFor: live,
      life: armIn + live,
      solid: true
    };
    for (var key in extra) o[key] = extra[key];
    return game._spawn(x, y, 0, 0, 'enemy', false, 1, o);
  }
  // A lob that comes down on the floor at toX after flight seconds.
  function bossLob(game, b, fromX, fromY, toX, flight, extra) {
    // it passes the arena's ledges and lands on the floor, so it comes down exactly where its mark or its
    // burning floor is
    var gv = 900,
      floorY = b.baseY + b.h,
      o = { g: gv, kind: 'shell', floorOnly: true };
    for (var key in extra) o[key] = extra[key];
    return bossShot(
      game,
      b,
      fromX,
      fromY,
      (toX - fromX) / flight,
      (floorY - fromY - (gv * flight * flight) / 2) / flight,
      o
    );
  }
  // A rock held at the top of the screen for delay seconds, then dropped; a marker shows where it will land.
  function bossRockfall(game, b, x, delay) {
    bossHazard(game, b, x, b.baseY + b.h - 6, 14, 6, 0, delay + 0.9, 'mark', { harmless: true });
    bossShot(game, b, x, -20, 0, 0, {
      r: 8,
      kind: 'rock',
      g: 900,
      life: 3,
      armIn: delay,
      hold: true,
      floorOnly: true
    });
  }
  function arenaX(k, b, x) {
    return clamp(x, k.A.gate + 10, k.A.bossMax + b.w - 10);
  }
  function slide(k, b, dx) {
    b.x = clamp(b.x + dx, k.A.bossMin, k.A.bossMax);
  }
  function landShock(game, k, b, speed, r, life, power, size, shake) {
    var fy = b.baseY + b.h,
      cx = b.x + b.w / 2;
    bossShot(game, b, cx - b.w * 0.4, fy - Math.max(10, r), -speed, 0, {
      r: r,
      kind: 'wave',
      life: life,
      power: power
    });
    bossShot(game, b, cx + b.w * 0.4, fy - Math.max(10, r), speed, 0, {
      r: r,
      kind: 'wave',
      life: life,
      power: power
    });
    game._bossImpact(cx, fy, b.id, size);
    k.s.shake = Math.max(k.s.shake, shake);
    game._emit('sound', { name: 'boss' });
  }
  var BOSS_MOVES = {
    // WARDEN, the siege crab. Claws that close like a gate, the cannon on its arm, and its weight.
    pincer: function (b, m, dt, k) {
      // claws thrown wide, then driven into the floor: a shock runs in from each end of the arena and they
      // cross in the middle - jump each one as it reaches you, or both at once in the centre
      m.pose = m.t < 0.25 ? 'crouch' : m.t < 0.9 ? 'slam' : null;
      if (once(m, 'clamp', 0.25)) {
        var y = b.baseY + b.h - 12,
          left = k.A.gate - 10,
          right = k.A.bossMax + b.w + 24,
          life = (right - left) / 230 + 0.2;
        bossShot(this, b, left, y, 230, 0, { r: 8, kind: 'wave', life: life, power: 2 });
        bossShot(this, b, right, y, -230, 0, { r: 8, kind: 'wave', life: life, power: 2 });
        this._bossImpact(b.x + b.w / 2, b.baseY + b.h, b.id, 40);
        k.s.shake = Math.max(k.s.shake, 0.3);
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 1) finish(b, m);
    },
    cannon: function (b, m, dt, k) {
      // three heavy slugs from the arm at chest height, each one kicking the body back - jump them
      for (var i = 0; i < 3; i++)
        if (once(m, 's' + i, 0.1 + i * 0.28)) {
          var mx = b.x + b.w / 2 + m.dir * b.w * 0.55,
            my = b.y + b.h * 0.36;
          bossShot(this, b, mx, my, m.dir * 250, 0, { r: 7, kind: 'slug', life: 2.6 });
          m.kick = 0.12;
          this._bossImpact(mx, my, b.id, 16);
          this._emit('sound', { name: 'boss' });
        }
      if (m.kick > 0) {
        m.kick -= dt;
        slide(k, b, -m.dir * 42 * dt);
        m.pose = 'recoil';
      } else m.pose = 'aim';
      if (m.t >= 1) finish(b, m);
    },
    clawrush: function (b, m, dt, k) {
      // three short snapping lunges, turning to the player before each one
      var cycle = 0.38,
        n = Math.min(2, Math.floor(m.t / cycle)),
        local = m.t - n * cycle;
      if (m.aimN !== n) {
        m.aimN = n;
        m.aim = k.p.x + k.p.w / 2 < b.x + b.w / 2 ? -1 : 1;
        b.facing = m.aim;
        m.from = b.x;
      }
      if (local < 0.22) {
        b.x = clamp(m.from + m.aim * 64 * sstep(local / 0.22), k.A.bossMin, k.A.bossMax);
        m.pose = 'lunge';
      } else {
        m.pose = 'crouch';
        if (once(m, 'snap' + n, n * cycle + 0.22)) {
          this._bossImpact(b.x + b.w / 2 + m.aim * b.w * 0.6, b.y + b.h * 0.55, b.id, 20);
          this._emit('sound', { name: 'boss' });
        }
      }
      if (m.t >= cycle * 3) finish(b, m);
    },
    quake: function (b, m, dt, k) {
      // a short hop and both claws into the floor: rocks come down around where the player stood
      if (m.t < 0.45) {
        var u = m.t / 0.45;
        b.fly = true;
        b.y = b.baseY - 38 * 4 * u * (1 - u);
        m.pose = 'rear';
      } else {
        b.y = b.baseY;
        b.fly = !!b.flies;
        m.pose = m.t < 0.9 ? 'slam' : null;
      }
      if (once(m, 'land', 0.45)) {
        this._bossImpact(b.x + b.w / 2, b.baseY + b.h, b.id, 52);
        k.s.shake = Math.max(k.s.shake, 0.5);
        this._emit('sound', { name: 'boss' });
        var px = k.p.x + k.p.w / 2;
        for (var i = 0; i < 3; i++) bossRockfall(this, b, arenaX(k, b, px + (i - 1) * 70), 0.1 + i * 0.16);
      }
      if (m.t >= 1.35) finish(b, m);
    },
    // TIDEBREAKER, the mantis. Scythes, water, and a leap.
    geyser: function (b, m, dt, k) {
      // it rears and brings both scythes down: three water columns burst up in turn, marching away from it
      m.pose = m.t < 0.3 ? 'rear' : m.t < 0.8 ? 'strike' : null;
      if (once(m, 'slam', 0.3)) {
        var front = b.x + b.w / 2 + m.dir * b.w * 0.5,
          floor = b.baseY + b.h;
        for (var i = 0; i < 3; i++)
          bossHazard(
            this,
            b,
            arenaX(k, b, front + m.dir * (60 + i * 70)),
            floor - 70,
            12,
            70,
            0.25 + i * 0.18,
            0.45,
            'geyser'
          );
        this._bossImpact(front, floor, b.id, 30);
        k.s.shake = Math.max(k.s.shake, 0.25);
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 1.3) finish(b, m);
    },
    crescent: function (b, m, dt, k) {
      // two scythe blades thrown along the ground: the first low - jump it - the second high, over a
      // standing player's head - stay down for it
      var floor = b.baseY + b.h,
        fx = b.x + b.w / 2 + m.dir * b.w * 0.6;
      if (once(m, 'low', 0.05))
        bossShot(this, b, fx, floor - 12, m.dir * 240, 0, { r: 9, kind: 'crescent', life: 2.4 });
      if (once(m, 'high', 0.45)) {
        bossShot(this, b, fx, floor - 62, m.dir * 240, 0, { r: 9, kind: 'crescent', high: true, life: 2.4 });
        this._emit('sound', { name: 'boss' });
      }
      m.pose = m.t < 0.3 ? 'strike' : m.t < 0.45 ? 'rear' : m.t < 0.7 ? 'strike' : null;
      if (m.t >= 0.9) finish(b, m);
    },
    leapslash: function (b, m, dt, k) {
      // it leaps over the player's head and lands on the far side with its scythes down, splashing both ways
      if (m.fromX === undefined) {
        var pc = k.p.x + k.p.w / 2,
          side = b.x + b.w / 2 < pc ? 1 : -1;
        m.fromX = b.x;
        m.toX = clamp(pc + side * 80 - b.w / 2, k.A.bossMin, k.A.bossMax);
        b.facing = side;
      }
      var dur = 0.75,
        u = Math.min(1, m.t / dur);
      if (u < 1) {
        b.fly = true;
        b.x = m.fromX + (m.toX - m.fromX) * u;
        b.y = b.baseY - 110 * 4 * u * (1 - u);
        m.pose = 'air';
      }
      if (once(m, 'land', dur)) {
        b.x = m.toX;
        b.y = b.baseY;
        b.fly = !!b.flies;
        landShock(this, k, b, 200, 7, 0.6, 1, 40, 0.3);
        b.facing = k.p.x + k.p.w / 2 < b.x + b.w / 2 ? -1 : 1;
        m.pose = 'strike';
      }
      if (m.t >= dur + 0.25) finish(b, m);
    },
    rain: function (b, m, dt, k) {
      // scythes raised, it flings five drops high; they come down in a row across the player
      m.pose = m.t < 0.35 ? 'rear' : null;
      if (once(m, 'throw', 0.2)) {
        var px = k.p.x + k.p.w / 2,
          mx = b.x + b.w / 2,
          my = b.y + b.h * 0.15;
        for (var i = 0; i < 5; i++)
          bossLob(this, b, mx, my, arenaX(k, b, px + (i - 2) * 55), 1.15 + Math.abs(i - 2) * 0.05, {
            r: 5,
            kind: 'drop'
          });
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 0.7) finish(b, m);
    },
    // COILHEAD, the wasp, which flies: its sting, and the arc that gives it its name.
    needles: function (b, m, dt, k) {
      // three bursts of needles from the tail, each aimed where the player is at that moment
      m.pose = 'sting';
      for (var i = 0; i < 3; i++)
        if (once(m, 'n' + i, 0.05 + i * 0.2)) {
          var tx = b.x + b.w / 2 - m.dir * b.w * 0.35,
            ty = b.y + b.h * 0.72,
            px = k.p.x + k.p.w / 2,
            py = k.p.y + k.p.h * 0.5,
            a = Math.atan2(py - ty, px - tx);
          for (var j = -1; j <= 1; j++)
            bossShot(this, b, tx, ty, Math.cos(a + j * 0.12) * 290, Math.sin(a + j * 0.12) * 290, {
              r: 4,
              kind: 'needle',
              life: 2
            });
          this._emit('sound', { name: 'boss' });
        }
      if (m.t >= 0.75) finish(b, m);
    },
    arcbolt: function (b, m, dt, k) {
      // lightning called down in three places around the player, one after another, starting on the side
      // nearest the wasp - step back through the first strike once it is spent
      m.pose = m.t < 0.9 ? 'charge' : null;
      if (once(m, 'call', 0.05)) {
        var px = k.p.x + k.p.w / 2,
          top = 34,
          floor = b.baseY + b.h;
        for (var i = 0; i < 3; i++)
          bossHazard(
            this,
            b,
            arenaX(k, b, px + (i - 1) * 60 * m.dir),
            (top + floor) / 2,
            9,
            (floor - top) / 2,
            0.45 + i * 0.2,
            0.22,
            'bolt'
          );
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 1.2) finish(b, m);
    },
    // ASHMAW, the cinder beast. Fire from the jaws and from the vents on its back, and its weight.
    breath: function (b, m, dt, k) {
      // it rears, then breathes a line of fire along the floor that runs out ahead of it - jump the front of
      // the flames as they reach you, or get behind it
      m.pose = m.t < 0.2 ? 'rear' : m.t < 0.95 ? 'strike' : null;
      var floor = b.baseY + b.h,
        front = b.x + b.w / 2 + m.dir * b.w * 0.5;
      if (once(m, 'roar', 0.2)) this._emit('sound', { name: 'boss' });
      for (var i = 0; i < 10; i++)
        if (once(m, 'f' + i, 0.2 + i * 0.07)) {
          var fx = front + m.dir * (26 + i * 22);
          if (fx > k.A.gate && fx < k.A.bossMax + b.w + 20)
            bossHazard(this, b, fx, floor - 9, 11, 9, 0, 0.45, 'flame');
        }
      if (m.t >= 1.25) finish(b, m);
    },
    eruption: function (b, m, dt, k) {
      // the vents on its back spit five molten rocks around the player; where each lands the floor burns
      m.pose = m.t < 0.25 ? 'crouch' : m.t < 0.6 ? 'rear' : null;
      if (once(m, 'spew', 0.25)) {
        var px = k.p.x + k.p.w / 2,
          mx = b.x + b.w / 2 - m.dir * b.w * 0.2,
          my = b.y + b.h * 0.1,
          floor = b.baseY + b.h;
        for (var i = 0; i < 5; i++) {
          var to = arenaX(k, b, px + (i - 2) * 64),
            fl = 1.05 + (i % 2) * 0.12;
          bossLob(this, b, mx, my, to, fl, { r: 7, kind: 'rock' });
          bossHazard(this, b, to, floor - 6, 13, 6, fl, 0.8, 'embers');
        }
        k.s.shake = Math.max(k.s.shake, 0.25);
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 0.8) finish(b, m);
    },
    tackle: function (b, m, dt, k) {
      // head down, a long heavy charge; it skids to a stop and the floor throws a shock on ahead
      if (m.t < 1) {
        slide(k, b, m.dir * 250 * dt);
        m.pose = 'lunge';
        var d = Math.floor(m.t * 20);
        if (!k.s.reducedMotion && d !== m.dust) {
          m.dust = d;
          this._push({
            x: b.x + b.w / 2 - m.dir * b.w * 0.4,
            y: b.baseY + b.h - 3,
            vx: -m.dir * 60,
            vy: -30,
            life: 0.3,
            maxLife: 0.3,
            color: '#8a6f5a',
            size: 3,
            type: 'smoke',
            gravity: 0
          });
        }
      }
      if (once(m, 'skid', 1)) {
        var fy = b.baseY + b.h,
          cx = b.x + b.w / 2;
        bossShot(this, b, cx + m.dir * b.w * 0.5, fy - 10, m.dir * 220, 0, { r: 8, kind: 'wave', life: 0.7 });
        this._bossImpact(cx + m.dir * b.w * 0.4, fy, b.id, 36);
        k.s.shake = Math.max(k.s.shake, 0.35);
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 1) m.pose = 'slam';
      if (m.t >= 1.25) finish(b, m);
    },
    bite: function (b, m, dt, k) {
      // a quick lunge and the jaws snap shut just ahead of it, then it backs off
      if (m.from === undefined) m.from = b.x;
      if (m.t < 0.18) {
        b.x = clamp(m.from + m.dir * 90 * sstep(m.t / 0.18), k.A.bossMin, k.A.bossMax);
        m.pose = 'lunge';
      } else if (m.t < 0.45) m.pose = 'strike';
      else {
        slide(k, b, -m.dir * 80 * dt);
        m.pose = null;
      }
      if (once(m, 'snap', 0.18)) {
        var jx = b.x + b.w / 2 + m.dir * (b.w * 0.6 + 14),
          jy = b.y + b.h * 0.5;
        bossHazard(this, b, jx, jy, 20, 22, 0, 0.14, 'jaws');
        this._bossImpact(jx, jy, b.id, 26);
        k.s.shake = Math.max(k.s.shake, 0.3);
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 0.7) finish(b, m);
    },
    // NULLPRIEST, the void scorpion. It is not always there, and its tail does the rest.
    voidstep: function (b, m, dt, k) {
      // it fades out, comes back on the far side of the player and strikes with its tail. While it is faded
      // nothing touches it and it touches nothing.
      var pc = k.p.x + k.p.w / 2;
      if (m.t < 0.25) {
        m.alpha = 1 - m.t / 0.25;
        b.phaseOut = m.t > 0.12;
      } else if (once(m, 'blink', 0.25)) {
        var side = b.x + b.w / 2 < pc ? -1 : 1,
          to = pc - side * 80 - b.w / 2;
        if (to < k.A.bossMin || to > k.A.bossMax) to = pc + side * 110 - b.w / 2;
        b.x = clamp(to, k.A.bossMin, k.A.bossMax);
        b.facing = pc < b.x + b.w / 2 ? -1 : 1;
        m.dir = b.facing;
        m.alpha = 0;
        b.phaseOut = true;
      } else if (m.t < 0.45) {
        m.alpha = (m.t - 0.25) / 0.2;
        b.phaseOut = m.t < 0.35;
      } else {
        m.alpha = 1;
        b.phaseOut = false;
        m.pose = 'strike';
        if (once(m, 'strike', 0.47)) {
          var tx = b.x + b.w / 2 + m.dir * b.w * 0.5,
            ty = b.y + b.h * 0.35;
          for (var j = -1; j <= 1; j++)
            bossShot(this, b, tx, ty, m.dir * Math.cos(j * 0.28) * 220, Math.sin(j * 0.28) * 220, {
              r: 5,
              kind: 'voidorb',
              life: 2
            });
          this._emit('sound', { name: 'boss' });
        }
        if (m.t < 0.6) slide(k, b, m.dir * 140 * dt);
      }
      if (m.t >= 0.8) {
        b.phaseOut = false;
        m.alpha = 1;
        finish(b, m);
      }
    },
    crossorb: function (b, m, dt, k) {
      // the tail lobs a slow orb at the player that splits into eight
      m.pose = m.t < 0.3 ? 'rear' : null;
      if (once(m, 'orb', 0.15)) {
        var tx = b.x + b.w / 2 + m.dir * b.w * 0.3,
          ty = b.y + b.h * 0.1,
          px = k.p.x + k.p.w / 2,
          py = k.p.y + k.p.h * 0.4,
          a = Math.atan2(py - ty, px - tx);
        bossShot(this, b, tx, ty, Math.cos(a) * 130, Math.sin(a) * 130, {
          r: 8,
          kind: 'voidorb',
          big: true,
          life: 3,
          split: { at: 2.15, n: 8, speed: 170, r: 4 }
        });
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 0.55) finish(b, m);
    },
    voidring: function (b, m, dt, k) {
      // two rings of orbs, the second turned half a step so it fills the first one's gaps
      m.pose = 'charge';
      for (var r = 0; r < 2; r++)
        if (once(m, 'ring' + r, 0.05 + r * 0.32)) {
          var cx = b.x + b.w / 2,
            cy = b.y + b.h / 2,
            n = 10,
            off = (r * Math.PI) / n;
          for (var i = 0; i < n; i++) {
            var a = off + (Math.PI * 2 * i) / n;
            bossShot(
              this,
              b,
              cx + Math.cos(a) * b.w * 0.66,
              cy + Math.sin(a) * b.h * 0.44,
              Math.cos(a) * 150,
              Math.sin(a) * 150,
              { r: 5, kind: 'voidorb', pops: true, life: 2.5 }
            );
          }
          this._emit('sound', { name: 'boss' });
        }
      if (m.t >= 0.65) finish(b, m);
    },
    tailbeam: function (b, m, dt, k) {
      // the tail levels and a thin beam fires along the floor at knee height - jump it
      m.pose = m.t < 0.45 ? 'charge' : m.t < 0.8 ? 'aim' : null;
      if (once(m, 'beam', 0.02)) {
        var floor = b.baseY + b.h,
          fx = b.x + b.w / 2 + m.dir * b.w * 0.5,
          len = 360;
        bossHazard(this, b, fx + (m.dir * len) / 2, floor - 24, len / 2, 5, 0.45, 0.3, 'beam', {
          dir: m.dir
        });
      }
      if (m.t >= 0.85) finish(b, m);
    },
    // GRAVELOCK, the anvil beetle. The horn, the stomp, and the whole weight of it from above.
    hornflip: function (b, m, dt, k) {
      // a short charge that ends with the horn thrown up, flinging four chunks of floor both ways
      if (m.t < 0.6) {
        slide(k, b, m.dir * 300 * dt);
        m.pose = 'lunge';
      } else m.pose = m.t < 1 ? 'rear' : null;
      if (once(m, 'flip', 0.6)) {
        var cx = b.x + b.w / 2 + m.dir * b.w * 0.4,
          cy = b.y + b.h * 0.2,
          arcs = [
            [-200, -380],
            [-110, -430],
            [120, -430],
            [210, -380]
          ];
        for (var i = 0; i < 4; i++)
          bossShot(this, b, cx, cy, arcs[i][0], arcs[i][1], {
            r: 6,
            kind: 'rock',
            g: 900,
            life: 3,
            floorOnly: true
          });
        this._bossImpact(cx, b.baseY + b.h, b.id, 40);
        k.s.shake = Math.max(k.s.shake, 0.4);
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 1.2) finish(b, m);
    },
    stomp: function (b, m, dt, k) {
      // it rears and stomps twice; each stomp sends a heavy shock both ways, and the second shakes rocks loose
      var t = m.t;
      m.pose = t < 0.3 || (t >= 0.6 && t < 0.9) ? 'rear' : t < 1.2 ? 'slam' : null;
      for (var i = 0; i < 2; i++)
        if (once(m, 'st' + i, 0.3 + i * 0.6)) {
          landShock(this, k, b, 180, 12, 2, 2, 56, 0.55);
          if (i === 1) {
            var px = k.p.x + k.p.w / 2;
            for (var j = 0; j < 3; j++)
              bossRockfall(this, b, arenaX(k, b, px + (j - 1) * 60), 0.15 + j * 0.15);
          }
        }
      if (t >= 1.5) finish(b, m);
    },
    anvil: function (b, m, dt, k) {
      // a huge leap onto the spot where the player stood when it jumped, marked on the floor, and a shock
      // both ways when it lands
      if (m.fromX === undefined) {
        m.fromX = b.x;
        m.toX = clamp(k.p.x + k.p.w / 2 - b.w / 2, k.A.bossMin, k.A.bossMax);
        bossHazard(this, b, m.toX + b.w / 2, b.baseY + b.h - 6, b.w * 0.8, 6, 0, 0.95, 'mark', {
          harmless: true
        });
      }
      var dur = 0.9,
        u = Math.min(1, m.t / dur);
      if (u < 1) {
        b.fly = true;
        b.x = m.fromX + (m.toX - m.fromX) * sstep(u);
        b.y = b.baseY - 150 * 4 * u * (1 - u);
        m.pose = 'air';
      }
      if (once(m, 'land', dur)) {
        b.x = m.toX;
        b.y = b.baseY;
        b.fly = !!b.flies;
        landShock(this, k, b, 300, 10, 1.2, 2, 64, 0.6);
        m.pose = 'slam';
      }
      if (m.t >= dur + 0.3) finish(b, m);
    },
    // SPARKWIDOW, the saw spider: saws, the smokestacks on its back, and its silk (swing).
    sawrush: function (b, m, dt, k) {
      // saws spinning, it runs flat out along the floor throwing sparks
      if (m.t < 0.7) {
        slide(k, b, m.dir * 340 * dt);
        m.pose = 'lunge';
        var sp = Math.floor(m.t * 30);
        if (!k.s.reducedMotion && sp !== m.spark) {
          m.spark = sp;
          this._push({
            x: b.x + b.w / 2 - m.dir * b.w * 0.3,
            y: b.baseY + b.h - 2,
            vx: -m.dir * (80 + (sp % 3) * 30),
            vy: -60 - (sp % 4) * 15,
            life: 0.25,
            maxLife: 0.25,
            color: '#ffd27a',
            size: 2,
            type: 'spark',
            gravity: 500
          });
        }
      } else m.pose = m.t < 0.85 ? 'crouch' : null;
      if (m.t >= 0.9) finish(b, m);
    },
    sawtoss: function (b, m, dt, k) {
      // legs planted, it flings the saw from each front leg along the floor. Each one rolls out and comes back
      // to it: the first runs long, the second short and a beat later, so each is jumped going out and again
      // coming back
      m.pose = m.t < 0.12 ? 'crouch' : m.t < 0.55 ? 'strike' : null;
      var S = combat.bossSwing,
        throws = [
          [0.12, S.sawSpeed, S.sawTurn],
          [0.46, 200, 0.55]
        ];
      for (var i = 0; i < 2; i++)
        if (once(m, 'saw' + i, throws[i][0])) {
          var t0 = throws[i];
          bossShot(this, b, b.x + b.w / 2 + m.dir * b.w * 0.4, b.baseY + b.h - S.sawR - 1, m.dir * t0[1], 0, {
            r: S.sawR,
            kind: 'saw',
            life: t0[2] * 2,
            turn: t0[2]
          });
          this._emit('sound', { name: 'boss' });
        }
      if (m.t >= 0.7) finish(b, m);
    },
    embers: function (b, m, dt, k) {
      // the smokestacks cough seven embers high into the air; they rain down across the player
      m.pose = m.t < 0.3 ? 'crouch' : null;
      if (once(m, 'puff', 0.15)) {
        var px = k.p.x + k.p.w / 2,
          sx = b.x + b.w / 2,
          sy = b.y + b.h * 0.05;
        for (var i = 0; i < 7; i++)
          bossLob(this, b, sx + (i - 3) * 3, sy, arenaX(k, b, px + (i - 3) * 44), 1 + (i % 3) * 0.08, {
            r: 4,
            kind: 'ember'
          });
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 0.6) finish(b, m);
    },
    // OBSIDIAN CROWN, the gate dragon. The cannons on its back, its tail, and a pounce.
    crownbeam: function (b, m, dt, k) {
      // two beams from the back cannons: first at head height - stay down - then along the floor - jump
      m.pose = m.t < 1.5 ? 'aim' : null;
      if (once(m, 'beams', 0.02)) {
        var floor = b.baseY + b.h,
          fx = b.x + b.w / 2 + m.dir * b.w * 0.5,
          len = 480;
        bossHazard(this, b, fx + (m.dir * len) / 2, floor - 66, len / 2, 7, 0.35, 0.4, 'beam', {
          dir: m.dir
        });
        bossHazard(this, b, fx + (m.dir * len) / 2, floor - 14, len / 2, 7, 1.1, 0.4, 'beam', {
          dir: m.dir,
          low: true
        });
        this._emit('sound', { name: 'boss' });
      }
      if (m.t >= 1.6) finish(b, m);
    },
    barrage: function (b, m, dt, k) {
      // three low shells - jump them - a breath, then three high ones over a standing player
      m.pose = 'aim';
      var floor = b.baseY + b.h,
        times = [0.05, 0.23, 0.41, 1.11, 1.29, 1.47];
      for (var i = 0; i < 6; i++)
        if (once(m, 'b' + i, times[i])) {
          bossShot(this, b, b.x + b.w / 2 + m.dir * b.w * 0.5, floor - (i >= 3 ? 62 : 14), m.dir * 280, 0, {
            r: 6,
            kind: 'slug',
            life: 2.5
          });
          this._emit('sound', { name: 'boss' });
        }
      if (m.t >= 1.6) finish(b, m);
    },
    tailspin: function (b, m, dt, k) {
      // it spins, its tail sweeping close on both sides, and finishes with a shock both ways
      m.pose = 'spin';
      m.poseU = Math.min(1, m.t / 0.6);
      if (once(m, 'sweep', 0.1)) {
        var fy = b.baseY + b.h,
          cx = b.x + b.w / 2;
        bossHazard(this, b, cx - 60, fy - 16, 45, 16, 0, 0.5, 'sweep');
        bossHazard(this, b, cx + 60, fy - 16, 45, 16, 0, 0.5, 'sweep');
      }
      if (once(m, 'waves', 0.6)) {
        landShock(this, k, b, 260, 8, 0.9, 1, 48, 0.35);
      }
      if (m.t >= 0.6) m.pose = null;
      if (m.t >= 0.9) finish(b, m);
    },
    pounce: function (b, m, dt, k) {
      // it leaps at the player and bursts five shards up and outward where it lands
      if (m.fromX === undefined) {
        m.fromX = b.x;
        m.toX = clamp(k.p.x + k.p.w / 2 - b.w / 2, k.A.bossMin, k.A.bossMax);
        bossHazard(this, b, m.toX + b.w / 2, b.baseY + b.h - 6, b.w * 0.8, 6, 0, 0.8, 'mark', {
          harmless: true
        });
      }
      var dur = 0.75,
        u = Math.min(1, m.t / dur);
      if (u < 1) {
        b.fly = true;
        b.x = m.fromX + (m.toX - m.fromX) * u;
        b.y = b.baseY - 120 * 4 * u * (1 - u);
        m.pose = 'air';
      }
      if (once(m, 'land', dur)) {
        b.x = m.toX;
        b.y = b.baseY;
        b.fly = !!b.flies;
        var fy = b.baseY + b.h,
          cx = b.x + b.w / 2;
        for (var i = 0; i < 5; i++) {
          var a = (-Math.PI * (150 - i * 30)) / 180;
          bossShot(this, b, cx, fy - 20, Math.cos(a) * 200, Math.sin(a) * 200, {
            r: 5,
            kind: 'shard',
            pops: true,
            life: 2
          });
        }
        this._bossImpact(cx, fy, b.id, 52);
        k.s.shake = Math.max(k.s.shake, 0.45);
        this._emit('sound', { name: 'boss' });
        m.pose = 'slam';
      }
      if (m.t >= dur + 0.25) finish(b, m);
    }
  };
  combat.bossMoves = BOSS_MOVES;
  // Each pattern fires once, at the moment its wind-up ends. Every number it uses comes from
  // the roster entry, so two bosses sharing an attack still do not play the same.
  NeonGame.prototype._bossFire = function (b, name) {
    var s = this.state,
      p = s.player,
      dir = p.x < b.x ? -1 : 1,
      cx = b.x + b.w / 2,
      cy = b.y + b.h / 2,
      floorY = (b.baseY === undefined ? b.y : b.baseY) + b.h,
      i,
      a;
    var firstBullet = s.bullets.length;
    b.facing = dir;
    if (name === 'volley') {
      var shots = knob(b, 'volleyShots'),
        aimVy = 0;
      // from the air the fan is tilted so its middle arrives at the player's chest; on the floor it is
      // the flat fan it always was
      if (b.fly) {
        var reach = Math.max(40, Math.abs(p.x + p.w / 2 - cx)),
          mid = (shots - 1) / 2,
          midSpeed = knob(b, 'volleySpeed') + mid * knob(b, 'volleyStep');
        aimVy =
          (p.y + p.h * 0.5 - (b.y + b.h * 0.27)) / (reach / midSpeed) -
          (knob(b, 'volleyRise') + mid * knob(b, 'volleyFall'));
      }
      // alternating sides of the chest, so the spread reads as coming off the machine
      for (i = 0; i < shots; i++)
        this._spawn(
          b.x + b.w * (i % 2 ? 0.72 : 0.28),
          b.y + b.h * 0.27,
          dir * (knob(b, 'volleySpeed') + i * knob(b, 'volleyStep')),
          knob(b, 'volleyRise') + i * knob(b, 'volleyFall') + aimVy,
          'enemy',
          false,
          1
        );
    } else if (name === 'wave') {
      // more than one wave leaves staggered, so they arrive as a rhythm rather than a wall
      for (i = 0; i < knob(b, 'waveCount'); i++)
        this._spawn(
          cx + dir * (b.w * 0.55 + i * 30),
          floorY - 12,
          dir * (knob(b, 'waveSpeed') - i * 38),
          0,
          'enemy',
          false,
          2,
          { r: knob(b, 'waveRadius'), kind: 'wave' }
        );
    } else if (name === 'dash') {
      // in the air a straight charge would pass over everyone's head, so it swoops instead
      if (b.fly) b.move = { kind: 'swoop', t: 0, fromY: b.y, dir: dir, done: false };
      else b.dashTime = knob(b, 'dashHold');
    } else if (name === 'mortar') {
      // shells lobbed onto where he last saw the player, straddling that spot. The arc is
      // solved so they come down on the floor plane, not on the muzzle line.
      var flight = knob(b, 'mortarFlight'),
        gv = 900,
        aimAt = p.x + p.w / 2,
        muzzleY = b.y + b.h * 0.18,
        climb = (floorY - muzzleY - (gv * flight * flight) / 2) / flight,
        shells = knob(b, 'mortarShells'),
        spread = knob(b, 'mortarSpread');
      for (i = 0; i < shells; i++) {
        var land = aimAt + (i - (shells - 1) / 2) * spread;
        this._spawn(cx, muzzleY, (land - cx) / flight, climb, 'enemy', false, 1, {
          r: 5,
          g: gv,
          kind: 'shell'
        });
      }
    } else if (name === 'ring') {
      // spawned clear of his own silhouette, or the first half second of the spread is invisible
      var ring = knob(b, 'ringShots'),
        rs = knob(b, 'ringSpeed');
      for (i = 0; i < ring; i++) {
        a = (Math.PI * 2 * i) / ring;
        // flattened vertically so the downward shots start above the floor rather than inside it
        this._spawn(
          cx + Math.cos(a) * (b.w * 0.66),
          cy + Math.sin(a) * (b.h * 0.44),
          Math.cos(a) * rs,
          Math.sin(a) * rs,
          'enemy',
          false,
          1,
          { r: 5, pops: true }
        );
      }
    } else if (name === 'slam') {
      // leap marks this as the committed jump: the scurry lets go of the body until it lands
      b.vy = -knob(b, 'slamLift');
      b.slammed = false;
      b.leap = true;
    } else if (name === 'mines') {
      // lobbed the same way as shells, but they sit where they land and go off on a fuse
      var mf = 1.1,
        mg = 900,
        mClimb = (floorY - (b.y + b.h * 0.18) - (mg * mf * mf) / 2) / mf,
        count = knob(b, 'mineShells'),
        mSpread = knob(b, 'mineSpread');
      for (i = 0; i < count; i++) {
        var at = p.x + p.w / 2 + (i - (count - 1) / 2) * mSpread;
        this._spawn(cx, b.y + b.h * 0.18, (at - cx) / mf, mClimb, 'enemy', false, 1, {
          r: 6,
          g: mg,
          kind: 'shell',
          mine: true
        });
      }
    } else if (name === 'dive') {
      // it lets go of the floor; _bossMove flies it from here
      b.fly = true;
      b.vy = 0;
      b.leap = false;
      b.slammed = true;
      b.move = { kind: 'dive', phase: 'rise', t: 0, fromY: b.y, lockX: null, done: false };
    } else if (name === 'swing') {
      var SW = global.AstraCombat.bossSwing,
        anchor = global.AstraCombat.bossSwingAnchor(b),
        side = b.x + b.w / 2 >= anchor.x ? 1 : -1;
      b.fly = true;
      b.vy = 0;
      b.leap = false;
      b.slammed = true;
      b.facing = -side;
      b.move = {
        kind: 'swing',
        phase: 'climb',
        t: 0,
        ax: anchor.x,
        ay: anchor.y,
        th0: (side * SW.swingDeg * Math.PI) / 180,
        th: (side * SW.swingDeg * Math.PI) / 180,
        fromX: b.x,
        fromY: b.y,
        done: false
      };
    } else if (name === 'swoop') {
      b.move = { kind: 'swoop', t: 0, fromY: b.y, dir: dir, done: false };
    } else if (BOSS_MOVES[name]) {
      b.move = { kind: name, t: 0, dir: dir, done: false, fired: {}, pose: null };
    } else if (name === 'wall') {
      // a column with exactly one hole in it, which is the whole puzzle
      var rows = knob(b, 'wallRows'),
        step = knob(b, 'wallStep'),
        hole = 1 + Math.floor(Math.random() * Math.max(1, rows - 2));
      for (i = 0; i < rows; i++) {
        if (i === hole) continue;
        this._spawn(
          cx + dir * (b.w * 0.5 + 6),
          floorY - 18 - i * step,
          dir * knob(b, 'wallSpeed'),
          0,
          'enemy',
          false,
          1,
          { r: 6, kind: 'wall' }
        );
      }
    }
    for (var fx = firstBullet; fx < s.bullets.length; fx++) s.bullets[fx].fxBoss = b.id;
  };
  // A signature move, one frame at a time. When it is done it zeroes the timer, and the boss goes
  // straight into the rest its beat asked for.
  NeonGame.prototype._bossMove = function (b, dt) {
    var s = this.state,
      p = s.player,
      C = global.AstraCombat,
      arena = C.arena,
      m = b.move,
      u,
      e;
    if (!m || m.done) return;
    m.t += dt;
    if (m.kind === 'dive') {
      var D = C.bossDive,
        hoverY = b.baseY - D.lift,
        want = p.x + p.w / 2 - b.w / 2;
      function hunt() {
        var gap = want - b.x,
          step = D.track * dt;
        b.x = clamp(
          b.x + (gap > 0 ? Math.min(step, gap) : Math.max(-step, gap)),
          arena.bossMin,
          arena.bossMax
        );
      }
      if (m.phase === 'rise') {
        u = Math.min(1, m.t / D.rise);
        e = u * u * (3 - 2 * u);
        b.y = m.fromY + (hoverY - m.fromY) * e;
        hunt();
        if (u >= 1) {
          m.phase = 'hover';
          m.t = 0;
        }
      } else if (m.phase === 'hover') {
        b.y = hoverY;
        // it keeps the way it faced when it took off: hovering over the player, the picture would
        // otherwise flip every time its middle crossed his
        if (m.t < D.hover - D.lock) hunt();
        else if (m.lockX === null) m.lockX = b.x;
        if (m.t >= D.hover) {
          if (m.lockX === null) m.lockX = b.x;
          m.phase = 'fall';
          m.t = 0;
          b.vy = 0;
        }
      } else if (m.phase === 'fall') {
        b.x = m.lockX;
        b.vy += D.fall * dt;
        b.y += b.vy * dt;
        if (b.y >= b.baseY) {
          b.y = b.baseY;
          b.vy = 0;
          b.fly = false;
          b.grounded = !!b.flies;
          m.phase = 'stuck';
          m.t = 0;
          var fy = b.y + b.h,
            cx = b.x + b.w / 2;
          this._spawn(cx - b.w * 0.3, fy - 12, -D.shockSpeed, 0, 'enemy', false, 1, {
            r: D.shockR,
            kind: 'wave',
            life: D.shockLife,
            fxBoss: b.id
          });
          this._spawn(cx + b.w * 0.3, fy - 12, D.shockSpeed, 0, 'enemy', false, 1, {
            r: D.shockR,
            kind: 'wave',
            life: D.shockLife,
            fxBoss: b.id
          });
          this._bossImpact(cx, fy, b.id, 44);
          s.shake = Math.max(s.shake, 0.4);
          this._emit('sound', { name: 'boss' });
        }
      } else if (m.phase === 'stuck') {
        if (m.t >= D.stuck) {
          m.done = true;
          b.timer = 0;
        }
      }
    } else if (m.kind === 'swoop') {
      // the charge's own speed and length, along a dip that bottoms out half way
      var dur = knob(b, 'dashHold'),
        lowY = b.baseY - C.bossFlight.swoopClear;
      u = Math.min(1, m.t / dur);
      b.x = clamp(b.x + m.dir * knob(b, 'dashSpeed') * dt, arena.bossMin, arena.bossMax);
      b.y = m.fromY + (lowY - m.fromY) * Math.sin(Math.PI * u);
      if (u >= 1) {
        b.y = m.fromY;
        m.done = true;
        b.timer = 0;
      }
    } else if (m.kind === 'swing') {
      var S = C.bossSwing,
        L = S.rope;
      if (m.phase === 'climb') {
        u = Math.min(1, m.t / S.climb);
        e = u * u * (3 - 2 * u);
        var tx = m.ax + L * Math.sin(m.th0) - b.w / 2,
          ty = m.ay + L * Math.cos(m.th0) - b.h / 2;
        b.x = clamp(m.fromX + (tx - m.fromX) * e, arena.bossMin, arena.bossMax);
        b.y = Math.min(b.baseY, m.fromY + (ty - m.fromY) * e);
        if (u >= 1) {
          m.phase = 'sweep';
          m.t = 0;
        }
      } else if (m.phase === 'sweep') {
        u = Math.min(1, m.t / S.sweep);
        m.th = m.th0 * Math.cos(Math.PI * u);
        b.x = clamp(m.ax + L * Math.sin(m.th) - b.w / 2, arena.bossMin, arena.bossMax);
        b.y = Math.min(b.baseY, m.ay + L * Math.cos(m.th) - b.h / 2);
        // it lets go on the far side and drops; slammed stays set, so the landing throws no slam wave
        if (u >= 1) {
          m.phase = 'drop';
          m.t = 0;
          b.fly = false;
          b.vy = 0;
          b.slammed = true;
        }
      } else if (m.phase === 'drop') {
        if (b.y >= b.baseY) {
          m.phase = 'saws';
          m.t = 0;
          var sx = b.x + b.w / 2,
            sy = b.baseY + b.h;
          for (var d = -1; d <= 1; d += 2)
            this._spawn(sx + d * b.w * 0.4, sy - S.sawR - 1, d * S.sawSpeed, 0, 'enemy', false, 1, {
              r: S.sawR,
              kind: 'saw',
              life: S.sawLife,
              turn: S.sawTurn,
              fxBoss: b.id
            });
          this._bossImpact(sx, sy, b.id, 34);
          s.shake = Math.max(s.shake, 0.25);
          this._emit('sound', { name: 'boss' });
        }
      } else if (m.phase === 'saws') {
        if (m.t >= 0.25) {
          m.done = true;
          b.timer = 0;
        }
      }
    } else if (BOSS_MOVES[m.kind]) {
      BOSS_MOVES[m.kind].call(this, b, m, dt, { s: s, p: p, A: arena });
    }
  };
  // An orb that has flown its course bursts into shards all the way round.
  NeonGame.prototype._bossSplit = function (q) {
    var sp = q.split;
    for (var i = 0; i < sp.n; i++) {
      var a = (Math.PI * 2 * i) / sp.n;
      this._spawn(q.x, q.y, Math.cos(a) * sp.speed, Math.sin(a) * sp.speed, 'enemy', false, 1, {
        r: sp.r,
        kind: 'voidorb',
        life: 2,
        pops: true,
        fxBoss: q.fxBoss
      });
    }
    if (q.fxBoss) this._bossImpact(q.x, q.y, q.fxBoss, 22);
  };
  // The slam only pays off when he lands: the floor throws a wave out both ways.
  NeonGame.prototype._bossSlam = function (b) {
    var s = this.state,
      cx = b.x + b.w / 2,
      fy = b.y + b.h,
      speed = knob(b, 'slamWave');
    this._spawn(cx - b.w * 0.3, fy - 12, -speed, 0, 'enemy', false, 2, { r: 7, kind: 'wave', fxBoss: b.id });
    this._spawn(cx + b.w * 0.3, fy - 12, speed, 0, 'enemy', false, 2, { r: 7, kind: 'wave', fxBoss: b.id });
    this._bossImpact(b.x + b.w / 2, fy, b.id, 48);
    s.shake = Math.max(s.shake, 0.45);
    for (var i = 0; i < 12; i++) {
      var d = i < 6 ? -1 : 1,
        sp = 80 + Math.random() * 150;
      this._push({
        x: cx + d * b.w * 0.2,
        y: fy - 6,
        vx: d * sp,
        vy: -40 - Math.random() * 90,
        life: 0.34,
        maxLife: 0.34,
        color: '#8ea6ad',
        size: 2 + Math.random() * 3,
        type: 'spark',
        gravity: 620,
        drag: 0.4
      });
    }
    this._emit('sound', { name: 'boss' });
  };
  // Cosmetic only: fixed lifetime, no RNG, collision or damage.
  NeonGame.prototype._bossImpact = function (x, y, id, size) {
    this._push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: 0.38,
      maxLife: 0.38,
      size: size,
      type: 'boss-impact',
      fxBoss: id
    });
  };
  // A mine that has run its fuse throws a short fan upward before it is gone.
  NeonGame.prototype._mineBursts = function (b) {
    var shots = b.burst || 5;
    this._explode(b.x, b.y, '#ffb04a', 0.7);
    for (var i = 0; i < shots; i++) {
      var a = -Math.PI / 2 + (i - (shots - 1) / 2) * 0.42;
      this._spawn(b.x, b.y - 6, Math.cos(a) * 165, Math.sin(a) * 165, 'enemy', false, 1, {
        r: 5,
        pops: true,
        fxBoss: b.fxBoss
      });
    }
    if (b.fxBoss) this._bossImpact(b.x, b.y, b.fxBoss, 36);
    this.state.shake = Math.max(this.state.shake, 0.2);
  };
  // Everything he had in the air comes off the board with him, and the arena goes quiet.
  NeonGame.prototype._bossDown = function (b) {
    var s = this.state;
    if (b.down) return;
    if (global.AstraCombat.stage.kind === 'gauntlet' && !s.practice) {
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + 4);
      var next = global.AstraCombat.stage.bosses[s.bossIndex + 1];
      if (next) {
        var incoming = global.AstraBosses.get(next);
        s.nextBossMarker = {
          id: next,
          name: incoming.name,
          x: global.AstraCombat.arena.bossX + incoming.w / 2,
          y: 310,
          w: incoming.w,
          h: incoming.h
        };
      }
      this._emit('sound', { name: 'pickup' });
    }
    b.hp = 0;
    b.down = true;
    b.downTime = 0;
    b.deathBursts = 0;
    b.blasted = false;
    b.dashTime = 0;
    b.attack = 'down';
    b.timer = 999;
    b.move = null;
    b.fly = false;
    b.phaseOut = false;
    for (var i = s.bullets.length - 1; i >= 0; i--) if (s.bullets[i].team === 'enemy') s.bullets.splice(i, 1);
    s.shake = Math.max(s.shake, 0.35);
    this._emit('sound', { name: 'explode' });
  };
  // Blasts walk across his frame, tightening up, and then the whole thing lets go.
  NeonGame.prototype._bossDying = function (b, dt) {
    var s = this.state,
      C = global.AstraCombat,
      plan = C.bossDeath;
    b.downTime += dt;
    b.flash = Math.max(0, b.flash - dt);
    if (b.y < b.baseY) {
      b.vy = (b.vy || 0) + 1500 * dt;
      b.y = Math.min(b.baseY, b.y + b.vy * dt);
      if (b.y >= b.baseY) b.vy = 0;
    }
    while (b.deathBursts < plan.bursts && C.bossDeathBurstAt(b.deathBursts) <= b.downTime) {
      b.deathBursts++;
      var rx = b.x + b.w * 0.15 + Math.random() * (b.w * 0.7),
        ry = b.y + b.h * 0.13 + Math.random() * (b.h * 0.74);
      this._explode(rx, ry, b.deathBursts % 2 ? '#ffd06a' : '#ff754d', 1);
      b.flash = 0.12;
      s.shake = Math.max(s.shake, 0.3);
      this._emit('sound', { name: 'explode' });
    }
    if (!b.blasted && b.downTime >= plan.blastAt) {
      b.blasted = true;
      b.gone = true;
      var cx = b.x + b.w / 2,
        cy = b.y + b.h / 2;
      this._explode(cx, cy, '#fff2c4', 2.3);
      for (var i = 0; i < 5; i++) {
        var a = (Math.PI * 2 * i) / 5 + 0.4;
        this._explode(
          cx + Math.cos(a) * (b.w * 0.85),
          cy + Math.sin(a) * (b.h * 0.65),
          i % 2 ? '#ffd06a' : '#ff754d',
          1.1
        );
      }
      s.shake = Math.max(s.shake, 1);
      s.flash = s.reducedMotion ? 0 : 0.55;
      this._emit('sound', { name: 'boom' });
    }
    if (b.downTime >= plan.end) {
      s.score += 800;
      if (this._nextBoss()) return; // a gauntlet sends the next one in
      b.active = false;
      s.mode = 'victory';
      s.message = 'GATEBREAKER // COMPLETE';
      this._emit('victory', this.snapshot());
      this._emit('sound', { name: 'victory' });
    }
  };
  // Builds the boss a stage asks for. Size, armour and look all come from the roster.
  NeonGame.prototype._spawnBoss = function (id) {
    var s = this.state,
      def = global.AstraBosses.get(id),
      arena = global.AstraCombat.arena;
    s.nextBossMarker = null;
    var hp = this.difficulty === 'easy' ? def.easyHp : def.hp,
      bottom = 310;
    s.boss = {
      id: def.id,
      name: def.name,
      title: def.title,
      look: def.look || '',
      sprite: def.sprite || '',
      x: arena.bossX,
      y: bottom - def.h,
      baseY: bottom - def.h,
      w: def.w,
      h: def.h,
      hp: hp,
      maxHp: hp,
      active: true,
      phase: 0,
      healthPhase: 1,
      attack: 'tell-' + def.pool[0],
      timer: 0.95,
      flash: 0,
      facing: -1,
      vy: 0,
      leap: false,
      slammed: true,
      beat: undefined,
      walkTo: undefined,
      fly: false,
      move: null,
      flies: def.flies ? def.flies.cruise : 0,
      grounded: false
    };
    if (s.boss.flies) {
      s.boss.fly = true;
      s.boss.y = s.boss.baseY - s.boss.flies;
    }
    // it opens on the first beat of its routine, so the loop starts where the roster says
    this._bossBeat(s.boss, def);
    return s.boss;
  };
  // In a gauntlet the arena refills until the list runs out.
  NeonGame.prototype._nextBoss = function () {
    var s = this.state,
      order = global.AstraCombat.stage.bosses;
    if (!order || s.bossIndex + 1 >= order.length) return false;
    s.bossIndex++;
    this._spawnBoss(order[s.bossIndex]);
    s.message = 'NEXT FRAME // ' + s.boss.name;
    s.messageTimer = 2.2;
    this._emit('sound', { name: 'boss' });
    return true;
  };
  NeonGame.prototype._boss = function (dt) {
    var s = this.state,
      p = s.player,
      b = s.boss,
      C = global.AstraCombat,
      arena = C.arena;
    if (!b || !b.active) return;
    if (b.baseY === undefined) b.baseY = b.y;
    if (b.hp <= 0 && !b.down) this._bossDown(b);
    if (b.down) {
      this._bossDying(b, dt);
      return;
    }
    var def = bossDef(b);
    b.timer -= dt;
    b.flash = Math.max(0, b.flash - dt);
    var ratio = b.hp / b.maxHp;
    b.healthPhase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    // the slam leap tracks the player through the air and shakes the floor on landing. A
    // scurry hop rides the same gravity but lands already slammed, so it throws no wave.
    if (!b.fly && (b.vy || b.y < b.baseY)) {
      b.vy = (b.vy || 0) + 1500 * dt;
      b.y += b.vy * dt;
      var toward = p.x + p.w / 2 - (b.x + b.w / 2);
      if (b.leap && Math.abs(toward) > 4)
        b.x = clamp(b.x + (toward > 0 ? 1 : -1) * knob(b, 'slamTrack') * dt, arena.bossMin, arena.bossMax);
      if (b.y >= b.baseY) {
        b.y = b.baseY;
        if (b.vy > 0 && !b.slammed) {
          b.slammed = true;
          this._bossSlam(b);
        }
        b.vy = 0;
        b.leap = false;
      }
    }
    // a flying boss holds its cruising height between moves, or the floor after it has landed
    if (b.flies && !b.move) {
      var cruiseY = b.grounded ? b.baseY : b.baseY - b.flies,
        gapY = cruiseY - b.y,
        climb = C.bossFlight.climb * dt;
      if (gapY) b.y += gapY > 0 ? Math.min(climb, gapY) : Math.max(-climb, gapY);
      b.fly = !b.grounded;
    }
    if (b.move) this._bossMove(b, dt);
    if (b.dashTime > 0) {
      b.dashTime -= dt;
      b.x = clamp(b.x + b.facing * knob(b, 'dashSpeed') * dt, arena.bossMin, arena.bossMax);
    }
    // Walking only ever happens on the way to the spot the next beat asked for, and it ends
    // the moment the boss gets there.
    var state = String(b.attack || '');
    if (state.indexOf('walk-') === 0 && b.dashTime <= 0 && !b.leap) {
      var gap = (b.walkTo === undefined ? b.x : b.walkTo) - b.x;
      if (Math.abs(gap) > C.bossWalk.settle) {
        var step = knob(b, 'stepSpeed') * dt;
        b.x = clamp(
          b.x + (gap > 0 ? Math.min(step, gap) : Math.max(-step, gap)),
          arena.bossMin,
          arena.bossMax
        );
      } else b.timer = 0;
      b.facing = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
    }
    // Resting is the opening: it stands, it faces you, and it starts nothing.
    if (state === 'rest') b.facing = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
    // a signature move ends when its own phases do, not when the pattern's nominal time runs out
    if (b.move && !b.move.done && b.timer <= 0) b.timer = 1e-6;
    if (b.timer <= 0) {
      if (state.indexOf('walk-') === 0) this._bossWind(b, def, state.slice(5));
      else if (state.indexOf('tell-') === 0 && C.bossPatterns[state.slice(5)]) {
        var move = state.slice(5);
        b.attack = move;
        b.timer = C.bossPatterns[move].active;
        this._bossFire(b, move);
      } else if (C.bossPatterns[state]) this._bossRest(b, def);
      else this._bossBeat(b, def);
    }
    if (!b.phaseOut && hit(p, b) && p.invuln <= 0 && !this._dodges()) {
      p.hp -= 2;
      if (this._registerHit) this._registerHit(this._attackSource || { boss: b.id, label: 'ボスとの接触' });
      p.invuln = 1;
      s.shake = 0.3;
      if (p.hp <= 0) this._die();
    }
  };
  // Step to the next beat of the routine and set off for the distance it asks for. Whichever
  // side of the player it is already on is the side it keeps, unless the arena is too tight
  // there to give the distance, in which case it crosses over.
  NeonGame.prototype._bossBeat = function (b, def) {
    var C = global.AstraCombat,
      arena = C.arena,
      p = this.state.player,
      routine = C.bossRoutine(def);
    if (!routine) {
      b.attack = 'rest';
      b.timer = 0.8;
      return;
    }
    b.beat = C.bossBeatAfter(def, b.beat);
    var beat = routine[b.beat],
      mid = p.x + p.w / 2,
      side = b.x + b.w / 2 < mid ? -1 : 1,
      away = C.bossBands[beat.from] || C.bossBands.mid;
    b.walkTo = clamp(mid + side * away - b.w / 2, arena.bossMin, arena.bossMax);
    if (Math.abs(b.walkTo + b.w / 2 - mid) < away - 24)
      b.walkTo = clamp(mid - side * away - b.w / 2, arena.bossMin, arena.bossMax);
    b.attack = 'walk-' + beat.move;
    b.timer = C.bossWalk.cap;
    b.dashTime = 0;
    b.move = null;
    // a flier that came down takes off again as it sets off for its next beat
    b.grounded = false;
    b.fly = !!b.flies;
    b.phaseOut = false;
  };
  // Plant and telegraph. The wind-up is the same one the warning graphic is drawn from.
  NeonGame.prototype._bossWind = function (b, def, move) {
    var C = global.AstraCombat,
      p = this.state.player;
    if (!C.bossPatterns[move]) {
      this._bossBeat(b, def);
      return;
    }
    b.attack = 'tell-' + move;
    b.phase = def.pool.indexOf(move);
    b.timer = C.bossPatterns[move].tell * C.bossTellScale[b.healthPhase - 1] * (def.tempo || 1);
    b.facing = p.x < b.x ? -1 : 1;
    b.dashTime = 0;
    this._emit('sound', { name: 'boss' });
  };
  // The recovery the beat asked for. Wounded it shortens, but never past the floor.
  NeonGame.prototype._bossRest = function (b, def) {
    var C = global.AstraCombat,
      routine = C.bossRoutine(def),
      beat = routine && routine[b.beat === undefined ? 0 : b.beat];
    b.attack = 'rest';
    b.dashTime = 0;
    b.move = null;
    b.fly = !!b.flies && !b.grounded;
    b.phaseOut = false;
    b.timer = Math.max(C.bossRestFloor, (beat ? beat.rest : 0.8) * C.bossTellScale[b.healthPhase - 1]);
  };
  NeonGame.prototype._deathTick = function (dt) {
    var s = this.state,
      f = s.deathFx;
    if (s.mode !== 'dead' || !f || f.done) return;
    f.time = Math.min(f.duration, f.time + dt);
    s.shake = Math.max(0, s.shake - dt * 3);
    s.flash = 0;
    if (f.time >= f.duration) {
      f.done = true;
      this._emit('death-ready', this.snapshot());
    }
  };
  NeonGame.prototype._die = function () {
    var s = this.state;
    if (s.mode === 'dead' || s.mode === 'victory') return;
    this._clearMouse();
    s.mode = 'dead';
    s.player.hp = 0;
    s.player.saberTime = 0;
    s.player.dashTime = 0;
    s.player.saberCharge = 0;
    s.deathFx = {
      time: 0,
      duration: 1.15,
      x: s.player.x + s.player.w / 2,
      y: Math.min(286, s.player.y + s.player.h / 2),
      facing: s.player.facing
    };
    s.message = '';
    s.messageTimer = 999;
    s.shake = 0.5;
    this._emit('death', this.snapshot());
  };
  NeonGame.prototype.destroy = function () {
    this.running = false;
    this._clearMouse();
    if (this.raf) cancelAnimationFrame(this.raf);
    global.removeEventListener('keydown', this._keydown);
    global.removeEventListener('keyup', this._keyup);
    global.removeEventListener('blur', this._blur);
    if (global.document && global.document.removeEventListener)
      global.document.removeEventListener('visibilitychange', this._visibility);
    if (this.canvas && this.canvas.removeEventListener) {
      this.canvas.removeEventListener('mousedown', this._mouseDown);
      this.canvas.removeEventListener('mouseup', this._mouseUp);
      this.canvas.removeEventListener('contextmenu', this._contextMenu);
    }
    if (this._globalMouseUp) global.removeEventListener('mouseup', this._globalMouseUp);
  };
  global.NeonGame = NeonGame;
})(typeof window !== 'undefined' ? window : globalThis);
