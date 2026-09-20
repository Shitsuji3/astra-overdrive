const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('qa/rush-ux',{recursive:true});
await p.goto('http://127.0.0.1:4173/');await p.locator('[data-action=boss-rush]').click();
await p.evaluate(()=>{game.running=false;cancelAnimationFrame(game.raf);game.state.bossIntro=null;game._tick(.01);});
const draw=()=>p.evaluate(()=>AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),game.state));
await p.evaluate(()=>{const s=game.state;s.player.hp=6;game._registerHit();s.mastery.ready=1.1;s.player.saberTime=1;s.player.saberCombo=7;s.player.fanCharge=.85;});
await draw();await p.waitForTimeout(500);await draw();await p.screenshot({path:'qa/rush-ux/hud.png'});
await p.evaluate(()=>{const s=game.state;game._bossDown(s.boss);s.boss.downTime=.9;});await draw();await p.screenshot({path:'qa/rush-ux/recovery.png'});
assert.equal(await p.evaluate(()=>game.state.feedback.recovery.healed),2);
await p.evaluate(()=>{game.state.boss.downTime=1.7;});await draw();await p.screenshot({path:'qa/rush-ux/next.png'});
await p.evaluate(()=>{game._bossDying(game.state.boss,1);game.state.bossIntro=null;const s=game.state,b=s.boss;b.hp=b.maxHp*.12;s.player.hp=1;s.player.invuln=0;s.player.saberTime=0;s.player.saberCombo=0;game._spawn(s.player.x+10,s.player.y+10,0,0,'enemy',false,1,{source:{boss:b.id,move:'crescent'}});game._bullets(0);game._deathTick(2);});
await p.waitForTimeout(700);assert.match(await p.locator('#overlay-copy').textContent(),/12%/);const btn=p.locator('[data-action=defeat-practice]');assert.equal(await btn.getAttribute('data-move'),'crescent');await p.screenshot({path:'qa/rush-ux/defeat.png'});
await btn.focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>game.state.practice.move),'crescent');
await p.keyboard.press('Escape');assert.equal(await p.locator('[data-action=rush-return]').count(),1);await p.locator('[data-action=rush-return]').click();assert.equal(await p.evaluate(()=>game.state.practice),undefined);assert.equal(await p.evaluate(()=>game.state.bossIndex),0);
await p.setViewportSize({width:960,height:600});await draw();await p.screenshot({path:'qa/rush-ux/compact.png'});
assert.deepEqual(errors,[]);console.log('HUD, capped healing, next boss, fatal move, keyboard practice, return to rush, compact render: PASS');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
