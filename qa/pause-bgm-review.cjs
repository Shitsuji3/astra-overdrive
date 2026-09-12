const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
 try{
  for(const url of ['http://127.0.0.1:4173/','file:///C:/Users/situz/Documents/ChatGPT/Astragemes/index.html']){
   const page=await browser.newPage(),errors=[],checks=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__qaMedia=[];
    window.Audio=new Proxy(window.Audio,{construct(Target,args){
     const audio=Reflect.construct(Target,args),play=audio.play.bind(audio),pause=audio.pause.bind(audio);
     audio.__calls={play:0,pause:0};audio.play=function(){audio.__calls.play++;return play();};audio.pause=function(){audio.__calls.pause++;return pause();};
     window.__qaMedia.push(audio);return audio;
    }});
   });
   const read=()=>page.evaluate(()=>{const a=window.__qaMedia[0];return {time:a.currentTime,paused:a.paused,volume:a.volume,muted:a.muted,...a.__calls};});
   const check=(name,ok)=>{assert.ok(ok,url+': '+name);checks.push(name);};
   await page.goto(url);await page.locator('[data-action=start]').click();
   await page.waitForFunction(()=>window.__qaMedia[0]?.currentTime>.3);
   await page.evaluate(()=>{AstraAudio.setMusic(.4);AstraAudio.setMaster(.8);});
   const beforeDeath=await read();
   await page.evaluate(()=>game._die());
   const death=await read();
   check('death halves configured volume without pause/play/restart',Math.abs(death.volume-beforeDeath.volume*.5)<1e-8&&!death.paused&&death.play===beforeDeath.play&&death.pause===beforeDeath.pause&&death.time>=beforeDeath.time);
   await page.waitForTimeout(180);check('BGM clock advances on game-over screen',(await read()).time>death.time+.05);
   await page.evaluate(()=>{AstraAudio.setMusic(.8);AstraAudio.setMaster(.5);AstraAudio.setMuted(true);});
   const adjusted=await read();check('result volume remains half after settings change, mute remains effective',Math.abs(adjusted.volume-.2)<1e-8&&adjusted.muted);
   await page.evaluate(()=>AstraAudio.setMuted(false));
   const beforeRetry=await read();await page.keyboard.press('r');
   const retry=await read();check('keyboard retry restores full configured volume without restarting music',Math.abs(retry.volume-.4)<1e-8&&!retry.paused&&retry.time>=beforeRetry.time&&retry.play===beforeRetry.play&&retry.pause===beforeRetry.pause);
   const beforePause=await read();await page.keyboard.press('Escape');const paused=await read();
   const frozen=await page.evaluate(()=>game.state.time);await page.waitForTimeout(160);
   check('pause continues BGM at half volume without playback interruption',!paused.paused&&Math.abs(paused.volume-.2)<1e-8&&paused.play===beforePause.play&&paused.pause===beforePause.pause&&paused.time>=beforePause.time&&(await read()).time>paused.time+.05);
   check('simulation remains frozen during audible pause',await page.evaluate(t=>game.state.mode==='paused'&&game.state.time===t,frozen));
   await page.evaluate(()=>{AstraAudio.setResultMode(true);AstraAudio.setPaused(true);});
   check('overlapping pause and result remain 50 percent',Math.abs((await read()).volume-.2)<1e-8);
   await page.evaluate(()=>{AstraAudio.setResultMode(false);AstraAudio.setMusic(.6);AstraAudio.setMaster(.4);AstraAudio.setMuted(true);});
   const changed=await read();check('paused settings use half of configured volume and keep mute',Math.abs(changed.volume-.12)<1e-8&&changed.muted&&!changed.paused);
   await page.evaluate(()=>{AstraAudio.setMusic(.8);AstraAudio.setMaster(.5);AstraAudio.setMuted(false);});
   await page.locator('#overlay [data-action=settings]').click();
   check('settings modal retains half-volume playback',Math.abs((await read()).volume-.2)<1e-8&&!(await read()).paused);
   await page.keyboard.press('Escape');const beforeResume=await read();
   await page.locator('#overlay [data-action=resume]').click();await page.waitForTimeout(120);
   const resumed=await read();check('resume restores full volume without restart',!resumed.paused&&Math.abs(resumed.volume-.4)<1e-8&&resumed.play===beforeResume.play&&resumed.pause===beforeResume.pause&&resumed.time>beforeResume.time);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   check('focus-loss pause also keeps half-volume music',await page.evaluate(()=>game.state.mode==='paused')&&Math.abs((await read()).volume-.2)<1e-8&&!(await read()).paused);
   await page.locator('#overlay [data-action=resume]').click();
   const beforeWin=await read();
   await page.evaluate(()=>{game.state.boss={x:4870,y:200,w:100,h:110,hp:0,maxHp:72,active:true,timer:99,attack:'tell-volley',phase:0,flash:0};game._boss(0);});
   const win=await read();check('victory halves music without stopping or seeking',Math.abs(win.volume-.2)<1e-8&&!win.paused&&win.play===beforeWin.play&&win.pause===beforeWin.pause&&win.time>=beforeWin.time);
   await page.waitForTimeout(180);check('BGM clock advances on clear screen',(await read()).time>win.time+.05);
   await page.locator('#overlay [data-action=replay]').click();await page.waitForTimeout(120);
   const replay=await read();check('replay begins fresh at full configured volume',!replay.paused&&Math.abs(replay.volume-.4)<1e-8&&replay.time<.5);
   await page.evaluate(()=>game._die());
   await page.locator('#overlay [data-action=retry]').click();
   check('retry button restores full configured volume',Math.abs((await read()).volume-.4)<1e-8);
   await page.evaluate(()=>game._die());await page.locator('#overlay [data-action=title]').click();
   const title=await read();check('title still stops and rewinds',title.paused&&title.time===0);
   await page.locator('[data-action=start]').click();await page.waitForTimeout(120);
   check('new stage starts at normal volume with one audio player',Math.abs((await read()).volume-.4)<1e-8&&await page.evaluate(()=>window.__qaMedia.length===1));
   check('no playback errors',errors.length===0);results.push({url,checks,errors});await page.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'pause-bgm-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
