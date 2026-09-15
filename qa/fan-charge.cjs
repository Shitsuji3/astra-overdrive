const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('[data-action=launch-stage]').first().click();await page.waitForTimeout(700);
 await page.evaluate(()=>{game.start({stage:'gauntlet'});game.running=false;cancelAnimationFrame(game.raf);const p=game.state.player;p.x=320;p.y=270;p.onGround=true;game.state.camera.x=80;game._enemies=()=>{};game._boss=()=>{};});
 await page.keyboard.down('ArrowDown');await page.locator('#game').hover();await page.mouse.down({button:'right'});
 const held=await page.evaluate(()=>{for(let i=0;i<100;i++)game._tick(1/60);AstraRenderer.draw(document.querySelector('#game').getContext('2d'),game.state);return{level:AstraCombat.fanLevel(game.state.player),orbs:game.state.bullets.length};});
 assert.equal(held.level,3);assert.equal(held.orbs,0);
 fs.mkdirSync('qa/fan-charge',{recursive:true});await page.locator('#game').screenshot({path:'qa/fan-charge/charge.png'});
 await page.mouse.up({button:'right'});await page.keyboard.up('ArrowDown');
 const fired=await page.evaluate(()=>{const shots=[],old=game._spawn.bind(game);game._spawn=(...a)=>{const b=old(...a);shots.push(b);return b;};for(let i=0;i<31;i++)game._tick(1/60);AstraRenderer.draw(document.querySelector('#game').getContext('2d'),game.state);return{count:shots.length,powers:shots.map(b=>b.power)};});
 assert.equal(fired.count,21);assert.ok(fired.powers.every(n=>n===9));await page.locator('#game').screenshot({path:'qa/fan-charge/release.png'});assert.deepEqual(errors,[]);
 fs.writeFileSync('qa/fan-charge/verification.json',JSON.stringify({held,fired,errors},null,2));console.log({held,fired,errors});
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
