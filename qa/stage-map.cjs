// Draws every stage to its own strip so the layouts can be read side by side.
// Writes qa/stage-map-<id>.png, one file per stage.
const fs = require('fs'), vm = require('vm');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){},
  requestAnimationFrame(){}, cancelAnimationFrame(){}, navigator:{getGamepads:()=>[]} };
for (const f of ['assets/bosses.js','assets/stages.js'])
  vm.runInNewContext(fs.readFileSync(f,'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('game.js','utf8'), {...ctx, globalThis:ctx});
function survey(id){
  const g = new ctx.NeonGame(null); g.start({stage:id});
  const def = ctx.AstraCombat.stage;
  // section bands carry a limit; the map wants the x each one starts at
  let at = 0;
  const sections = def.sections.map(b => { const from = at; at = b.to === undefined ? at : b.to; return [from, b.name]; });
  return {
    id: def.id, name: def.name, number: def.number,
    worldWidth: g.worldWidth,
    platforms: g.state.platforms.map(q=>({x:q.x,y:q.y,w:q.w,h:q.h,type:q.type})),
    enemies: g.state.enemies.map(e=>({x:e.x,y:e.y,type:e.type})),
    pickups: g.state.pickups.map(u=>({x:u.x,y:u.y,type:u.type})),
    checkpoints: ctx.AstraCombat.checkpoints.map(m=>({at:m.at,x:m.x})),
    arena: ctx.AstraCombat.arena,
    sections
  };
}
const levels = ctx.AstraStages.list.map(s => survey(s.id));
(async()=>{
const br = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page = await br.newPage();
  for (const level of levels){
  const png = await page.evaluate(L => {
    const S = 0.42, H = 360, rows = 3, perRow = Math.ceil(L.worldWidth/rows);
    const c = document.createElement('canvas');
    c.width = Math.ceil(perRow*S)+40; c.height = rows*(H*S+42)+10;
    const x = c.getContext('2d');
    x.fillStyle='#0b1a24'; x.fillRect(0,0,c.width,c.height);
    for (let r=0;r<rows;r++){
      const x0 = r*perRow, x1 = x0+perRow, top = r*(H*S+42)+30;
      x.save(); x.translate(20 - x0*S, top); x.scale(S,S);
      const inRange = q => q.x < x1 && q.x+q.w > x0;
      for (const q of L.platforms) if (inRange(q)) {
        x.fillStyle = q.type==='floor' ? '#2c5566' : '#3f7f92';
        x.fillRect(q.x, q.y, q.w, Math.max(q.h,10));
      }
      for (const e of L.enemies) if (e.x>=x0 && e.x<x1) {
        x.fillStyle = e.type==='drone' ? '#b07ce8' : e.type==='turret' ? '#e2a33c' : '#e05a5a';
        x.beginPath(); x.arc(e.x, e.y, 13, 0, 7); x.fill();
      }
      for (const u of L.pickups) if (u.x>=x0 && u.x<x1) {
        x.fillStyle = u.type==='health' ? '#5fe08a' : '#5fd4e0';
        x.fillRect(u.x-9, u.y-9, 18, 18);
      }
      for (const m of L.checkpoints) if (m.x>=x0 && m.x<x1) {
        x.strokeStyle='#ffd24d'; x.lineWidth=6;
        x.beginPath(); x.moveTo(m.x, 40); x.lineTo(m.x, 320); x.stroke();
      }
      x.strokeStyle='#ff6a6a'; x.lineWidth=6;
      if (L.arena.gate>=x0 && L.arena.gate<x1){x.beginPath();x.moveTo(L.arena.gate,20);x.lineTo(L.arena.gate,330);x.stroke();}
      x.restore();
      x.strokeStyle='#25485c'; x.strokeRect(20, top, perRow*S, H*S);
      x.fillStyle='#cfe6f2'; x.font='15px monospace';
      x.fillText(`${L.number}. ${L.name}   x ${x0} – ${x1}`, 22, top-8);
      for (const [sx,name] of L.sections) if (sx>=x0 && sx<x1) {
        x.fillStyle='#ffe08a'; x.fillText(name, 20+(sx-x0)*S+4, top+16);
        x.strokeStyle='#6a5a2a'; x.lineWidth=1;
        x.beginPath(); x.moveTo(20+(sx-x0)*S, top); x.lineTo(20+(sx-x0)*S, top+H*S); x.stroke();
      }
    }
    return c.toDataURL();
  }, level);
  fs.writeFileSync(`qa/stage-map-${level.id}.png`, Buffer.from(png.split(',')[1],'base64'));
  console.log(`map written: qa/stage-map-${level.id}.png  ${level.worldWidth}px`);
  }
} finally { await br.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
