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
   await page.keyboard.press('Escape');const paused=await read();await page.waitForTimeout(150);
   check('manual pause still pauses music',paused.paused&&Math.abs((await read()).time-paused.time)<.015);
   await page.locator('#overlay [data-action=resume]').click();await page.waitForTimeout(120);
   check('manual resume restores ordinary music',!(await read()).paused&&Math.abs((await read()).volume-.4)<1e-8);
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
 fs.writeFileSync(path.join(__dirname,'result-bgm-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
