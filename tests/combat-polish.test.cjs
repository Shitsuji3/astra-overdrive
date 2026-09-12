const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function harness(){
 const events={},box={console,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener:(n,f)=>events[n]=f,removeEventListener(){},navigator:{getGamepads:()=>[]}};
 vm.createContext(box);for(const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),box);
 const g=new box.NeonGame({getContext:()=>({}),addEventListener:(n,f)=>events['canvas-'+n]=f,removeEventListener(){}},{});g.start();g.state.enemies=[];g.state.pickups=[];
 return {g,api:box.AstraCombat,rig:box.AstraRunRig,events,step(n=1){for(let i=0;i<n;i++)g._tick(1/60);}};
}

test('both running arms swing from their shoulders, with opposite elbows',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','assets','run-rig-v6.js'),'utf8'),context);
 const rig=context.AstraRunRig,a=rig.armPose(0,0,false),b=rig.armPose(.5,0,false);
 assert.ok(a.front.elbow.x<a.front.shoulder.x-5);
 assert.ok(b.front.elbow.x>b.front.shoulder.x+5);
 assert.ok(a.rear.elbow.x>a.rear.shoulder.x+5);
 assert.ok(b.rear.elbow.x<b.rear.shoulder.x-5);
 assert.ok(Math.abs(rig.muzzle(0,{}).x-rig.muzzle(.5,{}).x)>18,'free buster travels with the whole arm');
 const idleA=rig.armPose(.25,0,true),idleB=rig.armPose(.75,0,true);
 assert.ok(Math.abs(idleA.front.elbow.x-idleB.front.elbow.x)>.8);
 assert.ok(Math.abs(idleA.rear.elbow.x-idleB.rear.elbow.x)>.8);
 const ma=rig.muzzle(.25,{idle:true}),mb=rig.muzzle(.75,{idle:true});assert.ok(Math.hypot(ma.x-mb.x,ma.y-mb.y)>1);
 const aimed=rig.armPose(.25,1,true);assert.equal(aimed.rear.elbow.x,8.2);assert.equal(aimed.rear.elbow.y,-3.8);assert.equal(aimed.front.elbow.x,idleA.front.elbow.x,'right hand remains free while left buster aims');
});
test('idle stands on one pelvis with the far leg forward and both feet planted',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','assets','run-rig-v6.js'),'utf8'),context);
 const rig=context.AstraRunRig;
 for(let i=0;i<=100;i++){
  const p=rig.standingPose(i/100);
  assert.equal(p.left.hip.x,p.right.hip.x,'both legs hang from one pelvis');
  assert.equal(p.left.hip.y,p.right.hip.y);
  // draw() shades and draws `right` first, so it is the far leg and leads the stance.
  assert.ok(p.right.ankle.x>p.right.hip.x+5,'far leg leads');
  assert.ok(p.left.ankle.x<p.left.hip.x-5,'near leg trails');
  for(const l of [p.left,p.right]){
   assert.equal(l.ankle.y,-4,'breathing never lifts the sole');
   assert.ok(l.ik.knee.y<l.ankle.y,'knees remain above ankles');
   assert.ok(Math.hypot(l.ankle.x-l.hip.x,l.ankle.y-l.hip.y)<25);
  }
 }
});
test('every drawn state resolves to one rig stance',()=>{
 const {api}=harness();
 const base={x:100,y:270,w:24,h:40,vx:0,vy:0,onGround:true,facing:1,dashTime:0,wallDir:0,saberTime:0,charge:0,shootPoseTime:0};
 const cases={idle:{},run:{vx:190},air:{onGround:false,vy:-200},dash:{dashTime:.15,vx:560},
   wall:{onGround:false,wallDir:1},saber:{saberTime:.2,saberCombo:1}};
 for(const [expected,extra] of Object.entries(cases))
  assert.equal(api.rigMode({...base,...extra}),expected);
 // charging and firing keep the same stance instead of dropping to the old sheet
 assert.equal(api.rigMode({...base,charge:.7}),'idle');
 assert.equal(api.rigMode({...base,shootPoseTime:.1}),'idle');
 assert.equal(api.rigMode({...base,vx:190,charge:.7}),'run');
});

test('all original movement poses remain and air shooting aims forward',()=>{
 const {api}=harness(),base={onGround:true,charge:0,shootPoseTime:0};
 for(const [change,frame] of [[{},0],[{vx:190,animTime:0},1],[{vx:190,animTime:.1},2],[{vx:190,animTime:.2},3],[{onGround:false},4],[{dashTime:.1},5],[{wallDir:1},6],[{saberTime:.1},7],[{onGround:false,charge:.6},0]])assert.equal(api.frame({...base,...change}),frame,JSON.stringify(change));
});
for(const facing of [-1,1])for(const pose of ['standing','running','airborne','dash','landing'])test(`${pose} ${facing}: normal and charged shots start at the rendered muzzle`,()=>{
 for(const charged of [false,true]){
  const {g,api,rig,events,step}=harness(),p=g.state.player;
  Object.assign(p,{x:100,y:270,facing,vx:0,vy:0,onGround:true});
  if(pose==='running'){p.vx=facing*190;g.setInput(facing>0?'right':'left',true);}
  if(pose==='airborne'){p.y=210;p.vy=-250;p.onGround=false;}
  if(pose==='dash'){p.dashTime=.15;p.vx=facing*560;}
  if(pose==='landing'){p.y=269;p.vy=140;p.onGround=false;}
  const calls=[],spawn=g._spawn;
  g._spawn=function(...args){if(args[4]==='player')calls.push(args);return spawn.apply(this,args);};
  p.charge=charged?.7:.02;g._shootHeld=true;
  step();assert.equal(calls.length,1);
  // Every pose is drawn by the rig, so every shot leaves that rig's barrel.
  const mode=api.rigMode(p);
  const expect=rig.muzzle(api.rigPhase(p),{x:p.x+p.w/2,y:p.y+p.h,facing,mode,rise:api.rigRise(p),aiming:api.runAim(p)});
  assert.ok(Math.abs(calls[0][0]-expect.x)<.0001,'spawn x follows the rendered barrel');assert.ok(Math.abs(calls[0][1]-expect.y)<.0001,'spawn y follows the rendered barrel');
  assert.equal(calls[0][6],charged?3:1);
 }
});
test('v6 running muzzle uses phase and current tick',()=>{
 for(const facing of [-1,1]){const {g,rig,events,step}=harness(),p=g.state.player;Object.assign(p,{x:1000,y:270,facing,vx:facing*190,onGround:true,runTime:.049});g.setInput(facing>0?'right':'left',true);const calls=[],spawn=g._spawn;g._spawn=function(...a){if(a[4]==='player')calls.push(a);return spawn.apply(this,a)};p.charge=.02;g._shootHeld=true;step();const phase=(.049+1/60)/.5,q=2*Math.PI*phase,bob=1.2*Math.sin(2*q),ang=.09+.035*Math.sin(2*q-.35),sw=.6*Math.sin(q),cpX=Math.cos(ang)*(8.2+sw)+3.8*Math.sin(ang),cpY=Math.sin(ang)*(8.2+sw)-3.8*Math.cos(ang),build=rig.build,x=p.x+p.w/2+facing*build.x*(cpX+12.9),y=p.y+p.h+build.y*(-23+bob+cpY+.6);assert.ok(Math.abs(calls[0][0]-x)<.001);assert.ok(Math.abs(calls[0][1]-y)<.001);}
});
test('actual hits deal 1 / 3 / 4.5 to enemies and bosses, retaining fractions',()=>{
 const damages={};
 for(const kind of ['normal','charged','saber']){
  const {g,api,events,step}=harness(),p=g.state.player;p.x=api.arena.gate+30;
  if(kind==='charged'){events['canvas-mousedown']({button:0});step(50);events['canvas-mouseup']({button:0});g.state.bullets=[];}
  g.state.enemies=[{type:'turret',x:p.x+30,y:276,w:30,h:34,hp:20,maxHp:20,dead:false,flash:0,fireTimer:999}];
  g.state.boss={x:p.x+30,y:200,w:100,h:110,hp:72,maxHp:72,active:true,phase:0,attack:'tell-volley',timer:99};
  // A live boss scurries, and this is a test of the weapon, not of his footwork: put him back
  // on the same mark after every frame so both targets are equally still.
  const held=n=>{for(let i=0;i<n;i++){step(1);Object.assign(g.state.boss,{x:p.x+30,y:200,vy:0});}};
  if(kind==='saber')events['canvas-mousedown']({button:2});else if(kind==='normal'){p.charge=.02;g._shootHeld=true;}
  // The saber cut lands when its blade swings out, so wait for the stage's own cut time.
  held(kind==='saber'?Math.ceil(api.saberHitTimes[0][0]*60)+2:1);
  const expected=kind==='normal'?1:kind==='charged'?3:4.5;
  assert.equal(20-g.state.enemies[0].hp,expected);assert.equal(72-g.state.boss.hp,expected);damages[kind]=expected;
  if(kind==='saber'){events['canvas-mouseup']({button:2});held(Math.ceil(api.saberDuration*60)+4);
   events['canvas-mousedown']({button:2});held(Math.ceil(api.saberHitTimes[0][0]*60)+2);
   assert.equal(g.state.enemies[0].hp,11);assert.equal(g.state.boss.hp,63);}
 }
 assert.equal(damages.saber/damages.charged,1.5);
});




test('stationary charging and firing keep the standing rig barrel',()=>{
 const {api,rig}=harness();
 for(const facing of [-1,1])for(const action of [{charge:.7},{shootPoseTime:.1}]){
  const p={x:100,y:270,w:24,h:40,vx:0,vy:0,onGround:true,facing,animTime:0,...action};
  assert.equal(api.rigMode(p),'idle');
  const still={...p,charge:0,shootPoseTime:0};
  const aimed=api.muzzle(p),relaxed=api.muzzle(still);
  // Aiming brings the barrel up and forward out of the same standing stance, not a sprite swap.
  assert.ok(aimed.y<relaxed.y,'aiming raises the barrel');
  assert.ok((aimed.x-relaxed.x)*facing>0,'aiming extends the barrel the way he faces');
  const expect=rig.muzzle(api.rigPhase(p),{x:p.x+p.w/2,y:p.y+p.h,facing,mode:'idle',rise:api.rigRise(p),aiming:api.runAim(p)});
  assert.ok(Math.abs(aimed.x-expect.x)<1e-9&&Math.abs(aimed.y-expect.y)<1e-9);
 }
 assert.equal(api.idlePose({onGround:true,vx:0}),true);
});
