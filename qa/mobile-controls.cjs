// Browser input QA: actual multi-touch events, not calls that skip the touch controller.
const assert = require('node:assert/strict'), fs = require('node:fs');
const {chromium} = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const URL = process.env.GAME_URL || 'http://127.0.0.1:4173/';
(async () => {
  fs.mkdirSync('qa/mobile-controls', {recursive:true});
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results = [], errors = [];
  try {
    const context = await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL); await page.locator('[data-action=boss-rush]').tap();
    await page.waitForTimeout(650);
    async function reset() {
      await page.evaluate(() => {
        game.running=false; cancelAnimationFrame(game.raf); game.raf=0;
        game.startPractice('warden','shears'); game.running=false; cancelAnimationFrame(game.raf); game.raf=0;
        game.state.bossIntro=null; game.state.boss.active=false; game.state.enemies=[];
        const p=game.state.player;
        p.x=AstraCombat.arena.gate+60; p.y=310-p.h; p.onGround=true; p.vx=0; p.vy=0; p.invuln=999;
        AstraRenderer.draw(document.querySelector('#game').getContext('2d'),game.state);
      });
    }
    const cdp = await context.newCDPSession(page), fingers = new Map();
    async function event(type) {
      await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:Array.from(fingers.values())});
      // Pointer moves may be coalesced until the next browser frame.
      await page.waitForTimeout(25);
    }
    async function point(selector) {
      const r=await page.locator(selector).boundingBox(); assert.ok(r);
      return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width};
    }
    async function down(id,p) { fingers.set(id,{id,x:p.x,y:p.y,radiusX:4,radiusY:4}); await event('touchStart'); }
    async function move(id,p) { Object.assign(fingers.get(id),{x:p.x,y:p.y}); await event('touchMove'); }
    async function up(id) {
      const ending = fingers.get(id); fingers.delete(id);
      await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[ending]});
    }
    async function step(n=1) { await page.evaluate(n=>{for(let i=0;i<n;i++)game._tick(1/60);},n); }
    async function input() { return page.evaluate(()=>({...game.touchInput})); }
    async function cancel() { fingers.clear(); await event('touchCancel'); }
    await reset();
    let stick=await point('.touch-stick'), shoot=await point('[data-input=shoot]'), saber=await point('[data-input=saber]'), jump=await point('[data-input=jump]');
    await down(1,stick); assert.ok(!Object.values(await input()).some(Boolean));
    await move(1,{x:stick.x+stick.width*.3,y:stick.y}); assert.equal((await input()).right,true);
    await down(2,saber); await down(3,jump); await step(4);
    assert.ok(await page.evaluate(()=>game.state.player.vx>0 && game.state.player.vy<0 && game.state.player.saberCombo===1));
    await up(3); assert.equal((await input()).saber,true); assert.equal((await input()).right,true);
    await up(2); await move(1,{x:stick.x-stick.width*.3,y:stick.y}); await step(4);
    assert.equal((await input()).left,true); assert.equal((await input()).right,false);
    await move(1,stick); assert.equal((await input()).left,false); await up(1);
    results.push('real three-finger move + saber + jump, slide reversal and stick dead zone');
    await reset(); await down(1,shoot); await down(2,shoot); await step(); await up(1);
    assert.equal((await input()).shoot,true); await step(); assert.equal(await page.evaluate(()=>game.state.shots),0);
    await up(2); await step(2); assert.equal(await page.evaluate(()=>game.state.shots),1);
    await page.dispatchEvent('[data-input=shoot]','lostpointercapture',{pointerId:2}); await step(5);
    assert.equal(await page.evaluate(()=>game.state.shots),1);
    results.push('two fingers on one button retain ownership; release fires exactly once');
    await reset(); await down(1,shoot); await step(2); await move(1,jump); await step();
    assert.equal((await input()).shoot,false); assert.equal((await input()).jump,true);
    assert.ok(await page.evaluate(()=>game.state.player.vy<0)); await up(1);
    await reset(); await down(1,saber); await step(100); assert.equal(await page.evaluate(()=>game.state.player.saberCharge),1);
    await up(1); await step(); assert.equal(await page.evaluate(()=>game.state.player.saberCombo),6);
    results.push('sliding between actions; saber long hold and released thrust');
    for (const [direction,combo] of [['up',4],['down',7]]) {
      await reset(); await down(1,stick); await move(1,{x:stick.x,y:stick.y+(direction==='up'?-1:1)*stick.width*.3});
      await down(2,saber); await step(); assert.equal(await page.evaluate(()=>game.state.player.saberCombo),combo);
      if (combo===7) {await step(100); assert.equal(await page.evaluate(()=>game.state.player.fanCharge),1.4);}
      await up(2); await step(); if(combo===7) assert.equal(await page.evaluate(()=>game.state.player.fanReleased),true);
      await up(1);
    }
    results.push('stick up + saber rising slash, down + held saber full three-wave fan');
    await reset(); await down(1,shoot); await down(2,saber); await step(100); await cancel(); await step();
    assert.equal(await page.evaluate(()=>game.state.shots),0);
    assert.notEqual(await page.evaluate(()=>game.state.player.saberCombo),6);
    assert.ok(!Object.values(await input()).some(Boolean));
    results.push('OS touch cancellation clears input without firing held attacks');
    await reset(); await down(1,saber); await step(100); await down(2,await point('[data-input=pause]'));
    assert.equal(await page.evaluate(()=>game.state.mode),'paused');
    assert.ok(!Object.values(await input()).some(Boolean)); assert.equal(await page.locator('.is-pressed').count(),0);
    await up(1); await up(2); await page.locator('[data-action=resume]').tap();
    await page.evaluate(()=>{game.running=false;cancelAnimationFrame(game.raf);game.raf=0;}); await step();
    assert.notEqual(await page.evaluate(()=>game.state.player.saberCombo),6);
    results.push('pause while charging puts controls away; resume has no phantom attack');
    await reset(); await down(1,shoot); await step(); await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(150); assert.ok(!Object.values(await input()).some(Boolean)); await up(1); await step();
    assert.equal(await page.evaluate(()=>game.state.shots),0);
    results.push('rotation cancels held input safely');
    for (const [width,height] of [[320,568],[390,844],[667,375],[844,390],[1024,768]]) {
      await page.setViewportSize({width,height}); await page.waitForTimeout(100);
      const bounds = await page.locator('.touch-controls button,.touch-stick').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};}));
      assert.ok(bounds.every(r=>r.x>=0 && r.y>=0 && r.right<=width+.1 && r.bottom<=height+.1 && r.w>=44 && r.h>=44),JSON.stringify({width,height,bounds}));
      const l=await page.locator('.touch-stick').boundingBox(),r=await page.locator('.touch-actions').boundingBox(); assert.ok(l.x+l.width+8<r.x);
      if(width===390 || width===844) await page.screenshot({path:`qa/mobile-controls/${width>height?'landscape':'portrait'}.png`});
    }
    results.push('320px phone through tablet: controls in bounds, no overlap, minimum 44px targets');
    await page.locator('[data-input=pause]').tap(); await page.locator('[data-action=title]').tap();
    await page.locator('[data-action=help-menu]').tap(); await page.locator('#modal [data-action=settings]').tap();
    await page.locator('#touch-size').evaluate(el=>{el.value='125';el.dispatchEvent(new Event('input'));el.dispatchEvent(new Event('change'));});
    assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--touch-scale')),'1.25');
    await page.reload(); await page.locator('[data-action=boss-rush]').tap();
    assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--touch-scale')),'1.25');
    await page.setViewportSize({width:320,height:568}); await page.waitForTimeout(100);
    assert.ok(await page.locator('.touch-controls button').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.right<=320 && r.width>=44;})));
    results.push('control size saves across reload; larger preset still fits a 320px phone');
    const desktop=await browser.newPage({viewport:{width:1280,height:720}});
    await desktop.goto(URL); await desktop.locator('[data-action=boss-rush]').click();
    assert.equal(await desktop.locator('.touch-controls').isVisible(),false);
    results.push('desktop controls remain hidden');
    assert.deepEqual(errors,[]);
    fs.writeFileSync('qa/mobile-controls/results.json',JSON.stringify({results,errors},null,2));
    console.log(JSON.stringify({results,errors},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
