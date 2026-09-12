// Maps what each saber stage can actually hit, by sweeping a probe box around the player and
// asking the real damage code. Proves the reach follows the drawn blade rather than a fixed box.
const assert = require('node:assert/strict');
const fs = require('fs'), vm = require('vm');
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){},
  requestAnimationFrame(){}, cancelAnimationFrame(){}, navigator:{getGamepads:()=>[]} };
vm.createContext(ctx); ctx.globalThis = ctx;
for (const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'), ctx);
const C = ctx.AstraCombat;

function probe(stage, elapsed){
  // one fresh game per probe grid so nothing carries over
  const g = new ctx.NeonGame(null); g.start();
  g._enemies = function(){}; g._boss = function(){};
  const s = g.state, p = s.player;
  Object.assign(p, {x:400, y:270, vx:0, vy:0, onGround:true, facing:1,
    saberFacing:1, saberCombo:stage, saberTime:C.saberDuration-elapsed, saberHits:0, saberHit:false});
  const ox = p.x + p.w/2, oy = p.y + p.h;
  const cells = [];
  for (let dy = -110; dy <= 30; dy += 5){
    for (let dx = -95; dx <= 95; dx += 5){
      const box = {x: ox+dx-8, y: oy+dy-8, w:16, h:16};
      const segs = C.saberSweep(p);
      if (C.bladeTouches(segs, box)) cells.push([dx, dy]);
    }
  }
  return cells;
}

const stages = {};
for (const stage of [1,2,3]){
  const times = C.saberHitTimes[stage-1];
  const all = new Set();
  const perCut = times.map(t => {
    const cells = probe(stage, t);
    for (const c of cells) all.add(c[0]+','+c[1]);
    return {at:t, cells:cells.length,
      forward: cells.length ? Math.max(...cells.map(c=>c[0])) : 0,
      behind:  cells.length ? Math.min(...cells.map(c=>c[0])) : 0,
      top:     cells.length ? Math.min(...cells.map(c=>c[1])) : 0,
      bottom:  cells.length ? Math.max(...cells.map(c=>c[1])) : 0};
  });
  const pts = [...all].map(k => k.split(',').map(Number));
  stages[stage] = {cuts: perCut,
    covered: pts.length,
    forward: Math.max(...pts.map(c=>c[0])),
    behind: Math.min(...pts.map(c=>c[0])),
    top: Math.min(...pts.map(c=>c[1])),
    bottom: Math.max(...pts.map(c=>c[1]))};
}
fs.writeFileSync('qa/saber-reach.json', JSON.stringify(stages, null, 2));

// Each stage must actually reach forward at every cut, and the three must not be identical:
// the whole point is that the shape follows the motion.
for (const stage of [1,2,3]){
  const st = stages[stage];
  assert.ok(st.forward > 30, `stage ${stage} reaches forward: ${st.forward}`);
  for (const cut of st.cuts)
    assert.ok(cut.forward > 25, `stage ${stage} cut at ${cut.at}s reaches forward: ${cut.forward}`);
}
// The three shapes must stay distinct, each matching what its motion does.
const height = st => st.bottom - st.top;
assert.ok(stages[1].top < -80, `the overhead cut reaches above the head: ${stages[1].top}`);
assert.ok(height(stages[2]) < height(stages[1]) && height(stages[2]) < height(stages[3]),
  `the waist sweep is the flattest band: ${height(stages[2])} against ${height(stages[1])} and ${height(stages[3])}`);
assert.ok(stages[3].bottom >= 0, `the finisher carries down to the floor: ${stages[3].bottom}`);
assert.ok(stages[3].covered > stages[1].covered && stages[1].covered > stages[2].covered,
  `coverage ranks finisher, overhead, sweep: ${stages[3].covered}/${stages[1].covered}/${stages[2].covered}`);
// A walker standing in front must still be inside every stage, so the combo keeps working.
const walker = {top:-34, bottom:0};
for (const stage of [1,2,3])
  assert.ok(stages[stage].top < walker.bottom && stages[stage].bottom > walker.top,
    `stage ${stage} still covers a grounded enemy`);

console.log(JSON.stringify(Object.fromEntries(Object.entries(stages).map(([k,v]) =>
  [k, {forward:v.forward, behind:v.behind, top:v.top, bottom:v.bottom, cells:v.covered,
       cuts:v.cuts.map(c=>`${c.at}s f${c.forward}`)}])), null, 1));
