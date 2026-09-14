const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('[data-action=launch-stage]').first().click();await page.waitForTimeout(650);
 await page.evaluate(()=>{game.start({stage:'gauntlet'});game.running=false;cancelAnimationFrame(game.raf);const p=game.state.player;p.x=320;p.y=270;p.onGround=true;game.state.camera.x=80;});
 await page.keyboard.down('ArrowDown');await page.locator('#game').click({button:'right'});
 const input=await page.evaluate(()=>{game._tick(1/60);return {stage:game.state.player.saberCombo,down:game.input.down}});await page.keyboard.up('ArrowDown');assert.equal(input.stage,7);assert.equal(input.down,true);
 const result=await page.evaluate(()=>{
   const s=game.state,p=s.player;const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const c=canvas.getContext('2d');
   const board=document.createElement('canvas');board.width=1280;board.height=480;const bc=board.getContext('2d');bc.imageSmoothingEnabled=false;
   let elapsed=1/60;const phases=[.02,.12,.22,.4,.55,.68,.76,.95];
   for(let i=0;i<phases.length;i++){while(elapsed<phases[i]*AstraCombat.fan.span){game._tick(1/60);elapsed+=1/60}s.camera.x=80;s.message='';s.shake=0;AstraRenderer.draw(c,s);bc.drawImage(canvas,172,198,160,120,(i%4)*320,Math.floor(i/4)*240,320,240);}
   const motion=board.toDataURL();AstraRenderer.draw(c,s);const fan=canvas.toDataURL();
   // All directional variants and reduced-motion settings use finite, reachable poses.
   let poses=0;for(const reduced of [false,true])for(const face of [-1,1])for(let j=0;j<=60;j++){p.saberFacing=face;p.saberCombo=7;p.saberTime=AstraCombat.fan.span*(1-j/61);s.reducedMotion=reduced;AstraRenderer.draw(c,s);const q=AstraSaberRig.pose(7,j/61);if(!Number.isFinite(q.hand.x)||Math.hypot(q.hand.x-q.shoulder.x,q.hand.y-q.shoulder.y)>17.001)throw Error('invalid hand');poses++;}
   return {motion,fan,poses,orbs:s.bullets.filter(b=>b.kind==='fan-orb').length};
 });assert.equal(result.orbs,7);assert.deepEqual(errors,[]);fs.mkdirSync('qa/fan-burst',{recursive:true});for(const key of ['motion','fan']){fs.writeFileSync('qa/fan-burst/'+key+'.png',Buffer.from(result[key].split(',')[1],'base64'));delete result[key]}
 fs.writeFileSync('qa/fan-burst/verification.json',JSON.stringify({input,...result,errors},null,2));console.log({input,...result,errors});
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
