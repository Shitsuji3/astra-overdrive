const assert = require('assert');
const fs = require('fs'), vm = require('vm');
const listeners = {}, rafs = [];
const ctx = { console, performance:{now:()=>0}, requestAnimationFrame:f=>{rafs.push(f);return rafs.length;}, cancelAnimationFrame:()=>{}, addEventListener:(k,f)=>listeners[k]=f, removeEventListener:()=>{} };
vm.createContext(ctx);
for (const f of ['assets/bosses.js','assets/stages.js','game.js'])
  vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..',f),'utf8'),ctx);
let draws=0; ctx.AstraRenderer={draw:()=>draws++};
const canvas={getContext:()=>({})}; const g=new ctx.NeonGame(canvas,{});
assert.equal(g.state.mode,'menu'); assert.ok(rafs.length,'menu RAF scheduled'); rafs.shift()(16); assert.equal(draws,1,'renderer draws menu');
g.start({difficulty:'easy'}); assert.equal(g.state.player.maxHp,10); g.setInput('dash',true); g._tick(1/60); g.setInput('dash',false); const x=g.state.player.x; g._tick(1/60); assert(g.state.player.x-x>7,'dash sustains speed');
g.state.player.onGround=true; g.setInput('jump',true); g._tick(1/60); assert(g.state.player.vy<0,'jump'); g.setInput('jump',false);
g.pause(); const t=g.state.time; g._tick(1); assert.equal(g.state.time,t,'pause freezes simulation'); g.resume();
g.state.checkpoint.active=true; g.state.player.hp=0; g._die(); assert.equal(g.state.mode,'dead'); g.retry(); assert.equal(g.state.mode,'playing'); assert.equal(g.state.player.x,2700,'safe checkpoint');
const arena=ctx.AstraCombat.arena; g.state.boss={x:arena.bossX,y:200,w:100,h:110,hp:1,maxHp:1,active:true,phase:0,attack:'tell',timer:0,flash:0,facing:-1}; g._boss(1/60); assert(g.state.boss.x>=arena.bossMin&&g.state.boss.x<=arena.bossMax);
// He now goes up in stages: bursts across his frame, one big blast, then the victory hand-off.
g.state.boss.hp=0; g._boss(1/60);
assert.equal(g.state.mode,'playing','victory waits for the death sequence');
assert(g.state.boss.down,'he is marked down on the frame his armour runs out');
let deathFrames=0; while(g.state.mode==='playing'&&deathFrames<300){g._boss(1/60);deathFrames++;}
assert.equal(g.state.mode,'victory'); assert(deathFrames>100,'the sequence runs about two seconds');
assert(g.state.particles.length>0,'it throws explosions on the way');
g.destroy(); console.log('engine tests passed');
