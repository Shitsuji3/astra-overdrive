const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function harness(){
 const events={},box={console,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener:(n,f)=>events[n]=f,removeEventListener(){},navigator:{getGamepads:()=>[]}};
 vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8'),box);
 const g=new box.NeonGame({getContext:()=>({}),addEventListener:(n,f)=>events['canvas-'+n]=f,removeEventListener(){}},{});g.start();g.state.enemies=[];g.state.pickups=[];
 return {g,api:box.AstraCombat,events,step(n=1){for(let i=0;i<n;i++)g._tick(1/60);}};
}
test('all original movement poses remain and air shooting aims forward',()=>{
 const {api}=harness(),base={onGround:true,charge:0,shootPoseTime:0};
 for(const [change,frame] of [[{},0],[{vx:190,animTime:0},1],[{vx:190,animTime:.1},2],[{vx:190,animTime:.2},3],[{onGround:false},4],[{dashTime:.1},5],[{wallDir:1},6],[{saberTime:.1},7],[{onGround:false,charge:.6},0]])assert.equal(api.frame({...base,...change}),frame,JSON.stringify(change));
});
for(const facing of [-1,1])for(const pose of ['standing','running','airborne','dash','landing'])test(`${pose} ${facing}: normal and charged shots start at the rendered muzzle`,()=>{
 for(const charged of [false,true]){
  const {g,api,events,step}=harness(),p=g.state.player;
  Object.assign(p,{x:100,y:270,facing,vx:0,vy:0,onGround:true});
  if(pose==='running'){p.vx=facing*190;g.setInput(facing>0?'right':'left',true);}
  if(pose==='airborne'){p.y=210;p.vy=-250;p.onGround=false;}
  if(pose==='dash'){p.dashTime=.15;p.vx=facing*560;}
  if(pose==='landing'){p.y=269;p.vy=140;p.onGround=false;}
  const calls=[],spawn=g._spawn;
  g._spawn=function(...args){if(args[4]==='player')calls.push(args);return spawn.apply(this,args);};
  if(charged){p.charge=.7;g._shootHeld=true;}else events['canvas-mousedown']({button:0});
  step();assert.equal(calls.length,1);
  const frame=pose==='dash'?5:pose==='running'?([1,3].includes(api.frame(p))?api.frame(p):NaN):0;
  const anchors={0:[338,198],1:[355,252],3:[338,254],5:[369,325]},a=anchors[frame];assert.ok(a,'forward cannon pose');
  const x=p.x+p.w/2-24+(facing<0?48-a[0]/8:a[0]/8),y=p.y+p.h-58+a[1]/8;
  assert.ok(Math.abs(calls[0][0]-x)<.0001,'spawn x follows current rendered pose');assert.ok(Math.abs(calls[0][1]-y)<.0001,'spawn y follows resolved player position');
  assert.equal(calls[0][6],charged?3:1);
 }
});
test('actual hits deal 1 / 3 / 4.5 to enemies and bosses, retaining fractions',()=>{
 const damages={};
 for(const kind of ['normal','charged','saber']){
  const {g,events,step}=harness(),p=g.state.player;p.x=4820;
  if(kind==='charged'){events['canvas-mousedown']({button:0});step(50);events['canvas-mouseup']({button:0});g.state.bullets=[];}
  g.state.enemies=[{type:'turret',x:4850,y:276,w:30,h:34,hp:20,maxHp:20,dead:false,flash:0,fireTimer:999}];
  g.state.boss={x:4850,y:200,w:100,h:110,hp:72,maxHp:72,active:true,phase:0,attack:'tell-volley',timer:99};
  if(kind!=='charged')events['canvas-mousedown']({button:kind==='saber'?2:0});
  step();const expected=kind==='normal'?1:kind==='charged'?3:4.5;
  assert.equal(20-g.state.enemies[0].hp,expected);assert.equal(72-g.state.boss.hp,expected);damages[kind]=expected;
  if(kind==='saber'){events['canvas-mouseup']({button:2});step(15);events['canvas-mousedown']({button:2});step();assert.equal(g.state.enemies[0].hp,11);assert.equal(g.state.boss.hp,63);}
 }
 assert.equal(damages.saber/damages.charged,1.5);
});
