// Draws each stage's hit area over the character it belongs to, so the reach can be compared
// against the motion by eye.
const fs = require('fs'), vm = require('vm');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){},
  requestAnimationFrame(){}, cancelAnimationFrame(){}, navigator:{getGamepads:()=>[]} };
vm.createContext(ctx); ctx.globalThis = ctx;
for (const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'), ctx);
const C = ctx.AstraCombat;

const STEP = 4;
function grid(stage, elapsed){
  const g = new ctx.NeonGame(null); g.start();
  const p = g.state.player;
  Object.assign(p, {x:400, y:270, vx:0, vy:0, onGround:true, facing:1,
    saberFacing:1, saberCombo:stage, saberTime:C.saberDuration-elapsed});
  const segs = C.saberSweep(p), ox = p.x+p.w/2, oy = p.y+p.h, cells = [];
  for (let dy=-120; dy<=40; dy+=STEP)
    for (let dx=-100; dx<=110; dx+=STEP)
      if (C.bladeTouches(segs, {x:ox+dx-6, y:oy+dy-6, w:12, h:12})) cells.push([dx,dy]);
  return cells;
}
const data = [1,2,3].map(stage => {
  const times = C.saberHitTimes[stage-1];
  const merged = new Map();
  for (const t of times) for (const c of grid(stage,t)) merged.set(c[0]+','+c[1], c);
  return {stage, times, phase: times[0]/C.saberDuration, cells:[...merged.values()]};
});
const legacy = {forward: C.saberRange, vertical: 55};

(async()=>{
const br = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
  await page.waitForTimeout(800);
  const png = await page.evaluate(async ({data, legacy, STEP}) => {
    game.running=false; cancelAnimationFrame(game.raf); AstraAudio.stop();
    const img = new Image(); img.src='assets/player-run-v4.svg'; await img.decode();
    const S=4, W=220, H=170, c=document.createElement('canvas');
    c.width=data.length*W*S; c.height=H*S;
    const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
    x.fillStyle='#0d1f2b'; x.fillRect(0,0,c.width,c.height);
    data.forEach((d,i)=>{
      const ox=i*W*S;
      x.save(); x.beginPath(); x.rect(ox,0,W*S,H*S); x.clip();
      x.translate(ox+W*S*0.42, H*S-22*S); x.scale(S,S);
      // the old fixed box, for comparison
      x.strokeStyle='#7c4a4a'; x.setLineDash([3,3]); x.lineWidth=1/S;
      x.strokeRect(0, -20-legacy.vertical, legacy.forward, legacy.vertical*2);
      x.setLineDash([]);
      x.fillStyle='rgba(90,225,160,.34)';
      for (const [dx,dy] of d.cells) x.fillRect(dx-STEP/2, dy-STEP/2, STEP, STEP);
      x.strokeStyle='#3d6070'; x.lineWidth=1/S;
      x.beginPath(); x.moveTo(-90,0); x.lineTo(105,0); x.stroke();
      AstraSaberRig.draw(x, {x:0,y:0,facing:1,stage:d.stage,phase:d.phase,image:img});
      x.restore();
      x.fillStyle='#eaf6ff'; x.font='15px monospace';
      x.fillText(`stage ${d.stage}  cuts at ${d.times.join(', ')}s`, ox+10, 22);
      x.fillStyle='#c8a0a0'; x.font='12px monospace';
      x.fillText('dashed = the old fixed box', ox+10, 40);
      x.strokeStyle='#2b4b5c'; x.strokeRect(ox+.5,.5,W*S-1,H*S-1);
    });
    return c.toDataURL();
  }, {data, legacy, STEP});
  fs.writeFileSync('qa/saber-reach-map.png', Buffer.from(png.split(',')[1],'base64'));
  console.log('reach map written');
} finally { await br.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
