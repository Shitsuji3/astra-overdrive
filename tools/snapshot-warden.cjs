// Freezes what the Warden does today: every pattern's spawned bullets and timings.
//
//   node tools/snapshot-warden.cjs
//
// Re-run this only when the Warden is meant to change. The body comes from the roster rather
// than from numbers written here, so the frozen shots always describe the boss the game builds.
const fs=require('fs'),vm=require('vm');
const ctx={console,performance:{now:()=>0},addEventListener(){},removeEventListener(){},
  requestAnimationFrame(){},cancelAnimationFrame(){},navigator:{getGamepads:()=>[]}};
vm.createContext(ctx);ctx.globalThis=ctx;
for(const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const C=ctx.AstraCombat;
const out={patterns:JSON.parse(JSON.stringify(C.bossPatterns)),order:Array.from(C.bossPatternOrder),
  tellScale:Array.from(C.bossTellScale),death:JSON.parse(JSON.stringify(C.bossDeath)),fire:{}};
for(const move of C.bossPatternOrder){
  const g=new ctx.NeonGame(null);g.start({stage:'signal-yard'});
  g._roll=()=>1;                      // the scurry keeps still, so these numbers are the attack
  const s=g.state,p=s.player;
  p.x=C.arena.gate+80;p.y=270;p.vx=0;p.vy=0;p.invuln=1e9;
  const b=g._spawnBoss('warden');
  b.attack='tell-'+move;b.timer=0;b.dashTime=0;b.vy=0;b.slammed=false;
  s.bullets=[];s.particles=[];
  g._boss(1/60);
  out.fire[move]={body:{w:b.w,h:b.h},bullets:s.bullets.map(b=>({x:Math.round(b.x),y:Math.round(b.y),
    vx:Math.round(b.vx),vy:Math.round(b.vy),r:b.r,power:b.power,kind:b.kind||null,g:b.g||0})),
    dashTime:s.boss.dashTime||0,vy:Math.round(s.boss.vy||0),timer:+(s.boss.timer||0).toFixed(3)};
}
fs.writeFileSync('tests/warden-baseline.json',JSON.stringify(out,null,1));
console.log(Object.entries(out.fire).map(([k,v])=>k+':'+v.bullets.length).join('  '));
