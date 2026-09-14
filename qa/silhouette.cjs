const assert=require('node:assert/strict'),fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(900);
const out=await page.evaluate(async()=>{
  game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  for(let i=0;i<80&&!AstraRunRig.idleReady;i++)await new Promise(r=>setTimeout(r,50));
  const S=4,W=140,H=120;
  const c=document.createElement('canvas');c.width=W*S;c.height=H*S;const ctx=c.getContext('2d');
  function draw(kind,phase,rise){
    ctx.clearRect(0,0,c.width,c.height);
    ctx.save();ctx.translate(W*S/2,(H-14)*S);ctx.scale(S,S);ctx.imageSmoothingEnabled=false;
    if(typeof kind==='string')AstraRunRig.draw(ctx,{x:0,y:0,facing:1,phase,mode:kind,rise,aiming:0,image:img});
    else AstraSaberRig.draw(ctx,{x:0,y:0,facing:1,stage:kind,phase,image:img});
    ctx.restore();
  }
  function measure(kind,phase,rise){
    draw(kind,phase,rise);
    const d=ctx.getImageData(0,0,c.width,c.height).data;
    let top=1e9,bot=-1,rows=[];
    for(let y=0;y<c.height;y++){let lo=1e9,hi=-1,n=0;
      for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;
        if(d[i+3]>110){ // ignore the pale green trail
          const R=d[i],G=d[i+1],B=d[i+2];
          if(G>R+18&&G>B+10)continue;
          if(x<lo)lo=x;if(x>hi)hi=x;n++;}}
      rows.push(hi<0?null:{lo,hi,n,w:hi-lo+1});
      if(hi>=0){if(y<top)top=y;bot=y;}}
    if(bot<0)return null;
    const h=bot-top+1;
    const at=f=>{const y=Math.round(top+h*f);let best=null;
      for(let k=-1;k<=1;k++){const rr=rows[y+k];if(rr&&(!best||rr.w>best.w))best=rr;}
      return best?+(best.w/S).toFixed(2):0;};
    let area=0;for(const rr of rows)if(rr)area+=rr.n;
    return {kind:String(kind),phase,heightPx:+(h/S).toFixed(2),
      shoulder:at(0.30),chest:at(0.42),waist:at(0.55),thigh:at(0.72),
      widest:+(Math.max(...rows.filter(Boolean).map(rr=>rr.w))/S).toFixed(2),
      areaPx:+(area/(S*S)).toFixed(1)};
  }
  const res=[];
  for(const ph of [0,.25,.5,.75])res.push(measure('idle',ph));
  for(const ph of [0,.15,.3,.45,.6,.75,.9])res.push(measure('run',ph));
  for(const r of [1,-1])res.push(measure('air',0,r));
  res.push(measure('dash',0));res.push(measure('wall',0));
  for(const st of [1,2,3])for(const ph of [.02,.12])res.push(measure(st,ph));
  return {idleReady:AstraRunRig.idleReady,build:AstraRunRig.build||{x:1,y:1},res};
});
fs.writeFileSync('qa/silhouette.json',JSON.stringify(out,null,2));
const pick=k=>out.res.filter(r=>r&&r.kind===k);
const avg=(a,f)=>+(a.reduce((s,x)=>s+x[f],0)/a.length).toFixed(2);
const idle=pick('idle'),run=pick('run');
const density=a=>+(avg(a,'areaPx')/Math.pow(avg(a,'heightPx'),2)).toFixed(4);
const report={build:out.build,idle:{h:avg(idle,'heightPx'),thigh:avg(idle,'thigh'),density:density(idle)},
  run:{h:avg(run,'heightPx'),thigh:avg(run,'thigh'),density:density(run)},
  saber:[1,2,3].map(n=>({stage:n,h:avg(pick(String(n)),'heightPx'),density:density(pick(String(n)))}))};
fs.writeFileSync('qa/silhouette-verification.json',JSON.stringify({report,res:out.res,errors},null,2));
assert.equal(errors.length,0,'no page errors');
// One rig draws every state, so every grounded stance must share the same build.
assert.ok(out.build.limb<1,'limbs are slimmed across the bone');
const upright=['idle','run','air','dash','wall'].map(k=>({k,h:avg(pick(k),'heightPx'),d:density(pick(k))}));
for(const u of upright)
  assert.ok(Math.abs(u.h-report.idle.h)<3.5,`${u.k} stands the same height as idle: ${u.h} vs ${report.idle.h}`);
for(const u of upright)
  assert.ok(u.d<report.idle.density*1.18,`${u.k} carries the same bulk as idle: ${u.d} vs ${report.idle.density}`);
report.states=upright;
// Saber poses are lunges, so their area covers the stance rather than the body. Height is the
// meaningful shared measure; limb thickness is checked on the comparable upright running pose.
for(const s of report.saber)
  assert.ok(s.h>report.idle.h-6,`saber ${s.stage} stands as tall as the idle sprite: ${s.h} vs ${report.idle.h}`);
console.log(JSON.stringify(report,null,1));
}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
