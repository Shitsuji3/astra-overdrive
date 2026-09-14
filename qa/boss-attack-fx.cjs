const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='qa/boss-attack-fx';fs.mkdirSync(out,{recursive:true});
const moves=['volley','wave','dash','mortar','ring','slam','mines','wall'];
function harness(source){const box={console,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener(){},removeEventListener(){},navigator:{getGamepads:()=>[]}};vm.createContext(box);vm.runInContext('Math.random=()=>.42',box);for(const file of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js'])vm.runInContext(fs.readFileSync(file,'utf8'),box);vm.runInContext(source,box);return box}
const old=harness(cp.execFileSync('git',['show','c3f87c1:game.js'],{encoding:'utf8'})),now=harness(fs.readFileSync('game.js','utf8'));
const clean=o=>JSON.parse(JSON.stringify(o,(k,v)=>k==='fxBoss'?undefined:v));let comparisons=0;
for(const def of now.AstraBosses.list)for(const move of moves){
  const results=[old,now].map(h=>{const g=new h.NeonGame(null);g.start({stage:'gauntlet'});const b=g._spawnBoss(def.id);g.state.player.x=b.x-150;g.state.bullets=[];g._bossFire(b,move);if(move==='slam')g._bossSlam(b);return {bullets:clean(g.state.bullets),dash:b.dashTime,vy:b.vy}});
  assert.deepEqual(results[1],results[0],def.id+'/'+move);comparisons++;
}
(async()=>{const br=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
  const page=await br.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();await page.waitForTimeout(1000);
  const report=await page.evaluate(async moves=>{
    game.running=false;cancelAnimationFrame(game.raf);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');
    const board=document.createElement('canvas');board.width=1280;board.height=1440;const bc=board.getContext('2d');
    let samples=0;const start=performance.now();
    for(let n=0;n<AstraBosses.list.length;n++){
      const id=AstraBosses.list[n].id;
      game.start({stage:'gauntlet'});game.running=false;cancelAnimationFrame(game.raf);
      const s=game.state,b=game._spawnBoss(id);s.camera.x=b.x-490;s.player.x=s.camera.x+130;s.player.y=270;s.enemies=[];s.pickups=[];s.message='';s.shake=0;
      // Load each real boss sprite before photographing it.
      AstraRenderer.draw(ctx,s);await new Promise(r=>setTimeout(r,120));
      for(const reduced of [false,true])for(const dir of [-1,1])for(const move of moves){
        s.reducedMotion=reduced;s.player.x=b.x+dir*150;b.facing=dir;s.bullets=[];s.particles=[];b.attack=move;s.time=1.13;
        game._bossFire(b,move);if(move==='slam')game._bossSlam(b);
        for(const p of s.bullets){p.x+=p.vx*.25;p.y+=p.vy*.25}
        const before=JSON.stringify(s);AstraRenderer.draw(ctx,s);assertState(before===JSON.stringify(s));
        b.attack='tell-'+move;b.timer=.35;AstraRenderer.draw(ctx,s);samples++;
      }
      s.reducedMotion=false;s.player.x=s.camera.x+130;b.facing=-1;b.attack='tell-'+moves[n];b.timer=.35;s.bullets=[];s.particles=[];
      // A legible sample of each attack; coordinates only arrange the QA photograph.
      game._bossFire(b,moves[n]);
      if(moves[n]==='slam')game._bossSlam(b);
      for(const p of s.bullets){p.x+=p.vx*.32;p.y+=p.vy*.32;if(p.kind==='shell')p.y+=46}
      if(moves[n]==='mines'){s.bullets=[];for(let k=0;k<3;k++)game._spawn(s.camera.x+260+k*62,302,0,0,'enemy',false,1,{kind:'mine',r:7,fuse:1.2,life:.55,fxBoss:id})}
      if(moves[n]==='dash')b.attack='dash';
      AstraRenderer.draw(ctx,s);bc.drawImage(canvas,(n%2)*640,Math.floor(n/2)*360);
      bc.fillStyle='#07131e';bc.fillRect((n%2)*640+8,Math.floor(n/2)*360+62,240,20);bc.fillStyle='#e9ffff';bc.font='12px monospace';bc.fillText(id+' / '+moves[n],(n%2)*640+14,Math.floor(n/2)*360+76);
    }
    function assertState(ok){if(!ok)throw Error('Renderer mutated simulation')}
    return {samples,ms:performance.now()-start,png:board.toDataURL('image/png')};
  },moves);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/preview.png',Buffer.from(report.png.split(',')[1],'base64'));delete report.png;
  fs.writeFileSync(out+'/verification.json',JSON.stringify({combatComparisons:comparisons,...report,errors},null,2));console.log({combatComparisons:comparisons,...report,errors});
}finally{await br.close()}})().catch(e=>{console.error(e);process.exit(1)});
