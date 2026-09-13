const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function make(){const ev={},frames=[];const s={console,performance:{now:()=>0},requestAnimationFrame:f=>{frames.push(f);return frames.length},cancelAnimationFrame:()=>{},addEventListener:(k,f)=>ev[k]=f,removeEventListener:()=>{},navigator:{getGamepads:()=>[]}};vm.createContext(s);for(const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),s);const ce={addEventListener:(k,f)=>ev['c'+k]=f,removeEventListener:()=>{},getContext:()=>({})};const g=new s.NeonGame(ce,{});g.start();g.state.enemies=[];g.state.pickups=[];return {g,ev,ce,api:s.AstraCombat,arena:s.AstraCombat.arena,step:n=>{for(let i=0;i<n;i++)g._tick(1/60)}};}
// The buster backs the saber up and no longer charges: every release is one plain shot.
test('mouse buster fires one plain shot on release',()=>{const {g,ev}=make();g.state.player.x=100;ev.cmousedown({button:0});for(let i=0;i<50;i++)g._tick(1/60);ev.cmouseup({button:0});g._tick(1/60);assert.equal(g.state.shots,1);assert.equal(g.state.bullets.filter(b=>b.team==='player').length,1);assert.ok(g.state.bullets.every(b=>!b.charged));});
test('holding the buster for three seconds fires and charges nothing; release fires one plain shot',()=>{
 const {g,ev,step,api}=make(),sounds=[];g.onEvent=(type,p)=>{if(type==='sound')sounds.push(p.name)};
 ev.cmousedown({button:0});step(180);assert.equal(g.state.shots,0);assert.equal(g.state.bullets.length,0);assert.ok(!(g.state.player.charge>0));assert.deepEqual(sounds,[]);
 ev.cmouseup({button:0});step(1);assert.equal(g.state.shots,1);assert.equal(g.state.bullets[0].power,api.normalPower);assert.equal(g.state.bullets[0].charged,false);assert.deepEqual(sounds,['shot']);step(30);assert.equal(g.state.shots,1);
 assert.equal(api.chargedPower,undefined,'there is no charged shot any more');
});
test('short and long clicks each release one plain shot; sub-frame tap survives',()=>{
 for(const frames of [0,1,15,30,120]){const {g,ev,step}=make();ev.cmousedown({button:0});step(frames);assert.equal(g.state.shots,0);ev.cmouseup({button:0});step(2);assert.equal(g.state.shots,1);assert.equal(g.state.bullets[0].power,1);assert.equal(g.state.bullets[0].charged,false);step(20);assert.equal(g.state.shots,1);}
});
test('mouse saber lands one cut of 4.5 when the blade swings out',()=>{
 const {g,ev,step,api,arena}=make();const p=g.state.player;p.x=arena.gate+30;p.y=270;p.facing=1;
 g.state.enemies=[{x:p.x+30,y:276,w:30,h:34,hp:10,maxHp:10,dead:false,flash:0}];
 g.state.boss={x:p.x+30,y:200,w:100,h:110,hp:10,maxHp:10,active:true,phase:0,attack:'tell-volley',timer:1};
 ev.cmousedown({button:2});
 // The cut lands where the stage says it does, which is where its blade is out in front.
 const want=api.saberHitTimes[0][0];let frames=0;
 // he would scurry off the mark otherwise, and this measures the blade, not his footwork
 while(g.state.enemies[0].hp===10&&frames<40){step(1);frames++;Object.assign(g.state.boss,{x:p.x+30,y:200,vy:0});}
 // two frames of slack: the click is buffered and consumed on the following tick
 assert.ok(Math.abs(frames/60-want)<=2.5/60,`cut at ${want}s, saw ${(frames/60).toFixed(3)}s`);
 assert.equal(g.state.enemies[0].hp,5.5);assert.equal(g.state.boss.hp,5.5);
 step(20);assert.equal(g.state.enemies[0].hp,5.5);ev.cmouseup({button:2});
});
test('saber captures facing at the press and can retrigger after the swing',()=>{
 const {g,ev,step,api,arena}=make();const p=g.state.player;p.x=arena.gate+30;p.y=270;p.facing=1;
 g.state.enemies=[{x:p.x+30,y:276,w:30,h:34,hp:20,maxHp:20,dead:false,flash:0}];
 const cut=()=>{let n=0;while(n<40){const before=g.state.enemies[0].hp;step(1);n++;if(g.state.enemies[0].hp!==before)return n;}return -1;};
 ev.cmousedown({button:2});step(1);p.facing=-1;                 // turning away must not steer the swing
 assert.ok(cut()>0);assert.equal(g.state.enemies[0].hp,15.5);
 ev.cmouseup({button:2});p.facing=1;step(Math.ceil(api.saberDuration*60)+4);
 ev.cmousedown({button:2});assert.ok(cut()>0);assert.equal(g.state.enemies[0].hp,11);ev.cmouseup({button:2});
});
test('paused saber freezes timer',()=>{const {g,ev,step}=make();ev.cmousedown({button:2});step(1);const before=g.state.player.saberTime;g.pause();step(20);assert.equal(g.state.player.saberTime,before);g.resume();});
test('mouse chord and outside release clear attacks',()=>{const {g,ev}=make();ev.cmousedown({button:0});ev.cmousedown({button:2});g._tick(1/60);ev.mouseup({button:0});ev.mouseup({button:2});assert.equal(g.mouseInput.shoot,false);assert.equal(g.mouseInput.saber,false);});
