const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=start]').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  for(let i=0;i<80&&!AstraRunRig.idleReady;i++)await new Promise(r=>setTimeout(r,50));
  // 1:1 game pixels, exactly what the 640x360 canvas gets
  const W=70,H=60,cols=4;
  const c=document.createElement('canvas');c.width=cols*W;c.height=H;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  const items=[cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:0,idle:true,aiming:0,image:img}),
               cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:.35,idle:false,aiming:0,image:img}),
               cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:1,phase:.03,image:img}),
               cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:3,phase:.03,image:img})];
  items.forEach((fn,i)=>{ctx.save();ctx.translate(i*W+W/2,H-6);fn(ctx);ctx.restore();});
  return {img:c.toDataURL(),smoothing:ctx.imageSmoothingEnabled};
});
fs.writeFileSync('qa/native-1to1.png',Buffer.from(out.img.split(',')[1],'base64'));
console.log(JSON.stringify({errors,smoothing:out.smoothing}));}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
