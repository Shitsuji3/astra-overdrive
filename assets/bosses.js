/* The boss roster, as data. A stage names a boss by id; the engine reads the entry.

   What an entry controls:
     name / title   shown on the health bar and on the stage select
     hp / easyHp    armour on normal and on easy
     w / h          the body the player collides with. It is the machine's core, a little
                    larger than the player; the picture is drawn around it and hangs over
     sprite         its own artwork. Without one it borrows the shared frame, tinted by look
     look           a canvas filter for the shared frame, used only when there is no sprite
     routine        the four to six beats it loops forever; pool is derived from it
     tempo          multiplies every wind-up: below 1 is faster, above 1 is slower
     knobs          per-attack numbers, merged over the defaults below

   A beat is one step of the loop: { move, from, rest }.
     move   which attack to use, from the catalogue below
     from   where it walks to first: 'near' 95px, 'mid' 190px or 'far' 300px from the player
     rest   how long it stands still and open afterwards, in seconds

   The loop is the whole design. A boss walks to the spot its next attack wants, winds up,
   attacks, then stands still long enough to be punished. Reading the routine top to bottom
   tells you exactly what the fight is, and the rests are where the player gets their hits in.

   Attacks in the catalogue: volley, wave, dash, mortar, ring, slam, mines, wall.
   A boss with a short routine is not a weaker boss, it is a more readable one. */
(function (g) {
  'use strict';

  // Every knob the attacks read. An entry overrides only what makes it itself.
  var DEFAULTS = {
    volleyShots: 5, volleySpeed: 110, volleyStep: 25, volleyRise: -80, volleyFall: 40,
    waveSpeed: 240, waveRadius: 9, waveCount: 1,
    dashSpeed: 260, dashHold: .9,
    mortarShells: 3, mortarSpread: 72, mortarFlight: 1.2,
    ringShots: 10, ringSpeed: 175,
    slamLift: 430, slamTrack: 230, slamWave: 330,
    mineShells: 3, mineSpread: 90, mineFuse: 1.2, mineBurst: 5,
    wallRows: 6, wallSpeed: 230, wallStep: 34,
    // How fast it walks to the spot its next beat asks for. It only ever moves with a
    // destination; there is no wandering for its own sake.
    stepSpeed: 210
  };

  var ALL = ['volley', 'wave', 'dash', 'mortar', 'ring', 'slam', 'mines', 'wall'];

  var roster = [
    {
      id: 'warden', name: 'WARDEN', title: 'SIEGE FRAME', jp: '門番',
      blurb: '最初の門を塞ぐ機体。ひととおり何でもやる。',
      hp: 72, easyHp: 48, w: 34, h: 50, look: '',
      // Six beats, spread wide apart, with the longest rests in the game. This is where the
      // shape of every later fight is taught.
      routine: [
        { move: 'volley', from: 'far',  rest: .9 },
        { move: 'wave',   from: 'mid',  rest: .8 },
        { move: 'dash',   from: 'far',  rest: 1 },
        { move: 'mortar', from: 'far',  rest: .9 },
        { move: 'ring',   from: 'near', rest: 1 },
        { move: 'slam',   from: 'mid',  rest: 1.1 }
      ], tempo: 1
    },
    {
      id: 'tidebreaker', name: 'TIDEBREAKER', title: 'FLOOD FRAME', jp: '潮砕',
      blurb: '床を這う波と落下弾で足元を潰す。空中に逃げ場を作らせない。',
      hp: 84, easyHp: 56, w: 36, h: 52, sprite: 'assets/bosses/tidebreaker.webp', look: 'hue-rotate(155deg) saturate(1.15)',
      // Four beats that work the floor, then close in for the spread once you are cornered.
      routine: [
        { move: 'wave',   from: 'far',  rest: .8 },
        { move: 'mortar', from: 'far',  rest: .85 },
        { move: 'slam',   from: 'mid',  rest: 1 },
        { move: 'ring',   from: 'near', rest: .9 }
      ], tempo: 1.05,
      knobs: { waveCount: 2, waveSpeed: 215, mortarShells: 4, mortarSpread: 62, slamWave: 360, stepSpeed: 190 }
    },
    {
      id: 'coilhead', name: 'COILHEAD', title: 'ARC FRAME', jp: '磁頭',
      blurb: '弾幕の壁を張って距離を詰めてくる。隙間を読んで抜ける相手。',
      hp: 96, easyHp: 64, w: 34, h: 50, sprite: 'assets/bosses/coilhead.webp', look: 'hue-rotate(38deg) saturate(1.3) brightness(1.06)',
      // Five beats that walk you backwards: a wall, then a volley behind it, then the charge.
      routine: [
        { move: 'wall',   from: 'far',  rest: .7 },
        { move: 'volley', from: 'mid',  rest: .75 },
        { move: 'dash',   from: 'far',  rest: .9 },
        { move: 'mines',  from: 'mid',  rest: .8 },
        { move: 'ring',   from: 'near', rest: .85 }
      ], tempo: .95,
      knobs: { wallRows: 6, wallSpeed: 250, volleyShots: 6, ringShots: 12, stepSpeed: 240 }
    },
    {
      id: 'ashmaw', name: 'ASHMAW', title: 'CINDER FRAME', jp: '灰顎',
      blurb: '曲射と地雷で床を使えなくする。動きは重いが一発が痛い。',
      hp: 88, easyHp: 58, w: 38, h: 54, sprite: 'assets/bosses/ashmaw.webp', look: 'hue-rotate(-18deg) saturate(1.35) brightness(.95)',
      // Four heavy beats. It stays out at range and rains things down, and the rests are long
      // because each one hurts.
      routine: [
        { move: 'mortar', from: 'far',  rest: 1 },
        { move: 'mines',  from: 'far',  rest: 1 },
        { move: 'dash',   from: 'far',  rest: 1.1 },
        { move: 'slam',   from: 'mid',  rest: 1.2 }
      ], tempo: 1.15,
      knobs: { mortarShells: 5, mortarSpread: 58, mineShells: 4, mineBurst: 6, dashSpeed: 220, stepSpeed: 170 }
    },
    {
      id: 'nullpriest', name: 'NULLPRIEST', title: 'VOID FRAME', jp: '虚僧',
      blurb: '手数だけで押してくる。装甲は薄い。速く削れば何も撃たせない。',
      hp: 76, easyHp: 50, w: 32, h: 48, sprite: 'assets/bosses/nullpriest.webp', look: 'hue-rotate(232deg) saturate(1.25)',
      // Five quick beats from only three attacks: the same moves keep coming back from a
      // different distance, so what changes is where you have to be, not what is coming.
      routine: [
        { move: 'ring',   from: 'mid',  rest: .7 },
        { move: 'volley', from: 'far',  rest: .65 },
        { move: 'wall',   from: 'far',  rest: .7 },
        { move: 'volley', from: 'near', rest: .6 },
        { move: 'ring',   from: 'far',  rest: .8 }
      ], tempo: .72,
      knobs: { ringShots: 14, ringSpeed: 195, wallRows: 7, volleyShots: 7, volleyStep: 20, stepSpeed: 265 }
    },
    {
      id: 'gravelock', name: 'GRAVELOCK', title: 'ANVIL FRAME', jp: '重錠',
      blurb: '数は少ないが一つ一つが大きい。跳んで潰しに来る。',
      hp: 116, easyHp: 78, w: 44, h: 58, sprite: 'assets/bosses/gravelock.webp', look: 'hue-rotate(196deg) saturate(.55) brightness(.88)',
      // Four slow beats and the longest rests of any boss. It is the one you are meant to
      // out-wait rather than out-run.
      routine: [
        { move: 'slam',  from: 'mid',  rest: 1.3 },
        { move: 'wave',  from: 'far',  rest: 1.1 },
        { move: 'dash',  from: 'far',  rest: 1.2 },
        { move: 'slam',  from: 'near', rest: 1.4 }
      ], tempo: 1.25,
      knobs: { slamLift: 470, slamTrack: 260, slamWave: 380, waveRadius: 12, waveSpeed: 200, dashSpeed: 300, stepSpeed: 155 }
    },
    {
      id: 'sparkwidow', name: 'SPARKWIDOW', title: 'FILAMENT FRAME', jp: '火寡',
      blurb: '小さくて速い。突進と壁を休みなく繰り返す。',
      hp: 80, easyHp: 54, w: 30, h: 44, sprite: 'assets/bosses/sparkwidow.webp', look: 'hue-rotate(295deg) saturate(1.4) brightness(1.05)',
      // Six short beats. Nothing it does is heavy; the pressure is that the next thing is
      // already coming.
      routine: [
        { move: 'dash',   from: 'far',  rest: .65 },
        { move: 'volley', from: 'mid',  rest: .6 },
        { move: 'wall',   from: 'far',  rest: .65 },
        { move: 'dash',   from: 'near', rest: .7 },
        { move: 'mines',  from: 'mid',  rest: .65 },
        { move: 'volley', from: 'far',  rest: .75 }
      ], tempo: .65,
      knobs: { dashSpeed: 330, dashHold: .75, wallSpeed: 270, wallRows: 5, volleyShots: 4, mineShells: 2, stepSpeed: 300 }
    },
    {
      id: 'obsidian-crown', name: 'OBSIDIAN CROWN', title: 'GATE FRAME', jp: '黒冠',
      blurb: '八つすべてを使う最後の機体。休みも短い。',
      hp: 132, easyHp: 88, w: 40, h: 56, sprite: 'assets/bosses/obsidian-crown.webp', look: 'saturate(.35) brightness(1.18) contrast(1.1)',
      // Six beats drawn from the whole catalogue, at every distance, with rests short enough
      // to need using properly.
      routine: [
        { move: 'volley', from: 'far',  rest: .7 },
        { move: 'wall',   from: 'far',  rest: .65 },
        { move: 'dash',   from: 'far',  rest: .8 },
        { move: 'ring',   from: 'near', rest: .75 },
        { move: 'mortar', from: 'far',  rest: .7 },
        { move: 'slam',   from: 'mid',  rest: .85 }
      ], tempo: .8,
      knobs: { volleyShots: 6, ringShots: 12, mortarShells: 4, wallRows: 7, slamWave: 350, stepSpeed: 255 }
    }
  ];

  var byId = {};
  roster.forEach(function (b, i) {
    b.number = i + 1;
    b.knobs = b.knobs || {};
    // The pool is not a second list to keep in step with the routine: it is read off it, so
    // the two can never disagree about what a boss actually does.
    b.pool = [];
    b.routine.forEach(function (beat) {
      if (b.pool.indexOf(beat.move) < 0) b.pool.push(beat.move);
    });
    // resolved once, so the engine never has to reach for a default mid-fight
    b.tuning = {};
    for (var k in DEFAULTS) b.tuning[k] = b.knobs[k] === undefined ? DEFAULTS[k] : b.knobs[k];
    byId[b.id] = b;
  });

  g.AstraBosses = {
    list: roster,
    catalogue: ALL,
    defaults: DEFAULTS,
    first: roster[0].id,
    // Falls back to the opening boss rather than throwing, so a bad id cannot brick a stage.
    get: function (id) { return byId[id] || roster[0]; },
    has: function (id) { return !!byId[id]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
