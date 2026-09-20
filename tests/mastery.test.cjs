const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
function setup(){const c={console,performance:{now:()=>0},addEventListener(){},removeEventListener(){},requestAnimationFrame(){},cancelAnimationFrame(){}};c.globalThis=c;vm.createContext(c);for(const f of ['assets/bosses.js','assets/stages.js','assets/run-rig-v6.js','assets/saber-rig.js','game.js','mastery.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const g=new c.NeonGame(null);g.start({stage:'gauntlet'});g._spawnBoss('warden');g.state.bossIntro=null;return{g,c};}
test('deflection arms the next attack only, not the attack that cut the bullet',()=>{const {g}=setup(),p=g.state.player;p.attackSerial=1;g._registerDeflect();assert.equal(g._masteryPower(4.5,'saber'),4.5);p.attackSerial=2;assert.equal(g._masteryPower(4.5,'saber'),6.75);assert.equal(g._masteryPower(4.5,'saber'),6.75);assert.equal(g.state.mastery.counters,1);p.attackSerial=3;assert.equal(g._masteryPower(4.5,'saber'),4.5);});
test('counter expires, freezes on pause and is lost on damage',()=>{const {g}=setup();g._registerDeflect();g.pause();g._tick(2);assert.equal(g.state.mastery.ready,1.5);g.resume();g._enemies=()=>{};g._boss=()=>{};for(let i=0;i<100;i++)g._tick(1/60);assert.equal(g.state.mastery.ready,0);g._registerDeflect();g._registerHit();assert.equal(g.state.mastery.ready,0);assert.equal(g.state.mastery.hits,1);});
test('thrust bonus needs recovery and rising bonus needs airborne target',()=>{const {g}=setup(),b=g.state.boss;b.attack='rest';assert.equal(g._masteryPower(6.75,'thrust'),8.4375);assert.equal(g._masteryPower(4.5,'saber'),4.5);b.attack='cannon';assert.equal(g._masteryPower(6.75,'thrust'),6.75);b.y=b.baseY-30;assert.equal(g._masteryPower(4,'rising'),5);b.y=b.baseY;assert.equal(g._masteryPower(4,'rising'),4);});
test('actual projectile deflection grants counter, body damage cancels it',()=>{const {g}=setup(),s=g.state,p=s.player;g._saberDeflects=()=>true;g._spawn(p.x+20,p.y+10,0,0,'enemy',false,1);g._bullets(1/60);assert.equal(s.mastery.deflects,1);assert.equal(s.bullets.length,0);g._saberDeflects=()=>false;p.invuln=0;g._spawn(p.x+10,p.y+10,0,0,'enemy',false,1);g._bullets(1/60);assert.equal(s.mastery.hits,1);assert.equal(s.mastery.ready,0);});
test('boss clear is recorded once before healing, not inferred from final HP',()=>{const {g}=setup(),s=g.state,b=s.boss;g._registerHit();s.timeElapsed=12.34;g._bossDown(b);g._bossDown(b);assert.equal(s.mastery.clears.length,1);assert.equal(s.mastery.clears[0].hits,1);assert.equal(s.mastery.clears[0].time,12.34);g._spawnBoss('tidebreaker');s.timeElapsed=20;g._bossDown(s.boss);assert.equal(s.mastery.clears[1].hits,0);});
test('practice selects a boss and move, retries immediately and never advances roster',()=>{const {g}=setup();g.startPractice('tidebreaker','crescent');assert.equal(g.state.boss.id,'tidebreaker');assert.equal(g.state.boss.attack,'tell-crescent');assert.equal(g.state.enemies.length,0);g.state.player.hp=1;g.restartPractice();assert.equal(g.state.player.hp,8);assert.equal(g.state.practice.move,'crescent');assert.equal(g._nextBoss(),false);g._bossDown(g.state.boss);assert.equal(g.state.mastery.clears[0].practice,true);assert.equal(g.state.nextBossMarker,null);g.start({stage:'gauntlet'});assert.equal(g.state.practice,undefined);});
test('all boss practice moves repeat, with invalid choices falling back to full fight',()=>{const {g,c}=setup();for(const def of c.AstraBosses.list)for(const beat of c.AstraCombat.bossRoutine(def)){g.startPractice(def.id,beat.move);g._bossBeat(g.state.boss,def);assert.equal(g.state.boss.attack,'tell-'+beat.move);}g.startPractice('warden','bad');assert.equal(g.state.practice.move,null);});
test('records preserve personal best, no-damage and difficulty; practice cannot write',()=>{const {c}=setup(),all={};const put=r=>c.AstraMastery.recordBoss(all,{id:'warden',difficulty:'normal',hits:1,time:20,...r});assert.equal(put({}).delta,null);assert.equal(put({time:18,hits:0}).delta,-2);put({time:30});assert.equal(all['normal:warden'].bestTime,18);assert.equal(all['normal:warden'].noDamage,true);put({difficulty:'easy',time:5});assert.equal(all['normal:warden'].bestTime,18);const before=JSON.stringify(all);assert.equal(put({practice:true}),null);assert.equal(JSON.stringify(all),before);});

test('counter applies to actual boss collision and cannot be consumed by a missed swing',()=>{
 const {g,c}=setup(),p=g.state.player,b=g.state.boss;c.AstraCombat.saberSweep=()=>null;
 p.attackSerial=1;g._registerDeflect();p.attackSerial=2;p.saberCombo=1;
 p.x=b.x-300;p.y=b.y;g._damageNearby(72,4.5,1);assert.equal(g.state.mastery.ready,1.5);
 p.x=b.x-25;const hp=b.hp;g._damageNearby(72,4.5,1);
 assert.equal(hp-b.hp,6.75);assert.equal(g.state.mastery.ready,0);
});
test('practice runs every selected move repeatedly without another move leaking in',()=>{
 const {g,c}=setup();
 for(const def of c.AstraBosses.list)for(const move of new Set(c.AstraCombat.bossRoutine(def).map(x=>x.move))){
  g.startPractice(def.id,move);let starts=0,previous='';
  for(let i=0;i<1200;i++){const p=g.state.player;p.invuln=999;p.hp=8;g._tick(1/60);const a=g.state.boss.attack;
   if(a!==previous&&a===move)starts++;
   if(c.AstraCombat.bossPatterns[a])assert.equal(a,move);
   previous=a;
  }
  assert.ok(starts>=2,def.id+' '+move+' should repeat');
 }
});

test('boss rush starts and retries directly in the arena',()=>{
 const {g,c}=setup();assert.ok(g.state.player.x>c.AstraCombat.arena.gate);assert.equal(g.state.boss.id,'warden');
 g._die();g.retry();assert.equal(g.state.mode,'playing');assert.ok(g.state.player.x>c.AstraCombat.arena.gate);
 assert.equal(g.state.mastery.hits,0);assert.equal(g.state.boss.id,'warden');
});


test('all boss entrances freeze combat and records, then preserve the first telegraph',()=>{
 const {g,c}=setup();
 for(const def of c.AstraBosses.list){
  g.start({stage:'gauntlet'});g._spawnBoss(def.id);const s=g.state,b=s.boss,p=s.player;
  const attack=b.attack,timer=b.timer,hp=p.hp,bhp=b.hp,time=s.timeElapsed,x=p.x;
  g.setInput('saber',true);g.setInput('right',true);g._spawn(p.x,p.y,0,0,'enemy',false,1);
  for(let n=0;n<90;n++)g._tick(1/60);
  assert.ok(s.bossIntro,def.id);assert.equal(b.attack,attack);assert.equal(b.timer,timer);
  assert.equal(s.timeElapsed,time);assert.equal(p.hp,hp);assert.equal(b.hp,bhp);assert.equal(p.x,x);
  g.pause();const frozen=s.bossIntro.time;g._tick(2);assert.equal(s.bossIntro.time,frozen);g.resume();
  for(let n=0;n<10;n++)g._tick(1/60);
  assert.equal(s.bossIntro,null);assert.equal(b.attack,attack);assert.equal(b.timer,timer);
  s.bullets=[];g._tick(1/60);assert.ok(s.timeElapsed>time);assert.ok(b.timer<timer);
 }
});
test('practice arrival is brief and a retry restarts it; next boss clears old attacks',()=>{
 const {g}=setup();g.startPractice('coilhead','needles');assert.equal(g.state.bossIntro.duration,.6);
 for(let n=0;n<37;n++)g._tick(1/60);assert.equal(g.state.bossIntro,null);
 g.restartPractice();assert.equal(g.state.bossIntro.time,0);
 g.start({stage:'gauntlet'});g.state.bullets.push({team:'enemy'});g.state.player.saberTime=1;
 g._nextBoss();assert.equal(g.state.boss.id,'tidebreaker');assert.equal(g.state.bossIntro.time,0);
 assert.equal(g.state.bullets.length,0);assert.equal(g.state.player.saberTime,0);
});


test('HP trail holds after damage, decays, freezes while paused and resets on retry',()=>{
 const {g}=setup(),s=g.state;g._tick(.01);s.player.hp=6;g._registerHit({label:'test'});g._tick(.1);assert.equal(s.feedback.hpTrail,8);
 g.pause();g._tick(1);assert.equal(s.feedback.hpTrail,8);g.resume();g._boss=()=>{};
 for(let n=0;n<50;n++)g._tick(1/60);assert.equal(s.feedback.hpTrail,6);
 g.start({stage:'gauntlet'});assert.equal(g.state.feedback.hpTrail,8);assert.equal(g.state.feedback.lastHit,null);
});
test('delayed split and mine bullets retain the original boss move',()=>{
 const {g}=setup(),s=g.state;g._attackSource={boss:'nullpriest',move:'crossorb'};
 const parent=g._spawn(100,100,0,0,'enemy',false,1,{split:{n:4,speed:80,r:4}});g._attackSource=null;
 s.boss.attack='rest';g._bossSplit(parent);assert.equal(s.bullets.at(-1).source.move,'crossorb');
 g._mineBursts({...parent,burst:3});assert.equal(s.bullets.at(-1).source.move,'crossorb');
 s.bullets=[];const p=s.player;p.hp=1;p.invuln=0;g._spawn(p.x+10,p.y+10,0,0,'enemy',false,1,{source:{boss:'warden',move:'cannon'}});
 g._bullets(0);assert.equal(s.mode,'dead');assert.equal(s.defeat.source.move,'cannon');assert.equal(s.defeat.remaining,100);
});
test('fall death never reuses a previous move as the cause',()=>{
 const {g}=setup();g.state.feedback.lastHit={boss:'warden',move:'cannon'};g._die();assert.equal(g.state.defeat.source.label,'落下');assert.equal(g.state.defeat.source.move,undefined);
});
test('recovery shows actual healing, full HP and final clear without adding a ninth boss',()=>{
 const {g}=setup();g.state.player.hp=6;g._bossDown(g.state.boss);assert.equal(g.state.feedback.recovery.healed,2);assert.equal(g.state.feedback.recovery.next,'tidebreaker');
 g._bossDown(g.state.boss);assert.equal(g.state.feedback.recovery.healed,2);
 g._spawnBoss('obsidian-crown');g.state.bossIndex=7;g._bossDown(g.state.boss);assert.equal(g.state.feedback.recovery.healed,0);assert.equal(g.state.feedback.recovery.next,null);
 g.startPractice('warden');g._bossDown(g.state.boss);assert.equal(g.state.feedback.recovery,null);
});
