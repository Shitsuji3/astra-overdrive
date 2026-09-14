const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
const page=await br.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();await page.waitForTimeout(800);
const result=await page.evaluate(async()=>{
game.start({stage:'gauntlet'});game.running=false;cancelAnimationFrame(game.raf);
const s=game.state;game._spawnBoss('warden');s.player.x=1320;s.player.hp=2;s.camera.x=1100;s.message='';
const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');AstraRenderer.draw(ctx,s);await new Promise(r=>setTimeout(r,200));
s.boss.hp=0;game._boss(.8);s.shake=0;s.flash=0;s.time=3;
const board=document.createElement('canvas');board.width=1280;board.height=720;const bc=board.getContext('2d');
for(let i=0;i<4;i++){s.camera.x=[1100,1600,800,1100][i];s.reducedMotion=i===3;AstraRenderer.draw(ctx,s);bc.drawImage(c,(i%2)*640,Math.floor(i/2)*360)}
const before={hp:s.player.hp,enemies:s.enemies.length,marker:s.nextBossMarker};
game._boss(1.5);const after={id:s.boss.id,marker:s.nextBossMarker,hp:s.player.hp};
return {before,after,png:board.toDataURL()};
});assert.equal(result.before.hp,6);assert.equal(result.before.enemies,0);assert.equal(result.before.marker.id,'tidebreaker');assert.equal(result.after.id,'tidebreaker');assert.equal(result.after.marker,null);assert.equal(result.after.hp,6);assert.deepEqual(errors,[]);
fs.mkdirSync('qa/boss-rush-preview',{recursive:true});fs.writeFileSync('qa/boss-rush-preview/preview.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;fs.writeFileSync('qa/boss-rush-preview/verification.json',JSON.stringify({...result,errors},null,2));console.log({...result,errors});
}finally{await br.close()}})().catch(e=>{console.error(e);process.exit(1)});
