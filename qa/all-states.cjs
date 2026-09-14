const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const OUT=process.argv[2]||'all-states';
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  const cells=[['idle',{mode:'idle',phase:0}],['idle aim',{mode:'idle',phase:0,aiming:1}],
    ['run a',{mode:'run',phase:.15}],['run b',{mode:'run',phase:.65}],
    ['jump',{mode:'air',phase:0,rise:1}],['fall',{mode:'air',phase:0,rise:-1}],
    ['dash',{mode:'dash',phase:0}],['wall',{mode:'wall',phase:0}],
    ['saber 1',{saber:1,phase:.45}],['saber 2',{saber:2,phase:.45}],
    ['saber 3',{saber:3,phase:.45}],['air aim',{mode:'air',phase:0,rise:-1,aiming:1}]];
  const S=7,W=76,H=64,cols=6,rows=2;
  const c=document.createElement('canvas');c.width=cols*W*S;c.height=rows*H*S;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0d1f2b';ctx.fillRect(0,0,c.width,c.height);
  cells.forEach(([label,o],i)=>{
    const x=(i%cols)*W*S,y=Math.floor(i/cols)*H*S;
    ctx.save();ctx.beginPath();ctx.rect(x,y,W*S,H*S);ctx.clip();
    ctx.translate(x+W*S/2,y+(H-9)*S);ctx.scale(S,S);
    ctx.strokeStyle='#3d6070';ctx.lineWidth=1/S;ctx.beginPath();ctx.moveTo(-38,0);ctx.lineTo(38,0);ctx.stroke();
    ctx.strokeStyle='#7fd6a0';ctx.setLineDash([2/S,2/S]);ctx.beginPath();ctx.moveTo(-38,-48);ctx.lineTo(38,-48);ctx.stroke();ctx.setLineDash([]);
    if(o.saber)AstraSaberRig.draw(ctx,{x:0,y:0,facing:1,stage:o.saber,phase:o.phase,image:img});
    else AstraRunRig.draw(ctx,Object.assign({x:0,y:0,facing:1,image:img,aiming:0},o));
    ctx.restore();
    ctx.fillStyle='#eaf6ff';ctx.font='16px monospace';ctx.fillText(label,x+8,y+22);
    ctx.strokeStyle='#2b4b5c';ctx.strokeRect(x+.5,y+.5,W*S-1,H*S-1);
  });
  return {img:c.toDataURL()};
});
fs.writeFileSync('qa/'+OUT+'.png',Buffer.from(out.img.split(',')[1],'base64'));
console.log(JSON.stringify({errors,out:OUT}));}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
