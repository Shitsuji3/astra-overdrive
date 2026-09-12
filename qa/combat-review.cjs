const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'combat-v2');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();
  await page.waitForTimeout(400);
  await page.evaluate(()=>{game.running=false;cancelAnimationFrame(game.raf);game.raf=0;});
  const cases=[
   ['idle',{}],['charging',{charge:.3}],['ready',{charge:.65}],['full',{charge:1}],
   ['left-ready',{charge:.65,facing:-1}],['air-ready',{charge:.65,onGround:false,y:220}],
   ['dash-ready',{charge:.65,dashTime:.14,vx:560}],['reduced-motion',{charge:1,reducedMotion:true}],
   ['projectiles',{projectiles:true,shootPoseTime:.12}],
  ];
  const records=[];
  for(const [name,variant] of cases){
   const record=await page.evaluate(v=>{
    game.start();game.running=false;
    const s=game.state,p=s.player;s.time=2;s.camera.x=0;s.enemies=[];s.pickups=[];s.bullets=[];s.particles=[];s.message='';s.messageTimer=0;
    Object.assign(p,{x:230,y:270,vx:0,vy:0,animTime:2,facing:1,charge:0,shootPoseTime:0,onGround:true},v);
    s.reducedMotion=!!v.reducedMotion;
    const muzzle=AstraCombat.muzzle(p);
    if(v.projectiles){s.bullets=[{x:muzzle.x+32,y:muzzle.y,vx:500,vy:0,r:4,team:'player',charged:false,power:1},{x:muzzle.x+95,y:muzzle.y,vx:410,vy:0,r:6,team:'player',charged:true,power:3}];}
    AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),s);
    return {frame:AstraCombat.frame(p),muzzle,charge:p.charge};
   },variant);
   await page.locator('canvas').screenshot({path:path.join(out,name+'.png')});
   records.push({name,...record});
  }
  assert.deepEqual(errors,[],'no canvas/renderer errors');
  fs.writeFileSync(path.join(out,'records.json'),JSON.stringify({records,errors},null,2));
  console.log(JSON.stringify({scenes:records.length,errors,records},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
