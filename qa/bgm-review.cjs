const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const results=[];
 try{
  for(const url of ['http://127.0.0.1:4173/','file:///C:/Users/situz/Documents/ChatGPT/Astragemes/index.html']){
   const page=await browser.newPage(),errors=[],checks=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__qaAudio=[];
    window.Audio=new Proxy(window.Audio,{construct(Target,args){const audio=Reflect.construct(Target,args);window.__qaAudio.push(audio);return audio;}});
   });
   const check=(name,ok)=>{assert.ok(ok,`${url}: ${name}`);checks.push(name);};
   await page.goto(url);
   check('title is silent',await page.evaluate(()=>window.__qaAudio.every(a=>a.paused)));
   await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
   await page.waitForFunction(()=>window.__qaAudio.length===1&&window.__qaAudio[0].readyState>=3&&window.__qaAudio[0].currentTime>.1);
   check('provided mp3 is decoded with loop enabled',await page.evaluate(()=>{const a=window.__qaAudio[0];return a.currentSrc.endsWith('/assets/stage1-bgm.mp3')&&a.loop&&a.duration>220&&a.duration<222&&!a.error;}));
   check('initial music/master volume is retained',await page.evaluate(()=>Math.abs(window.__qaAudio[0].volume-.45*.8)<.001));
   const before=await page.evaluate(()=>window.__qaAudio[0].currentTime);
   await page.keyboard.press('Escape');await page.waitForTimeout(180);
   const pausedAt=await page.evaluate(()=>window.__qaAudio[0].currentTime);
   await page.waitForTimeout(160);
   check('pause freezes track position',await page.evaluate(t=>{const a=window.__qaAudio[0];return a.paused&&Math.abs(a.currentTime-t)<.015;},pausedAt));
   await page.locator('#overlay [data-action=resume]').click();await page.waitForTimeout(180);
   check('resume continues same position',await page.evaluate(t=>{const a=window.__qaAudio[0];return !a.paused&&a.currentTime>t+.05;},pausedAt));
   await page.evaluate(()=>{AstraAudio.setMusic(.23);AstraAudio.setMaster(.6);AstraAudio.setSfx(.9);AstraAudio.setMuted(true);});
   check('volume, mute, and independent SE settings apply',await page.evaluate(()=>{const a=window.__qaAudio[0];return a.muted&&Math.abs(a.volume-.138)<.001;}));
   await page.evaluate(()=>AstraAudio.setMuted(false));
   check('unmute restores BGM',await page.evaluate(()=>!window.__qaAudio[0].muted&&!window.__qaAudio[0].paused));
   await page.evaluate(()=>game._die());
   check('death pauses BGM',await page.evaluate(()=>window.__qaAudio[0].paused));
   await page.locator('#overlay [data-action=retry]').click();
   await page.waitForTimeout(130);
   check('retry resumes BGM',await page.evaluate(()=>!window.__qaAudio[0].paused));
   await page.waitForFunction(()=>{const a=window.__qaAudio[0];return a.buffered.length&&a.buffered.end(a.buffered.length-1)>a.duration-.2;},null,{timeout:20000});
   await page.evaluate(()=>{const a=window.__qaAudio[0];a.currentTime=a.duration-.15;});
   await page.waitForTimeout(600);
   check('track loops at end',await page.evaluate(()=>{const a=window.__qaAudio[0];return !a.paused&&a.currentTime<2&&!a.ended;}));
   await page.keyboard.press('Escape');await page.locator('#overlay [data-action=title]').click();
   check('return to title stops and rewinds music',await page.evaluate(()=>{const a=window.__qaAudio[0];return a.paused&&a.currentTime===0;}));
   await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(160);
   check('new stage reuses one music player and starts at beginning',await page.evaluate(()=>window.__qaAudio.length===1&&!window.__qaAudio[0].paused&&window.__qaAudio[0].currentTime<1));
   await page.evaluate(()=>{AstraAudio.setPaused(true);AstraAudio.setPaused(false);AstraAudio.stop();});await page.waitForTimeout(150);
   check('pending play cannot restart a stopped track',await page.evaluate(()=>window.__qaAudio[0].paused));
   check('no uncaught playback errors',errors.length===0);
   results.push({url,checks,errors});await page.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'bgm-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
