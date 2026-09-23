/* Boss-rush mastery: simulation hooks, practice and comparable personal records. */
(function (g) {
  'use strict';
  var P = g.NeonGame.prototype,
    C = g.AstraCombat;
  var hints = {
    pincer: 'JUMP WAVES',
    cannon: 'JUMP / CUT BULLETS',
    clawrush: 'KEEP DISTANCE',
    quake: 'LEAVE MARKS',
    geyser: 'LEAVE POOLS',
    crescent: 'JUMP THEN STAND',
    leapslash: 'MOVE THEN JUMP',
    rain: 'LEAVE MARKS',
    needles: 'MOVE / CUT BULLETS',
    arcbolt: 'LEAVE MARKS',
    swoop: 'JUMP PAST',
    dive: 'MOVE AFTER LOCK',
    breath: 'GET BEHIND',
    eruption: 'LEAVE MARKS',
    tackle: 'JUMP PAST',
    bite: 'STEP BACK',
    voidstep: 'TURN AND WATCH',
    crossorb: 'CUT BEFORE SPLIT',
    voidring: 'FIND GAP / CUT',
    tailbeam: 'JUMP BEAM',
    hornflip: 'JUMP PAST',
    stomp: 'JUMP WAVES',
    anvil: 'LEAVE MARK',
    sawrush: 'JUMP / CUT SAW',
    sawtoss: 'WATCH RETURN',
    embers: 'LEAVE MARKS',
    swing: 'WATCH SAW / CUT',
    crownbeam: 'STAND THEN JUMP',
    barrage: 'JUMP THEN STAND',
    tailspin: 'BACK THEN JUMP',
    pounce: 'LEAVE MARK'
  };
  var reset = P._reset;
  P._reset = function (mode) {
    reset.call(this, mode);
    this.state.runDifficulty = this.difficulty || 'normal';
    this.state.mastery = { hits: 0, deflects: 0, counters: 0, clears: [], ready: 0, notice: 0, text: '' };
    this.state.feedback = { hpTrail: this.state.player.hp, hpHold: 0, lastHit: null, recovery: null };
  };
  function note(s, text) {
    s.mastery.text = text;
    s.mastery.notice = 1.1;
  }
  P._registerHit = function (source) {
    var s = this.state,
      m = s.mastery;
    if (m) {
      m.hits++;
      m.ready = 0;
      m.counterSerial = null;
    }
    if (s.feedback) {
      s.feedback.hpHold = 0.35;
      s.feedback.lastHit = source || { label: '被弾' };
    }
  };
  // Keep the original move on delayed, split and mine projectiles, even after the boss changes moves.
  function bossSource(b) {
    var move =
      (b && b.move && b.move.kind) ||
      String((b && b.attack) || '')
        .replace(/^tell-/, '')
        .replace(/^walk-/, '');
    return { boss: b && b.id, move: C.bossPatterns[move] ? move : null, label: 'ボスとの接触' };
  }
  var spawnShot = P._spawn;
  P._spawn = function () {
    var shot = spawnShot.apply(this, arguments);
    if (shot.team === 'enemy' && this._attackSource)
      shot.source = Object.assign({}, this._attackSource, { label: '敵弾' });
    return shot;
  };
  var bossTick = P._boss;
  P._boss = function (dt) {
    var prev = this._attackSource;
    this._attackSource = bossSource(this.state.boss);
    try {
      return bossTick.call(this, dt);
    } finally {
      this._attackSource = prev;
    }
  };
  ['_bossSplit', '_mineBursts'].forEach(function (key) {
    var original = P[key];
    P[key] = function (projectile) {
      var prev = this._attackSource;
      this._attackSource = projectile.source;
      try {
        return original.call(this, projectile);
      } finally {
        this._attackSource = prev;
      }
    };
  });
  var die = P._die;
  P._die = function () {
    var s = this.state,
      b = s.boss;
    if (s.mode === 'playing') {
      var source = s.player.hp > 0 ? { label: '落下' } : s.feedback.lastHit || { label: '被弾' };
      s.defeat = {
        boss: b && b.id,
        name: b && b.name,
        remaining: b ? Math.max(0, Math.ceil((b.hp / b.maxHp) * 100)) : null,
        source: source
      };
      saveRush(this);
    }
    return die.call(this);
  };
  // Carrying on after a defeat in the rush. When the rush is lost after at least one boss has fallen,
  // where it was lost is kept: the bosses already beaten, the run's time and counts. continueRush()
  // restarts the fight with the boss that won, at full health, straight from the failure panel or after
  // practising the move that did it. The run is marked as continued, and ui.js keeps a continued run out
  // of the rush's best time and score, which only a run done in one go can set. The save is dropped by
  // a fresh rush, a full restart and a return to the title.
  function saveRush(game) {
    var s = game.state,
      order = C.stage.bosses || [],
      // lost while the beaten boss was still going down: that one counts, carry on from the next
      index = (s.bossIndex || 0) + (s.boss && s.boss.down ? 1 : 0),
      m = s.mastery || {};
    // losing a practice fight leaves the rush's save alone; losing the rush replaces it
    if (s.practice) return;
    game._rushSave = null;
    if (C.stage.kind !== 'gauntlet' || index < 1 || index >= order.length) return;
    game._rushSave = {
      index: index,
      boss: order[index],
      difficulty: game.difficulty || 'normal',
      time: s.timeElapsed || 0,
      continues: (s.continues || 0) + 1,
      hits: m.hits || 0,
      deflects: m.deflects || 0,
      counters: m.counters || 0,
      clears: (m.clears || []).slice(),
      score: s.score || 0,
      kills: s.kills || 0,
      shots: s.shots || 0
    };
  }
  // the boss a continue would start with, or null when there is nothing to continue
  P.rushContinueBoss = function () {
    var save = this._rushSave;
    return save ? g.AstraBosses.get(save.boss) : null;
  };
  P.dropRushSave = function () {
    this._rushSave = null;
  };
  P.continueRush = function () {
    var save = this._rushSave;
    if (!save) return false;
    this._rushSave = null;
    this.start({ stage: 'gauntlet', difficulty: save.difficulty });
    var s = this.state,
      m = s.mastery;
    // the run's clock carries on too: timeElapsed is read off it on every step
    s.time = s.timeElapsed = save.time;
    s.continues = save.continues;
    s.score = save.score;
    s.kills = save.kills;
    s.shots = save.shots;
    m.hits = save.hits;
    m.deflects = save.deflects;
    m.counters = save.counters;
    m.clears = save.clears.slice();
    s.bossIndex = save.index;
    this._spawnBoss(save.boss);
    return true;
  };
  var toTitle = P.toTitle;
  P.toTitle = function () {
    this._rushSave = null;
    return toTitle.call(this);
  };
  P._registerDeflect = function () {
    var s = this.state,
      m = s.mastery;
    if (!m) return;
    if (m.ready <= 0) this._emit('sound', { name: 'pickup' });
    m.deflects++;
    m.ready = 1.5;
    m.sourceSerial = s.player.attackSerial || 0;
    note(s, 'COUNTER READY / 1.5s');
  };
  P._masteryPower = function (power, kind) {
    var s = this.state,
      m = s.mastery,
      b = s.boss,
      p = s.player;
    if (!m) return power;
    var serial = p.attackSerial || 0;
    if (m.ready > 0 && serial !== m.sourceSerial && kind !== 'fan') {
      m.ready = 0;
      m.counterSerial = serial;
      m.counters++;
      note(s, 'COUNTER x1.5');
    }
    var mult = kind !== 'fan' && m.counterSerial === serial ? 1.5 : 1;
    if (b && kind === 'thrust' && b.attack === 'rest') {
      mult *= 1.25;
      note(s, m.counterSerial === serial ? 'COUNTER + OPEN x1.875' : 'OPENING / THRUST x1.25');
    }
    if (b && kind === 'rising' && b.y < b.baseY - 20) {
      mult *= 1.25;
      note(s, m.counterSerial === serial ? 'COUNTER + AIR x1.875' : 'AIR BREAK x1.25');
    }
    return power * mult;
  };
  // Intro time is separate from combat time: records and attack windups do not run here.
  var tick = P._tick;
  P._tick = function (dt) {
    var s = this.state;
    if (s.mode === 'playing' && s.feedback) {
      var f = s.feedback,
        hp = Math.max(0, s.player.hp);
      if (hp > f.hpTrail) f.hpTrail = hp;
      if (f.hpHold > 0) f.hpHold = Math.max(0, f.hpHold - dt);
      else f.hpTrail = Math.max(hp, f.hpTrail - dt * 6);
    }
    if (s.mode === 'playing' && s.bossIntro) {
      var intro = s.bossIntro;
      if (!s.boss || s.boss.down) {
        s.bossIntro = null;
      } else {
        intro.time = Math.min(intro.duration, intro.time + dt);
        s.player.animTime += dt;
        this.pressed = {};
        this.mouseInput.pendingShoot = false;
        this.mouseInput.pendingSaber = false;
        if (!intro.landed && intro.time >= intro.duration * 0.46) {
          intro.landed = true;
          this._emit('sound', { name: 'boss' });
        }
        if (intro.time >= intro.duration) {
          s.bossIntro = null;
          this._clearMouse();
          this.input = {};
          this.keys = {};
          this.pressed = {};
          this._jumpHeld = !!this.padInput.jump;
          this._dashHeld = !!this.padInput.dash;
          this._saberHeld = !!this.padInput.saber;
          this._shootHeld = !!this.padInput.shoot;
          s.boss.masteryStart = s.timeElapsed || 0;
          s.message = '';
          s.messageTimer = 0;
        }
        return;
      }
    }
    if (s.mode === 'playing' && s.mastery) {
      s.mastery.ready = Math.max(0, s.mastery.ready - dt);
      s.mastery.notice = Math.max(0, s.mastery.notice - dt);
    }
    tick.call(this, dt);
  };
  var spawn = P._spawnBoss;
  P._spawnBoss = function (id) {
    var b = spawn.call(this, id),
      s = this.state,
      p = s.player;
    b.masteryStart = s.timeElapsed || 0;
    b.masteryHits = s.mastery ? s.mastery.hits : 0;
    s.bossIntro = { time: 0, duration: s.practice ? 0.6 : 1.65, landed: false };
    s.bullets = [];
    s.particles = [];
    s.shake = 0;
    s.flash = 0;
    s.message = '';
    s.messageTimer = 0;
    p.x = Math.max(C.arena.gate, Math.min(Math.max(p.x, b.x - 260), b.x - p.w - 100));
    s.camera.x = Math.max(0, Math.min(this.worldWidth - 640, p.x - 230));
    p.y = 310 - p.h;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
    p.facing = 1;
    p.dashTime = 0;
    p.saberTime = 0;
    p.saberCombo = 0;
    p.shootPoseTime = 0;
    p.risingHold = 0;
    p.risingWind = 0;
    p.jumpBuffer = 0;
    this._clearMouse();
    if (s.mastery) {
      s.mastery.ready = 0;
      s.mastery.notice = 0;
      s.mastery.counterSerial = null;
    }
    return b;
  };
  var down = P._bossDown;
  P._bossDown = function (b) {
    var s = this.state,
      m = s.mastery,
      first = !b.down,
      before = s.player.hp;
    if (first && m) {
      var result = {
        id: b.id,
        name: b.name,
        time: Math.max(0.001, (s.timeElapsed || 0) - (b.masteryStart || 0)),
        hits: m.hits - (b.masteryHits || 0),
        difficulty: this.difficulty || 'normal',
        practice: !!s.practice
      };
      m.clears.push(result);
      this._emit('boss-record', result);
    }
    down.call(this, b);
    if (first && s.feedback && C.stage.kind === 'gauntlet' && !s.practice) {
      var next = C.stage.bosses[s.bossIndex + 1];
      s.feedback.recovery = {
        boss: b.id,
        healed: s.player.hp - before,
        hp: s.player.hp,
        maxHp: s.player.maxHp,
        next: next || null
      };
      s.feedback.hpTrail = s.player.hp;
      s.feedback.hpHold = 0;
    }
  };
  var next = P._nextBoss;
  P._nextBoss = function () {
    if (this.state.practice) {
      this.state.nextBossMarker = null;
      return false;
    }
    return next.call(this);
  };
  var wind = P._bossWind;
  P._bossWind = function (b, def, move) {
    wind.call(this, b, def, move);
    b.tellDuration = b.timer;
  };
  var beat = P._bossBeat;
  P._bossBeat = function (b, def) {
    var pr = this.state.practice;
    if (pr && pr.move) {
      b.beat = C.bossRoutine(def).findIndex(function (x) {
        return x.move === pr.move;
      });
      b.move = null;
      b.grounded = false;
      b.fly = !!b.flies;
      b.phaseOut = false;
      this._bossWind(b, def, pr.move);
      return;
    }
    return beat.call(this, b, def);
  };
  function enterArena(game) {
    if (C.stage.kind !== 'gauntlet') return;
    var s = game.state,
      p = s.player,
      A = C.arena;
    s.enemies = [];
    s.pickups = [];
    p.x = A.spawn + 24;
    p.y = 310 - p.h;
    p.onGround = true;
    s.bossIndex = 0;
    game._spawnBoss(C.stage.bosses[0]);
    s.camera.x = Math.max(0, p.x - 160);
  }
  var start = P.start;
  P.start = function (options) {
    start.call(this, options);
    enterArena(this);
  };
  P.startPractice = function (id, move) {
    var def = g.AstraBosses.get(id),
      valid = C.bossRoutine(def).some(function (x) {
        return x.move === move;
      });
    this.start({ stage: 'gauntlet', difficulty: this.difficulty || 'normal' });
    var s = this.state,
      A = C.arena,
      p = s.player;
    s.practice = { boss: def.id, move: valid ? move : null };
    s.enemies = [];
    s.pickups = [];
    s.bullets = [];
    s.particles = [];
    s.bossIndex = 0;
    var b = this._spawnBoss(def.id);
    p.x = Math.max(A.gate + 30, b.x - 180);
    p.y = 310 - p.h;
    p.onGround = true;
    s.camera.x = Math.max(0, p.x - 200);
    s.message = 'PRACTICE / R : RESTART';
    s.messageTimer = 2;
    this._clearMouse();
    this.input = {};
    this.keys = {};
    this.pressed = {};
  };
  P.restartPractice = function () {
    var p = this.state.practice;
    if (p) this.startPractice(p.boss, p.move);
  };
  var retry = P.retry;
  P.retry = function () {
    if (this.state.practice) {
      this.restartPractice();
      return;
    }
    if (this.state.mode !== 'dead') return;
    // a restart from the first boss is a new run, so the point to continue from goes
    this._rushSave = null;
    retry.call(this);
    if (this.state.mode === 'playing') enterArena(this);
  };
  // Small pure record update shared by the UI and regression tests. Difficulty is part of the key.
  function recordBoss(all, r) {
    if (r.practice) return null;
    var key = r.difficulty + ':' + r.id,
      old = all[key] || {},
      previous = old.bestTime;
    var fresh = {
      clears: (old.clears || 0) + 1,
      bestTime: previous === undefined ? r.time : Math.min(previous, r.time),
      noDamage: !!old.noDamage || r.hits === 0
    };
    all[key] = fresh;
    return { record: fresh, delta: previous === undefined ? null : r.time - previous };
  }
  g.AstraMastery = { hints: hints, recordBoss: recordBoss };
})(typeof window !== 'undefined' ? window : globalThis);
