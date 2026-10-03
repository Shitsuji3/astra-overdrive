// Compare the pre-animation reach with the real rig, and exercise damage on both sides.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
process.chdir(path.join(__dirname, '..'));
const folder = path.join(__dirname, process.env.RISING_RANGE_QA_DIR || 'rising-direction-reach-20261003');
function load(rig) {
  const c = { console, performance: { now: () => 0 }, addEventListener() {},
    removeEventListener() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
    navigator: { getGamepads: () => [] } };
  vm.createContext(c); c.globalThis = c;
  for (const f of ['assets/bosses.js', 'assets/stages.js', 'assets/run-rig-v6.js', 'assets/saber-rig.js', 'game.js'])
    vm.runInContext(f === 'assets/saber-rig.js' && rig ? rig : fs.readFileSync(f, 'utf8'), c);
  return c;
}
const original = load(execFileSync('git', ['show', '11fd1ed:assets/saber-rig.js'], { encoding: 'utf8' }));
const current = load();
function reach(c, t) {
  const cells = c.AstraSaberRig.fireCells(4, t, c.AstraRunRig.build);
  return { t, forward: Math.max(...cells.map(p => p.x)), top: Math.min(...cells.map(p => p.y)) };
}
const phases = [.085, .12, .2, .3, .45, .6, .75, .85];
const ranges = phases.map(t => ({ original: reach(original, t), current: reach(current, t) }));
for (const r of ranges) assert.ok(r.current.forward >= r.original.forward * (r.original.t < .2 ? .90 : .95),
  `Restore visible forward reach at ${r.original.t}: ${r.current.forward} vs ${r.original.forward}`);
function target(c, facing, distance, dy, height) {
  const g = new c.NeonGame(null); g.start(); g._enemies = () => {}; g._boss = () => {};
  const s = g.state, p = s.player;
  p.x = 400; p.y = 270; p.vx = p.vy = 0; p.facing = p.saberFacing = facing; p.onGround = true;
  // A broad isolated floor prevents stage geometry or enemies from changing the observation.
  s.platforms = [{ x: 0, y: 310, w: 3000, h: 50 }]; s.boss = null; s.bullets = [];
  const x0 = p.x + p.w / 2, y0 = p.y + p.h, width = 16;
  const e = { id: 5, type: 'drone', x: x0 + (facing > 0 ? distance : -distance - width),
    y: y0 + dy, w: width, h: height, hp: 100, maxHp: 100, facing: -facing, flash: 0, dead: false };
  s.enemies = [e];
  g.setInput('up', true); g.setInput('saber', true); g._tick(1 / 60);
  g.setInput('saber', false); g.setInput('up', false);
  let visibleAt = null, hitAt = null;
  for (let i = 0; i < 80; i++) {
    if (i) g._tick(1 / 60);
    if (p.saberCombo === 4) {
      const cells = c.AstraSaberRig.fireCells(4, c.AstraCombat.saberPhase(p), c.AstraRunRig.build);
      if (visibleAt === null && cells.some(v => {
        const x = p.x + p.w / 2 + facing * v.x, y = p.y + p.h + v.y;
        return x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h;
      })) visibleAt = i / 60;
    }
    if (hitAt === null && e.hp < 100) hitAt = i / 60;
  }
  return { facing, distance, dy, height, visibleAt, hitAt, damage: 100 - e.hp };
}
const targets = [];
for (const facing of [1, -1]) for (const [d, y, h] of [[75, -40, 40], [75, -130, 24], [75, -210, 24], [130, -160, 24]]) {
  const a = target(original, facing, d, y, h), b = target(current, facing, d, y, h);
  targets.push({ original: a, current: b });
  if (d === 75 && a.damage > 0) assert.ok(b.damage > 0, `Restore actual hit at ${d}/${y}, facing ${facing}`);
  if (d === 75 && y === -40) {
    assert.equal(b.damage, a.damage, 'Preserve the distant grounded target hit');
    assert.equal(b.hitAt, b.visibleAt, 'Ground target takes damage when the visible floor pass reaches it');
  }
  if (b.damage) assert.ok(b.visibleAt !== null, 'A distant hit must have visible flame over the target');
  if (d === 130) assert.equal(b.damage, 0, 'A target beyond the restored flame must remain out of reach');
}
const left = targets.filter(r => r.current.facing < 0), right = targets.filter(r => r.current.facing > 0);
for (let i = 0; i < left.length; i++) assert.equal(left[i].current.damage, right[i].current.damage, 'Left/right damage symmetry');
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(folder, 'range-and-targets.json'), JSON.stringify({ ranges, targets }, null, 2));
console.log(JSON.stringify({ ranges: ranges.map(r => ({ t: r.current.t, original: +r.original.forward.toFixed(1), current: +r.current.forward.toFixed(1) })), targets }, null, 2));
