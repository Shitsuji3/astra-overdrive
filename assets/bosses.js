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
     flies          { cruise }: it lives in the air, cruise px over the floor, and only lands when a
                    move brings it down
     knobs          per-attack numbers, merged over the defaults below

   A beat is one step of the loop: { move, from, rest }.
     move   which attack to use, from the catalogue below
     from   where it walks to first: 'near' 95px, 'mid' 190px or 'far' 300px from the player
     rest   how long it stands still and open afterwards, in seconds

   The loop is the whole design. A boss walks to the spot its next attack wants, winds up,
   attacks, then stands still long enough to be punished. Reading the routine top to bottom
   tells you exactly what the fight is, and the rests are where the player gets their hits in.

   Every boss fights with moves drawn from its own body (game.js, BOSS_MOVES):
     WARDEN      pincer, cannon, clawrush, quake        TIDEBREAKER  geyser, crescent, leapslash, rain
     COILHEAD    needles, arcbolt, swoop, dive          ASHMAW       breath, eruption, tackle, bite
     NULLPRIEST  voidstep, crossorb, voidring, tailbeam GRAVELOCK    stomp, hornflip, anvil
     SPARKWIDOW  sawrush, sawtoss, embers, swing        OBSIDIAN CROWN  crownbeam, barrage, tailspin, pounce
   The classic catalogue - volley, wave, dash, mortar, ring, slam, mines, wall - is still in the engine
   and still measured, but no routine uses it.
   A boss with a short routine is not a weaker boss, it is a more readable one. */
(function (g) {
  'use strict';

  // Every knob the attacks read. An entry overrides only what makes it itself.
  var DEFAULTS = {
    volleyShots: 5,
    volleySpeed: 110,
    volleyStep: 25,
    volleyRise: -80,
    volleyFall: 40,
    waveSpeed: 240,
    waveRadius: 9,
    waveCount: 1,
    dashSpeed: 260,
    dashHold: 0.9,
    mortarShells: 3,
    mortarSpread: 72,
    mortarFlight: 1.2,
    ringShots: 10,
    ringSpeed: 175,
    slamLift: 430,
    slamTrack: 230,
    slamWave: 330,
    mineShells: 3,
    mineSpread: 90,
    mineFuse: 1.2,
    mineBurst: 5,
    wallRows: 6,
    wallSpeed: 230,
    wallStep: 34,
    // How fast it walks to the spot its next beat asks for. It only ever moves with a
    // destination; there is no wandering for its own sake.
    stepSpeed: 210
  };

  var ALL = [
    'volley',
    'wave',
    'dash',
    'mortar',
    'ring',
    'slam',
    'mines',
    'wall',
    'dive',
    'swing',
    'swoop',
    'pincer',
    'cannon',
    'clawrush',
    'quake',
    'geyser',
    'crescent',
    'leapslash',
    'rain',
    'needles',
    'arcbolt',
    'breath',
    'eruption',
    'tackle',
    'bite',
    'voidstep',
    'crossorb',
    'voidring',
    'tailbeam',
    'hornflip',
    'stomp',
    'anvil',
    'sawrush',
    'sawtoss',
    'embers',
    'crownbeam',
    'barrage',
    'tailspin',
    'pounce'
  ];

  var roster = [
    {
      id: 'warden',
      name: 'WARDEN',
      title: 'SIEGE FRAME',
      jp: '門番',
      blurb: '最初の門を塞ぐ蟹型の攻城機。左右から閉じる鋏の衝撃波、腕の砲、鋏の突進、叩きつけで岩を落とす。',
      hp: 72,
      easyHp: 48,
      w: 34,
      h: 50,
      look: '',
      // Four beats of the siege crab, spread wide apart, with the longest rests in the game. This is
      // where the shape of every later fight is taught: jump the cannon's slugs, jump the gate's shocks,
      // get out of the rush, step off the rock marks.
      routine: [
        { move: 'cannon', from: 'far', rest: 1 },
        { move: 'pincer', from: 'mid', rest: 1.1 },
        { move: 'clawrush', from: 'far', rest: 1 },
        { move: 'quake', from: 'mid', rest: 1.1 }
      ],
      tempo: 1
    },
    {
      id: 'tidebreaker',
      name: 'TIDEBREAKER',
      title: 'FLOOD FRAME',
      jp: '潮砕',
      blurb: '潮を操る蟷螂。鎌を叩きつけて水柱を立て、低い刃と高い刃を投げ、相手を跳び越えて斬り下ろす。',
      hp: 84,
      easyHp: 56,
      w: 36,
      h: 52,
      sprite: 'assets/bosses/tidebreaker.webp',
      look: 'hue-rotate(155deg) saturate(1.15)',
      // Five beats of the mantis: water up from the floor, blades low and high, a leap over your head
      // and a rain of drops, then the blades again from further out.
      routine: [
        { move: 'geyser', from: 'far', rest: 1 },
        { move: 'crescent', from: 'mid', rest: 0.85 },
        { move: 'leapslash', from: 'mid', rest: 1 },
        { move: 'rain', from: 'far', rest: 0.9 },
        { move: 'crescent', from: 'far', rest: 0.85 }
      ],
      tempo: 1.05,
      knobs: {
        waveCount: 2,
        waveSpeed: 215,
        mortarShells: 4,
        mortarSpread: 62,
        slamWave: 360,
        stepSpeed: 190
      }
    },
    {
      id: 'coilhead',
      name: 'COILHEAD',
      title: 'ARC FRAME',
      jp: '磁頭',
      blurb:
        '宙を飛ぶ蜂。尾から毒針を撃ち、雷を三点に落とし、低く滑空して突っ込む。降りてくるのは毒針で急降下した時だけ。',
      hp: 96,
      easyHp: 64,
      w: 34,
      h: 50,
      sprite: 'assets/bosses/coilhead.webp',
      look: 'hue-rotate(38deg) saturate(1.3) brightness(1.06)',
      // It flies. Ninety pixels up it clears a standing player's head and stays in reach of a jump; every
      // attack comes from the air, its charge is a low swoop, and only the dive brings it down.
      flies: { cruise: 90 },
      // Five beats from the air: needles from the tail, lightning called down around you, the low swoop,
      // needles again, and last the dive, the one time it comes down.
      routine: [
        { move: 'needles', from: 'far', rest: 0.75 },
        { move: 'arcbolt', from: 'mid', rest: 0.8 },
        { move: 'swoop', from: 'far', rest: 0.9 },
        { move: 'needles', from: 'mid', rest: 0.75 },
        { move: 'dive', from: 'mid', rest: 0.9 }
      ],
      tempo: 0.95,
      knobs: { wallRows: 6, wallSpeed: 250, volleyShots: 6, ringShots: 12, stepSpeed: 240 }
    },
    {
      id: 'ashmaw',
      name: 'ASHMAW',
      title: 'CINDER FRAME',
      jp: '灰顎',
      blurb: '灰と炎の獣。床を焼く火炎を吐き、背の噴出口から溶岩を降らせ、重い突進と噛みつきで押し潰す。',
      hp: 88,
      easyHp: 58,
      w: 38,
      h: 54,
      sprite: 'assets/bosses/ashmaw.webp',
      look: 'hue-rotate(-18deg) saturate(1.35) brightness(.95)',
      // Four heavy beats of the cinder beast. Fire along the floor, molten rocks that leave it burning, a
      // long charge and a bite, and the rests are long because each one hurts.
      routine: [
        { move: 'breath', from: 'mid', rest: 1.1 },
        { move: 'eruption', from: 'far', rest: 1 },
        { move: 'tackle', from: 'far', rest: 1.2 },
        { move: 'bite', from: 'near', rest: 1 }
      ],
      tempo: 1.15,
      knobs: {
        mortarShells: 5,
        mortarSpread: 58,
        mineShells: 4,
        mineBurst: 6,
        dashSpeed: 220,
        stepSpeed: 170
      }
    },
    {
      id: 'nullpriest',
      name: 'NULLPRIEST',
      title: 'VOID FRAME',
      jp: '虚僧',
      blurb:
        '虚ろな蠍。消えて背後に回り尾で刺し、割れる虚空弾と二重の輪、床を這う尾の光線で押してくる。装甲は薄い。',
      hp: 76,
      easyHp: 50,
      w: 32,
      h: 48,
      sprite: 'assets/bosses/nullpriest.webp',
      look: 'hue-rotate(232deg) saturate(1.25)',
      // Five quick beats of the void scorpion. The step behind you comes back twice, so what changes is
      // where it reappears, not what is coming.
      routine: [
        { move: 'crossorb', from: 'mid', rest: 0.7 },
        { move: 'voidstep', from: 'near', rest: 0.65 },
        { move: 'voidring', from: 'far', rest: 0.7 },
        { move: 'tailbeam', from: 'far', rest: 0.6 },
        { move: 'voidstep', from: 'mid', rest: 0.8 }
      ],
      tempo: 0.72,
      knobs: { ringShots: 14, ringSpeed: 195, wallRows: 7, volleyShots: 7, volleyStep: 20, stepSpeed: 265 }
    },
    {
      id: 'gravelock',
      name: 'GRAVELOCK',
      title: 'ANVIL FRAME',
      jp: '重錠',
      blurb: '角を持つ重い甲虫。二度の踏み鳴らしで床を揺らし、角でかち上げ、大跳躍で真上から潰しに来る。',
      hp: 116,
      easyHp: 78,
      w: 44,
      h: 58,
      sprite: 'assets/bosses/gravelock.webp',
      look: 'hue-rotate(196deg) saturate(.55) brightness(.88)',
      // Four slow beats of the anvil beetle and the longest rests of any boss. It is the one you are meant
      // to out-wait rather than out-run.
      routine: [
        { move: 'stomp', from: 'mid', rest: 1.3 },
        { move: 'hornflip', from: 'far', rest: 1.2 },
        { move: 'anvil', from: 'near', rest: 1.4 },
        { move: 'hornflip', from: 'far', rest: 1.2 }
      ],
      tempo: 1.25,
      knobs: {
        slamLift: 470,
        slamTrack: 260,
        slamWave: 380,
        waveRadius: 12,
        waveSpeed: 200,
        dashSpeed: 300,
        stepSpeed: 155
      }
    },
    {
      id: 'sparkwidow',
      name: 'SPARKWIDOW',
      title: 'FILAMENT FRAME',
      jp: '火寡',
      blurb:
        '丸鋸の蜘蛛。小さくて速い。丸鋸で床を駆け、戻ってくる丸鋸を投げ、背の煙突から火の粉を降らせ、天井の糸で振り子のように横切る。',
      hp: 80,
      easyHp: 54,
      w: 30,
      h: 44,
      sprite: 'assets/bosses/sparkwidow.webp',
      look: 'hue-rotate(295deg) saturate(1.4) brightness(1.05)',
      // Six short beats of the saw spider. Nothing it does is heavy; the pressure is that the next thing
      // is already coming. It runs and swings once each and throws from where it stands the rest of the time.
      routine: [
        { move: 'sawrush', from: 'far', rest: 0.65 },
        { move: 'sawtoss', from: 'mid', rest: 0.7 },
        { move: 'embers', from: 'mid', rest: 0.6 },
        { move: 'swing', from: 'far', rest: 0.75 },
        { move: 'sawtoss', from: 'far', rest: 0.7 },
        { move: 'embers', from: 'far', rest: 0.65 }
      ],
      tempo: 0.65,
      knobs: {
        dashSpeed: 330,
        dashHold: 0.75,
        wallSpeed: 270,
        wallRows: 5,
        volleyShots: 4,
        mineShells: 2,
        stepSpeed: 300
      }
    },
    {
      id: 'obsidian-crown',
      name: 'OBSIDIAN CROWN',
      title: 'GATE FRAME',
      jp: '黒冠',
      blurb:
        '最後の門を守る機竜。背の砲で頭の高さと足元を二段に薙ぎ、上下に撃ち分け、尾を回して飛びかかる。休みも短い。',
      hp: 132,
      easyHp: 88,
      w: 40,
      h: 56,
      sprite: 'assets/bosses/obsidian-crown.webp',
      look: 'saturate(.35) brightness(1.18) contrast(1.1)',
      // Six beats of the gate dragon, at every distance, with rests short enough to need using properly:
      // shells low then high, the two beams - stay down, then jump - the tail, the pounce.
      routine: [
        { move: 'barrage', from: 'far', rest: 0.7 },
        { move: 'crownbeam', from: 'far', rest: 0.65 },
        { move: 'tailspin', from: 'near', rest: 0.8 },
        { move: 'pounce', from: 'mid', rest: 0.75 },
        { move: 'barrage', from: 'far', rest: 0.7 },
        { move: 'crownbeam', from: 'mid', rest: 0.85 }
      ],
      tempo: 0.8,
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
    get: function (id) {
      return byId[id] || roster[0];
    },
    has: function (id) {
      return !!byId[id];
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
