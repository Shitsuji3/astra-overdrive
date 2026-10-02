// Render the new weapons with the same public script bundle a player receives.
const assert = require('node:assert/strict'), fs = require('node:fs');
const {chromium} = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action=boss-rush]').click();
    const result=await page.evaluate(async()=>{
      game.running=false; cancelAnimationFrame(game.raf);
      const board=document.createElement('canvas'); board.width=1280; board.height=8*210;
      const bc=board.getContext('2d'); bc.imageSmoothingEnabled=false; bc.fillStyle='#071419'; bc.fillRect(0,0,board.width,board.height);
      const canvas=document.createElement('canvas'); canvas.width=640; canvas.height=360; const c=canvas.getContext('2d');
      let moves=0, draws=0, meshChecks=0, attributed=0;
      for(const [row,def] of AstraBosses.list.entries()) {
        const names=def.pool.filter(n=>AstraBosses.extraMoves[n]);
        for(const [column,name] of names.entries()) {
          const e=AstraBosses.extraMoves[name];
          game.startPractice(def.id,name); game.running=false; cancelAnimationFrame(game.raf);
          const s=game.state, b=s.boss, p=s.player, A=AstraCombat.arena;
          s.bossIntro=null; s.particles=[]; s.bullets=[]; s.shake=0; s.message=''; s.messageTimer=0;
          b.x=(A.bossMin+A.bossMax)/2+50; b.y=b.baseY-(b.flies||0); b.beat=def.routine.findIndex(q=>q.move===name);
          p.x=b.x-155; p.y=310-p.h; p.invuln=1e9; p.onGround=true;
          s.camera.x=(A.bossMin+A.bossMax)/2-330;
          game._bossWind(b,def,name); b.timer=b.tellDuration*.3;
          AstraRenderer.draw(c,s); await new Promise(r=>setTimeout(r,180)); s.time+=1;
          function capture(phase) {
            const before=JSON.stringify(s); AstraRenderer.draw(c,s); if(before!==JSON.stringify(s)) throw Error(name+' renderer mutated state'); draws++;
            const x=column*640+phase*320, y=row*210;
            bc.drawImage(canvas,0,0,640,360,x,y+20,320,180);
            bc.fillStyle=phase?'#e9d69e':'#6ee2e9'; bc.font='12px monospace'; bc.fillText(def.name+' / '+e.name+' / '+(phase?'ATTACK':'TELL'),x+5,y+14);
          }
          capture(0); b.timer=0; game._boss(1/60);
          const sample=e.beats[0]+.1;
          for(let t=0;t<sample;t+=1/60) { s.time+=1/60; game._boss(1/60); game._bullets(1/60); }
          capture(1);
          for(const facing of [-1,1]) for(const reduced of [false,true]) {
            b.facing=facing; if(b.move)b.move.dir=facing; s.reducedMotion=reduced; s.time+=1;
            const before=JSON.stringify(s); AstraRenderer.draw(c,s);
            if(before!==JSON.stringify(s))throw Error(name+' mirrored renderer mutated state'); draws++;
          }
          for(const q of s.bullets) if(q.team==='enemy' && !q.harmless) {
            if(q.source?.move!==name) throw Error(name+' lost projectile source'); attributed++;
          }
          if(AstraMastery.hints[name]!==e.hint || AstraRenderer.moveNames[name]!==e.name) throw Error(name+' missing UI contract');
          // New part motions stay finite with the art facing either way and reduced motion.
          for(const d of [-1,1]) for(const reduced of [false,true]) for(let f=0;f<90;f++) {
            const angles=AstraRenderer.bossArtTarget({id:def.id,facing:d,attack:name,move:{kind:name,t:f/60}},f/60,reduced);
            if(angles.some(v=>!Number.isFinite(v))) throw Error(name+' nonfinite joints');
            for(let y=0;y<12;y++) for(let x=0;x<12;x++) {
              const a=AstraRenderer.bossMeshPoint(def.id,x/12,y/12,angles), b=AstraRenderer.bossMeshPoint(def.id,(x+1)/12,y/12,angles), z=AstraRenderer.bossMeshPoint(def.id,x/12,(y+1)/12,angles);
              if((b.x-a.x)*(z.y-a.y)-(b.y-a.y)*(z.x-a.x)<=0)throw Error(name+' folded mesh');
            }
            meshChecks++;
          }
          moves++;
        }
      }
      // Complete each expanded routine once at full and low armour, including both new weapons.
      let routines=0;
      for(const def of AstraBosses.list) for(const wounded of [false,true]) {
        game.startPractice(def.id,null); game.running=false; cancelAnimationFrame(game.raf);
        const s=game.state,b=s.boss; s.bossIntro=null; s.player.invuln=1e9;
        if(wounded)b.hp=b.maxHp*.2;
        const seen=new Set();
        for(let n=0;n<60*50 && seen.size<def.pool.length;n++) {
          game._tick(1/60); if(AstraCombat.bossPatterns[b.attack])seen.add(b.attack);
        }
        if(!def.pool.every(n=>seen.has(n)))throw Error(def.id+' incomplete '+Array.from(seen));
        routines++;
      }
      return {image:board.toDataURL(),moves,draws,meshChecks,attributed,routines};
    });
    fs.mkdirSync('qa/boss-expansion',{recursive:true});
    fs.writeFileSync('qa/boss-expansion/overview.png',Buffer.from(result.image.split(',')[1],'base64')); delete result.image;
    assert.equal(result.moves,16); assert.equal(result.routines,16); assert.deepEqual(errors,[]);
    fs.writeFileSync('qa/boss-expansion/review.json',JSON.stringify({...result,errors},null,2)); console.log({...result,errors});
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
