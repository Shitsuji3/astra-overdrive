const assert = require('assert');
const { test } = require('node:test');
const fs = require('fs'), vm = require('vm');
const ctx = { console, performance:{now:()=>0}, addEventListener(){}, removeEventListener(){}, requestAnimationFrame(){}, cancelAnimationFrame(){} };
// The saber hits with the blade the rig draws, so the rigs have to be present here too.
vm.createContext(ctx); ctx.globalThis = ctx;
for (const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'), ctx);
function game(){const g=new ctx.NeonGame(null);g.start();return g;}
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
// How far a swing's drawn edge actually travels, measured from the player's own box.
function reach(stage){
  const g=game(),p=g.state.player,C=ctx.AstraCombat;
  p.x=400;p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
  p.saberCombo=stage;p.saberTime=C.saberDuration;p.saberFacing=1;
  let above=0,ahead=0;
  for(let i=0;i<26;i++){
    for(const s of C.saberSweep(p)||[]){
      above=Math.max(above,p.y-s.ay,p.y-s.by);
      ahead=Math.max(ahead,s.ax-(p.x+p.w),s.bx-(p.x+p.w));
    }
    p.saberTime-=1/60;
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
  tick(g,Math.ceil(ctx.AstraCombat.saberDuration*60)+3);
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

test('the rising cut trades forward reach for height',()=>{
  const rise=reach(4),over=reach(1),finish=reach(3);
  assert.ok(rise.above>over.above+15,`it reaches over the overhead cut: ${rise.above} against ${over.above}`);
  assert.ok(rise.above>finish.above,`and over the finisher: ${rise.above} against ${finish.above}`);
  assert.ok(rise.ahead<over.ahead,`while giving up ground in front: ${rise.ahead} against ${over.ahead}`);
});

test('the rising cut takes down something the level swing cannot reach',()=>{
  // Hang a drone in the band between the two ceilings: its lowest edge sits just above
  // everything the overhead cut can touch, and well inside what the rising cut can.
  const over=reach(1),rise=reach(4);
  assert.ok(rise.above>over.above+10,'there is a band to hang it in');
  const high=(stage)=>{
    const g=game(),p=g.state.player;quiet(g);
    p.x=400;p.y=270;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;
    // clear of the blade's own thickness as well as its measured tip
    const bottom=p.y-over.above-ctx.AstraCombat.bladeThickness-8;
    const e={id:7,type:'drone',x:p.x+8,y:bottom-24,w:28,h:24,hp:100,maxHp:100,facing:-1,flash:0,dead:false};
    g.state.enemies=[e];
    swingAs(g,stage,1);
    return 100-e.hp;
  };
  assert.ok(high(4)>0,'the rising cut reaches it');
  assert.equal(high(1),0,'the overhead cut does not');
});

test('finisher damage config is four separate cuts worth 2.5 normal swings',()=>{
  const c=ctx.AstraCombat;
  // three chained swings, then the rising cut that up asks for
  assert.deepEqual(c.saberHitTimes.map(t=>t.length),[1,1,4,1]);
  assert.ok(c.saberHitTimes[2].every((t,i,a)=>i===0||t>a[i-1]),'finisher cut times increase');
  assert.ok(c.saberHitTimes[2][c.saberHitTimes[2].length-1]<c.saberDuration,'every cut lands inside the swing');
  const total=n=>c.saberHitTimes[n].length*c.saberPower*c.saberComboPower[n];
  assert.equal(total(0),4.5);assert.equal(total(1),4.5);assert.equal(total(2),11.25);
  assert.equal(total(2)/total(0),2.5);
  assert.equal(total(3),4.5,'the rising cut is worth a plain swing');
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
