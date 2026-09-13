// How well the rising cut's hit shape matches the flame it draws, and whether its bites land the moment
// the flame reaches a target. Runs in node against the real game and rig; pass a label to keep runs apart.
//   shape   for moments through the rise: how much of the drawn flame the hit shape covers, and how much
//           of the hit shape is not flame. "old" is the blade sweep padded 16px, the way it used to hit;
//           "outline" is the flame's own outline, at a few widths.
//   timing  targets hung where the flame passes: the frame the drawn flame first covers each one, the frame
//           it is first damaged, and every bite, under whatever hit code game.js currently has.
// Writes qa/rising-hit/report-<label>.json and qa/rising-hit/shape-<label>.png: the drawn flame in orange,
// flame the outline misses in red, outline that is not flame in cyan, old band that is not flame in purple.
const fs = require('fs'), vm = require('vm'), zlib = require('zlib');
process.chdir(require('path').join(__dirname, '..'));
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){},
  requestAnimationFrame(){}, cancelAnimationFrame(){}, navigator:{getGamepads:()=>[]} };
vm.createContext(ctx); ctx.globalThis = ctx;
for (const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'), ctx);
const C = ctx.AstraCombat, R = ctx.AstraSaberRig, build = ctx.AstraRunRig.build;
const label = process.argv[2] || 'current';

const oldShape = t => ({ segs: R.sweep(4, t, build).map(s => ({ax:s.root.x, ay:s.root.y, bx:s.tip.x, by:s.tip.y})), pad: 16 });
const outline = (t, reach) => ({ segs: R.fireSlices(4, t, build, reach).map(s => ({ax:s.a.x, ay:s.a.y, bx:s.b.x, by:s.b.y})),
                                 pad: C.risingFirePad || 3 });
const key = (x, y) => Math.round(x) + ',' + Math.round(y);
function near(keys, x, y) { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (keys.has((x+dx)+','+(y+dy))) return true; return false; }
function metrics(lit, shape) {
  const { segs, pad } = shape;
  if (!lit.length || !segs.length) return null;
  const keys = new Set(lit.map(c => key(c.x, c.y)));
  const covered = lit.filter(c => C.bladeTouches(segs, {x:c.x-.5, y:c.y-.5, w:1, h:1}, pad)).length / lit.length;
  const xs = [], ys = [];
  for (const s of segs) { xs.push(s.ax, s.bx); ys.push(s.ay, s.by); }
  let inside = 0, stray = 0;
  for (let x = Math.floor(Math.min(...xs) - pad - 1); x <= Math.ceil(Math.max(...xs) + pad + 1); x++)
    for (let y = Math.floor(Math.min(...ys) - pad - 1); y <= Math.ceil(Math.max(...ys) + pad + 1); y++) {
      if (!C.bladeTouches(segs, {x, y, w:0, h:0}, pad)) continue;
      inside++; if (!near(keys, x, y)) stray++;
    }
  return { covered: +(covered * 100).toFixed(1), stray: +(stray / Math.max(1, inside) * 100).toFixed(1), cells: lit.length, area: inside };
}

const report = { label, shape: [], timing: [] };
const PHASES = [.03, .08, .12, .2, .3, .45, .6, .75, .85, .92];
for (const t of PHASES) {
  const lit = R.fireCells(4, t, build);
  report.shape.push({ t, cells: lit.length, old: metrics(lit, oldShape(t)),
    'outline x1.00': metrics(lit, outline(t, 1)), 'outline x1.25': metrics(lit, outline(t, 1.25)), 'outline x1.40': metrics(lit, outline(t, 1.4)) });
}

function clearFloor(g) {
  for (let x = 40; x < 4000; x += 10) {
    const floor = g.state.platforms.some(q => q.y === 310 && q.x <= x - 100 && q.x + q.w >= x + 120);
    const roof = g.state.platforms.some(q => q.y < 310 && q.y > 60 && q.x < x + 140 && q.x + q.w > x - 120);
    if (floor && !roof) return x;
  }
  return 400;
}
const TARGETS = [['in front, low', 18, -34, 30, 34], ['in front, head high', 24, -84, 28, 24], ['up the flame', 30, -130, 28, 24],
                 ['high and forward', 60, -160, 28, 24], ['behind, low', -48, -34, 30, 34], ['a wall it all passes through', -70, -230, 180, 230]];
for (const [name, dx, dy, w, h] of TARGETS) {
  const g = new ctx.NeonGame(null); g.start(); g._enemies = () => {}; g._boss = () => {};
  const p = g.state.player; p.x = clearFloor(g); p.y = 270; p.vx = 0; p.vy = 0; p.facing = 1; p.onGround = true;
  const x0 = p.x + p.w / 2, y0 = p.y + p.h;
  const e = { id: 5, type: 'drone', x: x0 + dx, y: y0 + dy, w, h, hp: 100, maxHp: 100, facing: -1, flash: 0, dead: false };
  g.state.enemies = [e];
  g.setInput('up', true); g.setInput('saber', true); g._tick(1 / 60); g.setInput('saber', false); g.setInput('up', false);
  let touched = -1, last = 100; const bites = [];
  for (let i = 0; i <= 80; i++) {
    if (i > 0) g._tick(1 / 60);
    if (touched < 0 && p.saberCombo === 4 && p.saberTime > 0) {
      const cells = R.fireCells(4, C.saberPhase(p), build);
      if (cells.some(c => { const x = x0 - (x0 - (p.x + p.w / 2)) + p.saberFacing * c.x, y = p.y + p.h + c.y; return x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h; })) touched = i;
    }
    if (e.hp !== last) { bites.push(+(i / 60).toFixed(3)); last = e.hp; }
  }
  report.timing.push({ target: name, flameOverItAt: touched < 0 ? null : +(touched / 60).toFixed(3),
    firstBiteAt: bites.length ? bites[0] : null, bites, damage: +(100 - e.hp).toFixed(4) });
}

// picture: four moments side by side, feet-relative, facing right
const X0 = -90, X1 = 140, Y0 = -210, Y1 = 30, SC = 2, PANELS = [.1, .3, .5, .75];
const PW = (X1 - X0) * SC, PH = (Y1 - Y0) * SC, img = Buffer.alloc(PW * PANELS.length * PH * 3, 18);
PANELS.forEach((t, k) => {
  const lit = new Set(R.fireCells(4, t, build).map(c => key(c.x, c.y)));
  const o = outline(t), old = oldShape(t);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const isLit = lit.has(x + ',' + y), inO = o.segs.length && C.bladeTouches(o.segs, {x, y, w:0, h:0}, o.pad),
          inOld = old.segs.length && C.bladeTouches(old.segs, {x, y, w:0, h:0}, old.pad);
    const col = isLit ? (inO ? [240, 128, 32] : [255, 30, 30]) : inO ? [40, 170, 220] : inOld ? [110, 50, 120] : (x === 0 || y === 0 ? [60, 60, 60] : null);
    if (!col) continue;
    for (let sy = 0; sy < SC; sy++) for (let sx = 0; sx < SC; sx++) {
      const i = (((y - Y0) * SC + sy) * PW * PANELS.length + (k * PW + (x - X0) * SC + sx)) * 3;
      img[i] = col[0]; img[i + 1] = col[1]; img[i + 2] = col[2];
    }
  }
});
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
fs.mkdirSync('qa/rising-hit', { recursive: true });
fs.writeFileSync(`qa/rising-hit/shape-${label}.png`, png(PW * PANELS.length, PH, img));
fs.writeFileSync(`qa/rising-hit/report-${label}.json`, JSON.stringify(report, null, 1));

console.log(`== shape (${label}): covered% / stray% of the hit shape`);
for (const r of report.shape) {
  const f = m => m ? `${m.covered}/${m.stray}` : '-';
  console.log(`t ${r.t.toFixed(2)} cells ${String(r.cells).padStart(4)}  old ${f(r.old).padEnd(11)} x1.00 ${f(r['outline x1.00']).padEnd(11)} x1.25 ${f(r['outline x1.25']).padEnd(11)} x1.40 ${f(r['outline x1.40'])}`);
}
console.log(`== timing (${label})`);
for (const r of report.timing)
  console.log(`${r.target.padEnd(30)} flame over it ${String(r.flameOverItAt).padEnd(6)} first bite ${String(r.firstBiteAt).padEnd(6)} bites [${r.bites.join(', ')}] damage ${r.damage}`);
console.log(`wrote qa/rising-hit/shape-${label}.png and report-${label}.json`);
