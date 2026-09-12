const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const OUT=process.argv[2]||'build-compare';
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  for(let i=0;i<80&&!AstraRunRig.idleReady;i++)await new Promise(r=>setTimeout(r,50));
  const cells=[['idle',0],['idle',0.5],['run',0.10],['run',0.35],['run',0.60],['run',0.85],
               [1,0.03],[1,0.10],[2,0.03],[2,0.10],[3,0.03],[3,0.10]];
  const S=7,W=76,H=64,cols=6,rows=2;
  const c=document.createElement('canvas');c.width=cols*W*S;c.height=rows*H*S;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0d1f2b';ctx.fillRect(0,0,c.width,c.height);
  cells.forEach(([kind,ph],i)=>{
    const x=(i%cols)*W*S,y=Math.floor(i/cols)*H*S;
    ctx.save();ctx.beginPath();ctx.rect(x,y,W*S,H*S);ctx.clip();
    ctx.translate(x+W*S/2,y+(H-9)*S);ctx.scale(S,S);
    ctx.strokeStyle='#3d6070';ctx.lineWidth=1/S;ctx.beginPath();ctx.moveTo(-38,0);ctx.lineTo(38,0);ctx.stroke();
    // reference height of the idle sprite
    ctx.strokeStyle='#7fd6a0';ctx.setLineDash([2/S,2/S]);
    ctx.beginPath();ctx.moveTo(-38,-48);ctx.lineTo(38,-48);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='#26485a';ctx.beginPath();ctx.moveTo(0,-56);ctx.lineTo(0,5);ctx.stroke();
    if(kind==='idle')AstraRunRig.draw(ctx,{x:0,y:0,facing:1,phase:ph,idle:true,aiming:0,image:img});
    else if(kind==='run')AstraRunRig.draw(ctx,{x:0,y:0,facing:1,phase:ph,idle:false,aiming:0,image:img});
    else AstraSaberRig.draw(ctx,{x:0,y:0,facing:1,stage:kind,phase:ph,image:img});
    ctx.restore();
    ctx.fillStyle='#eaf6ff';ctx.font='16px monospace';
    ctx.fillText(kind==='idle'||kind==='run'?`${kind} ${ph}`:`saber ${kind} t=${ph}`,x+8,y+22);
    ctx.strokeStyle='#2b4b5c';ctx.strokeRect(x+.5,y+.5,W*S-1,H*S-1);
  });
  return {img:c.toDataURL()};
});
fs.writeFileSync('qa/'+OUT+'.png',Buffer.from(out.img.split(',')[1],'base64'));
console.log(JSON.stringify({errors,out:OUT}));}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
