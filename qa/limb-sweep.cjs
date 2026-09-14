const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  for(let i=0;i<80&&!AstraRunRig.idleReady;i++)await new Promise(r=>setTimeout(r,50));
  const vals=[1,.88,.80,.72];
  const S=8,W=72,H=62,cols=5,rows=2;
  const c=document.createElement('canvas');c.width=cols*W*S;c.height=rows*H*S;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0d1f2b';ctx.fillRect(0,0,c.width,c.height);
  function cell(col,row,label,fn){
    const x=col*W*S,y=row*H*S;
    ctx.save();ctx.beginPath();ctx.rect(x,y,W*S,H*S);ctx.clip();
    ctx.translate(x+W*S/2,y+(H-9)*S);ctx.scale(S,S);
    ctx.strokeStyle='#3d6070';ctx.lineWidth=1/S;ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(36,0);ctx.stroke();
    ctx.strokeStyle='#7fd6a0';ctx.setLineDash([2/S,2/S]);ctx.beginPath();ctx.moveTo(-36,-48);ctx.lineTo(36,-48);ctx.stroke();ctx.setLineDash([]);
    fn(ctx);ctx.restore();
    ctx.fillStyle='#eaf6ff';ctx.font='16px monospace';ctx.fillText(label,x+8,y+22);
    ctx.strokeStyle='#2b4b5c';ctx.strokeRect(x+.5,y+.5,W*S-1,H*S-1);
  }
  const keep=AstraRunRig.build.limb;
  cell(0,0,'IDLE reference',cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:0,idle:true,aiming:0,image:img}));
  cell(0,1,'IDLE reference',cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:.5,idle:true,aiming:0,image:img}));
  vals.forEach((v,i)=>{
    AstraRunRig.build.limb=v;
    cell(i+1,0,'run limb '+v,cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:.35,idle:false,aiming:0,image:img}));
    cell(i+1,1,'saber1 limb '+v,cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:1,phase:.03,image:img}));
  });
  AstraRunRig.build.limb=keep;
  return {img:c.toDataURL()};
});
fs.writeFileSync('qa/limb-sweep.png',Buffer.from(out.img.split(',')[1],'base64'));
console.log(JSON.stringify({errors}));}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
