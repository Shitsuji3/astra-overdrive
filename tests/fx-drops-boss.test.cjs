const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function harness(){
  const events={},box={console,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    addEventListener:(n,f)=>events[n]=f,removeEventListener(){},navigator:{getGamepads:()=>[]}};
  vm.createContext(box);
  for(const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),box);
  const g=new box.NeonGame({getContext:()=>({}),addEventListener:(n,f)=>events['canvas-'+n]=f,removeEventListener(){}},{});
  g.start();g.state.enemies=[];g.state.pickups=[];
  const sounds=[];g.onEvent=(type,detail)=>{if(type==='sound')sounds.push(detail.name)};
  return {g,api:box.AstraCombat,bosses:box.AstraBosses,sounds,step(n=1){for(let i=0;i<n;i++)g._tick(1/60)}};
}
function mob(g,x=400,y=276,type='walker'){
  const e={id:99,type,x,y,w:30,h:34,hp:2,maxHp:2,facing:-1,flash:0,dead:false,baseX:x,baseY:y,phase:0,fireTimer:9};
  g.state.enemies.push(e);return e;
}
// A Warden already engaged, held at the given share of his armour.
function arena(share){
  const h=harness(),a=h.api,p=h.g.state.player;
  p.x=a.arena.gate+80;p.y=270;p.vx=0;p.vy=0;p.invuln=999;
  h.g.state.boss={x:a.arena.bossX,y:200,baseY:200,w:100,h:110,hp:72*share,maxHp:72,active:true,
    phase:0,healthPhase:1,attack:'tell-volley',timer:.95,flash:0,facing:-1};
  return h;
}
// Skip the wind-up and let one named pattern run for a while.
function run(h,move,frames){
  const b=h.g.state.boss;
  b.attack='tell-'+move;b.timer=0;b.dashTime=0;b.vy=0;b.slammed=false;
  h.g.state.bullets=[];h.g.state.particles=[];
  for(let i=0;i<(frames||1);i++)h.g._boss(1/60);
  return b;
}

test('a mob taken down by either weapon blows up',()=>{
  for(const weapon of ['shot','saber']){
    const {g,api,sounds}=harness();
    g._roll=()=>1;                                   // no drop, so only the blast is measured
    const e=mob(g);
    if(weapon==='shot'){g._spawn(e.x,e.y+10,0,0,'player',false,9);g._bullets(1/60);}
    else{
      const p=g.state.player;p.x=e.x-30;p.y=270;p.facing=1;p.saberFacing=1;
      p.saberCombo=3;p.saberTime=api.saberDuration;p.saberHit=false;p.saberHits=0;
      for(let i=0;i<30&&!e.dead;i++)g._tick(1/60);
    }
    assert.ok(e.dead,`${weapon} killed the mob`);
    const q=g.state.particles;
    assert.ok(q.some(x=>x.type==='flash'),`${weapon}: a white core`);
    assert.ok(q.filter(x=>x.type==='ring').length>=2,`${weapon}: rings push out`);
    assert.ok(q.filter(x=>x.type==='spark').length>=10,`${weapon}: shrapnel flies`);
    assert.ok(q.some(x=>x.type==='smoke'),`${weapon}: smoke is left`);
    assert.ok(sounds.includes('explode'),`${weapon}: the blast is heard`);
    assert.ok(g.state.shake>.1,`${weapon}: the screen kicks`);
  }
});

test('reduced motion keeps the blast small and smokeless',()=>{
  function blast(calm){
    const {g}=harness();if(calm)g.setOptions({reducedMotion:true});
    g._roll=()=>1;g._killEnemy(mob(g));return g.state.particles;
  }
  const loud=blast(false),calm=blast(true),sparks=q=>q.filter(x=>x.type==='spark').length;
  assert.equal(calm.filter(x=>x.type==='smoke').length,0,'no smoke');
  assert.ok(loud.filter(x=>x.type==='smoke').length>0,'smoke when motion is allowed');
  assert.ok(sparks(calm)<sparks(loud),`less shrapnel: ${sparks(calm)} against ${sparks(loud)}`);
  assert.ok(calm.length<loud.length,'a smaller blast overall');
});

test('one kill in four leaves a repair cell',()=>{
  const {g,api}=harness();
  assert.equal(api.dropChance,.25);
  for(const [roll,dropped] of [[0,1],[.249,1],[.25,0],[.9,0]]){
    const h=harness();h.g._roll=()=>roll;
    h.g._killEnemy(mob(h.g));
    assert.equal(h.g.state.pickups.length,dropped,`roll ${roll}`);
  }
  // over many kills the real generator settles on a quarter
  let drops=0;const n=4000;
  for(let i=0;i<n;i++){g.state.pickups=[];g._drop({x:400,y:276,w:30,h:34});drops+=g.state.pickups.length;}
  const rate=drops/n;
  assert.ok(Math.abs(rate-.25)<.03,`measured ${rate.toFixed(3)}`);
});

test('a dropped cell falls to the surface under it and stays there',()=>{
  const {g}=harness();g._roll=()=>0;
  g.state.platforms=[{x:300,y:300,w:200,h:20,type:'floor'}];
  g._killEnemy(mob(g,400,150,'drone'));
  const k=g.state.pickups[0];
  assert.equal(k.rest,false,'it starts in the air');
  for(let i=0;i<180&&!k.rest;i++)g._pickups(1/60);
  assert.ok(k.rest,'it settles');
  assert.equal(k.y+18,300,'it sits on the surface');
  g._pickups(1/60);assert.equal(k.y+18,300,'and stops moving');
});

test('a cell dropped over a pit falls out of the world',()=>{
  const {g}=harness();g._roll=()=>0;g.state.platforms=[];
  g._killEnemy(mob(g,400,150,'drone'));
  assert.equal(g.state.pickups.length,1);
  for(let i=0;i<200&&g.state.pickups.length;i++)g._pickups(1/60);
  assert.equal(g.state.pickups.length,0,'nothing is left hanging below the stage');
});

test('a repair cell restores one armour, a placed pack still restores two',()=>{
  const {g,api}=harness();g._roll=()=>0;
  const p=g.state.player;p.hp=4;
  g._killEnemy(mob(g,p.x,p.y));
  const k=g.state.pickups[0];k.rest=true;k.x=p.x;k.y=p.y;
  g._pickups(1/60);
  assert.equal(k.taken,true);
  assert.equal(p.hp,4+api.dropHeal);
  g.state.pickups.push({x:p.x,y:p.y,type:'health',taken:false});
  g._pickups(1/60);assert.equal(p.hp,4+api.dropHeal+2);
  p.hp=p.maxHp;
  g.state.pickups.push({x:p.x,y:p.y,type:'health',taken:false,dropped:true,rest:true,heal:api.dropHeal});
  g._pickups(1/60);assert.equal(p.hp,p.maxHp,'never past the armour cap');
});

test('the Warden has all six of its patterns from the opening bell',()=>{
  const {api,bosses}=harness();
  const warden=bosses.get('warden');
  const mine=['volley','wave','dash','mortar','ring','slam'];
  assert.deepEqual(Array.from(warden.pool),mine,'nothing is held back');
  assert.deepEqual(Array.from(api.bossPool(warden)),mine,'the pool belongs to the entry');
  for(const name of mine)assert.ok(api.bossPatterns[name],`${name} is described`);
  // the catalogue is wider than any one boss
  assert.ok(Array.from(api.bossPatternOrder).length>mine.length,'other bosses have more to draw on');
  // the rotation walks its own list whatever shape he is in
  let at='volley';const walked=[at];
  for(let i=0;i<5;i++){at=api.bossNext(at,warden);walked.push(at);}
  assert.deepEqual(walked,mine,'the cycle covers every move it owns');
  assert.equal(api.bossNext('slam',warden),'volley','and wraps back round');
});

test('every pattern comes out at any armour level, and each is announced first',()=>{
  for(const [share,expected] of [[1,6],[.5,6],[.2,6]]){
    const h=arena(share),b=h.g.state.boss;
    // he spawns already winding up, so the log starts from that wind-up
    const log=[{at:-Math.round(b.timer*60),from:null,to:String(b.attack)}];
    for(let i=0;i<3600;i++){
      const before=b.attack;h.step(1);b.hp=72*share;        // hold the health phase steady
      if(b.attack!==before)log.push({at:i,from:before,to:String(b.attack)});
    }
    const fired=log.filter(x=>x.to.indexOf('tell-')!==0);
    const seen=new Set(fired.map(x=>x.to));
    assert.equal(seen.size,expected,`at ${share*100}% armour: ${[...seen].join(', ')}`);
    for(let i=0;i<log.length;i++){
      const e=log[i];if(e.to.indexOf('tell-')===0)continue;
      assert.equal(e.from,'tell-'+e.to,`${e.to} was announced`);
      const started=log[i-1];
      assert.ok(e.at-started.at>=29,`${e.to} winds up for ${((e.at-started.at)/60).toFixed(2)}s`);
    }
  }
});

test('each pattern does its own thing',()=>{
  // volley: a fan of five, spread across the vertical
  let h=arena(1),b=run(h,'volley',1),shots=h.g.state.bullets;
  assert.equal(shots.length,5);
  assert.equal(new Set(shots.map(x=>x.vy)).size,5,'the fan spreads');

  // ground wave: one heavy shot hugging the floor
  h=arena(1);b=run(h,'wave',1);
  assert.equal(h.g.state.bullets.length,1);
  const w=h.g.state.bullets[0];
  assert.equal(w.power,2);assert.ok(w.r>=7,'it is wide');
  assert.equal(w.vy,0);assert.ok(w.y>b.baseY+b.h-30,'it runs along the floor');

  // charge: he covers ground and stays inside the arena
  h=arena(1);b=run(h,'dash',1);
  const from=b.x;
  for(let i=0;i<54;i++)h.g._boss(1/60);
  assert.ok(Math.abs(b.x-from)>60,'the charge covers ground');
  assert.ok(b.x>=h.api.arena.bossMin&&b.x<=h.api.arena.bossMax);

  // spread: ten shots covering every direction
  h=arena(.5);b=run(h,'ring',1);
  const ring=h.g.state.bullets;
  assert.equal(ring.length,10);
  assert.ok(ring.some(x=>x.vx>0)&&ring.some(x=>x.vx<0),'left and right');
  assert.ok(ring.some(x=>x.vy>0)&&ring.some(x=>x.vy<0),'up and down');
});

function lobAt(flatFloor){
  const h=arena(.5),p=h.g.state.player;
  p.x=h.api.arena.gate+120;p.invuln=999;              // shells pass through him and reach the ground
  if(flatFloor)h.g.state.platforms=[{x:8900,y:310,w:700,h:50,type:'floor'}];
  run(h,'mortar',1);
  const aim=p.x+p.w/2,landed=[];
  // the bullets are mutated as they fly, so record how they left the barrel
  const shells=h.g.state.bullets.map(x=>({g:x.g,vy:x.vy,r:x.r,kind:x.kind}));
  for(let i=0;i<240&&h.g.state.bullets.length;i++){
    const before=h.g.state.bullets.slice();
    h.g._bullets(1/60);
    for(const s of before)if(!h.g.state.bullets.includes(s))landed.push(s.x);
  }
  return {h,aim,shells,landed:landed.sort((a,z)=>a-z)};
}

test('mortar shells arc onto the ground and burst there',()=>{
  const {h,shells,landed}=lobAt(false);
  assert.equal(shells.length,3);
  assert.ok(shells.every(x=>x.g>0),'they arc');
  assert.ok(shells.every(x=>x.vy<0),'they are lobbed upward first');
  assert.equal(h.g.state.bullets.length,0,'nothing is left flying');
  assert.equal(landed.length,3,'all three come down');
  assert.ok(h.g.state.particles.some(q=>q.type==='flash'),'each landing bursts');
});

test('over open floor the middle shell lands on the mark',()=>{
  const {aim,landed}=lobAt(true);
  assert.ok(Math.abs(landed[1]-aim)<12,`landed ${landed[1].toFixed(0)} against ${aim}`);
  assert.ok(landed[0]<aim-40&&landed[2]>aim+40,'the other two straddle it');
});

test('the slam leaves the floor and throws a wave both ways when it lands',()=>{
  const h=arena(.2),b=run(h,'slam',1);
  assert.ok(b.vy<0,'he leaves the floor');
  let frames=0;
  while(!b.slammed&&frames<120){h.g._boss(1/60);frames++;}
  assert.ok(b.slammed,'he comes back down');
  assert.ok(frames>18,`he hangs long enough to be read: ${(frames/60).toFixed(2)}s`);
  assert.equal(b.y,b.baseY,'and lands square on the floor');
  const waves=h.g.state.bullets.filter(x=>x.kind==='wave');
  assert.equal(waves.length,2);
  assert.ok(waves.some(x=>x.vx<0)&&waves.some(x=>x.vx>0),'the floor throws one each way');
  assert.ok(waves.every(x=>x.y>b.baseY+b.h-30),'along the floor');
  assert.ok(h.g.state.shake>=.4,'the impact kicks the screen');
});

test('the slam tracks the player but never leaves the arena',()=>{
  for(const at of ['gate','far']){
    const h=arena(.2),a=h.api,b=h.g.state.boss,p=h.g.state.player;
    p.x=at==='gate'?a.arena.gate:a.arena.bossMax+80;
    const from=b.x;run(h,'slam',1);
    // where he comes down is the leap's doing; after that the scurry is free to wander
    let landed=null;
    for(let i=0;i<90;i++){
      h.g._boss(1/60);
      if(landed===null&&!b.leap)landed=b.x;
      assert.ok(b.x>=a.arena.bossMin&&b.x<=a.arena.bossMax,`inside the arena at frame ${i}`);
    }
    assert.ok(Math.abs(landed-from)>10,'he closes on the player');
  }
});

test('the Warden goes up in stages: bursts, then one big blast, then victory',()=>{
  const h=arena(.2),g=h.g,b=g.state.boss,C=h.api;
  g._spawn(b.x,b.y+40,-200,0,'enemy',false,1);      // something of his still in the air
  const log=[];g.onEvent=(type,detail)=>{if(type==='sound')log.push(detail.name)};
  b.hp=0;g._boss(1/60);
  assert.equal(g.state.mode,'playing','the victory screen waits for him to finish');
  assert.ok(b.down,'he is marked down at once');
  assert.equal(g.state.bullets.length,0,'his shots come off the board with him');
  let frames=1;
  while(g.state.mode==='playing'&&frames<400){g._boss(1/60);frames++;}
  assert.equal(g.state.mode,'victory');
  assert.equal(b.active,false,'and he is finally gone');
  const bursts=log.filter(x=>x==='explode').length;
  assert.ok(bursts>=C.bossDeath.bursts,`several bursts land first: ${bursts}`);
  assert.equal(log.filter(x=>x==='boom').length,1,'exactly one big blast');
  assert.ok(log.indexOf('boom')>log.lastIndexOf('explode'),'the big one comes after every burst');
  assert.equal(log[log.length-1],'victory','then the victory hand-off');
  assert.ok(Math.abs(frames/60-C.bossDeath.end)<.1,`the whole thing runs ${(frames/60).toFixed(2)}s`);
});

test('the final blast dwarfs the bursts and clears his frame off the screen',()=>{
  const h=arena(.2),g=h.g,b=g.state.boss;
  b.hp=0;g._boss(1/60);
  let burstPeak=0,blastPeak=0,frames=0;
  while(g.state.mode==='playing'&&frames<400){
    g.state.particles=[];g._boss(1/60);frames++;
    const n=g.state.particles.length;
    if(b.blasted)blastPeak=Math.max(blastPeak,n);else burstPeak=Math.max(burstPeak,n);
  }
  assert.ok(burstPeak>10,`the bursts throw particles: ${burstPeak}`);
  assert.ok(blastPeak>burstPeak*3,`the finale is far bigger: ${blastPeak} against ${burstPeak}`);
  assert.ok(b.gone,'his frame stops being drawn once it lets go');
  assert.ok(g.state.shake>=1,'and it kicks the screen hard');
  assert.ok(g.state.flash>0,'with a white flash the renderer had never used');
});

test('a downed Warden takes no more hits and fires nothing',()=>{
  const h=arena(.2),g=h.g,b=g.state.boss,p=g.state.player;
  b.hp=0;g._boss(1/60);
  p.x=b.x-40;p.saberCombo=1;p.saberFacing=1;p.saberTime=h.api.saberDuration;
  g._damageNearby(h.api.saberRange,99,1);
  g._spawn(b.x+10,b.y+40,0,0,'player',false,99);g._bullets(1/60);
  assert.equal(b.hp,0,'his armour cannot go below nothing');
  for(let i=0;i<120;i++)g._boss(1/60);
  assert.equal(g.state.bullets.filter(x=>x.team==='enemy').length,0,'and he never fires again');
});
