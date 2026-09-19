const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const p=await br.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4173/');await p.locator('[data-action=stage-select]').click();await p.locator('.stage-node.active').click();await p.waitForTimeout(700);
 const result=await p.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);game.start({stage:'gauntlet'});game.running=false;cancelAnimationFrame(game.raf);
  const ids=['warden','tidebreaker','coilhead','ashmaw','nullpriest','gravelock','sparkwidow','obsidian-crown'];
  const moves=['pincer','geyser','needles','breath','tailbeam','stomp','sawtoss','barrage'],contacts=[.25,.3,.25,.2,.47,.3,.12,.23];
  const src=document.createElement('canvas');src.width=640;src.height=360;const c=src.getContext('2d');
  const board=document.createElement('canvas');board.width=960;board.height=8*200;const bc=board.getContext('2d');bc.imageSmoothingEnabled=false;
  let maxMs=0,sumMs=0,frames=0,meshes=0,minArea=Infinity;
  for(let n=0;n<ids.length;n++){
   const b=game._spawnBoss(ids[n]),s=game.state;b.x=400;b.y=b.baseY=250-b.h;s.camera.x=120;s.message='';s.shake=0;s.bullets=[];s.particles=[];s.player.x=100;s.player.invuln=0;
   AstraRenderer.draw(c,s);await new Promise(r=>setTimeout(r,150));
   for(let col=0;col<3;col++){
    b.attack=col===0?'rest':col===1?'tell-'+moves[n]:moves[n];b.timer=0;
    b.move=col===2?{kind:moves[n],t:contacts[n]}:null;
    // Force time separation to show a reproducible target, independent of last sampled pose.
    s.time+=1;AstraRenderer.draw(c,s);
    bc.drawImage(src,225,145,135,112,col*320,n*200,240,200);
    bc.fillStyle='#a8ecff';bc.font='12px monospace';bc.fillText(ids[n]+' / '+['IDLE','WINDUP','STRIKE'][col],col*320+4,n*200+15);
   }
   for(let f=0;f<60;f++){s.time+=1/60;b.move.t+=1/60;const st=performance.now();AstraRenderer.draw(c,s);c.getImageData(0,0,1,1);const ms=performance.now()-st;sumMs+=ms;maxMs=Math.max(maxMs,ms);frames++;}
   // Test every move, both directions and reduced motion: finite mesh with no inverted cells.
   for(const beat of AstraCombat.bossRoutine(AstraBosses.get(ids[n]))){
    for(const face of [-1,1])for(const rm of [false,true])for(let k=0;k<=60;k++){
     const bb={id:ids[n],facing:face,attack:beat.move,move:{kind:beat.move,t:k/30}};
     const a=AstraRenderer.bossArtTarget(bb,k/30,rm);if(a.some(v=>!Number.isFinite(v)))throw Error('nonfinite');
     for(let y=0;y<12;y++)for(let x=0;x<12;x++){
      const A=AstraRenderer.bossMeshPoint(ids[n],x/12,y/12,a),B=AstraRenderer.bossMeshPoint(ids[n],(x+1)/12,y/12,a),D=AstraRenderer.bossMeshPoint(ids[n],x/12,(y+1)/12,a);
      const area=(B.x-A.x)*(D.y-A.y)-(B.y-A.y)*(D.x-A.x);const E=AstraRenderer.bossMeshPoint(ids[n],(x+1)/12,(y+1)/12,a);const area2=(E.x-B.x)*(D.y-B.y)-(E.y-B.y)*(D.x-B.x);minArea=Math.min(minArea,area,area2);if(Math.min(area,area2)<=0)throw Error('folded mesh '+ids[n]+' '+beat.move);
     }meshes++;
    }
   }
  }
  return{sheet:board.toDataURL(),frames,meanMs:sumMs/frames,maxMs,meshes,minArea};
 });
 fs.mkdirSync('qa/boss-art-motion',{recursive:true});fs.writeFileSync('qa/boss-art-motion/poses.png',Buffer.from(result.sheet.split(',')[1],'base64'));delete result.sheet;assert.deepEqual(errors,[]);fs.writeFileSync('qa/boss-art-motion/verification.json',JSON.stringify({...result,errors},null,2));console.log(result);
}finally{await br.close()}})().catch(e=>{console.error(e);process.exit(1)});
