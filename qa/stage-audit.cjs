// Static audit of every stage in the list: reach of every gap, reach of every platform step,
// enemy footing, pickup placement, checkpoint spacing, and whether the boss gate can actually
// be reached from the start by jumping.
const assert = require('node:assert/strict');
const fs = require('fs'), vm = require('vm');
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){},
  requestAnimationFrame(){}, cancelAnimationFrame(){}, navigator:{getGamepads:()=>[]} };
for (const f of ['assets/bosses.js','assets/stages.js'])
  vm.runInNewContext(fs.readFileSync(f,'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('game.js','utf8'), {...ctx, globalThis:ctx});

// movement budget, straight from the tick constants
const GRAV = 1100, JUMP = 430, RUN = 190, DASH = 560, DASH_TIME = .16;
const APEX = JUMP*JUMP/(2*GRAV);                 // 84 px
const AIRTIME = 2*JUMP/GRAV;                     // .78 s
const RUN_REACH = RUN*AIRTIME;                   // 149 px
const DASH_REACH = DASH*DASH_TIME + RUN*(AIRTIME-DASH_TIME);
const PLAYER_H = 40, FLOOR_TOP = 310, STAND = FLOOR_TOP - PLAYER_H;

function audit(stageId){
  const g = new ctx.NeonGame(null); g.start({stage: stageId});
  const s = g.state, C = ctx.AstraCombat, def = C.stage;
  const floors = s.platforms.filter(q=>q.type==='floor').sort((a,b)=>a.x-b.x);
  const ledges = s.platforms.filter(q=>q.type!=='floor').sort((a,b)=>a.x-b.x);
  const span = q => [q.x, q.x+q.w];

  // 1. every gap between floor slabs is either jumpable or bridged by a ledge
  const gaps = [];
  for (let i=1;i<floors.length;i++){
    const from = floors[i-1].x+floors[i-1].w, to = floors[i].x, width = to-from;
    // A bridge only counts if it sits over the middle of the hole, not merely at its lip.
    const mid = (from+to)/2;
    const bridge = ledges.filter(l => l.y <= FLOOR_TOP && l.x < mid + 40 && l.x + l.w > mid - 40)
      .sort((a,b)=>a.x-b.x);
    gaps.push({from,to,width,bridged:bridge.length>0,bridgeTops:bridge.map(b=>b.y)});
  }

  // 2. every ledge can be reached: from the floor, or from another ledge below and near it
  const reachableFrom = (topY, fromTopY) => topY >= fromTopY - APEX - 0.01;
  const unreachable = [];
  for (const l of ledges){
    if (l.y >= STAND) continue;                       // at or below standing height
    if (reachableFrom(l.y, FLOOR_TOP)) continue;      // straight off the floor
    const helpers = s.platforms.filter(q => q!==l && q.y > l.y &&
      q.x < l.x + l.w + RUN_REACH && q.x + q.w > l.x - RUN_REACH &&
      reachableFrom(l.y, q.y));
    if (!helpers.length) unreachable.push({x:l.x,y:l.y});
  }

  // 3. enemies stand on something and walkers keep their patrol on it
  const grounded = [], patrol = [];
  for (const e of s.enemies){
    if (e.type === 'drone') continue;
    const under = s.platforms.find(q => e.x >= q.x && e.x <= q.x+q.w && q.y >= e.y);
    if (!under) grounded.push({type:e.type,x:e.x});
    else if (e.type === 'walker' && (e.x-45 < under.x || e.x+45 > under.x+under.w))
      patrol.push({x:e.x, slab:span(under)});
  }

  // 4. pickups sit within reach of a surface
  // Array.from keeps the result in this realm; the game state lives in a vm context.
  const stranded = Array.from(s.pickups.filter(u => !s.platforms.some(q =>
    u.x >= q.x-30 && u.x <= q.x+q.w+30 && q.y >= u.y && q.y - u.y < APEX + PLAYER_H + 20)),
    u => ({x:u.x, y:u.y, type:u.type}));

  // 5. the stage is completable: walk a jump-reachability graph from the start to the boss gate
  const surfaces = s.platforms.map((q,i) => ({i, x:q.x, w:q.w, y:q.y}));
  function reach(fromY, toY, dashing){
    const peak = fromY - APEX;
    if (toY < peak) return -1;                        // that landing is above the jump arc
    const t = JUMP/GRAV + Math.sqrt(2*(toY-peak)/GRAV);
    return dashing && t > DASH_TIME
      ? DASH*DASH_TIME + RUN*(t-DASH_TIME)
      : RUN*t;
  }
  function links(a, b){
    const forward = b.x - (a.x + a.w);                // 0 or less when they overlap
    const gap = Math.max(0, forward);
    if (b.x + b.w < a.x) return false;                // strictly behind, no need to model
    const plain = reach(a.y, b.y, false), dash = reach(a.y, b.y, true);
    return plain >= 0 && (gap <= plain || gap <= dash);
  }
  const seen = new Set(), queue = [];
  const start = surfaces.find(q => def.spawn.x >= q.x && def.spawn.x <= q.x+q.w);
  if (start) { seen.add(start.i); queue.push(start); }
  while (queue.length){
    const a = queue.shift();
    for (const b of surfaces){
      if (seen.has(b.i) || b.x + b.w < a.x) continue;
      if (links(a,b)) { seen.add(b.i); queue.push(b); }
    }
  }
  const gateSurface = surfaces.filter(q => C.arena.gate >= q.x && C.arena.gate <= q.x+q.w);
  const gateReached = gateSurface.some(q => seen.has(q.i));
  const furthest = Math.max(...[...seen].map(i => surfaces[i].x + surfaces[i].w));

  // 6. checkpoints advance and land on floor
  const marks = C.checkpoints;
  const badMark = Array.from(marks.filter(m => !floors.some(f => m.x >= f.x+20 && m.x <= f.x+f.w-20)),
    m => ({at:m.at, x:m.x}));

  // 7. the sector readout covers the whole run
  const sectorGaps = [];
  for (let x = 0; x < g.worldWidth; x += 50)
    if (!ctx.AstraStages.bandAt(def.sections, x).name) sectorGaps.push(x);

  const report = {
    id: def.id, name: def.name, number: def.number,
    worldWidth: g.worldWidth,
    floors: floors.length, ledges: ledges.length,
    enemies: s.enemies.length, pickups: s.pickups.length, checkpoints: marks.length,
    kind: def.kind, bosses: def.bosses.slice(),
    gaps, unreachableLedges: unreachable, floatingEnemies: grounded,
    patrolOverruns: patrol, strandedPickups: stranded, checkpointsOffFloor: badMark,
    sectorGaps,
    route: {surfaces: surfaces.length, reachable: seen.size, gateReached, furthest},
  };

  const where = `${def.number} ${def.name}`;
  // a gauntlet is deliberately short: it is an arena, not a run
  assert.ok(def.kind === 'gauntlet' || g.worldWidth > 5200, `${where}: the stage is a full run`);
  assert.ok(def.bosses.length >= 1, `${where}: names at least one boss`);
  for (const id of def.bosses)
    assert.ok(ctx.AstraBosses.has(id), `${where}: ${id} is in the roster`);
  for (const gap of gaps)
    assert.ok(gap.width <= RUN_REACH || gap.bridged,
      `${where}: gap ${gap.from}-${gap.to} is ${gap.width}px and needs a ledge`);
  assert.deepEqual(unreachable, [], `${where}: every raised ledge is reachable by a jump chain`);
  assert.deepEqual(grounded, [], `${where}: every walker and turret stands on a slab`);
  assert.deepEqual(patrol, [], `${where}: walker patrols stay on their slab`);
  assert.deepEqual(stranded, [], `${where}: every pickup sits within jumping reach of a surface`);
  assert.deepEqual(badMark, [], `${where}: every checkpoint respawns on solid floor`);
  assert.deepEqual(sectorGaps, [], `${where}: the sector readout never goes blank`);
  assert.ok(gateReached, `${where}: the boss gate is reachable by jumps, route stops at x=${furthest}`);
  for (const m of marks) assert.ok(surfaces.some(q => seen.has(q.i) && m.x >= q.x && m.x <= q.x+q.w),
    `${where}: checkpoint ${m.x} sits on the reachable route`);
  for (let i=1;i<marks.length;i++) assert.ok(marks[i].at > marks[i-1].at, `${where}: checkpoints advance`);
  assert.ok(C.arena.gate < C.arena.spawn && C.arena.spawn < C.arena.bossX, `${where}: gate, spawn and boss are ordered`);
  assert.ok(C.arena.bossX + 100 < g.worldWidth, `${where}: the boss fits inside the world`);
  assert.ok(marks[marks.length-1].at === C.arena.gate, `${where}: the last checkpoint is the gate`);
  return report;
}

const reports = ctx.AstraStages.list.map(s => audit(s.id));
fs.writeFileSync('qa/stage-audit.json', JSON.stringify(reports, null, 2));

// the list itself has to be coherent, or the select screen has nothing to show
const ids = ctx.AstraStages.list.map(s => s.id);
assert.equal(new Set(ids).size, ids.length, 'stage ids are unique');
assert.ok(ids.length >= 2, 'there is more than one stage to choose from');

for (const r of reports)
  console.log(`${r.number} ${r.name.padEnd(15)} ${String(r.worldWidth).padStart(6)}px  ` +
    `floors ${String(r.floors).padStart(2)}  ledges ${String(r.ledges).padStart(2)}  ` +
    `enemies ${String(r.enemies).padStart(2)}  bosses ${r.bosses.length}  ` +
    `gaps ${r.gaps.map(x => x.width + (x.bridged ? 'b' : '')).join(' ') || '-'}`);

// every boss in the roster must be fought somewhere, or it is not really in the game
const used = new Set(reports.flatMap(r => r.bosses));
for (const b of ctx.AstraBosses.list)
  assert.ok(used.has(b.id), `${b.name} is not reachable from any stage`);
console.log(`roster: ${ctx.AstraBosses.list.length} bosses, all reachable`);
