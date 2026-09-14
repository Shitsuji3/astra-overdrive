const assert=require('node:assert/strict'),fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(9000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();await page.waitForTimeout(1000);
fs.mkdirSync('qa/build-fix/live',{recursive:true});
// still: the redrawn idle sprite
await page.evaluate(()=>{game.start();const p=game.state.player;p.x=180;p.facing=1;game.state.enemies=[];game.state.bullets=[];});
await page.waitForTimeout(500);
fs.writeFileSync('qa/build-fix/live/idle.png',await page.locator('canvas').screenshot());
// running
await page.evaluate(()=>{game.setInput('right',true);});
await page.waitForTimeout(650);
fs.writeFileSync('qa/build-fix/live/run.png',await page.locator('canvas').screenshot());
// a running shot, then confirm the bullet starts on the barrel
const shot=await page.evaluate(async()=>{
  const p=game.state.player;game.state.bullets=[];
  const spawn=game._spawn.bind(game);let rec=null;
  // Read the barrel at the very instant the shot leaves, not a frame later.
  game._spawn=function(...a){if(a[4]==='player'&&!rec){const m=AstraCombat.muzzle(p);
    rec={spawn:{x:a[0],y:a[1]},muzzle:{x:m.x,y:m.y},running:AstraCombat.runPose(p)};}return spawn(...a);};
  p.charge=.02;game._shootHeld=true;
  await new Promise(r=>setTimeout(r,150));
  game._shootHeld=false;
  return rec;
});
await page.evaluate(()=>{game.setInput('right',false);});
await page.waitForTimeout(400);
// saber
await page.evaluate(()=>{const p=game.state.player;p.saberCombo=1;p.saberFacing=1;p.saberTime=AstraCombat.saberDuration*0.45;});
fs.writeFileSync('qa/build-fix/live/saber.png',await page.locator('canvas').screenshot());
assert.equal(errors.length,0,'no page errors: '+errors.join(' | '));
assert.ok(shot&&shot.spawn,'a player shot was spawned while running');
assert.ok(shot.running,'the shot happened in the running pose, which uses the jointed rig');
const d=Math.hypot(shot.spawn.x-shot.muzzle.x,shot.spawn.y-shot.muzzle.y);
assert.ok(d<0.001,'the bullet starts exactly at the rendered barrel, gap '+d.toFixed(4));
console.log(JSON.stringify({shot,gap:+d.toFixed(6),errors},null,1));
}finally{await br.close();}})().catch(e=>{console.error(e.message||e);process.exitCode=1});
