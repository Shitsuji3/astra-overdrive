const assert = require('assert');
const { test } = require('node:test');
const fs = require('fs'), vm = require('vm');
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){}, requestAnimationFrame(){}, cancelAnimationFrame(){} };
// The saber hits with the blade the rig draws, so the rigs have to be present here too.
vm.createContext(ctx); ctx.globalThis = ctx;
for (const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'), ctx);
function game(){const g=new ctx.NeonGame(null);g.start();return g;}
// Somewhere with floor underfoot and nothing overhead, because the rising cut leaps.
function clearFloor(g){
  for(let x=40;x<4000;x+=10){
    const floor=g.state.platforms.some(q=>q.y===310&&q.x<=x&&q.x+q.w>=x+24);
    const roof=g.state.platforms.some(q=>q.y<310&&q.y>140&&q.x<x+34&&q.x+q.w>x-8);
    if(floor&&!roof)return x;
  }
  return 400;
}
function tick(g,n=1){for(let i=0;i<n;i++)g._tick(1/60);}
function press(g){g.setInput('saber',true);tick(g);g.setInput('saber',false);}
function quiet(g){g._enemies=()=>{};g._boss=()=>{};}
function enemyAt(g,dx,dy=0,hp=100){const p=g.state.player;const e={id:99,type:'walker',x:p.x+dx,y:p.y+dy,w:30,h:p.h,hp,maxHp:hp,facing:-1,flash:0,dead:false};g.state.enemies=[e];return e;}
function bossAt(g,dx,dy=0,hp=100){const p=g.state.player;p.x=ctx.AstraCombat.arena.gate+30;p.y=270;p.vx=0;p.vy=0;const b={x:p.x+dx,y:p.y+20-55+dy,w:100,h:110,hp,maxHp:hp,active:true,flash:0,attack:'tell-volley',timer:999};g.state.boss=b;return b;}
// Each stage lands its cut where its own blade swings out, so wait for that moment.
function cutFrames(stage){return Math.ceil(ctx.AstraCombat.saberHitTimes[stage-1][0]*60)+2;}
function saberAndHit(g,stage=1){press(g);tick(g,cutFrames(stage));}
function swingAs(g,stage,facing){const p=g.state.player;p.saberCombo=stage;p.saberTime=ctx.AstraCombat.saberDuration;
 p.saberHit=false;p.saberHits=0;p.saberFacing=facing;tick(g,cutFrames(stage));}

test('run animation has 16 debug frames across a  .50s cycle',()=>{
  assert.equal(ctx.AstraCombat.runFrameCount,16);
  for(let i=0;i<16;i++){const t=(i+.001)* .50/16;assert.equal(ctx.AstraCombat.runFrame({runTime:t}),i);}
  assert.equal(ctx.AstraCombat.runFrame({runTime: .50}),0);assert.equal(ctx.AstraCombat.saberRange,72);
});
function waitStage(g,n){for(let i=0;i<60&&g.state.player.saberCombo!==n;i++)tick(g);assert.equal(g.state.player.saberCombo,n);}
test('saber advances 1 to 2 to 3 then expires, including queued window',()=>{
 const g=game(),p=g.state.player;press(g);tick(g,8);press(g);assert.equal(p.saberQueued,true);waitStage(g,2);tick(g,8);press(g);waitStage(g,3);tick(g,26);assert.equal(p.saberCombo,0);
});
test('third swing cannot queue and expired tick input starts combo one',()=>{
 const g=game(),p=g.state.player;press(g);tick(g,8);press(g);waitStage(g,2);tick(g,8);press(g);waitStage(g,3);tick(g,8);press(g);assert.equal(p.saberQueued,false);
 while(!(p.saberTime>0&&p.saberTime<=1/60))tick(g);press(g);tick(g);assert.equal(p.saberCombo,1);
});
test('early input is ignored and held input does not auto-repeat',()=>{
  const g=game(),p=g.state.player;press(g);tick(g,2);press(g);assert.equal(p.saberQueued,false);tick(g,30);assert.equal(p.saberCombo,0);g.setInput('saber',true);tick(g,60);assert.equal(p.saberCombo,0);assert.equal(p.saberQueued,false);g.setInput('saber',false);
});
for(const facing of [-1,1]){
  test(`each stage reaches as far as its own blade, facing ${facing}`,()=>{
    // measured from the drawn arc: the sweep is the shortest, the finisher the longest
    for(const [stage,hitAt,missAt] of [[1,60,110],[2,50,95],[3,70,120]]){
      for(const [distance,shouldHit] of [[hitAt,true],[missAt,false]]){
        const g=game();quiet(g);g.state.player.facing=facing;
        const e=enemyAt(g,facing*distance);swingAs(g,stage,facing);
        assert.equal(e.hp<100,shouldHit,`stage ${stage} at ${distance}px`);
      }
    }
    // nothing well behind the swing is touched
    for(const stage of [1,2,3]){
      const g=game();quiet(g);g.state.player.facing=facing;
      const e=enemyAt(g,-facing*60);swingAs(g,stage,facing);assert.equal(e.hp,100);
    }
  });
  test(`the boss is struck by the blade rather than a fixed box, facing ${facing}`,()=>{
    // distances are from the body centre to the near edge of the boss, either way he faces
    const place=(g,dist)=>bossAt(g,facing>0?dist+12:12-dist-100);
    for(const [stage,hitAt,missAt] of [[1,60,130],[2,50,120],[3,70,140]]){
      for(const [distance,shouldHit] of [[hitAt,true],[missAt,false]]){
        const g=game();quiet(g);g.state.player.facing=facing;
        const b=place(g,distance);swingAs(g,stage,facing);
        assert.equal(b.hp<100,shouldHit,`stage ${stage} boss at ${distance}px`);
      }
    }
    const g=game();quiet(g);g.state.player.facing=facing;
    const b=place(g,-260);swingAs(g,1,facing);assert.equal(b.hp,100);
  });
}
test('the flat waist sweep cannot reach what the overhead cut and the finisher can',()=>{
  // 60px above the floor is inside the overhead arc and the finisher, above the sweep's band
  for(const [stage,shouldHit] of [[1,true],[2,false],[3,true]]){
    const g=game();quiet(g);const e=enemyAt(g,30,-60);swingAs(g,stage,1);
    assert.equal(e.hp<100,shouldHit,`stage ${stage} against a high target`);
  }
  // a grounded enemy stays inside all three, so the combo still connects
  for(const stage of [1,2,3]){
    const g=game();quiet(g);const e=enemyAt(g,30);swingAs(g,stage,1);
    assert.ok(e.hp<100,`stage ${stage} against a grounded enemy`);
  }
});
test('stages 1 and 2 hit once for 4.5; the finisher lands four cuts for 11.25',()=>{
  const g=game();quiet(g);const p=g.state.player,e=enemyAt(g,20,0,100);const waitForStage=n=>{for(let i=0;i<40&&p.saberCombo!==n;i++)tick(g);assert.equal(p.saberCombo,n);};
  press(g);tick(g,cutFrames(1));assert.equal(e.hp,95.5);tick(g,6);assert.equal(e.hp,95.5);
  press(g);waitForStage(2);tick(g,cutFrames(2));assert.equal(Number(e.hp.toFixed(3)),91);tick(g,6);assert.equal(Number(e.hp.toFixed(3)),91);
  press(g);waitForStage(3);
  const cuts=[];let last=e.hp;
  for(let i=0;i<45;i++){tick(g);if(e.hp!==last){cuts.push(Number((last-e.hp).toFixed(4)));last=e.hp;}}
  assert.deepEqual(cuts,[2.8125,2.8125,2.8125,2.8125]);
  assert.equal(Number(e.hp.toFixed(4)),79.75);
});
// How far the cutting edge actually gets, measured from where the player was standing when the
// move began. The rising cut takes its height from the leap, so this has to play the move out
// rather than hold the body still and spin the clock.
function reach(stage){
  const g=game();quiet(g);const p=g.state.player,C=ctx.AstraCombat;
  const x0=clearFloor(g);
  p.x=x0;p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
  const top=p.y,front=p.x+p.w;
  if(stage===4){g.setInput('up',true);press(g);g.setInput('up',false);}
  else{p.saberCombo=stage;p.saberTime=C.saberDuration;p.saberFacing=1;p.saberHit=false;p.saberHits=0;}
  let above=0,ahead=0;
  for(let i=0;i<Math.ceil(C.saberSpan(p)*60)+40;i++){
    for(const s of C.saberSweep(p)||[]){
      above=Math.max(above,top-s.ay,top-s.by);
      ahead=Math.max(ahead,s.ax-front,s.bx-front);
    }
    tick(g);
  }
  return {above:Math.round(above),ahead:Math.round(ahead)};
}

test('up with the saber asks for the rising cut, and nothing else does',()=>{
  const g=game(),p=g.state.player;quiet(g);
  p.x=400;p.y=270;p.vx=0;p.vy=0;p.onGround=true;
  press(g);
  assert.equal(p.saberCombo,1,'on its own the saber opens the chain');
  tick(g,Math.ceil(ctx.AstraCombat.saberDuration*60)+3);
  g.setInput('up',true);press(g);
  assert.equal(p.saberCombo,4,'held up, it is the rising cut instead');
  // and it is not a link in the chain: pressing again during it queues nothing
  g.setInput('saber',true);tick(g,4);g.setInput('saber',false);
  assert.equal(p.saberQueued,false,'the rising cut does not chain');
  // it runs longer than a chained swing, so wait out its own clock
  tick(g,Math.ceil(ctx.AstraCombat.rising.span*60)+4);
  assert.equal(p.saberCombo,0,'it ends the swing rather than handing on');
});

test('up is a direction now, not a second jump key',()=>{
  const g=game(),p=g.state.player;quiet(g);
  p.x=400;p.y=270;p.vx=0;p.vy=0;p.onGround=true;
  g._mapKey('arrowup',true);tick(g,2);
  assert.ok(p.onGround&&p.vy>=0,`arrow up leaves him on the floor: vy ${p.vy}`);
  assert.equal(g.input.up,true,'and asks for up instead');
  g._mapKey('arrowup',false);
  p.y=270;p.vy=0;p.onGround=true;
  g._mapKey(' ',true);tick(g);
  assert.ok(p.vy<-300,'space still jumps');
});

test('the two presses do not have to land on the same frame',()=>{
  const C=ctx.AstraCombat;
  const start=(g)=>{const p=g.state.player;p.x=400;p.y=270;p.vx=0;p.vy=0;p.onGround=true;return p;};
  // up let go a moment before the saber still asks for the rising cut
  const before=(frames)=>{
    const g=game();quiet(g);const p=start(g);
    g.setInput('up',true);tick(g);g.setInput('up',false);
    tick(g,frames);
    press(g);
    return p.saberCombo;
  };
  assert.equal(before(0),4,'let go on the same frame');
  assert.equal(before(5),4,'let go five frames earlier');
  assert.equal(before(40),1,'but not half a second earlier');
  // and the saber landing first still becomes the rising cut, before the blade is out
  const after=(frames)=>{
    const g=game();quiet(g);const p=start(g);
    press(g);
    tick(g,frames);
    g.setInput('up',true);tick(g);
    return p.saberCombo;
  };
  assert.equal(after(0),4,'up one frame late');
  assert.equal(after(2),4,'up three frames late');
  assert.equal(after(20),1,'but a swing already under way is left alone');
});

test('the rising cut gets its height from the leap',()=>{
  const rise=reach(4),over=reach(1),finish=reach(3);
  // the flame ends up far above anything a swing in place can touch
  assert.ok(rise.above>over.above+50,`the rising cut: ${rise.above} against ${over.above}`);
  assert.ok(rise.above>finish.above+40,`and against the finisher: ${rise.above} against ${finish.above}`);
});

test('the leap matches the arc traced off the reference',()=>{
  const g=game();quiet(g);const p=g.state.player,C=ctx.AstraCombat;
  p.x=clearFloor(g);p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
  const y0=p.y,x0=p.x;
  g.setInput('up',true);press(g);g.setInput('up',false);
  let apex=0,apexAt=0,landed=null;
  for(let i=1;i<=140;i++){
    tick(g);
    const up=y0-p.y;
    if(up>apex){apex=up;apexAt=i;}
    if(landed===null&&i>12&&p.onGround)landed=i;
  }
  // the clip rises two body heights in about half a second and is back down inside a second
  assert.ok(Math.abs(apex-C.rising.apex)<12,`apex ${apex} against the reference's ${C.rising.apex}`);
  assert.ok(apexAt/60>.45&&apexAt/60<.70,`apex reached at ${(apexAt/60).toFixed(2)}s`);
  assert.ok(landed/60>.85&&landed/60<1.15,`back on the floor at ${(landed/60).toFixed(2)}s`);
  assert.ok(p.x-x0>8&&p.x-x0<34,`and it carries him forward ${Math.round(p.x-x0)}px`);
});

test('the rising cut takes down something no swing in place can reach',()=>{
  // Hang a drone in the band between the two ceilings: its lowest edge sits clear of anything
  // the overhead cut can touch, and well inside what the leap carries the flame to.
  const over=reach(1),rise=reach(4);
  assert.ok(rise.above>over.above+30,'there is a band to hang it in');
  const high=(stage)=>{
    const g=game();quiet(g);const p=g.state.player,C=ctx.AstraCombat;
    const x0=clearFloor(g);
    p.x=x0;p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
    const bottom=p.y-over.above-C.saberPad(p)-10;
    const e={id:7,type:'drone',x:p.x+10,y:bottom-24,w:28,h:24,hp:100,maxHp:100,facing:-1,flash:0,dead:false};
    g.state.enemies=[e];
    if(stage===4){g.setInput('up',true);press(g);g.setInput('up',false);}
    else{p.saberCombo=stage;p.saberTime=C.saberDuration;p.saberFacing=1;p.saberHit=false;p.saberHits=0;}
    tick(g,Math.ceil(C.saberSpan(p)*60)+20);
    return 100-e.hp;
  };
  assert.ok(high(4)>0,'the rising cut reaches it');
  assert.equal(high(1),0,'the overhead cut does not');
});

test('finisher damage config is four separate cuts worth 2.5 normal swings',()=>{
  const c=ctx.AstraCombat;
  // three chained swings on a clock; the rising cut bites on contact instead, four times at most
  assert.deepEqual(c.saberHitTimes.map(t=>t.length),[1,1,4]);
  assert.ok(c.saberHitTimes[2].every((t,i,a)=>i===0||t>a[i-1]),'finisher cut times increase');
  assert.ok(c.saberHitTimes[2][c.saberHitTimes[2].length-1]<c.saberDuration,'every cut lands inside the swing');
  const total=n=>c.saberHitTimes[n].length*c.saberPower*c.saberComboPower[n];
  assert.equal(total(0),4.5);assert.equal(total(1),4.5);assert.equal(total(2),11.25);
  assert.equal(total(2)/total(0),2.5);
  assert.equal(c.rising.bites*c.saberPower*c.saberComboPower[3],11.25,'the rising cut deals what it always has in play');
  assert.ok(c.rising.bites*c.rising.biteEvery<c.rising.span,'and all four bites fit inside the rise');
});
test('the finisher applies each cut to the boss as well',()=>{
  const g=game();quiet(g);const p=g.state.player;const b=bossAt(g,30,0,100);
  p.saberCombo=2;p.saberQueued=true;p.saberTime=1/60;
  for(let i=0;i<40&&p.saberCombo!==3;i++)tick(g);
  assert.equal(p.saberCombo,3);
  for(let i=0;i<25;i++)tick(g);
  assert.equal(Number(b.hp.toFixed(4)),88.75);
});
test('reset clears saber flags',()=>{const g=game();press(g);g.state.player.saberQueued=true;g.state.player.saberHit=true;g.state.player.saberHits=3;g._reset('playing');const p=g.state.player;assert.equal(p.saberTime,0);assert.equal(p.saberCombo,0);assert.equal(p.saberQueued,false);assert.equal(p.saberHit,false);assert.equal(p.saberHits,0);});


for(const facing of [-1,1]) test(`the blade clears the shots it actually sweeps through, facing ${facing}`,()=>{
  // dx from the body centre, dy from the soles: one point inside each stage's arc, one outside
  const cases=[[1,{dx:45,dy:-50},{dx:45,dy:25}],
               [2,{dx:45,dy:-30},{dx:45,dy:-75}],
               [3,{dx:55,dy:-60},{dx:130,dy:-60}]];
  for(const [combo,inside,outside] of cases){
    const g=game(),p=g.state.player;g.state.enemies=[];p.x=500;p.facing=-facing;
    p.saberCombo=combo;p.saberFacing=facing;
    p.saberTime=ctx.AstraCombat.saberDuration-ctx.AstraCombat.saberHitTimes[combo-1][0];
    const at=o=>[p.x+p.w/2+facing*o.dx, p.y+p.h+o.dy];
    g._spawn(...at(inside),0,0,'enemy');
    g._spawn(...at(outside),0,0,'enemy');
    g._spawn(...at(inside),0,0,'player');          // his own shots pass straight through
    g._bullets(1/60);
    assert.equal(g.state.bullets.length,2,`stage ${combo} clears only the swept shot`);
    assert.ok(g.state.bullets.some(b=>b.team==='player'),`stage ${combo} keeps the player shot`);
    assert.equal(p.hp,8,`stage ${combo} takes no hit`);
    assert.ok(g.state.particles.length>0);
  }
});
test('a shot on the arc is cut down, one during the windup is not',()=>{
  const C=ctx.AstraCombat;
  // stage 1 sweeps overhead first, so the same point is safe early and cut once the blade arrives
  for(const [elapsed,clears] of [[0,false],[.02,false],[C.saberHitTimes[0][0],true],[.39,false]]){
    const g=game(),p=g.state.player;g.state.enemies=[];
    p.saberCombo=1;p.saberFacing=1;p.saberTime=elapsed===0?0:C.saberDuration-elapsed;
    g._spawn(p.x+p.w/2+45,p.y+p.h-50,0,0,'enemy');
    g._bullets(1/60);
    assert.equal(p.hp,clears?8:8,'a shot out at arm length never reaches him');
    assert.equal(g.state.bullets.length,clears?0:1,`elapsed ${elapsed}`);
  }
});
test('a shot entering the arc after the cut has landed is still cut down',()=>{
  const C=ctx.AstraCombat;
  const g=game(),p=g.state.player;g.state.enemies=[];
  p.saberCombo=1;p.saberFacing=1;p.saberHit=true;p.saberHits=1;
  p.saberTime=C.saberDuration-C.saberHitTimes[0][0];
  g._spawn(p.x+p.w/2+45,p.y+p.h-50,-600,0,'enemy');g._bullets(1/60);
  assert.equal(g.state.bullets.length,0);assert.equal(p.hp,8);
});


test('relaxed recovery keeps impact phase and takes longer to settle',()=>{
 const c=ctx.AstraCombat;assert.equal(c.saberDuration,.4);
 assert.ok(Math.abs(c.saberPhase({saberTime:.32})-.25)<1e-9);
 assert.equal(c.saberPhase({saberTime:.16}),.75);
 assert.equal(c.saberPhase({saberTime:.08}),.875);
 assert.equal(c.saberPhase({saberTime:0}),1);
});

// --- what the eleven-frame sheet added ------------------------------------------------------
// The sheet's first four frames are a windup: the flame goes out BEHIND the figure at chest
// height, sweeps down through the legs, and lies forward along the floor at the deepest crouch
// before any of it goes up. Reading the drawn flame's own direction is the only way to tell
// that apart from a flame that simply switches on pointing upward.
function flameAim(t){
  const rig=ctx.AstraSaberRig,p=rig.pose(4,t),b=rig.blade(p);
  return Math.atan2(b.tip.y-b.root.y,b.tip.x-b.root.x);
}
test('the flame winds out behind, passes along the floor and only then goes up',()=>{
  const back=flameAim(.035),floor=flameAim(.085),up=flameAim(.30);
  // behind: pointing away from the way the figure faces, within thirty degrees of level
  assert.ok(Math.cos(back)<-.8,`the windup points behind: ${back.toFixed(2)}rad`);
  // along the floor: forward, and no more than thirty degrees off level
  assert.ok(Math.cos(floor)>.8,`the floor pass points forward: ${floor.toFixed(2)}rad`);
  assert.ok(Math.abs(Math.sin(floor))<.5,`and lies flat: ${floor.toFixed(2)}rad`);
  // and the rise carries it up and forward
  assert.ok(Math.sin(up)<-.6&&Math.cos(up)>0,`the rise points up and forward: ${up.toFixed(2)}rad`);
});
test('the figure arches backward through the rise, as the sheet does',()=>{
  // spin turns the whole figure about its hip; on the sheet the head trails the feet
  for(const t of [.26,.46,.67,.85]){
    const s=ctx.AstraSaberRig.pose(4,t).spin;
    assert.ok(s<0,`arched back at ${t}: spin ${s}`);
    assert.ok(s>-.6,`but not lying down at ${t}: spin ${s}`);
  }
  // and the legs hang rather than tucking: the sheet's feet sit where a standing frame's do
  for(const t of [.26,.46,.67,.85])
    assert.ok(ctx.AstraSaberRig.pose(4,t).lift<=4,`legs hang at ${t}`);
});
test('the ride down is a pose, not an attack, and ends when the ride does',()=>{
  const g=game(),C=ctx.AstraCombat,p=g.state.player;quiet(g);
  p.x=clearFloor(g);p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
  g.setInput('up',true);press(g);g.setInput('up',false);
  // hang something in reach of where the held blade is drawn, to prove it cannot cut
  let held=0,landed=0;
  for(let i=1;i<=150;i++){
    tick(g);
    if(C.risingHeld(p)){
      held++;
      assert.equal(C.saberStage(p),5,'the ride down is its own set of poses');
      assert.equal(p.saberCombo,0,'and the swing is over');
      const e=enemyAt(g,14,-30);tick(g);
      assert.equal(e.hp,100,'a held blade cuts nothing');
      g.state.enemies=[];
    }
    if(!landed&&i>12&&p.onGround)landed=i;
    if(landed&&p.onGround)assert.ok(!C.risingHeld(p),'and it is over once he lands');
  }
  assert.ok(held>4,`the pose is on screen for a while: ${held} frames`);
});
test('a dash out of the ride down drops the pose at once',()=>{
  const g=game(),C=ctx.AstraCombat,p=g.state.player;quiet(g);
  p.x=clearFloor(g);p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
  g.setInput('up',true);press(g);g.setInput('up',false);
  for(let i=0;i<150&&!C.risingHeld(p);i++)tick(g);
  assert.ok(C.risingHeld(p),'reached the ride down');
  g.setInput('dash',true);tick(g);g.setInput('dash',false);
  assert.ok(!C.risingHeld(p),'the dash drops it');
});
test('the rig carries five stages and the fifth resolves',()=>{
  const rig=ctx.AstraSaberRig;
  for(const t of [0,.45,.80]){
    const p=rig.pose(5,t);
    assert.equal(p.stage,5);
    assert.ok(Number.isFinite(p.hip.x)&&Number.isFinite(p.hand.y));
    assert.ok(rig.blade(p).visible,`the ride down holds a blade at ${t}`);
  }
  // a fall long enough to run the pose out puts the blade away rather than holding it for ever
  assert.ok(!rig.blade(rig.pose(5,1)).visible,'and it goes out at the end of the pose');
});

// --- what makes the plume read as fire rather than as a shape --------------------------------
// The first version of this move drew nested outlines, which can only give concentric bands on
// a solid body that holds one shape. Measured against the reference GIF that was wrong three
// ways at once: the reference's fire covers only a fifth to a third of its own bounding box,
// its temperature runs diagonally rather than in rings, and it re-forms on an eight frame
// loop. Those three are what these hold.
test('the plume runs the nine colours of the fire itself, coolest to hottest',()=>{
  const fire=ctx.AstraSaberRig.fire;
  // The colours that turn up in the reference's rising frames but never on the hero standing
  // still. An earlier list took three of the hero's for fire - his white armour #f0f0f0, gold hair
  // #e8c838 and red armour #f01000 - and missed the fire's real hottest value, a lavender white.
  assert.deepEqual(Array.from(fire.map(b=>b.c)),
    ['#981810','#c81810','#e82810','#f05818','#f88818','#f8d828','#f8f040','#f8f8b8','#f8f0f8']);
  const lum=c=>{const n=parseInt(c.slice(1),16);return ((n>>16)&255)+((n>>8)&255)*2+(n&255);};
  for(let i=1;i<fire.length;i++){
    assert.ok(lum(fire[i].c)>lum(fire[i-1].c),`layer ${i} is hotter than ${i-1}`);
    assert.ok(fire[i].s>fire[i-1].s,`and takes over at a higher temperature`);
  }
  assert.equal(fire[0].s,0,'the coolest value is the floor');
});
test('the fire leaves the hand dark red and is white by the tip, in the reference proportions',()=>{
  // Measured on the fire's own colours only, the ones the hero never wears. Across the whole plume
  // the reference is 40% white, 17% yellow, 23% orange, 12% red and 8% dark red; its first fifth
  // is two thirds red and dark red, and its far half is mostly white. An earlier ladder took the
  // hero's armour and hair for fire, read the reference as mostly white and yellow, and the fire
  // built to that came out yellow at the hand with no dark red in it at all.
  const rig=ctx.AstraSaberRig;
  // the nine colours sort into five bands, coldest first: dark red, red, orange, yellow, white
  const bandOf=[0,1,1,2,2,3,3,4,4];
  const whole=[0,0,0,0,0],root=[0,0,0,0,0],tip=[0,0,0,0,0];
  let live=0,nRoot=0,nTip=0;
  const L=72,HW=18;
  for(let step=0;step<8;step++)
    for(let px=0;px<L;px++){
      const u=px/L,hw=HW*rig.fireHalf(u);
      for(let y=-2*HW;y<=2*HW;y++){
        const h=rig.fireHeat(px,y,u,hw,step);
        if(h<0)continue;
        const b=bandOf[rig.fireBand(h)];
        whole[b]++;live++;
        if(u<.2){root[b]++;nRoot++;}
        if(u>=.6){tip[b]++;nTip++;}
      }
    }
  assert.ok(live>4000,`enough of the field is alight to judge: ${live}`);
  const pc=(arr,n,b)=>100*arr[b]/n;
  const dark=pc(whole,live,0),red=pc(whole,live,1),yellow=pc(whole,live,3),white=pc(whole,live,4);
  assert.ok(white>30&&white<52,`white near the reference's 40%: ${white.toFixed(1)}%`);
  assert.ok(yellow<28,`yellow nowhere near dominant, against the reference's 17%: ${yellow.toFixed(1)}%`);
  assert.ok(red+dark>12&&red+dark<34,`red and dark red near the reference's 20%: ${(red+dark).toFixed(1)}%`);
  assert.ok(dark>2,`dark red is actually reachable: ${dark.toFixed(1)}%`);
  const rootRed=pc(root,nRoot,0)+pc(root,nRoot,1);
  assert.ok(rootRed>35,`the first fifth is mostly red, like the reference's two thirds: ${rootRed.toFixed(1)}%`);
  assert.ok(pc(tip,nTip,4)>42,`and the far part is mostly white: ${pc(tip,nTip,4).toFixed(1)}%`);
});
test('the fire has holes clean through it, which a filled shape cannot',()=>{
  const rig=ctx.AstraSaberRig;
  // Well inside the fire, away from its edge, some cells are still absent. That is what the
  // reference has and what nine attempts at stacking filled shapes could never produce.
  let inside=0,gaps=0;
  const L=72,HW=18;
  for(let px=8;px<L-8;px++){
    const u=px/L,hw=HW*rig.fireHalf(u);
    for(let y=-Math.floor(hw*.6);y<=Math.floor(hw*.6);y++){
      inside++;
      if(rig.fireHeat(px,y,u,hw,3)<0)gaps++;
    }
  }
  assert.ok(inside>500,`a real interior to look at: ${inside}`);
  // The reference has more of these than this does. Too many read as speckle against the
  // factory at game size rather than as fire, so the cut is set low on purpose; what the test
  // holds is that there are any at all, well inside the fire.
  assert.ok(gaps/inside>.012,`and holes in it: ${(100*gaps/inside).toFixed(1)}%`);
  assert.ok(gaps/inside<.35,`but still mostly fire: ${(100*gaps/inside).toFixed(1)}%`);
});
test('the plume is a broad band with no neck',()=>{
  const rig=ctx.AstraSaberRig;
  // Read off the reference: three eighths of full width where the fire leaves the hand, three
  // quarters by a third of the way along, and flat from there. Earlier versions made a cone
  // and then a comet with a narrow throat, and both read as the wrong thing entirely.
  // Relative to the widest point, so the check survives the edge tables being refitted in scale.
  const peak=Math.max(...Array.from({length:101},(_,i)=>rig.fireHalf(i/100)));
  const rel=u=>rig.fireHalf(u)/peak;
  assert.ok(rel(.02)>.25&&rel(.02)<.50,`already wide at the hand: ${rel(.02).toFixed(2)} of the peak`);
  assert.ok(rel(.33)>.70,`most of its width a third along: ${rel(.33).toFixed(2)} of the peak`);
  assert.ok(rel(.70)>.68,`and still wide past the middle: ${rel(.70).toFixed(2)} of the peak`);
  assert.ok(rel(1)<.20,'closing at the tip');
});
test('the fire is a pixel field with holes in it, not a stack of outlines',()=>{
  const rig=ctx.AstraSaberRig;
  // The noise is what breaks it up. Smooth on a coarse lattice, so the blotches are big enough
  // to read, and different enough across the field that some cells fall below the cut and are
  // simply absent - which is what makes the holes and the torn edge.
  const vals=[];
  for(let x=0;x<40;x++)for(let y=-10;y<10;y++)vals.push(rig.fireNoise(x,y,0,6.5));
  const lo=Math.min(...vals),hi=Math.max(...vals);
  assert.ok(lo<.25&&hi>.75,`the field spans enough to cut holes: ${lo.toFixed(2)}..${hi.toFixed(2)}`);
  // smooth, not per-pixel hash: neighbours are close, or the fire would be static noise
  let jump=0;
  for(let x=0;x<40;x++)jump=Math.max(jump,Math.abs(rig.fireNoise(x,0,0,6.5)-rig.fireNoise(x+1,0,0,6.5)));
  assert.ok(jump<.42,`neighbouring cells stay close: ${jump.toFixed(2)}`);
});
test('the plume re-forms as it burns instead of holding one shape',()=>{
  const rig=ctx.AstraSaberRig;
  const shape=step=>rig.fire.map((b,i)=>
    [rig.fireHash(i*3.7+i*11.3,step),rig.fireHash(i*5.1+i*7.9+40,step)]).flat();
  const first=shape(0);
  let moved=0;
  for(let s=1;s<8;s++){
    const now=shape(s);
    if(now.some((v,i)=>Math.abs(v-first[i])>.05))moved++;
  }
  assert.equal(moved,7,'every step of the loop is a different shape');
  // but the same step is always the same shape: random per draw would strobe at sixty a second
  assert.deepEqual(Array.from(shape(3)),Array.from(shape(3)));
});
test('the plume is a jet, longer than it is wide, and lies well off vertical',()=>{
  const rig=ctx.AstraSaberRig,C=ctx.AstraCombat;
  // measured on the reference: 1.9 body heights along its axis against 0.8 across, and forty
  // degrees off vertical. A plume as wide as it is long reads as a fan sitting on the hero.
  for(const t of [.26,.46,.67]){
    const p=rig.pose(4,t),b=rig.blade(p);
    const len=Math.hypot(b.tip.x-b.root.x,b.tip.y-b.root.y);
    assert.ok(len>60,`the jet reaches at ${t}: ${len.toFixed(0)}px`);
    const off=Math.abs(Math.atan2(b.tip.x-b.root.x,b.root.y-b.tip.y))*180/Math.PI;
    assert.ok(off>28&&off<58,`and lies off vertical at ${t}: ${off.toFixed(0)} degrees`);
  }
});

test('the outline is lopsided: the leading edge billows, the trailing edge tears',()=>{
  const rig=ctx.AstraSaberRig;
  // Measured on the fire's own colours, which the hero never wears. The reference's trailing edge is
  // at its widest right at the hand, where dark red fire hangs below it, and tapers from there; its
  // leading edge starts narrow, is near full width within a fifth of the length, and eases off toward
  // the tip. An earlier reading counted the hero's red armour and gold hair as fire and put a bulge on
  // the trailing edge a third of the way along that the reference does not have.
  // Near the hand the trailing table is also the larger for a second reason: that side runs cooler
  // and loses more cells to the cut, so it needs more table to draw the same edge.
  assert.ok(rig.fireSide(.05,1)>rig.fireSide(.05,-1),'wider on the trailing side at the hand');
  assert.ok(rig.fireSide(.15,1)>rig.fireSide(.15,-1),'and still a fifth of the way along');
  assert.ok(rig.fireSide(.15,-1)>rig.fireSide(.05,-1)*1.6,'the leading edge widens fast off the hand');
  assert.ok(rig.fireSide(.55,-1)>rig.fireSide(.05,-1)*1.8,'and is well past its starting width by the middle');
  const peakOf=side=>Math.max(...Array.from({length:21},(_,i)=>rig.fireSide(i/20,side)));
  assert.ok(rig.fireSide(.95,-1)<peakOf(-1)*.6,'the leading edge eases off toward the tip');
  assert.ok(rig.fireSide(.95,1)<peakOf(1)*.8,'and so does the trailing one');
  // The trailing edge is the ragged one in the drawn field: its tear is two and a half times the
  // leading edge's, which is what the reference's measured edge roughness asks for.
  const L=72,HW=18;let rTop=0,rBot=0;
  for(let step=0;step<8;step++){
    let pTop=null,pBot=null;
    for(let px=10;px<L-6;px++){
      const u=px/L,hw=HW*rig.fireHalf(u);
      let top=0,bot=0;
      for(let y=-40;y<0;y++)if(rig.fireHeat(px,y,u,hw,step)>=0){top=-y;break;}
      for(let y=40;y>0;y--)if(rig.fireHeat(px,y,u,hw,step)>=0){bot=y;break;}
      if(pTop!==null){rTop+=Math.abs(top-pTop);rBot+=Math.abs(bot-pBot);}
      pTop=top;pBot=bot;
    }
  }
  assert.ok(rBot>rTop,`the trailing edge is ragged in the field: ${rBot} against ${rTop}`);
});

// The charged thrust: hold the saber, let go at ready.
function holdSaber(g,frames){g.setInput('saber',true);tick(g,frames);}
function letGo(g){g.setInput('saber',false);tick(g);}
function framesToReady(){const T=ctx.AstraCombat.thrust;return Math.ceil(T.ready/T.rate*60)+2;}
// Open floor with nothing in the way for a lunge's length either side.
function openGround(g){
  for(let x=60;x<4000;x+=10){
    const floor=g.state.platforms.some(q=>q.y===310&&q.x<=x-40&&q.x+q.w>=x+110);
    const wall=g.state.platforms.some(q=>q.y<310&&q.x<x+110&&q.x+q.w>x-40);
    if(floor&&!wall)return x;
  }
  return 400;
}
function thrustAs(g,facing){const p=g.state.player,T=ctx.AstraCombat.thrust;p.facing=facing;p.saberCombo=6;p.saberTime=T.span;
 p.saberHit=false;p.saberHits=0;p.saberFacing=facing;tick(g,Math.ceil(T.span*60)+2);}
test('charged thrust: a held saber charges it and letting go at ready runs it',()=>{
  const g=game(),p=g.state.player,T=ctx.AstraCombat.thrust;quiet(g);
  holdSaber(g,1);assert.equal(p.saberCombo,1,'the press still swings');
  holdSaber(g,framesToReady());assert.ok(p.saberCharge>=T.ready,`charged to ${p.saberCharge}`);
  letGo(g);assert.equal(p.saberCombo,6);assert.equal(p.saberTime,T.span);assert.equal(p.saberCharge,0);
  assert.equal(ctx.AstraCombat.saberStage(p),6);
  tick(g,Math.ceil(T.span*60)+2);assert.equal(p.saberCombo,0,'and it ends');
});
test('charged thrust: a hold let go short of ready is only the swing it already was',()=>{
  const g=game(),p=g.state.player;quiet(g);
  holdSaber(g,Math.floor(framesToReady()*.6));letGo(g);
  assert.notEqual(p.saberCombo,6);assert.equal(p.saberCharge,0);
});
test('charged thrust: the rising cut does not charge it, and chained swings still chain',()=>{
  const g=game(),p=g.state.player;quiet(g);
  g.setInput('up',true);holdSaber(g,1);g.setInput('up',false);assert.equal(p.saberCombo,4);
  tick(g,20);assert.equal(p.saberCharge,0);letGo(g);assert.notEqual(p.saberCombo,6);
  const h=game(),q=h.state.player;quiet(h);press(h);tick(h,8);press(h);waitStage(h,2);tick(h,8);press(h);waitStage(h,3);
  assert.ok(!(q.saberCharge>=ctx.AstraCombat.thrust.ready),'taps never charge');
});
test('charged thrust: the charge is not shown while the pressed swing is still out',()=>{
  const g=game(),p=g.state.player,c=ctx.AstraCombat;quiet(g);
  holdSaber(g,10);assert.ok(p.saberTime>0&&p.saberCharge>0);assert.equal(c.saberChargeShown(p),0);
  holdSaber(g,30);assert.equal(p.saberTime,0);assert.ok(c.saberChargeShown(p)>0);
  g.setInput('saber',false);
});
for(const facing of [-1,1]){
  test(`charged thrust: reaches far past every swing and bites four times up close, facing ${facing}`,()=>{
    const T=ctx.AstraCombat.thrust;
    let g=game();quiet(g);g.state.player.facing=facing;let e=enemyAt(g,facing*40);thrustAs(g,facing);
    assert.equal(e.hp,100-T.hits.length*T.power,'four bites up close');
    g=game();quiet(g);g.state.player.facing=facing;e=enemyAt(g,facing*125);thrustAs(g,facing);
    assert.ok(e.hp<100,'the lance reaches 125px, where no swing does');
    g=game();quiet(g);g.state.player.facing=facing;e=enemyAt(g,facing*180);thrustAs(g,facing);
    assert.equal(e.hp,100,'but not 180px');
    g=game();quiet(g);g.state.player.facing=facing;e=enemyAt(g,-facing*50);thrustAs(g,facing);
    assert.equal(e.hp,100,'and nothing behind');
  });
}
test('charged thrust: plants the body, steps forward once, and turning does not steer it',()=>{
  const g=game(),p=g.state.player,T=ctx.AstraCombat.thrust;quiet(g);
  p.x=openGround(g);p.y=270;p.vx=0;p.vy=0;p.onGround=true;p.facing=1;const x0=p.x;
  p.saberCombo=6;p.saberTime=T.span;p.saberHits=0;p.saberFacing=1;
  g.setInput('left',true);tick(g,Math.floor(T.span*60)-2);g.setInput('left',false);
  assert.equal(p.saberFacing,1);assert.equal(p.facing,1,'walking input waits for the thrust');
  const moved=p.x-x0;assert.ok(moved>8&&moved<40,`one lunge forward, moved ${moved.toFixed(1)}px`);
});
test('charged thrust: the light follows the sheet - orb, flight, hollow flash, lance, dashes, gone',()=>{
  const r=ctx.AstraSaberRig,at=t=>r.thrust(r.pose(6,t));
  const forming=at(.06),swelling=at(.16),flying=at(.23),ring=at(.27),lance=at(.50),going=at(.76),after=at(.9);
  assert.ok(forming.orb&&!forming.lance&&forming.orb.rx<5,'a small light forms in the fist');
  assert.ok(swelling.orb.rx>forming.orb.rx,'it swells');
  assert.ok(flying.orb.x>swelling.orb.x,'it is driven out ahead');
  assert.ok(ring.orb.ring,'it flashes hollow');
  assert.ok(lance.lance&&!lance.orb&&lance.lance.len>80&&lance.lance.broken===0,'then a long lance');
  assert.ok(going.lance&&going.lance.broken>0,'which breaks into dashes where it stands');
  assert.ok(!after.orb&&!after.lance,'and is gone before the body straightens');
});
test('charged thrust: starts and ends on the standing pose',()=>{
  const r=ctx.AstraSaberRig,s=r.pose(1,0);
  for(const q of [r.pose(6,0),r.pose(6,1)])
    assert.deepEqual([q.hip.x,q.hip.y,q.hand.x,q.hand.y],[s.hip.x,s.hip.y,s.hand.x,s.hand.y]);
});

// The rising cut's flame bites with the outline it draws, when it draws it.
function flameWorld(p){
  const C=ctx.AstraCombat,R=ctx.AstraSaberRig,build=ctx.AstraRunRig.build;
  if(p.saberCombo!==4||!(p.saberTime>0))return [];
  const ox=p.x+p.w/2,oy=p.y+p.h,f=p.saberFacing;
  return R.fireCells(4,C.saberPhase(p),build).map(c=>({x:ox+f*c.x,y:oy+c.y}));
}
function risingAt(g){const p=g.state.player;p.x=clearFloor(g);p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;return p;}
for(const [name,dx,dy,w,h] of [['in front, low',18,-34,30,34],['in front, head high',24,-84,28,24],['up the flame',30,-130,28,24]]){
  test(`the rising cut bites the moment its flame reaches a target: ${name}`,()=>{
    const g=game();quiet(g);const p=risingAt(g),x0=p.x+p.w/2,y0=p.y+p.h;
    const e={id:5,type:'drone',x:x0+dx,y:y0+dy,w,h,hp:100,maxHp:100,facing:-1,flash:0,dead:false};
    g.state.enemies=[e];
    g.setInput('up',true);press(g);g.setInput('up',false);
    let touched=-1,bitten=-1;
    for(let i=0;i<=70;i++){
      if(i>0)tick(g);
      if(touched<0&&flameWorld(p).some(c=>c.x>=e.x&&c.x<=e.x+e.w&&c.y>=e.y&&c.y<=e.y+e.h))touched=i;
      if(bitten<0&&e.hp<100)bitten=i;
    }
    assert.ok(touched>=0,'the flame is drawn over it');
    assert.ok(bitten>=0&&Math.abs(bitten-touched)<=1,`drawn over it on frame ${touched}, bitten on frame ${bitten}`);
  });
}
test('a target that stays in the flame is bitten four times, a bite apart, from the first moment',()=>{
  const g=game();quiet(g);const p=risingAt(g),C=ctx.AstraCombat,x0=p.x+p.w/2,y0=p.y+p.h;
  const e={id:6,type:'drone',x:x0-70,y:y0-230,w:180,h:230,hp:100,maxHp:100,facing:-1,flash:0,dead:false};
  g.state.enemies=[e];
  g.setInput('up',true);press(g);g.setInput('up',false);
  const at=[];let last=100;
  for(let i=1;i<=80;i++){tick(g);if(e.hp!==last){at.push(i/60);last=e.hp;}}
  assert.equal(at.length,C.rising.bites,`bites at ${at.map(x=>x.toFixed(2)).join(', ')}`);
  assert.ok(Math.abs((100-e.hp)-C.rising.bites*C.saberPower*C.saberComboPower[3])<1e-9);
  assert.ok(at[0]<=.1,`the first bite lands as the flame comes out, at ${at[0].toFixed(2)}s`);
  for(let k=1;k<at.length;k++)assert.ok(at[k]-at[k-1]>=C.rising.biteEvery-1e-9,`bites ${at.join(', ')}`);
});
test('the rising cut leaves alone what its flame is not drawn over',()=>{
  const g=game();quiet(g);const p=risingAt(g),x0=p.x+p.w/2,y0=p.y+p.h;
  // well behind and below where any of the flame goes, but inside the old sixteen-pixel band's sweep
  const e={id:8,type:'drone',x:x0-95,y:y0-150,w:24,h:24,hp:100,maxHp:100,facing:-1,flash:0,dead:false};
  g.state.enemies=[e];
  g.setInput('up',true);press(g);g.setInput('up',false);
  let touched=false;
  for(let i=1;i<=70;i++){tick(g);if(flameWorld(p).some(c=>c.x>=e.x-3&&c.x<=e.x+e.w+3&&c.y>=e.y-3&&c.y<=e.y+e.h+3))touched=true;}
  assert.equal(touched,false,'the flame never comes near it');
  assert.equal(e.hp,100,'so it is not bitten');
});
test('the rising cut hit shape is the flame it draws: nearly all of it, and little else',()=>{
  // Measured through the body of the rise. The old hit - the blade's sweep padded sixteen pixels - covered
  // the flame too, but a third to a half of it was empty air, and it bit a third of a second late.
  const C=ctx.AstraCombat,R=ctx.AstraSaberRig,build=ctx.AstraRunRig.build,pad=C.risingFirePad;
  for(const t of [.12,.2,.3,.45,.6,.75,.85]){
    const lit=R.fireCells(4,t,build);assert.ok(lit.length>1000,`the flame is out at ${t}`);
    const segs=R.fireSlices(4,t,build).map(s=>({ax:s.a.x,ay:s.a.y,bx:s.b.x,by:s.b.y}));
    const covered=lit.filter(c=>C.bladeTouches(segs,{x:c.x-.5,y:c.y-.5,w:1,h:1},pad)).length/lit.length;
    const keys=new Set(lit.map(c=>Math.round(c.x)+','+Math.round(c.y)));
    const xs=segs.flatMap(s=>[s.ax,s.bx]),ys=segs.flatMap(s=>[s.ay,s.by]);
    let inside=0,stray=0;
    for(let x=Math.floor(Math.min(...xs)-pad-1);x<=Math.ceil(Math.max(...xs)+pad+1);x++)
      for(let y=Math.floor(Math.min(...ys)-pad-1);y<=Math.ceil(Math.max(...ys)+pad+1);y++){
        if(!C.bladeTouches(segs,{x,y,w:0,h:0},pad))continue;inside++;
        let near=false;
        for(let dx=-1;dx<=1&&!near;dx++)for(let dy=-1;dy<=1&&!near;dy++)if(keys.has((x+dx)+','+(y+dy)))near=true;
        if(!near)stray++;
      }
    assert.ok(covered>=.98,`at ${t} the hit shape covers ${(covered*100).toFixed(1)}% of the drawn flame`);
    assert.ok(stray/inside<=.15,`at ${t} ${(stray/inside*100).toFixed(1)}% of the hit shape is not flame`);
  }
});
test('the rising cut lands its four bites in quick succession, four frames apart',()=>{
  // The user asked for half the old interval: .13s became .065s, which at sixty steps a second is four
  // frames between bites instead of eight.
  const g=game();quiet(g);const p=risingAt(g),C=ctx.AstraCombat,x0=p.x+p.w/2,y0=p.y+p.h;
  assert.equal(C.rising.biteEvery,.065);
  const e={id:9,type:'drone',x:x0-70,y:y0-230,w:180,h:230,hp:100,maxHp:100,facing:-1,flash:0,dead:false};
  g.state.enemies=[e];
  g.setInput('up',true);press(g);g.setInput('up',false);
  const at=[];let last=100;
  for(let i=1;i<=80;i++){tick(g);if(e.hp!==last){at.push(i);last=e.hp;}}
  assert.equal(at.length,4,`bites on frames ${at.join(', ')}`);
  for(let k=1;k<at.length;k++)assert.equal(at[k]-at[k-1],4,`bites on frames ${at.join(', ')}`);
  assert.ok((at[3]-at[0])/60<=.21,'all four inside about a fifth of a second');
});
