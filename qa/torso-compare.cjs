const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  for(let i=0;i<80&&!AstraRunRig.idleReady;i++)await new Promise(r=>setTimeout(r,50));
  const S=13,W=44,H=40,cols=4;
  const c=document.createElement('canvas');c.width=cols*W*S;c.height=H*S;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0d1f2b';ctx.fillRect(0,0,c.width,c.height);
  const items=[['idle',cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:0,idle:true,aiming:0,image:img})],
               ['run',cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:.35,idle:false,aiming:0,image:img})],
               ['saber 1',cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:1,phase:.03,image:img})],
               ['saber 3',cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:3,phase:.03,image:img})]];
  items.forEach(([label,fn],i)=>{
    const x=i*W*S;
    ctx.save();ctx.beginPath();ctx.rect(x,0,W*S,H*S);ctx.clip();
    // frame the upper body only: origin sits below the feet so the torso fills the cell
    ctx.translate(x+W*S/2,H*S+16*S);ctx.scale(S,S);fn(ctx);ctx.restore();
    ctx.fillStyle='#eaf6ff';ctx.font='18px monospace';ctx.fillText(label,x+8,24);
    ctx.strokeStyle='#2b4b5c';ctx.strokeRect(x+.5,.5,W*S-1,H*S-1);
  });
  return {img:c.toDataURL()};
});
fs.writeFileSync('qa/torso-compare.png',Buffer.from(out.img.split(',')[1],'base64'));
console.log(JSON.stringify({errors}));}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
