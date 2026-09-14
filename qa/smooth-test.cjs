const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  for(let i=0;i<80&&!AstraRunRig.idleReady;i++)await new Promise(r=>setTimeout(r,50));
  const W=70,H=60,cols=5;
  const c=document.createElement('canvas');c.width=cols*W;c.height=H*2;
  const ctx=c.getContext('2d');
  // row 0: as shipped. row 1: same, but let the canvas average the 5x downscale
  function block(row,forceSmooth){
    const items=[cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:0,idle:true,aiming:0,image:img}),
                 cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:.35,idle:false,aiming:0,image:img}),
                 cx=>AstraRunRig.draw(cx,{x:0,y:0,facing:1,phase:.6,idle:false,aiming:0,image:img}),
                 cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:1,phase:.03,image:img}),
                 cx=>AstraSaberRig.draw(cx,{x:0,y:0,facing:1,stage:3,phase:.03,image:img})];
    items.forEach((fn,i)=>{
      ctx.save();ctx.translate(i*W+W/2,row*H+H-6);
      if(forceSmooth){const d=CanvasRenderingContext2D.prototype;
        const orig=Object.getOwnPropertyDescriptor(d,'imageSmoothingEnabled');
        Object.defineProperty(ctx,'imageSmoothingEnabled',{configurable:true,get(){return true},set(){}});
        ctx.imageSmoothingQuality='high';fn(ctx);
        delete ctx.imageSmoothingEnabled;
      } else fn(ctx);
      ctx.restore();});
  }
  block(0,false); block(1,true);
  return {img:c.toDataURL()};
});
fs.writeFileSync('qa/smooth-test.png',Buffer.from(out.img.split(',')[1],'base64'));
console.log(JSON.stringify({errors}));}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
