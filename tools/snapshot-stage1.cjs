// Freezes the opening stage's layout into tests/stage1-layout.json. tests/stages.test.cjs
// compares against it, so any accidental change to SIGNAL YARD shows up as a failing test.
// Only re-run this when SIGNAL YARD is meant to change:
//   node tools/snapshot-stage1.cjs
const fs=require('fs'),vm=require('vm');
const ctx={console,performance:{now:()=>0},addEventListener(){},removeEventListener(){},
  requestAnimationFrame(){},cancelAnimationFrame(){},navigator:{getGamepads:()=>[]}};
vm.createContext(ctx);ctx.globalThis=ctx;
for(const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const g=new ctx.NeonGame(null);g.start();
const s=g.state;
const out={
  worldWidth:g.worldWidth,
  platforms:JSON.parse(JSON.stringify(s.platforms)),
  enemies:JSON.parse(JSON.stringify(s.enemies)),
  pickups:JSON.parse(JSON.stringify(s.pickups)),
  checkpoint:JSON.parse(JSON.stringify(s.checkpoint)),
  arena:JSON.parse(JSON.stringify(ctx.AstraCombat.arena)),
  checkpoints:JSON.parse(JSON.stringify(ctx.AstraCombat.checkpoints)),
  sections:[]
};
// the section name the engine reports across the run
for(let x=0;x<out.worldWidth;x+=10){
  s.mode='playing';s.player.x=x;s.player.y=270;s.player.vy=0;s.player.hp=8;
  s.boss=null;g._tick(1/600);
  const last=out.sections[out.sections.length-1];
  if(!last||last.name!==s.section)out.sections.push({from:x,name:s.section});
}
fs.writeFileSync('tests/stage1-layout.json',JSON.stringify(out,null,1));
console.log('platforms',out.platforms.length,'enemies',out.enemies.length,'pickups',out.pickups.length,
  'sections',out.sections.map(x=>x.name).join(' / '));
