const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>AstraRunRig.idleReady);
 const result=await page.evaluate(async()=>{
  const image=new Image();image.src='assets/player-run-v4.svg';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;const ctx=canvas.getContext('2d');
  const original=ctx.drawImage.bind(ctx),calls=[];ctx.drawImage=(...args)=>{calls.push({src:args[0].src,d:args.slice(1)});original(...args);};
  let floorError=0,seamError=0,samples=0,minTop=Infinity,maxTop=-Infinity;
  for(const facing of [-1,1])for(let i=0;i<=100;i++){
   calls.length=0;ctx.clearRect(0,0,160,120);AstraRunRig.draw(ctx,{x:80,y:100,spriteIdle:true,idle:true,phase:i/100,facing,image});
   if(calls.length!==2||calls.some(c=>!c.src.endsWith('/assets/player-idle-v2.png')))throw Error('idle must use the cohesive sprite');
   const a=calls[0].d,b=calls[1].d;floorError=Math.max(floorError,Math.abs(b[5]+b[7]));
   seamError=Math.max(seamError,Math.abs(a[5]+a[7]-b[5]));minTop=Math.min(minTop,a[5]);maxTop=Math.max(maxTop,a[5]);samples++;
  }
  return{samples,floorError,seamError,breathTravel:maxTop-minTop};
 });
 assert.equal(result.samples,202);assert(result.floorError<1e-9);assert(result.seamError<1e-9);assert(result.breathTravel>.5&&result.breathTravel<1);assert.deepEqual(errors,[]);
 fs.writeFileSync('qa/idle-redrawn-verification.json',JSON.stringify({result,errors},null,2));console.log({result,errors});
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
