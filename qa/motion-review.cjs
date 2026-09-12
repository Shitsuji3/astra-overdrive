const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'motion-preview');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')&&!m.text().startsWith('Failed to load resource'))errors.push(m.text())});
  await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();await page.waitForTimeout(2000);
  await page.evaluate(()=>{
   game.running=false;cancelAnimationFrame(game.raf);game.raf=0;AstraAudio.stop();
   window.reviewDraws=[];const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im.src?.includes('player-'))reviewDraws.push({src:im.src,args});return original.call(this,im,...args);};
  });
  const states=[];
  for(let i=0;i<4;i++)states.push(['idle-'+i,{animTime:i*.7}]);
  for(let i=0;i<16;i++)states.push(['run-'+i,{vx:190,runTime:(i+.05)*.0525,animTime:(i+.05)*.0525}]);
  const frameStarts=[0,.02,.05,.08,.12,.18,.24,.28];
  for(let stage=1;stage<=3;stage++)for(let i=0;i<8;i++)states.push(['saber-stage'+stage+'-'+i,{saberTime:.32-frameStarts[i]-.001,saberFacing:1,saberCombo:stage,animTime:0}]);
  states.push(['run-left',{vx:-190,facing:-1,runTime:.35,animTime:.35}],['run-after-dash',{vx:190,dashTime:-.006,runTime:.35,animTime:.35}],['saber-left',{saberTime:.22,saberFacing:-1,facing:-1}],['charge',{charge:1}],['air',{onGround:false,y:230}]);
  const records=[];
  for(const [name,values] of states){
   await page.evaluate(v=>{
    game.start();game.running=false;const s=game.state,p=s.player;
    s.time=0;s.camera.x=0;s.enemies=[];s.pickups=[];s.bullets=[];s.particles=[];s.message='';s.messageTimer=0;
    Object.assign(p,{x:230,y:270,vx:0,vy:0,animTime:0,facing:1,charge:0,shootPoseTime:0,onGround:true,saberTime:0,dashTime:0,runTime:0},v);
    const c=document.querySelector('canvas');AstraRenderer.draw(c.getContext('2d'),s);
   },values);
   await page.waitForTimeout(100);
   const r=await page.evaluate(()=>{
    reviewDraws=[];const s=game.state,p=s.player,c=document.querySelector('canvas');AstraRenderer.draw(c.getContext('2d'),s);
    return {image:c.toDataURL(),state:{x:p.x,y:p.y,w:p.w,h:p.h,invuln:p.invuln},frame:AstraCombat.frame(p),runFrame:AstraCombat.runFrame?.(p),saberFrame:AstraCombat.saberFrame?.(p),saberCombo:p.saberCombo||0,muzzle:AstraCombat.muzzle(p),idle:AstraCombat.idleOffset?.(p),draws:reviewDraws};
   });
   fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.image.split(',')[1],'base64'));delete r.image;records.push({name,...r});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'records.json'),JSON.stringify(records,null,2));console.log(JSON.stringify({frames:records.length,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
