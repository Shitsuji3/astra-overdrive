const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(9000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(1000);
fs.mkdirSync('qa/stage/live',{recursive:true});
const spots=[['conveyor',5000],['slag',5800],['catwalk',7300],['gate-approach',8600]];
const shots=[];
for(const [name,x] of spots){
  const info=await page.evaluate(x=>{game.start();game.running=false;cancelAnimationFrame(game.raf);
    const s=game.state,p=s.player;
    Object.assign(p,{x,y:250,vx:0,vy:0,onGround:false,dashTime:0,wallDir:0,saberTime:0,charge:0,shootPoseTime:0,facing:1,invuln:0});
    for(let i=0;i<40;i++)game._tick(1/60);
    AstraRenderer.draw(document.querySelector('canvas').getContext('2d'),s);
    return {x:Math.round(p.x),y:Math.round(p.y),section:s.section,onGround:p.onGround,mode:s.mode};},x);
  fs.writeFileSync('qa/stage/live/'+name+'.png',await page.locator('canvas').screenshot());
  shots.push({name,...info});
}
console.log(JSON.stringify({shots,errors},null,1));
}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
