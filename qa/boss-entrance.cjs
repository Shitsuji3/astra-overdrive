const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('qa/boss-entrance',{recursive:true});await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=boss-rush]').click();
 await page.evaluate(()=>{game.running=false;cancelAnimationFrame(game.raf);});
 const ids=await page.evaluate(()=>AstraBosses.list.map(b=>b.id));
 for(const id of ids){
  await page.evaluate(id=>{game._spawnBoss(id);game.state.bossIntro.time=.8;AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),game.state);},id);
  await page.waitForTimeout(250);
  await page.evaluate(()=>AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),game.state));
  await page.screenshot({path:'qa/boss-entrance/'+id+'.png'});
  const result=await page.evaluate(()=>{const s=game.state,attack=s.boss.attack,hp=s.player.hp,time=s.timeElapsed;for(let n=0;n<60;n++)game._tick(1/60);return{intro:s.bossIntro,attack:s.boss.attack,expected:attack,hp:s.player.hp,oldHp:hp,time:s.timeElapsed,oldTime:time};});
  assert.equal(result.intro,null);assert.equal(result.hp,result.oldHp);assert.ok(result.time>=result.oldTime);
 }
 await page.evaluate(()=>{game._spawnBoss('gravelock');game.state.bossIntro.time=.2;AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),game.state);});
 await page.screenshot({path:'qa/boss-entrance/arrival.png'});
 await page.evaluate(()=>{game.setOptions({reducedMotion:true});AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),game.state);});
 await page.screenshot({path:'qa/boss-entrance/reduced-motion.png'});
 assert.deepEqual(errors,[]);console.log('8 boss entrances, combat resume, reduced motion render: PASS; browser errors: 0');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
