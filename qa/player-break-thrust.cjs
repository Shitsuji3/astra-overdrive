const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='2386386';
function rig(old){const box={};vm.createContext(box);for(const f of ['assets/run-rig-v6.js','assets/saber-rig.js'])vm.runInContext(old?cp.execFileSync('git',['show',base+':'+f],{encoding:'utf8'}):fs.readFileSync(f,'utf8'),box);return box.AstraSaberRig}
const old=rig(true),now=rig(false);let matched=0;
for(let i=1;i<80;i++){const t=i/100,op=old.pose(6,t),np=now.pose(6,t),a=old.thrust(op),b=now.thrust(np);if(a.orb){assert.ok(Math.abs(b.orb.rx/a.orb.rx-1.5)<1e-9);assert.ok(Math.abs(b.orb.ry/a.orb.ry-1.5)<1e-9)}if(a.lance){assert.ok(Math.abs(b.lance.len/a.lance.len-1.5)<1e-9);assert.ok(Math.abs(b.lance.thick/a.lance.thick-1.5)<1e-9)}const ab=old.blade(op),bb=now.blade(np);if(ab.visible){assert.ok(Math.abs((bb.tip.x-bb.root.x)/(ab.tip.x-ab.root.x)-1.5)<1e-8);matched++}}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('[data-action=launch-stage]').first().click();await page.waitForTimeout(700);
const result=await page.evaluate(async()=>{
  const s=game.state;s.enemies=[];s.boss=null;s.player.x=300;s.player.y=270;s.camera.x=60;s.message='';s.player.hp=0;game._die();
  const initialOverlay=!document.querySelector('#overlay').hidden;
  await new Promise(r=>setTimeout(r,130));const progressed=s.deathFx.time>0;
  game.running=false;cancelAnimationFrame(game.raf);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const c=canvas.getContext('2d');
  const board=document.createElement('canvas');board.width=1280;board.height=720;const bc=board.getContext('2d');
  for(let i=0;i<4;i++){s.deathFx.time=[.1,.36,.63,.96][i];AstraRenderer.draw(c,s);bc.drawImage(canvas,(i%2)*640,Math.floor(i/2)*360)}
  const death=board.toDataURL();game._deathTick(2);const resultShown=!document.querySelector('#overlay').hidden;
  game.retry();game.running=false;cancelAnimationFrame(game.raf);const q=game.state,p=q.player;p.x=300;p.y=270;p.facing=1;p.saberFacing=1;p.saberCombo=6;p.saberTime=AstraCombat.thrust.span*.5;q.camera.x=60;q.enemies=[];q.message='';
  const boundary=[];
  for(const face of [-1,1]){p.saberFacing=face;const segs=AstraCombat.saberSweep(p),seg=segs[segs.length-1],x=(seg.ax+seg.bx)/2,y=seg.ay;
    boundary.push(AstraCombat.bladeTouches(segs,{x:x,y:y+12,w:1,h:1},AstraCombat.saberPad(p)));
    boundary.push(!AstraCombat.bladeTouches(segs,{x:x,y:y+30,w:1,h:1},AstraCombat.saberPad(p)));
  }
  p.saberFacing=1;AstraRenderer.draw(c,q);const thrust=canvas.toDataURL();
  return {initialOverlay,progressed,resultShown,retryClean:!q.deathFx,boundary,death,thrust};
});assert.equal(result.initialOverlay,false);assert.equal(result.progressed,true);assert.equal(result.resultShown,true);assert.equal(result.retryClean,true);assert.ok(result.boundary.every(Boolean));assert.deepEqual(errors,[]);
const dir='qa/player-break-thrust';fs.mkdirSync(dir,{recursive:true});for(const key of ['death','thrust']){fs.writeFileSync(dir+'/'+key+'.png',Buffer.from(result[key].split(',')[1],'base64'));delete result[key]}fs.writeFileSync(dir+'/verification.json',JSON.stringify({matched, ...result,errors},null,2));console.log({matched,...result,errors});
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
