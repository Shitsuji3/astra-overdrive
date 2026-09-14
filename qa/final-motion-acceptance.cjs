const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];try{
for(const protocol of ['http','file']){
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(protocol==='http'?'http://127.0.0.1:4173/':'file:///C:/Users/situz/Documents/ChatGPT/Astragemes/index.html');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(2000);
 await page.evaluate(()=>{const s=game.state;s.enemies=[];s.pickups=[];s.platforms=[{x:-100,y:310,w:10000,h:50,type:'floor'}];s.player.x=1500;s.player.hp=8;window.observedRun=new Set();window.spawned=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im.src?.endsWith('player-run-v4.svg'))observedRun.add(args[0]+','+args[1]);return draw.call(this,im,...args)};const spawn=game._spawn;game._spawn=function(...args){spawned.push(args);return spawn.apply(this,args)};});
 const box=await page.locator('canvas').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 for(const key of ['d','a']){
  await page.evaluate(()=>{game.state.player.x=1500;observedRun.clear();spawned=[];});await page.keyboard.down(key);await page.mouse.down({button:'left'});await page.waitForTimeout(2000);
  const held=await page.evaluate(()=>({frames:observedRun.size,charge:game.state.player.charge,facing:game.state.player.facing,mode:game.state.mode}));assert.equal(held.frames,16);assert.equal(held.charge,1);assert.equal(held.facing,key==='d'?1:-1);assert.equal(held.mode,'playing');
  await page.mouse.up({button:'left'});await page.waitForTimeout(80);await page.keyboard.up(key);assert.equal(await page.evaluate(()=>spawned.filter(a=>a[4]==='player'&&a[5]===true&&a[6]===3).length),1);
 }
 const visual=await page.evaluate(()=>{
  game.running=false;cancelAnimationFrame(game.raf);game.raf=0;AstraAudio.stop();
  const cells=[0,14,5,4,8,9,7,6,10,2,3,12,11,1,13,15],edges=[0,314,627,940,1254];
  const mx=[266.5,248,247,240.5,264.5,246.5,244,239,264.5,248,241,236.5,258.5,241,247.5,239],my=[167,171.5,167,169,146.5,141.5,142.5,150,134.5,138,140.5,134.5,113.5,114,110.5,115.5];
  const head=[77,82,80,80,62,57,57,63,45,50,51,45,25,26,21,26],bottom=[304,301,301,301,286,284,269,276,260,262,262,262,247,247,249,250];
  const rows=[],canvas=document.querySelector('canvas'),c=canvas.getContext('2d');let capture=null;const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(im,...a){if(im.src?.endsWith('player-run-v4.svg'))capture={a,t:Array.from([this.getTransform().a,this.getTransform().d,this.getTransform().e,this.getTransform().f])};return draw.call(this,im,...a)};
  for(const facing of [1,-1])for(let f=0;f<16;f++){
   game.start();const s=game.state,p=s.player;s.time=0;s.camera.x=0;s.shake=0;s.enemies=[];s.bullets=[];s.particles=[];s.pickups=[];s.message='';Object.assign(p,{x:230,y:270,vx:facing*190,vy:0,facing,onGround:true,wallDir:0,dashTime:0,saberTime:0,runTime:(f+.05)*.0525,charge:0,shootPoseTime:.1});
   capture=null;AstraRenderer.draw(c,s);if(!capture)throw Error('Missing run draw');const {a,t}=capture,i=cells[f],scaleX=a[6]/a[2],scaleY=a[7]/a[3];
   const rendered={x:t[2]+t[0]*(a[4]+mx[i]*scaleX),y:t[3]+t[1]*(a[5]+my[i]*scaleY)},m=AstraCombat.muzzle(p);
   rows.push({f,facing,source:[a[0],a[1]],expected:[edges[i%4],edges[Math.floor(i/4)]],delta:Math.hypot(rendered.x-m.x,rendered.y-m.y),headY:t[3]+a[5]+head[i]*scaleY,bottomY:t[3]+a[5]+bottom[i]*scaleY});
  }
  // Cross a frame boundary in the same tick that emits a projectile.
  const boundary=[];for(const facing of [1,-1]){game.start();const p=game.state.player;game.state.enemies=[];game.state.pickups=[];Object.assign(p,{x:1000,y:270,vx:facing*190,vy:0,facing,onGround:true,runTime:.049});game.setInput(facing>0?'right':'left',true);game.setInput('shoot',true);spawned=[];game._tick(1/60);const shot=spawned.find(a=>a[4]==='player');boundary.push({facing,frame:AstraCombat.runFrame(p),dx:shot[0]-(p.x+p.w/2),dy:shot[1]-(p.y+p.h-3)});game.input={};}
  return {rows,boundary};
 });
 for(const r of visual.rows){assert.deepEqual(r.source,r.expected);assert.ok(r.delta<.00001,JSON.stringify(r));assert.ok(Math.abs(r.headY-264.63)<.01);assert.ok(r.bottomY<=310.01);}
 for(const b of visual.boundary){assert.equal(b.frame,1);assert.ok(Math.abs(b.dx-b.facing*16.815)<.00001);assert.ok(Math.abs(b.dy+25.365)<.00001);}
 assert.deepEqual(errors,[]);results.push({protocol,heldChargeRunFrames:16,directions:2,chargedRelease:'one power-3 shot per release',renderedMuzzles:visual.rows.length,maxMuzzleError:Math.max(...visual.rows.map(r=>r.delta)),sameTickBoundaryCases:visual.boundary.length,errors});await page.close();
}
fs.writeFileSync('qa/motion-v4/final-acceptance.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
