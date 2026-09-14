const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(900);
const out=await page.evaluate(()=>{
  const C=AstraCombat,states={
    'stand still':p=>{},
    'charging':p=>{p.charge=.7;},
    'firing':p=>{p.shootPoseTime=.1;},
    'running':p=>{p.vx=190;p.onGround=true;},
    'jumping':p=>{p.onGround=false;p.vy=-250;},
    'falling':p=>{p.onGround=false;p.vy=180;},
    'dashing':p=>{p.dashTime=.15;p.vx=560;},
    'wall cling':p=>{p.onGround=false;p.wallDir=1;},
    'saber 1':p=>{p.saberTime=C.saberDuration*.5;p.saberCombo=1;},
    'saber 3':p=>{p.saberTime=C.saberDuration*.5;p.saberCombo=3;}};
  const base={vx:0,vy:0,onGround:true,dashTime:0,wallDir:0,saberTime:0,saberCombo:0,charge:0,shootPoseTime:0};
  const res=[];
  for(const [name,set] of Object.entries(states)){
    const p=Object.assign({},game.state.player,base);set(p);
    // Ask the game which stance it will pose, exactly as the renderer does.
    const mode=C.rigMode?C.rigMode(p):null;
    let src;
    if(mode==='saber') src='jointed rig  assets/player-run-v4.svg  [saber]';
    else if(mode) src='jointed rig  assets/player-run-v4.svg  ['+mode+']';
    else src='old sheet  assets/player-sheet.png';
    res.push({state:name,src,mode});
  }
  return res;
});
console.log('state            art source');
for(const r of out)console.log('  '+r.state.padEnd(15),r.src);
const uniq=[...new Set(out.map(r=>r.src.split('  [')[0]))];
console.log('\ndistinct art sources in use:',uniq.length);
uniq.forEach(u=>console.log('   -',u));
console.log('errors',errors);
}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
