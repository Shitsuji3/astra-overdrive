/* Every stage the game can run, as data. The engine reads these; it holds no layout of its own.
   Adding a stage means adding an entry here and nothing else.

   Shape of an entry:
     id          stable key used by the stage select and by saved records
     name        shown on the select screen and in the HUD sector readout
     subtitle    one line of flavour on the select screen
     blurb       what the player is walking into
     worldWidth  right-hand limit of the run
     spawn       where the player starts
     arena       the boss enclosure: gate is the point of no return, bossX where he stands
     bosses      ids from assets/bosses.js, fought in this order; a run stage names one
     kind        'run' walks a long stage to a gate; 'gauntlet' is an arena and nothing else
     site        where this mission sits on the select screen's map, in its 900x230 frame
     checkpoints {at} is the x that arms it, {x} is where a retry puts the player
     sections    HUD sector names, in order, each running until {to}
     hints       the prompts along the opening, each shown until {to}
     pickups     hand-placed health and energy
     build       lays the floors, ledges and enemies down through the helpers it is given

   Distances that the layouts are built around, measured from the movement constants:
     a running jump clears 149px of gap and rises 84px
     a dash jump clears 208px
     so any gap wider than 149 carries a ledge across its middle */
(function (g) {
  'use strict';

  // A stair is a run of ledges 190px apart. Consecutive tops must differ by no more than the
  // 84px jump height, which makes every step reachable from the one below by construction.
  // Laying climbs this way keeps the audit honest without hand-checking each ledge.
  function stair(add, x, tops, w) {
    w = w || 120;
    tops.forEach(function (top, i) {
      add(x + i * 190, top, w, 18);
    });
  }

  var stages = [
    {
      id: 'signal-yard',
      site: { x: 96, y: 104 },
      name: 'SIGNAL YARD',
      subtitle: '軌道都市 外縁',
      blurb: '最終防衛線の入口。工廠の谷を抜けてゲートへ。',
      worldWidth: 9600,
      spawn: { x: 54, y: 270 },
      arena: { gate: 8950, checkpoint: 8930, spawn: 9020, bossX: 9270, bossMin: 8990, bossMax: 9430 },
      kind: 'run',
      bosses: ['warden'],
      checkpoints: [
        { at: 2520, x: 2700 },
        { at: 4700, x: 4850 },
        { at: 6300, x: 6450 },
        { at: 7950, x: 8100 },
        { at: 8950, x: 8930, heal: true }
      ],
      sections: [
        { to: 800, name: 'SIGNAL YARD' },
        { to: 3600, name: 'COOLANT WORKS' },
        { to: 5450, name: 'CONVEYOR SPAN' },
        { to: 6990, name: 'SLAG CHANNEL' },
        { to: 8350, name: 'CATWALK GRID' },
        { name: 'OBSIDIAN GATE' }
      ],
      hints: [
        { to: 350, text: 'MOVE A/D  •  JUMP SPACE' },
        { to: 650, text: 'J FIRE  •  HOLD/RELEASE CHARGE' },
        { to: 1000, text: 'SHIFT DASH  •  JUMP THE GAP' },
        { to: 1800, text: 'K SABER  •  WALL + JUMP' }
      ],
      pickups: [
        { x: 700, y: 275, type: 'health' },
        { x: 1510, y: 220, type: 'energy' },
        { x: 2390, y: 220, type: 'health' },
        { x: 3330, y: 205, type: 'energy' },
        { x: 4400, y: 275, type: 'health' },
        { x: 5240, y: 215, type: 'energy' },
        { x: 6180, y: 145, type: 'health' },
        { x: 7480, y: 220, type: 'energy' },
        { x: 8630, y: 160, type: 'health' }
      ],
      build: function (add, e) {
        // SIGNAL YARD and COOLANT WORKS keep their tuned opening. The run then continues through
        // CONVEYOR SPAN, SLAG CHANNEL and CATWALK GRID before reaching the gate.
        add(0, 310, 760, 50, 'floor');
        add(860, 310, 760, 50, 'floor');
        add(1720, 310, 830, 50, 'floor');
        add(2670, 310, 700, 50, 'floor');
        add(3520, 310, 520, 50, 'floor');
        add(4170, 310, 450, 50, 'floor');
        add(4795, 310, 605, 50, 'floor');
        add(5520, 310, 700, 50, 'floor');
        add(6385, 310, 555, 50, 'floor');
        add(7065, 310, 535, 50, 'floor');
        add(7785, 310, 465, 50, 'floor');
        add(8390, 310, 1210, 50, 'floor');
        // Low ledges bridge the gaps that are too wide for a plain running jump.
        add(2550, 295, 120, 15, 'platform');
        add(3400, 295, 100, 15, 'platform');
        add(4470, 295, 150, 15, 'platform');
        add(5455, 295, 110, 15, 'platform');
        add(6255, 295, 120, 15, 'platform');
        add(7620, 295, 130, 15, 'platform');
        add(8265, 295, 120, 15, 'platform');
        add(9080, 245, 90, 14, 'platform');
        add(9350, 245, 95, 14, 'platform');
        [
          [170, 245, 120],
          [390, 190, 150],
          [610, 250, 100],
          [960, 235, 130],
          [1190, 175, 150],
          [1390, 250, 130],
          [1830, 235, 150],
          [2070, 165, 130],
          [2290, 245, 160],
          [2780, 220, 150],
          [3040, 150, 130],
          [3260, 245, 130],
          [3650, 230, 140],
          [3910, 170, 160],
          [4210, 245, 150],
          [4450, 190, 150],
          [4680, 245, 90],
          [4880, 185, 120],
          [5090, 240, 110],
          [5290, 175, 130],
          [5560, 245, 120],
          [5790, 180, 110],
          [6010, 235, 120],
          [6180, 165, 110],
          [6420, 250, 120],
          [6620, 185, 110],
          [6820, 240, 120],
          [7100, 245, 120],
          [7300, 180, 110],
          [7500, 240, 130],
          [7700, 185, 120],
          [7920, 250, 120],
          [8110, 190, 130],
          [8420, 245, 140],
          [8650, 180, 130],
          [8880, 245, 120]
        ].forEach(function (a) {
          add(a[0], a[1], a[2], 18);
        });
        e('walker', 420, 276);
        e('drone', 630, 200);
        e('drone', 510, 120);
        e('walker', 1040, 276);
        e('turret', 1330, 276);
        e('drone', 1880, 110);
        e('walker', 2200, 276);
        e('turret', 2460, 276);
        e('drone', 2880, 115);
        e('walker', 3140, 276);
        e('turret', 3320, 276);
        e('drone', 3830, 125);
        e('walker', 4270, 276);
        e('turret', 4360, 276);
        e('drone', 4900, 150);
        e('walker', 5150, 276);
        e('turret', 5340, 276);
        e('drone', 5760, 125);
        e('walker', 6060, 276);
        e('turret', 6440, 276);
        e('drone', 6640, 150);
        e('walker', 6870, 276);
        e('turret', 7220, 276);
        e('drone', 7520, 135);
        e('walker', 7900, 276);
        e('turret', 8180, 276);
        e('drone', 8560, 140);
        e('walker', 8820, 276);
      }
    },

    {
      id: 'tidal-refinery',
      site: { x: 180, y: 178 },
      name: 'TIDAL REFINERY',
      subtitle: '潮汐精製区',
      blurb: '塔の上へ登らされる区画。ドローンが多く、足場は高い。',
      worldWidth: 8800,
      spawn: { x: 54, y: 270 },
      arena: { gate: 8150, checkpoint: 8130, spawn: 8220, bossX: 8470, bossMin: 8190, bossMax: 8630 },
      kind: 'run',
      bosses: ['tidebreaker'],
      checkpoints: [
        { at: 2150, x: 2300 },
        { at: 4150, x: 4300 },
        { at: 6100, x: 6250 },
        { at: 8150, x: 8130, heal: true }
      ],
      sections: [
        { to: 1500, name: 'INTAKE DECK' },
        { to: 3300, name: 'BRINE STACKS' },
        { to: 5100, name: 'VAPOUR WALK' },
        { to: 6900, name: 'TURBINE ROW' },
        { to: 8150, name: 'SPILLWAY' },
        { name: 'TIDE GATE' }
      ],
      hints: [{ to: 420, text: 'CLIMB  •  高い足場を使え' }],
      pickups: [
        { x: 620, y: 200, type: 'health' },
        { x: 1870, y: 185, type: 'energy' },
        { x: 2960, y: 165, type: 'health' },
        { x: 3880, y: 210, type: 'energy' },
        { x: 5020, y: 150, type: 'health' },
        { x: 6050, y: 195, type: 'energy' },
        { x: 7160, y: 160, type: 'health' },
        { x: 7960, y: 230, type: 'energy' }
      ],
      build: function (add, e) {
        // Floors sit in long runs with four gaps too wide to jump, each carrying a ledge.
        add(0, 310, 700, 50, 'floor');
        add(820, 310, 680, 50, 'floor');
        add(1660, 310, 740, 50, 'floor');
        add(2530, 310, 620, 50, 'floor');
        add(3330, 310, 650, 50, 'floor');
        add(4100, 310, 660, 50, 'floor');
        add(4930, 310, 670, 50, 'floor');
        add(5720, 310, 730, 50, 'floor');
        add(6630, 310, 650, 50, 'floor');
        add(7400, 310, 1400, 50, 'floor');
        add(1520, 295, 120, 15, 'platform');
        add(3180, 295, 120, 15, 'platform');
        add(4790, 295, 120, 15, 'platform');
        add(6480, 295, 120, 15, 'platform');
        add(8280, 245, 95, 14, 'platform');
        add(8560, 245, 95, 14, 'platform');
        // The climb: each stack steps up to a high catwalk, then drops back to the floor.
        [
          [150, 250, 110],
          [330, 195, 120],
          [530, 235, 110],
          [880, 245, 120],
          [1080, 185, 110],
          [1270, 240, 120],
          [1700, 250, 120],
          [1900, 190, 120],
          [2090, 235, 110],
          [2260, 165, 120],
          [2580, 245, 120],
          [2780, 185, 110],
          [2960, 225, 120],
          [3380, 250, 110],
          [3560, 190, 120],
          [3760, 235, 110],
          [3930, 165, 100],
          [4140, 245, 120],
          [4340, 185, 110],
          [4530, 240, 120],
          [4970, 250, 110],
          [5150, 190, 120],
          [5350, 230, 110],
          [5520, 160, 110],
          [5760, 245, 120],
          [5960, 185, 120],
          [6160, 240, 110],
          [6330, 175, 100],
          [6670, 250, 120],
          [6870, 190, 110],
          [7060, 235, 120],
          [7230, 165, 110],
          [7440, 245, 130],
          [7660, 185, 120],
          [7880, 240, 120],
          [8060, 180, 110]
        ].forEach(function (a) {
          add(a[0], a[1], a[2], 18);
        });
        e('walker', 380, 276);
        e('drone', 560, 150);
        e('drone', 300, 105);
        e('turret', 900, 276);
        e('drone', 1120, 130);
        e('walker', 1320, 276);
        e('drone', 1760, 140);
        e('walker', 1950, 276);
        e('drone', 2130, 110);
        e('turret', 2320, 276);
        e('walker', 2650, 276);
        e('drone', 2830, 125);
        e('turret', 3010, 276);
        e('drone', 3420, 135);
        e('walker', 3620, 276);
        e('drone', 3800, 110);
        e('turret', 3960, 276);
        e('walker', 4210, 276);
        e('drone', 4390, 125);
        e('turret', 4580, 276);
        e('drone', 5010, 140);
        e('walker', 5200, 276);
        e('drone', 5390, 105);
        e('turret', 5570, 276);
        e('walker', 5820, 276);
        e('drone', 6010, 125);
        e('turret', 6210, 276);
        e('drone', 6380, 115);
        e('walker', 6730, 276);
        e('drone', 6920, 130);
        e('turret', 7110, 276);
        e('drone', 7280, 110);
        e('walker', 7500, 276);
        e('drone', 7710, 125);
        e('turret', 7930, 276);
      }
    },

    {
      id: 'magnet-spine',
      site: { x: 238, y: 60 },
      name: 'MAGNET SPINE',
      subtitle: '磁束背稜',
      blurb: '砲座が並ぶ尾根。撃たれながら渡る区画。守りは最も厚い。',
      worldWidth: 10400,
      spawn: { x: 54, y: 270 },
      arena: { gate: 9700, checkpoint: 9680, spawn: 9770, bossX: 10020, bossMin: 9740, bossMax: 10180 },
      kind: 'run',
      bosses: ['coilhead'],
      checkpoints: [
        { at: 2400, x: 2680 },
        { at: 4500, x: 4660 },
        { at: 6600, x: 6960 },
        { at: 8500, x: 8660 },
        { at: 9700, x: 9680, heal: true }
      ],
      sections: [
        { to: 1700, name: 'RAIL HEAD' },
        { to: 3600, name: 'COIL TERRACE' },
        { to: 5500, name: 'FLUX BRIDGE' },
        { to: 7400, name: 'GUN LINE' },
        { to: 9700, name: 'SPINE CREST' },
        { name: 'CORE GATE' }
      ],
      hints: [{ to: 460, text: 'SABER DEFLECTS  •  弾は斬れる' }],
      pickups: [
        { x: 600, y: 200, type: 'health' },
        { x: 1920, y: 175, type: 'energy' },
        { x: 3040, y: 205, type: 'health' },
        { x: 4060, y: 130, type: 'energy' },
        { x: 5240, y: 215, type: 'health' },
        { x: 6320, y: 170, type: 'energy' },
        { x: 7420, y: 200, type: 'health' },
        { x: 8030, y: 140, type: 'energy' },
        { x: 9420, y: 225, type: 'health' }
      ],
      build: function (add, e) {
        add(0, 310, 720, 50, 'floor');
        add(840, 310, 700, 50, 'floor');
        add(1700, 310, 760, 50, 'floor');
        add(2600, 310, 700, 50, 'floor');
        add(3440, 310, 720, 50, 'floor');
        add(4300, 310, 700, 50, 'floor');
        add(5150, 310, 740, 50, 'floor');
        add(6030, 310, 700, 50, 'floor');
        add(6880, 310, 720, 50, 'floor');
        add(7740, 310, 700, 50, 'floor');
        add(8580, 310, 680, 50, 'floor');
        add(9400, 310, 1000, 50, 'floor');
        // seven crossings are wider than a running jump and get a ledge over the middle
        add(1580, 295, 110, 15, 'platform');
        add(2490, 295, 110, 15, 'platform');
        add(3330, 295, 110, 15, 'platform');
        add(4190, 295, 110, 15, 'platform');
        add(5030, 295, 110, 15, 'platform');
        add(5930, 295, 110, 15, 'platform');
        add(6780, 295, 110, 15, 'platform');
        add(7630, 295, 110, 15, 'platform');
        add(8470, 295, 110, 15, 'platform');
        add(9300, 295, 110, 15, 'platform');
        add(9830, 245, 95, 14, 'platform');
        add(10110, 245, 95, 14, 'platform');
        // The rhythm changes slab to slab: a two-step here, a three-step tower there, and a
        // couple of bare stretches where the only cover is the floor itself.
        [
          [150, 250, 120],
          [340, 200, 110],
          [520, 245, 120],
          [900, 245, 130],
          [1120, 185, 110],
          [1330, 240, 120],
          [1740, 250, 120],
          [1930, 205, 110],
          [2120, 160, 100],
          [2320, 235, 120],
          [2660, 245, 140],
          [2900, 195, 120],
          [3480, 250, 120],
          [3670, 200, 110],
          [3860, 245, 120],
          [4030, 175, 100],
          [4340, 240, 130],
          [4560, 180, 110],
          [4800, 250, 120],
          [5200, 250, 110],
          [5370, 205, 120],
          [5560, 155, 100],
          [5760, 240, 120],
          [6080, 245, 130],
          [6300, 190, 110],
          [6930, 250, 120],
          [7120, 200, 110],
          [7310, 245, 130],
          [7480, 165, 100],
          [7790, 240, 120],
          [8000, 185, 110],
          [8210, 250, 120],
          [8630, 250, 130],
          [8850, 195, 110],
          [9060, 240, 120],
          [9220, 170, 100],
          [9450, 245, 130],
          [9640, 185, 110]
        ].forEach(function (a) {
          add(a[0], a[1], a[2], 18);
        });
        e('walker', 400, 276);
        e('turret', 620, 276);
        e('drone', 300, 120);
        e('turret', 960, 276);
        e('drone', 1140, 125);
        e('walker', 1360, 276);
        e('turret', 1520, 276);
        e('walker', 1820, 276);
        e('drone', 2010, 130);
        e('turret', 2220, 276);
        e('drone', 2390, 110);
        e('turret', 2720, 276);
        e('walker', 2920, 276);
        e('drone', 3110, 120);
        e('turret', 3290, 276);
        e('walker', 3560, 276);
        e('turret', 3760, 276);
        e('drone', 3950, 125);
        e('turret', 4120, 276);
        e('drone', 4410, 130);
        e('walker', 4620, 276);
        e('turret', 4820, 276);
        e('drone', 4980, 110);
        e('turret', 5270, 276);
        e('walker', 5470, 276);
        e('drone', 5660, 125);
        e('turret', 5840, 276);
        e('walker', 6150, 276);
        e('turret', 6350, 276);
        e('drone', 6540, 120);
        e('turret', 6710, 276);
        e('drone', 7000, 130);
        e('walker', 7200, 276);
        e('turret', 7390, 276);
        e('drone', 7560, 110);
        e('turret', 7860, 276);
        e('walker', 8060, 276);
        e('drone', 8250, 125);
        e('turret', 8420, 276);
        e('walker', 8700, 276);
        e('turret', 8900, 276);
        e('drone', 9090, 120);
        e('turret', 9260, 276);
        e('walker', 9520, 276);
        e('drone', 9700, 130);
      }
    },
    {
      id: 'cinder-flats',
      site: { x: 368, y: 194 },
      name: 'CINDER FLATS',
      subtitle: '灰の平地',
      blurb: '見通しのいい平地。曲射と地雷が降ってくるので、立ち止まれない。',
      worldWidth: 9200,
      spawn: { x: 54, y: 270 },
      arena: { gate: 8550, checkpoint: 8530, spawn: 8620, bossX: 8870, bossMin: 8590, bossMax: 9030 },
      bosses: ['ashmaw'],
      checkpoints: [
        { at: 2500, x: 2800 },
        { at: 4300, x: 4600 },
        { at: 6100, x: 6400 },
        { at: 8550, x: 8530, heal: true }
      ],
      sections: [
        { to: 1700, name: 'ASH GATE' },
        { to: 3500, name: 'SLAG FLATS' },
        { to: 5300, name: 'EMBER LINE' },
        { to: 7050, name: 'CINDER WALK' },
        { to: 8550, name: 'BURN YARD' },
        { name: 'MAW' }
      ],
      hints: [{ to: 440, text: 'KEEP MOVING  •  落ちてくる' }],
      pickups: [
        { x: 600, y: 200, type: 'health' },
        { x: 1450, y: 200, type: 'energy' },
        { x: 2400, y: 205, type: 'health' },
        { x: 3250, y: 200, type: 'energy' },
        { x: 4210, y: 200, type: 'health' },
        { x: 5060, y: 200, type: 'energy' },
        { x: 6000, y: 200, type: 'health' },
        { x: 6850, y: 200, type: 'energy' },
        { x: 7760, y: 200, type: 'health' },
        { x: 8150, y: 205, type: 'energy' }
      ],
      build: function (add, e) {
        add(0, 310, 820, 50, 'floor');
        add(950, 310, 750, 50, 'floor');
        add(1870, 310, 730, 50, 'floor');
        add(2720, 310, 780, 50, 'floor');
        add(3675, 310, 725, 50, 'floor');
        add(4530, 310, 770, 50, 'floor');
        add(5465, 310, 735, 50, 'floor');
        add(6320, 310, 730, 50, 'floor');
        add(7230, 310, 720, 50, 'floor');
        add(8080, 310, 1120, 50, 'floor');
        add(1725, 295, 120, 15, 'platform');
        add(3527, 295, 120, 15, 'platform');
        add(5322, 295, 120, 15, 'platform');
        add(7080, 295, 120, 15, 'platform');
        add(8700, 245, 95, 14, 'platform');
        add(8960, 245, 95, 14, 'platform');
        // low and open: the climbs are short, so there is nowhere to wait out a barrage
        stair(add, 120, [250, 200]);
        stair(add, 560, [245, 175]);
        stair(add, 1000, [250, 195]);
        stair(add, 1420, [245, 180]);
        stair(add, 1910, [250, 200]);
        add(2380, 250, 120, 18);
        stair(add, 2760, [245, 190]);
        stair(add, 3220, [245, 170]);
        stair(add, 3720, [250, 195]);
        add(4180, 245, 130, 18);
        stair(add, 4570, [250, 190]);
        stair(add, 5030, [245, 165]);
        stair(add, 5510, [250, 200]);
        add(5970, 245, 130, 18);
        stair(add, 6360, [250, 190]);
        stair(add, 6820, [245, 170]);
        stair(add, 7270, [250, 195]);
        add(7730, 245, 130, 18);
        stair(add, 8120, [250, 190]);
        e('walker', 400, 276);
        e('drone', 620, 150);
        e('turret', 700, 276);
        e('walker', 1100, 276);
        e('drone', 1350, 130);
        e('turret', 1600, 276);
        e('walker', 2000, 276);
        e('drone', 2250, 140);
        e('turret', 2480, 276);
        e('walker', 2900, 276);
        e('drone', 3100, 125);
        e('turret', 3350, 276);
        e('walker', 3800, 276);
        e('drone', 4050, 135);
        e('turret', 4280, 276);
        e('walker', 4700, 276);
        e('drone', 4950, 120);
        e('turret', 5180, 276);
        e('walker', 5600, 276);
        e('drone', 5850, 140);
        e('turret', 6080, 276);
        e('walker', 6450, 276);
        e('drone', 6700, 125);
        e('turret', 6930, 276);
        e('walker', 7350, 276);
        e('drone', 7600, 135);
        e('turret', 7830, 276);
        e('walker', 8200, 276);
        e('drone', 8420, 130);
      }
    },

    {
      id: 'anvil-depth',
      site: { x: 596, y: 188 },
      name: 'ANVIL DEPTH',
      subtitle: '鉄床坑',
      blurb: '砲座が並ぶ坑道。奥で待つのは全機中もっとも重い機体。',
      worldWidth: 9800,
      spawn: { x: 54, y: 270 },
      arena: { gate: 9100, checkpoint: 9080, spawn: 9170, bossX: 9420, bossMin: 9140, bossMax: 9580 },
      bosses: ['gravelock'],
      checkpoints: [
        { at: 2400, x: 2750 },
        { at: 4300, x: 4600 },
        { at: 6200, x: 6500 },
        { at: 9100, x: 9080, heal: true }
      ],
      sections: [
        { to: 1660, name: 'FORGE MOUTH' },
        { to: 3440, name: 'ANVIL ROW' },
        { to: 5240, name: 'SLAG PIT' },
        { to: 7020, name: 'HAMMER LINE' },
        { to: 9100, name: 'DEEP FLOOR' },
        { name: 'LOCK' }
      ],
      hints: [{ to: 440, text: 'TURRETS  •  砲座を先に潰せ' }],
      pickups: [
        { x: 700, y: 200, type: 'health' },
        { x: 1500, y: 165, type: 'energy' },
        { x: 2440, y: 205, type: 'health' },
        { x: 3300, y: 200, type: 'energy' },
        { x: 4230, y: 165, type: 'health' },
        { x: 5080, y: 200, type: 'energy' },
        { x: 6030, y: 205, type: 'health' },
        { x: 6890, y: 165, type: 'energy' },
        { x: 7810, y: 200, type: 'health' },
        { x: 8900, y: 205, type: 'energy' }
      ],
      build: function (add, e) {
        add(0, 310, 780, 50, 'floor');
        add(920, 310, 740, 50, 'floor');
        add(1820, 310, 740, 50, 'floor');
        add(2690, 310, 750, 50, 'floor');
        add(3615, 310, 745, 50, 'floor');
        add(4500, 310, 740, 50, 'floor');
        add(5410, 310, 740, 50, 'floor');
        add(6280, 310, 740, 50, 'floor');
        add(7205, 310, 735, 50, 'floor');
        add(8080, 310, 1720, 50, 'floor');
        add(1680, 295, 120, 15, 'platform');
        add(3467, 295, 120, 15, 'platform');
        add(5265, 295, 120, 15, 'platform');
        add(7052, 295, 120, 15, 'platform');
        add(9250, 245, 95, 14, 'platform');
        add(9510, 245, 95, 14, 'platform');
        // three-step climbs, because the turret line is easier to break from above
        stair(add, 140, [250, 205, 160]);
        stair(add, 700, [245, 190]);
        stair(add, 960, [250, 200, 155]);
        stair(add, 1460, [245, 185]);
        stair(add, 1860, [250, 205, 160]);
        stair(add, 2400, [245, 195]);
        stair(add, 2730, [250, 200, 155]);
        stair(add, 3260, [245, 190]);
        stair(add, 3660, [250, 205, 160]);
        stair(add, 4190, [245, 185]);
        stair(add, 4540, [250, 200, 155]);
        stair(add, 5040, [245, 195]);
        stair(add, 5450, [250, 205, 160]);
        stair(add, 5990, [245, 190]);
        stair(add, 6320, [250, 200, 155]);
        stair(add, 6850, [245, 185]);
        stair(add, 7250, [250, 205, 160]);
        stair(add, 7770, [245, 195]);
        stair(add, 8120, [250, 200]);
        stair(add, 8620, [245, 190]);
        e('turret', 300, 276);
        e('walker', 560, 276);
        e('turret', 720, 276);
        e('drone', 420, 130);
        e('turret', 1020, 276);
        e('walker', 1280, 276);
        e('turret', 1560, 276);
        e('turret', 1920, 276);
        e('drone', 2160, 125);
        e('walker', 2320, 276);
        e('turret', 2480, 276);
        e('turret', 2800, 276);
        e('walker', 3060, 276);
        e('turret', 3340, 276);
        e('turret', 3720, 276);
        e('drone', 3960, 135);
        e('walker', 4120, 276);
        e('turret', 4280, 276);
        e('turret', 4600, 276);
        e('walker', 4860, 276);
        e('turret', 5140, 276);
        e('turret', 5520, 276);
        e('drone', 5760, 120);
        e('walker', 5920, 276);
        e('turret', 6080, 276);
        e('turret', 6380, 276);
        e('walker', 6640, 276);
        e('turret', 6920, 276);
        e('turret', 7320, 276);
        e('drone', 7560, 130);
        e('walker', 7720, 276);
        e('turret', 7880, 276);
        e('turret', 8200, 276);
        e('walker', 8460, 276);
        e('drone', 8700, 125);
        e('turret', 8900, 276);
      }
    },

    {
      id: 'void-choir',
      site: { x: 452, y: 48 },
      name: 'VOID CHOIR',
      subtitle: '虚の聖堂',
      blurb: '高く組まれた聖堂。ドローンが群れ、ボスは手数だけで押してくる。',
      worldWidth: 9000,
      spawn: { x: 54, y: 270 },
      arena: { gate: 8350, checkpoint: 8330, spawn: 8420, bossX: 8670, bossMin: 8390, bossMax: 8830 },
      bosses: ['nullpriest'],
      checkpoints: [
        { at: 2300, x: 2650 },
        { at: 4200, x: 4520 },
        { at: 6000, x: 6350 },
        { at: 8350, x: 8330, heal: true }
      ],
      sections: [
        { to: 1600, name: 'NAVE' },
        { to: 3300, name: 'HIGH ROW' },
        { to: 5100, name: 'BELL DECK' },
        { to: 6800, name: 'ORGAN LOFT' },
        { to: 8350, name: 'APSE' },
        { name: 'CHOIR' }
      ],
      hints: [{ to: 440, text: 'CLIMB  •  ドローンは上から' }],
      pickups: [
        { x: 520, y: 120, type: 'health' },
        { x: 1400, y: 120, type: 'energy' },
        { x: 2290, y: 120, type: 'health' },
        { x: 3190, y: 120, type: 'energy' },
        { x: 4080, y: 120, type: 'health' },
        { x: 4980, y: 120, type: 'energy' },
        { x: 5870, y: 120, type: 'health' },
        { x: 6770, y: 120, type: 'energy' },
        { x: 7660, y: 120, type: 'health' },
        { x: 8180, y: 205, type: 'energy' }
      ],
      build: function (add, e) {
        add(0, 310, 760, 50, 'floor');
        add(890, 310, 720, 50, 'floor');
        add(1740, 310, 730, 50, 'floor');
        add(2600, 310, 720, 50, 'floor');
        add(3450, 310, 730, 50, 'floor');
        add(4310, 310, 720, 50, 'floor');
        add(5160, 310, 730, 50, 'floor');
        add(6020, 310, 720, 50, 'floor');
        add(6870, 310, 730, 50, 'floor');
        add(7730, 310, 1270, 50, 'floor');
        add(1640, 295, 120, 15, 'platform');
        add(3350, 295, 120, 15, 'platform');
        add(5060, 295, 120, 15, 'platform');
        add(6770, 295, 120, 15, 'platform');
        add(8500, 245, 95, 14, 'platform');
        add(8760, 245, 95, 14, 'platform');
        // four-step climbs to the rafters, which is where the drones sit
        stair(add, 140, [250, 205, 165, 140]);
        stair(add, 1020, [250, 205, 165, 140]);
        stair(add, 1910, [250, 205, 165, 140]);
        stair(add, 2810, [250, 205, 165, 140]);
        stair(add, 3700, [250, 205, 165, 140]);
        stair(add, 4600, [250, 205, 165, 140]);
        stair(add, 5490, [250, 205, 165, 140]);
        stair(add, 6390, [250, 205, 165, 140]);
        stair(add, 7280, [250, 205, 165, 140]);
        stair(add, 8080, [250, 195]);
        e('drone', 300, 110);
        e('drone', 520, 165);
        e('walker', 640, 276);
        e('drone', 1060, 105);
        e('drone', 1300, 160);
        e('turret', 1500, 276);
        e('drone', 1960, 110);
        e('drone', 2180, 165);
        e('walker', 2380, 276);
        e('drone', 2860, 105);
        e('drone', 3080, 160);
        e('turret', 3260, 276);
        e('drone', 3750, 110);
        e('drone', 3970, 165);
        e('walker', 4100, 276);
        e('drone', 4650, 105);
        e('drone', 4870, 160);
        e('turret', 5060, 276);
        e('drone', 5540, 110);
        e('drone', 5760, 165);
        e('walker', 5840, 276);
        e('drone', 6440, 105);
        e('drone', 6660, 160);
        e('turret', 6680, 276);
        e('drone', 7330, 110);
        e('drone', 7550, 165);
        e('walker', 7480, 276);
        e('drone', 8130, 105);
        e('turret', 8200, 276);
      }
    },

    {
      id: 'filament-run',
      site: { x: 664, y: 70 },
      name: 'FILAMENT RUN',
      subtitle: '火線区',
      blurb: '細い足場が続く長い区画。止まると追いつかれる。最速の機体が待つ。',
      worldWidth: 10200,
      spawn: { x: 54, y: 270 },
      arena: { gate: 9500, checkpoint: 9480, spawn: 9570, bossX: 9820, bossMin: 9540, bossMax: 9980 },
      bosses: ['sparkwidow'],
      checkpoints: [
        { at: 2400, x: 2760 },
        { at: 4400, x: 4740 },
        { at: 6400, x: 6900 },
        { at: 8300, x: 8620 },
        { at: 9500, x: 9480, heal: true }
      ],
      sections: [
        { to: 1800, name: 'SPOOL HEAD' },
        { to: 3700, name: 'HOT WIRE' },
        { to: 5600, name: 'ARC SPAN' },
        { to: 7500, name: 'FILAMENT ROW' },
        { to: 9500, name: 'GLOW DECK' },
        { name: 'WIDOW NEST' }
      ],
      hints: [{ to: 440, text: 'DASH  •  足場は細い' }],
      pickups: [
        { x: 640, y: 200, type: 'health' },
        { x: 1620, y: 130, type: 'energy' },
        { x: 2480, y: 200, type: 'health' },
        { x: 3400, y: 165, type: 'energy' },
        { x: 4320, y: 200, type: 'health' },
        { x: 5240, y: 165, type: 'energy' },
        { x: 6160, y: 200, type: 'health' },
        { x: 7080, y: 165, type: 'energy' },
        { x: 8000, y: 200, type: 'health' },
        { x: 9140, y: 165, type: 'energy' }
      ],
      build: function (add, e) {
        add(0, 310, 760, 50, 'floor');
        add(900, 310, 700, 50, 'floor');
        add(1740, 310, 720, 50, 'floor');
        add(2600, 310, 700, 50, 'floor');
        add(3440, 310, 720, 50, 'floor');
        add(4300, 310, 700, 50, 'floor');
        add(5140, 310, 720, 50, 'floor');
        add(6000, 310, 700, 50, 'floor');
        add(6840, 310, 720, 50, 'floor');
        add(7700, 310, 700, 50, 'floor');
        add(8540, 310, 1660, 50, 'floor');
        add(1650, 295, 120, 15, 'platform');
        add(3350, 295, 120, 15, 'platform');
        add(5050, 295, 120, 15, 'platform');
        add(6750, 295, 120, 15, 'platform');
        add(8450, 295, 120, 15, 'platform');
        add(9650, 245, 95, 14, 'platform');
        add(9910, 245, 95, 14, 'platform');
        // narrow treads, two steps at a time, so the run stays quick rather than vertical
        stair(add, 140, [250, 190], 90);
        stair(add, 560, [245, 200], 90);
        stair(add, 960, [250, 190], 90);
        stair(add, 1420, [245, 165], 90);
        stair(add, 1800, [250, 190], 90);
        stair(add, 2260, [245, 200], 90);
        stair(add, 2660, [250, 190], 90);
        stair(add, 3120, [245, 165], 90);
        stair(add, 3500, [250, 190], 90);
        stair(add, 3960, [245, 200], 90);
        stair(add, 4360, [250, 190], 90);
        stair(add, 4820, [245, 165], 90);
        stair(add, 5200, [250, 190], 90);
        stair(add, 5660, [245, 200], 90);
        stair(add, 6060, [250, 190], 90);
        stair(add, 6520, [245, 165], 90);
        stair(add, 6900, [250, 190], 90);
        stair(add, 7360, [245, 200], 90);
        stair(add, 7760, [250, 190], 90);
        stair(add, 8220, [245, 165], 90);
        stair(add, 8600, [250, 190], 90);
        stair(add, 9060, [245, 165], 90);
        e('walker', 380, 276);
        e('drone', 600, 140);
        e('turret', 700, 276);
        e('walker', 1000, 276);
        e('drone', 1240, 125);
        e('walker', 1480, 276);
        e('walker', 1840, 276);
        e('turret', 2100, 276);
        e('drone', 2320, 135);
        e('walker', 2380, 276);
        e('walker', 2700, 276);
        e('drone', 2940, 120);
        e('walker', 3180, 276);
        e('walker', 3540, 276);
        e('turret', 3800, 276);
        e('drone', 4020, 140);
        e('walker', 4080, 276);
        e('walker', 4400, 276);
        e('drone', 4640, 125);
        e('walker', 4880, 276);
        e('walker', 5240, 276);
        e('turret', 5500, 276);
        e('drone', 5720, 135);
        e('walker', 5780, 276);
        e('walker', 6100, 276);
        e('drone', 6340, 120);
        e('walker', 6580, 276);
        e('walker', 6940, 276);
        e('turret', 7200, 276);
        e('drone', 7420, 140);
        e('walker', 7480, 276);
        e('walker', 7800, 276);
        e('drone', 8040, 125);
        e('walker', 8280, 276);
        e('walker', 8640, 276);
        e('turret', 8900, 276);
        e('drone', 9120, 135);
        e('turret', 9300, 276);
      }
    },

    {
      id: 'crown-vault',
      site: { x: 800, y: 122 },
      name: 'CROWN VAULT',
      subtitle: '黒冠宮',
      blurb: '最長にして最厚。八つの攻撃をすべて使う機体が最奥で待っている。',
      worldWidth: 11200,
      spawn: { x: 54, y: 270 },
      arena: { gate: 10450, checkpoint: 10430, spawn: 10520, bossX: 10770, bossMin: 10490, bossMax: 10930 },
      bosses: ['obsidian-crown'],
      checkpoints: [
        { at: 2400, x: 2740 },
        { at: 4400, x: 4720 },
        { at: 6400, x: 6700 },
        { at: 8400, x: 8680 },
        { at: 10450, x: 10430, heal: true }
      ],
      sections: [
        { to: 2000, name: 'OUTER WARD' },
        { to: 4000, name: 'BLACK STAIR' },
        { to: 6000, name: 'REGALIA HALL' },
        { to: 8000, name: 'SCEPTRE WALK' },
        { to: 10450, name: 'INNER WARD' },
        { name: 'CROWN' }
      ],
      hints: [{ to: 460, text: 'FINAL  •  八手すべて来る' }],
      pickups: [
        { x: 620, y: 165, type: 'health' },
        { x: 1560, y: 200, type: 'energy' },
        { x: 2500, y: 165, type: 'health' },
        { x: 3440, y: 200, type: 'energy' },
        { x: 4380, y: 165, type: 'health' },
        { x: 5320, y: 200, type: 'energy' },
        { x: 6340, y: 205, type: 'health' },
        { x: 7200, y: 200, type: 'energy' },
        { x: 8140, y: 165, type: 'health' },
        { x: 9080, y: 200, type: 'energy' },
        { x: 10060, y: 165, type: 'health' }
      ],
      build: function (add, e) {
        add(0, 310, 780, 50, 'floor');
        add(920, 310, 740, 50, 'floor');
        add(1800, 310, 760, 50, 'floor');
        add(2700, 310, 740, 50, 'floor');
        add(3580, 310, 760, 50, 'floor');
        add(4480, 310, 740, 50, 'floor');
        add(5360, 310, 760, 50, 'floor');
        add(6260, 310, 740, 50, 'floor');
        add(7140, 310, 760, 50, 'floor');
        add(8040, 310, 740, 50, 'floor');
        add(8920, 310, 760, 50, 'floor');
        add(9820, 310, 1380, 50, 'floor');
        add(1680, 295, 120, 15, 'platform');
        add(3460, 295, 120, 15, 'platform');
        add(5240, 295, 120, 15, 'platform');
        add(7020, 295, 120, 15, 'platform');
        add(8800, 295, 120, 15, 'platform');
        add(10600, 245, 95, 14, 'platform');
        add(10860, 245, 95, 14, 'platform');
        // the vault alternates a tall climb with a low sprint, the whole way in
        stair(add, 140, [250, 205, 160]);
        stair(add, 640, [245, 195]);
        stair(add, 960, [250, 205, 160]);
        stair(add, 1460, [245, 200]);
        stair(add, 1840, [250, 205, 160]);
        stair(add, 2340, [245, 195]);
        stair(add, 2740, [250, 205, 160]);
        stair(add, 3240, [245, 200]);
        stair(add, 3620, [250, 205, 160]);
        stair(add, 4120, [245, 195]);
        stair(add, 4520, [250, 205, 160]);
        stair(add, 5020, [245, 200]);
        stair(add, 5400, [250, 205, 160]);
        stair(add, 5900, [245, 195]);
        stair(add, 6300, [250, 205, 160]);
        stair(add, 6800, [245, 200]);
        stair(add, 7180, [250, 205, 160]);
        stair(add, 7680, [245, 195]);
        stair(add, 8080, [250, 205, 160]);
        stair(add, 8580, [245, 200]);
        stair(add, 8960, [250, 205, 160]);
        stair(add, 9460, [245, 195]);
        stair(add, 9860, [250, 205, 160]);
        stair(add, 10360, [245, 200]);
        e('walker', 380, 276);
        e('turret', 620, 276);
        e('drone', 500, 120);
        e('walker', 1060, 276);
        e('turret', 1300, 276);
        e('drone', 1180, 115);
        e('walker', 1940, 276);
        e('turret', 2180, 276);
        e('drone', 2060, 120);
        e('walker', 2420, 276);
        e('walker', 2840, 276);
        e('turret', 3080, 276);
        e('drone', 2960, 115);
        e('walker', 3720, 276);
        e('turret', 3960, 276);
        e('drone', 3840, 120);
        e('walker', 4200, 276);
        e('walker', 4620, 276);
        e('turret', 4860, 276);
        e('drone', 4740, 115);
        e('walker', 5500, 276);
        e('turret', 5740, 276);
        e('drone', 5620, 120);
        e('walker', 5980, 276);
        e('walker', 6400, 276);
        e('turret', 6640, 276);
        e('drone', 6520, 115);
        e('walker', 7280, 276);
        e('turret', 7520, 276);
        e('drone', 7400, 120);
        e('walker', 7760, 276);
        e('walker', 8180, 276);
        e('turret', 8420, 276);
        e('drone', 8300, 115);
        e('walker', 9060, 276);
        e('turret', 9300, 276);
        e('drone', 9180, 120);
        e('walker', 9540, 276);
        e('walker', 9960, 276);
        e('turret', 10200, 276);
        e('drone', 10080, 115);
      }
    },
    {
      id: 'gauntlet',
      site: { x: 450, y: 118 },
      name: 'BOSS RUSH',
      subtitle: '連戦',
      blurb: '雑魚なしの八体連戦。倒すたびライフが4回復。次の出現位置を表示。',
      kind: 'gauntlet',
      worldWidth: 1950,
      spawn: { x: 54, y: 270 },
      arena: { gate: 1200, checkpoint: 1180, spawn: 1270, bossX: 1520, bossMin: 1240, bossMax: 1680 },
      bosses: [
        'warden',
        'tidebreaker',
        'coilhead',
        'ashmaw',
        'nullpriest',
        'gravelock',
        'sparkwidow',
        'obsidian-crown'
      ],
      checkpoints: [{ at: 1200, x: 1180, heal: true }],
      sections: [{ to: 1200, name: 'STAGING' }, { name: 'GAUNTLET' }],
      hints: [{ to: 420, text: 'BOSS RUSH  •  8体連戦' }],
      pickups: [
        { x: 300, y: 275, type: 'health' },
        { x: 640, y: 215, type: 'energy' },
        { x: 980, y: 275, type: 'health' },
        { x: 1120, y: 205, type: 'energy' }
      ],
      build: function (add, e) {
        // one unbroken floor: nowhere to fall, nothing to do but fight
        add(0, 310, 1950, 50, 'floor');
        // a few perches to break line of fire, kept clear of where the frames stand
        [
          [170, 245, 130],
          [400, 195, 120],
          [640, 245, 120],
          [880, 200, 120],
          [1080, 245, 120],
          [1290, 200, 110],
          [1560, 185, 120],
          [1810, 235, 110]
        ].forEach(function (a) {
          add(a[0], a[1], a[2], 18);
        });
      }
    }
  ];

  var byId = {};
  stages.forEach(function (s, i) {
    s.number = i + 1;
    s.kind = s.kind || 'run';
    byId[s.id] = s;
  });

  g.AstraStages = {
    list: stages,
    first: stages[0].id,
    // Falls back to the first stage rather than throwing, so a stale saved id cannot brick a boot.
    get: function (id) {
      return byId[id] || stages[0];
    },
    has: function (id) {
      return !!byId[id];
    },
    // The sector name reads as "the first band whose limit is still ahead"; the last band has
    // no limit and catches everything past it.
    bandAt: function (bands, x) {
      for (var i = 0; i < bands.length; i++)
        if (bands[i].to === undefined || x < bands[i].to) return bands[i];
      return bands[bands.length - 1];
    },
    // Prompts run out instead of sticking: past the last one there is nothing to say.
    hintAt: function (hints, x) {
      for (var i = 0; i < hints.length; i++) if (x < hints[i].to) return hints[i].text;
      return '';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
