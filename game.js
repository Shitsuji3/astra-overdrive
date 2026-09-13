(function (global) {
  'use strict';
  var clamp = function (v,a,b) { return Math.max(a,Math.min(b,v)); };
  var hit = function (a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; };
  var combat = { normalPower: 1, chargedPower: 3, chargeThreshold: .55 };
  combat.saberRange = 72;
  combat.saberPower = combat.chargedPower * 1.5;
  // The rising cut is a full swing, so it is worth what the first two are worth.
  // Four bites up the flame come to one and a half of a plain swing.
  combat.saberComboPower = [1, 1, .625, .375];
  combat.saberComboWindowStart = .12;
  combat.saberDuration = .40;
  // The rising cut is not a swing in place, it is a launch. Measured off the reference clip
  // at 20ms a frame: four frames crouched on the floor, then twenty-six rising while the flame
  // is out, which carries the body two of its own heights up and about half a width forward.
  // The rise gets its own weaker gravity so it takes as long as the reference's does; past the
  // top the world's own gravity takes over, which keeps the landing from floating.
  // hold is the ride down, which is a pose and not an attack: the sheet keeps a short blade
  // overhead from the moment the plume tears off until the feet touch the floor.
  combat.rising = { span: .78, crouch: .08, lift: 354, gravity: 680, drift: 34, apex: 92,
                    hold: .46 };
  // The charged thrust, keyed off the user's thirty-frame sheet. Holding the saber charges it at the
  // buster's own rate and to the buster's own ready mark, so the meter, the hum and the flash all mean
  // the same thing whichever button is held; letting go at ready runs it. The sheet in order: the light
  // forms in the fist, a lunge drives it out ahead, it becomes a lance a little over two body heights
  // long, breaks up where it stands, and the body straightens. It bites once with the light still at
  // the fist and three times along the lance, each bite a full swing's worth.
  //   span            the whole move after the release, in seconds
  //   hits            elapsed seconds of each bite
  //   lunge           forward speed of the step into the lunge, between lungeFrom and lungeTo
  //   pad             how far from the drawn light a hit still counts
  //   reach           the old rectangle's range, only used if the rig is missing
  combat.thrust = { rate: .85, ready: combat.chargeThreshold, span: .90, hits: [.20, .34, .43, .52],
                    power: combat.saberPower, pad: 9, lunge: 90, lungeFrom: .10, lungeTo: .26, reach: 110 };
  // How much of the thrust's charge is on show. The hold is counted from the press, but the press has
  // already swung, and the hum, the meter and the lightning wait for that blade to come back.
  combat.saberChargeShown = function (p) {
    return (!p || p.saberTime > 0) ? 0 : Math.max(0, Math.min(1, p.saberCharge || 0));
  };
  // How long the swing on the books lasts. Every stage but the rising cut runs the short one.
  combat.saberSpan = function (p) {
    if (p && p.saberCombo === 6) return combat.thrust.span;
    return (p && p.saberCombo === 4) ? combat.rising.span : combat.saberDuration;
  };
  // Which set of rig keys is on screen. Five is the ride down, which no input can ask for:
  // it is what the rising cut leaves behind while the player is still in the air.
  combat.saberStage = function (p) {
    if (p && !(p.saberTime > 0) && (p.risingHold || 0) > 0) return 5;
    // Six is the charged thrust, which only a released charge can ask for.
    if (p && p.saberCombo === 6) return 6;
    return Math.max(1, Math.min(4, (p && p.saberCombo) || 1));
  };
  combat.risingHeld = function (p) {
    return !!(p && !(p.saberTime > 0) && (p.risingHold || 0) > 0);
  };
  // Keep the cutting response; give the follow-through twice as much time to settle.
  combat.saberPhase = function(p) {
    if(combat.risingHeld(p))return Math.min(1,Math.max(0,1-p.risingHold/combat.rising.hold));
    var span=combat.saberSpan(p),elapsed=Math.max(0,span-(p.saberTime||0));
    // the rising cut reads straight off its own clock; the chained swings keep the cut fast and
    // let the follow-through settle
    if(p&&(p.saberCombo===4||p.saberCombo===6))return Math.min(1,elapsed/span);
    return Math.min(1,elapsed<=.24?elapsed/.32:.75+(elapsed-.24)/.16*.25);
  };
  // Which stage is loaded. The arena and the checkpoints used to be constants here; they now
  // travel with the stage, so everything that reads combat.arena keeps working per stage.
  combat.stage = null;
  combat.useStage = function (def) {
    combat.stage = def;
    combat.arena = def.arena;
    combat.checkpoints = def.checkpoints;
    return def;
  };
  if (!global.AstraStages) throw new Error('assets/stages.js must load before game.js');
  if (!global.AstraBosses) throw new Error('assets/bosses.js must load before game.js');
  combat.useStage(global.AstraStages.get(global.AstraStages.first));
  combat.saberHitAt = .08;
  // Elapsed seconds at which each stage lands damage. The third swing is a multi-hit finisher.
  // Each entry is the elapsed second at which that stage lands a cut. They sit where the blade
  // has swung out, not where the input was pressed: stage 1 goes overhead first, stage 2 thrusts
  // straight away, and the finisher lands four cuts down its arc.
  // The rising cut lands a little later than the first swing, because the edge has to come up
  // off the floor before it is anywhere.
  // The flame is out for the whole of the rise, so it bites four times on the way up.
  combat.saberHitTimes = [[.16], [.08], [.13, .17, .21, .25], [.18, .31, .44, .57]];
  // Up and the saber are meant as one input, and nobody presses two keys on the same frame.
  // A recent up still counts when the saber arrives, and an up that arrives just after the
  // saber turns the swing that has barely started into the rising cut. Either order works.
  combat.risingGrace = .18;
  combat.risingConvert = .08;
  combat.saberDeflectEnd = .24;
  // The arc the drawn edge has travelled, in world coordinates. Null when the rig is absent,
  // in which case the callers fall back to the old rectangle.
  combat.saberSweep = function (p) {
    var rig = global.AstraSaberRig;
    if (!p || !(p.saberTime > 0) || !rig || !rig.sweep) return null;
    var build = global.AstraRunRig && global.AstraRunRig.build;
    var stage = combat.saberStage(p);
    var facing = p.saberFacing === undefined ? (p.facing || 1) : p.saberFacing;
    var ox = p.x + p.w / 2, oy = p.y + p.h;
    var arc = rig.sweep(stage, combat.saberPhase(p), build);
    if (!arc.length) return null;
    return arc.map(function (seg) {
      return { ax: ox + facing * seg.root.x, ay: oy + seg.root.y,
               bx: ox + facing * seg.tip.x,  by: oy + seg.tip.y };
    });
  };
  // Liang-Barsky clip of one blade segment against a padded box.
  function segmentInBox(seg, x0, y0, x1, y1) {
    var dx = seg.bx - seg.ax, dy = seg.by - seg.ay, t0 = 0, t1 = 1;
    var edges = [[-dx, seg.ax - x0], [dx, x1 - seg.ax], [-dy, seg.ay - y0], [dy, y1 - seg.ay]];
    for (var i = 0; i < 4; i++) {
      var pp = edges[i][0], qq = edges[i][1];
      if (pp === 0) { if (qq < 0) return false; continue; }
      var r = qq / pp;
      if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
  }
  combat.bladeThickness = 7;
  // How far from the drawn edge a hit still counts. A sword is thin; the rising cut's flame is
  // not, and pretending otherwise would make it miss things it visibly engulfs.
  combat.saberPad = function (p) {
    if (p && p.saberCombo === 6) return combat.thrust.pad;
    return (p && p.saberCombo === 4) ? 16 : combat.bladeThickness;
  };
  combat.bladeTouches = function (segs, box, pad) {
    if (!segs) return false;
    var grow = (pad === undefined ? combat.bladeThickness : pad);
    var x0 = box.x - grow, y0 = box.y - grow, x1 = box.x + box.w + grow, y1 = box.y + box.h + grow;
    for (var i = 0; i < segs.length; i++) if (segmentInBox(segs[i], x0, y0, x1, y1)) return true;
    return false;
  };
  // A downed mob blows up, and one kill in four leaves a repair cell behind.
  combat.dropChance = .25;
  combat.dropHeal = 1;
  // The Warden's moves. He has all six from the opening bell; only his tempo changes as he
  // loses armour.
  combat.bossPatterns = {
    volley: { tell: .95, active: 1.6 },
    wave:   { tell: .90, active: 1.7 },
    dash:   { tell: .85, active: 1.5 },
    mortar: { tell: 1.0, active: 1.5 },
    ring:   { tell: .85, active: 1.4 },
    slam:   { tell: .75, active: 1.6 },
    mines:  { tell: .95, active: 1.6 },
    wall:   { tell: .85, active: 1.5 }
  };
  // The whole catalogue. Which of these a boss owns is its own business.
  combat.bossPatternOrder = ['volley','wave','dash','mortar','ring','slam','mines','wall'];
  // How far from the player each beat can ask the boss to stand. Mixing these is what gives a
  // fight its shape: it backs off to shell you, then closes to sweep you.
  combat.bossBands = { near: 95, mid: 190, far: 300 };
  // Walking is bounded. If the arena will not give it the distance it wanted, it takes what it
  // got and winds up anyway rather than pressing into the wall.
  combat.bossWalk = { cap: 1.4, settle: 6 };
  // The opening. Every attack is followed by the boss standing still and starting nothing, and
  // this is the window the player is meant to take. It tightens as armour drops, never below
  // this, so there is always a way in.
  combat.bossRestFloor = .42;
  // Going down takes time: bursts walk over his frame, closing up as they go, and then he
  // goes up all at once.
  combat.bossDeath = { bursts: 9, blastAt: 1.55, end: 2.2 };
  combat.bossDeathBurstAt = function (i) {
    return combat.bossDeath.blastAt * Math.pow((i + 1) / (combat.bossDeath.bursts + 1), .72);
  };
  // Wounded, he winds up faster.
  combat.bossTellScale = [1, .82, .68];
  // Which attacks a boss owns, taken from the beats of its routine.
  combat.bossPool = function (def) {
    return (def && def.pool && def.pool.length) ? def.pool.slice() : combat.bossPatternOrder.slice();
  };
  // The loop a boss runs, and the beat that follows a given one. Nothing is chosen at random:
  // the order is written down in the roster and repeats forever.
  combat.bossRoutine = function (def) {
    return (def && def.routine && def.routine.length) ? def.routine : null;
  };
  combat.bossBeatAfter = function (def, at) {
    var routine = combat.bossRoutine(def);
    if (!routine) return 0;
    return ((at === undefined || at < 0 ? -1 : at) + 1) % routine.length;
  };
  combat.bossOf = function (b) { return global.AstraBosses.get(b && b.id); };
  combat.saberFrameDurations = [.02,.03,.03,.04,.06,.06,.04,.04];
  combat.runFrameCount = 16;
  combat.runDuration = .50;
  combat.runFrameDuration = combat.runDuration / combat.runFrameCount;
  combat.runPhase = function (p) { return ((p.runTime || 0) / combat.runDuration) % 1; };
  // Keep the firing pose while charging, then ease back into the arm swing.
  combat.runAim = function (p) {
    if (p.charge > 0) return 1;
    var t = Math.max(0, Math.min(1, (p.shootPoseTime || 0) / .08));
    return t * t * (3 - 2 * t);
  };
  combat.runFrame = function (p) { return Math.floor((p.runTime || 0) / combat.runFrameDuration) % combat.runFrameCount; };
  combat.runPose = function (p) { return !!p && p.onGround && Math.abs(p.vx || 0) > 20 && !(p.dashTime > 0) && !(p.saberTime > 0) && !p.wallDir; };
  combat.idlePose = function (p) { return !!p && !(p.shootPoseTime > 0) && !(p.charge > 0) && p.onGround && Math.abs(p.vx || 0) <= 20 && !(p.dashTime > 0) && !(p.saberTime > 0) && !p.wallDir; };
  // Every drawn state comes from the jointed rig. This picks which stance it poses.
  combat.rigMode = function (p) {
    if (!p) return null;
    if (p.saberTime > 0) return 'saber';
    if (p.wallDir) return 'wall';
    if (p.dashTime > 0) return 'dash';
    if (!p.onGround) return 'air';
    if (Math.abs(p.vx || 0) > 20) return 'run';
    return 'idle';
  };
  combat.rigPhase = function (p) { return combat.rigMode(p) === 'run' ? combat.runPhase(p) : combat.idlePhase(p); };
  // Positive while climbing, negative while dropping, so the airborne legs read the arc.
  combat.rigRise = function (p) { return Math.max(-1, Math.min(1, -(p.vy || 0) / 260)); };
  combat.idlePhase = function (p) { return p.reducedMotion ? 0 : ((p.animTime || 0) / 2.8) % 1; };
  combat.runCellOrder = [0,14,5,4,8,9,7,6,10,2,3,12,11,1,13,15];
  combat.runMetadata = { cells: [[0,0,314,314],[314,0,313,314],[627,0,313,314],[940,0,314,314],[0,314,314,313],[314,314,313,313],[627,314,313,313],[940,314,314,313],[0,627,314,313],[314,627,313,313],[627,627,313,313],[940,627,314,313],[0,940,314,314],[314,940,313,314],[627,940,313,314],[940,940,314,314]], rootX:[176.5,160,153.5,151.5,170.5,155,154.5,153.5,176,163,152.5,149,171,151.5,159,151], virtualGroundY:[300,305,303,303,285,280,280,286,268,273,274,268,248,249,244,249], muzzleX:[266.5,248,247,240.5,264.5,246.5,244,239,264.5,248,241,236.5,258.5,241,247.5,239], muzzleY:[167,171.5,167,169,146.5,141.5,142.5,150,134.5,138,140.5,134.5,113.5,114,110.5,115.5], scale:.19 };
  combat.saberFrame = function (p) {
    var elapsed = combat.saberPhase(p)*.32, acc = 0;
    var maps = [[0,1,2,3,4,5,6,7],[7,6,5,4,3,4,6,7],[0,1,2,2,3,4,5,7]];
    if (elapsed <= 0) return maps[Math.max(0,Math.min(2,(p.saberCombo||1)-1))][0];
    for (var i = 0; i < combat.saberFrameDurations.length; i++) {
      acc += combat.saberFrameDurations[i];
      if (elapsed < acc) return maps[Math.max(0,Math.min(2,(p.saberCombo||1)-1))][i];
    }
    return maps[Math.max(0,Math.min(2,(p.saberCombo||1)-1))][7];
  };
  combat.idleOffset = function (p) {
    if (!p || p.saberTime > 0 || p.shootPoseTime > 0 || p.charge > 0 ||
        p.dashTime > 0 || !p.onGround || p.wallDir || Math.abs(p.vx || 0) > 1 ||
        p.reducedMotion) return 0;
    return Math.sin((p.animTime || 0) * Math.PI * 2 / 2.8) * 1.5;
  };
  combat.frame = function (p) {
    if (p.saberTime > 0) return 7;
    if (p.shootPoseTime > 0 || p.charge > 0) {
      if (p.dashTime > 0) return 5;
      if (p.onGround && Math.abs(p.vx || 0) > 1) {
        return Math.floor((p.animTime || 0) * 12) % 2 ? 3 : 1;
      }
      return 0;
    }
    return p.wallDir ? 6 : p.dashTime > 0 ? 5 : !p.onGround ? 4
      : Math.abs(p.vx || 0) > 1 ? 1 + Math.floor((p.animTime || 0) * 12) % 3 : 0;
  };
  combat.muzzle = function (p) {
    var rigMode = combat.rigMode(p);
    if (global.AstraRunRig && rigMode && rigMode !== 'saber') return global.AstraRunRig.muzzle(combat.rigPhase(p),{x:p.x+p.w/2,y:p.y+p.h,facing:p.facing,mode:rigMode,rise:combat.rigRise(p),aiming:combat.runAim(p)});
    if (combat.runPose(p)) { if(global.AstraRunRig) return global.AstraRunRig.muzzle(combat.runPhase(p),{x:p.x+p.w/2,y:p.y+p.h,facing:p.facing,aiming:combat.runAim(p)}); var m=combat.runMetadata,f=combat.runFrame(p),af=combat.runCellOrder[f],base=p.y+p.h-3,dx=(m.muzzleX[af]-m.rootX[af])*m.scale; return {x:p.x+p.w/2+(p.facing<0?-dx:dx),y:base-(m.virtualGroundY[af]-m.muzzleY[af])*m.scale}; }
    var frame = combat.frame(p);
    var anchor = [[338, 198], [355, 252], [105, 263], [338, 254],
      [81, 196], [369, 325], [238, 46], [200, 265]][frame];
    var anchorY = anchor[1] / 8, idle = combat.idleOffset(p);
    return {
      x: p.x + p.w / 2 - 24 + (p.facing < 0 ? 48 - anchor[0] / 8 : anchor[0] / 8),
      y: p.y + p.h - 58 + anchorY + (anchorY < 36 ? idle * (1 - anchorY / 36) : 0)
    };
  };
  global.AstraCombat = combat;
  var NeonGame = function (canvas, opts) {
    opts = opts || {}; this.canvas=canvas; this.onEvent=opts.onEvent||function(){};
    this.width=640; this.height=360; this.worldWidth=9600; this.input={}; this.padInput={}; this.mouseInput={}; this.pressed={}; this.keys={};
    this.stageId=(opts.stage&&global.AstraStages.has(opts.stage))?opts.stage:global.AstraStages.first;
    this.options={reducedMotion:false}; this.acc=0; this.last=performance.now(); this.running=true; this.raf=0; this._pauseLatch=false; this._padStartLatch=false;
    this._bind(); this._bindMouse(); this._reset('menu'); this._loop();
  };
  NeonGame.prototype._bind=function(){
    var self=this;
    this._keydown=function(e){ var k=e.key.toLowerCase(); if(self.state.mode==='playing'&&['arrowleft','arrowright','arrowup',' ','shift','z','x','j','k','a','d','p','escape','r'].indexOf(k)>=0)e.preventDefault();
      if(k==='escape'||k==='p'){ if(e.repeat||self._pauseLatch)return; self._pauseLatch=true; if(self.state.mode==='playing')self.pause(); else if(self.state.mode==='paused')self.resume(); return; }
      if(k==='r'&&self.state.mode==='dead'){self.retry();return;} self.keys[k]=true; self._mapKey(k,true); };
    this._keyup=function(e){var k=e.key.toLowerCase(); self.keys[k]=false; if(k==='escape'||k==='p')self._pauseLatch=false; self._mapKey(k,false);};
    this._blur=function(){self.keys={};self.input={};self._clearMouse();if(self.state.mode==='playing')self.pause();};
    global.addEventListener('keydown',this._keydown); global.addEventListener('keyup',this._keyup); global.addEventListener('blur',this._blur);
  };
  NeonGame.prototype._bindMouse=function(){
    var self=this, c=this.canvas; if(!c||!c.addEventListener)return;
    this._mouseDown=function(e){if(self.state.mode!=='playing')return;if(e.button===0){self.mouseInput.shoot=true;self.mouseInput.pendingShoot=true;}if(e.button===2){self.mouseInput.saber=true;self.mouseInput.pendingSaber=true;}};
    this._mouseUp=function(e){if(e.button===0)self.mouseInput.shoot=false;if(e.button===2)self.mouseInput.saber=false;};
    this._contextMenu=function(e){e.preventDefault();};
    c.addEventListener('mousedown',this._mouseDown);c.addEventListener('mouseup',this._mouseUp);c.addEventListener('contextmenu',this._contextMenu);
    this._globalMouseUp=function(e){self._mouseUp(e);}; global.addEventListener('mouseup',this._globalMouseUp);
  };
  NeonGame.prototype._clearMouse=function(){this.mouseInput={};this._shootHeld=false;this._saberHeld=false;if(this.state&&this.state.player){this.state.player.charge=0;this.state.player.saberCharge=0;this._emit('charge-state',{level:0});}};
  // Up is a direction rather than a second jump key: held with the saber it asks for the
  // rising cut, and jumping still has Space, Z and the pad's own button.
  NeonGame.prototype._mapKey=function(k,v){var m={a:'left',arrowleft:'left',d:'right',arrowright:'right',' ':'jump',arrowup:'up',w:'up',z:'jump',shift:'dash',x:'dash',j:'shoot',k:'saber'};if(m[k])this.setInput(m[k],v);};
  NeonGame.prototype._reset=function(mode){
    this.input={}; this.padInput={}; this.mouseInput={}; this.pressed={}; this.keys={}; this.acc=0; this._jumpHeld=false; this._shootHeld=false; this._dashHeld=false; this._saberHeld=false; this._pauseLatch=false; this._padStartLatch=false;
    var def=global.AstraCombat.useStage(global.AstraStages.get(this.stageId));
    this.stageId=def.id; this.worldWidth=def.worldWidth;
    var p=[]; function add(x,y,w,h,t){p.push({x:x,y:y,w:w,h:h,type:t||'platform'});}
    var enemies=[], id=0, e=function(type,x,y){enemies.push({id:id++,type:type,x:x,y:y,w:type==='turret'?28:30,h:type==='drone'?24:34,hp:type==='turret'?3:2,maxHp:type==='turret'?3:2,facing:-1,flash:0,dead:false,baseX:x,baseY:y,phase:id*.7,fireTimer:1.6});};
    def.build(add,e);
    var pickups=def.pickups.map(function(k){return {x:k.x,y:k.y,type:k.type,taken:false};});
  this.state={mode:mode,time:0,camera:{x:0,y:0},width:640,height:360,worldWidth:this.worldWidth,player:{x:def.spawn.x,y:def.spawn.y,w:24,h:40,vx:0,vy:0,facing:1,hp:8,maxHp:8,charge:0,dashTime:0,dashCooldown:0,onGround:true,wallDir:0,invuln:0,animTime:0,saberTime:0,saberHits:0,coyote:.1,jumpBuffer:0,fireCooldown:0,shootPoseTime:0,reducedMotion:!!this.options.reducedMotion},platforms:p,enemies:enemies,bullets:[],particles:[],pickups:pickups,boss:null,bossIndex:0,checkpoint:{x:def.checkpoints[0].x,y:270,active:false},score:0,kills:0,shots:0,timeElapsed:0,stage:{id:def.id,name:def.name,number:def.number},section:def.sections[0].name,message:mode==='menu'?'ASTRA // OVERDRIVE':'',messageTimer:mode==='menu'?4:0,shake:0,flash:0,reducedMotion:!!this.options.reducedMotion};
    this.state.player.runTime=0;this.state.player.saberHit=false;this.state.player.saberHits=0;this.state.player.saberFacing=this.state.player.facing;this.state.player.saberCombo=0;this.state.player.saberQueued=false;this.state.player.upBuffer=0;this.state.player.risingWind=0;this.state.player.risingUp=false;this.state.player.risingHold=0;this.state.player.saberCharge=0;
    if(mode==='playing' && this.difficulty==='easy'){this.state.player.maxHp=10;this.state.player.hp=10;}
    this._jumpHeld=false; this._shootHeld=false; this._dashHeld=false; this._saberHeld=false;
  };
  NeonGame.prototype.start=function(o){o=o||{};this.difficulty=o.difficulty||'normal';this.character=o.character||'astra';if(o.stage&&global.AstraStages.has(o.stage))this.stageId=o.stage;this._reset('playing');this.running=true;this.last=performance.now();this.onEvent('start',this.snapshot());};
  NeonGame.prototype.pause=function(){if(this.state.mode==='playing'){this._clearMouse();this.state.mode='paused';this.onEvent('pause-request',this.snapshot());}};
  NeonGame.prototype.resume=function(){if(this.state.mode==='paused'){this.state.mode='playing';this.last=performance.now();this.onEvent('resume',this.snapshot());}};
  NeonGame.prototype.retry=function(){if(this.state.mode!=='dead')return;var c={x:this.state.checkpoint.x,active:this.state.checkpoint.active};this._reset('playing');this.state.player.x=c.active?c.x:global.AstraCombat.stage.spawn.x;this.state.player.y=270;this.state.checkpoint.active=c.active;this.state.checkpoint.x=c.x;this.running=true;this.last=performance.now();this.onEvent('start',this.snapshot());};
  NeonGame.prototype.toTitle=function(){this.running=true;this._reset('menu');this.last=performance.now();};
  // A press is latched as well as held. The loop does not step once per animation frame, so a
  // tap can begin and end between two steps; without the latch that tap is simply never seen.
  // The latch is cleared by the step that reads it, so it can only ever add one frame.
  NeonGame.prototype.setInput=function(a,v){this.input[a]=!!v;if(v)this.pressed[a]=true;}; NeonGame.prototype.setOptions=function(o){Object.assign(this.options,o||{});if(this.state){this.state.reducedMotion=!!this.options.reducedMotion;this.state.player.reducedMotion=!!this.options.reducedMotion;}};
  NeonGame.prototype.snapshot=function(){return JSON.parse(JSON.stringify(this.state));};
  NeonGame.prototype._emit=function(t,p){this.onEvent(t,p||this.snapshot());};
  NeonGame.prototype._loop=function(){var self=this;if(this.raf)return;var frame=function(now){self.raf=0;var dt=Math.min(.1,(now-self.last)/1000);self.last=now;self._pollGamepad();if(self.state.mode==='playing'){self.acc+=dt;while(self.acc>=1/60){self._tick(1/60);self.acc-=1/60;}}if(global.AstraRenderer&&self.canvas&&self.canvas.getContext)global.AstraRenderer.draw(self.canvas.getContext('2d'),self.state);if(self.running)self.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);};
  NeonGame.prototype._spawn=function(x,y,vx,vy,team,charged,power,extra){var b={x:x,y:y,vx:vx,vy:vy,r:charged?6:4,team:team,charged:!!charged,power:power||1,life:4};if(extra)for(var k in extra)b[k]=extra[k];this.state.bullets.push(b);return b;};
  NeonGame.prototype._push=function(q){if(this.state.particles.length>320)return null;this.state.particles.push(q);return q;};
  NeonGame.prototype._particle=function(x,y,color,type){return this._push({x:x,y:y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.35,maxLife:.35,color:color,size:2+Math.random()*3,type:type||'spark'});};
  NeonGame.prototype._roll=function(){return Math.random();};
  // A kill going up: a white core, rings pushing out, shrapnel that falls, and a little smoke.
  // power scales the whole thing down for smaller bursts, such as a mortar shell landing.
  NeonGame.prototype._explode=function(x,y,color,power){
    var calm=!!this.state.reducedMotion,tint=color||'#ffb52e',k=power===undefined?1:power,i,life;
    this._push({x:x,y:y,vx:0,vy:0,life:.14,maxLife:.14,color:'#fff6d8',size:13*k,type:'flash',gravity:0,grow:110*k});
    this._push({x:x,y:y,vx:0,vy:0,life:.30,maxLife:.30,color:tint,size:4,type:'ring',gravity:0,grow:130*k,width:2});
    if(!calm)this._push({x:x,y:y,vx:0,vy:0,life:.44,maxLife:.44,color:'#ff754d',size:2,type:'ring',gravity:0,grow:78*k,width:1});
    var shards=Math.round((calm?7:14)*k);
    for(i=0;i<shards;i++){
      var a=Math.PI*2*(i+Math.random()*.7)/shards,sp=(110+Math.random()*170)*k;
      life=.28+Math.random()*.3;
      this._push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-50*k,life:life,maxLife:life,
        color:i%3?tint:'#fff2c4',size:2+Math.random()*2,type:'spark',gravity:560,drag:.3});
    }
    if(calm)return;
    var puffs=Math.round(6*k);
    for(i=0;i<puffs;i++){
      life=.4+Math.random()*.3;
      this._push({x:x+(Math.random()-.5)*14,y:y+(Math.random()-.5)*14,vx:(Math.random()-.5)*40,
        vy:-24-Math.random()*36,life:life,maxLife:life,color:'#4c3a46',size:5+Math.random()*5,
        type:'smoke',gravity:-30,drag:.5,grow:9});
    }
  };
  // Every mob death runs through here, whichever weapon landed the last hit.
  NeonGame.prototype._killEnemy=function(e){
    var s=this.state;if(e.dead)return;
    e.dead=true;s.kills++;s.score+=100;
    this._explode(e.x+(e.w||30)/2,e.y+(e.h||30)/2,e.type==='drone'?'#ff5fa8':e.type==='turret'?'#ffd06a':'#ffb52e');
    s.shake=Math.max(s.shake,.18);
    this._emit('sound',{name:'explode'});
    this._drop(e);
  };
  // One kill in four leaves a repair cell where the mob stood. It falls to the nearest surface.
  NeonGame.prototype._drop=function(e){
    var s=this.state,c=global.AstraCombat;
    if(this._roll()>=c.dropChance)return null;
    var k={x:e.x+(e.w||30)/2-9,y:e.y+(e.h||30)/2-9,type:'health',taken:false,dropped:true,heal:c.dropHeal,vy:-110,rest:false};
    s.pickups.push(k);return k;
  };
  NeonGame.prototype._burst=function(x,y,color){for(var i=0;i<12;i++)this._particle(x,y,color,'burst');this._particle(x,y,color,'ring');};
  NeonGame.prototype._pollGamepad=function(){this.padInput={};if(typeof navigator==='undefined'||!navigator.getGamepads)return;var g=navigator.getGamepads()[0];if(!g)return;var ax=g.axes&&g.axes[0]||0,ay=g.axes&&g.axes[1]||0;this.padInput.left=!!((g.buttons[14]&&g.buttons[14].pressed)||ax<-.35);this.padInput.right=!!((g.buttons[15]&&g.buttons[15].pressed)||ax>.35);this.padInput.up=!!((g.buttons[12]&&g.buttons[12].pressed)||ay<-.35);this.padInput.jump=!!(g.buttons[0]&&g.buttons[0].pressed);this.padInput.dash=!!(g.buttons[1]&&g.buttons[1].pressed);this.padInput.shoot=!!(g.buttons[2]&&g.buttons[2].pressed);this.padInput.saber=!!(g.buttons[3]&&g.buttons[3].pressed);var start=!!(g.buttons[9]&&g.buttons[9].pressed);if(start&&!this._padStartLatch){this._padStartLatch=true;if(this.state.mode==='playing')this.pause();else if(this.state.mode==='paused')this.resume();}if(!start)this._padStartLatch=false;};
  NeonGame.prototype._tick=function(dt){var s=this.state,p=s.player;if(s.mode!=='playing')return;s.time+=dt;s.timeElapsed=s.time;s.messageTimer=Math.max(0,s.messageTimer-dt);p.animTime+=dt;p.invuln=Math.max(0,p.invuln-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.saberTime=Math.max(0,p.saberTime-dt);p.coyote=Math.max(0,p.coyote-dt);p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);p.upBuffer=Math.max(0,(p.upBuffer||0)-dt);p.risingHold=Math.max(0,(p.risingHold||0)-dt);if(p.risingWind>0){p.risingWind-=dt;if(p.risingWind<=0&&p.saberCombo===4){var R=global.AstraCombat.rising;p.vy=-R.lift;p.onGround=false;p.coyote=0;p.risingUp=true;if(Math.abs(p.vx)<R.drift)p.vx=p.saberFacing*R.drift;}}
    var held=this.pressed;this.pressed={};
    var left=!!(this.input.left||this.padInput.left||held.left),right=!!(this.input.right||this.padInput.right||held.right),up=!!(this.input.up||this.padInput.up||held.up),jump=!!(this.input.jump||this.padInput.jump||held.jump),dash=!!(this.input.dash||this.padInput.dash||held.dash),shoot=!!(this.input.shoot||this.padInput.shoot||this.mouseInput.shoot||this.mouseInput.pendingShoot||held.shoot),saber=!!(this.input.saber||this.padInput.saber||this.mouseInput.saber||this.mouseInput.pendingSaber||held.saber);this.mouseInput.pendingShoot=false;this.mouseInput.pendingSaber=false; var jumpPressed=jump&&!this._jumpHeld; if(jumpPressed)p.jumpBuffer=.12;this._jumpHeld=jump;
    if(up)p.upBuffer=global.AstraCombat.risingGrace;var wantsRising=up||p.upBuffer>0;
    var dir=(right?1:0)-(left?1:0); if(p.wallLock>0)dir=0;var thrusting=p.saberCombo===6&&p.saberTime>0;if(thrusting)dir=0;if(dir){p.facing=dir;p.vx+=(dir*1500)*dt;}else if(!p.risingUp)p.vx*=Math.pow(.0008,dt);if(p.dashTime<=0)p.vx=clamp(p.vx,-190,190);else p.vx=p.facing*560;if(thrusting){var TL=global.AstraCombat.thrust,thrustStep=TL.span-p.saberTime;if(thrustStep>=TL.lungeFrom&&thrustStep<TL.lungeTo&&p.dashTime<=0)p.vx=p.saberFacing*TL.lunge;}
    if(p.jumpBuffer>0&&(p.onGround||p.coyote>0)){p.vy=-430;p.onGround=false;p.coyote=0;p.jumpBuffer=0;this._emit('sound',{name:'jump'});} if(!jump&&!p.risingUp&&p.vy<-150)p.vy+=900*dt;
    if(dash&&!this._dashHeld&&p.dashCooldown<=0){p.risingHold=0;p.dashTime=.16;p.dashCooldown=.65;p.vx=p.facing*560;p.vy=0;this._emit('sound',{name:'dash'});}this._dashHeld=dash;
    shoot=shoot||this.input.shoot;p.fireCooldown=Math.max(0,p.fireCooldown-dt);p.shootPoseTime=Math.max(0,(p.shootPoseTime||0)-dt);var fireNormal=false,fireCharged=false;if(shoot){p.charge=clamp(p.charge+dt*.85,0,1);this._shootHeld=true;} if(!shoot&&this._shootHeld){fireCharged=p.charge>=global.AstraCombat.chargeThreshold;fireNormal=!fireCharged&&p.fireCooldown<=0;if(fireNormal||fireCharged)p.fireCooldown=.18;p.charge=0;this._shootHeld=false;} this._emit('charge-state',{level:Math.max(p.charge,global.AstraCombat.saberChargeShown(p))}); var saberElapsed=global.AstraCombat.saberSpan(p)-p.saberTime;if(p.saberTime<=0&&p.saberCombo>0){if(p.saberQueued&&p.saberCombo<3){p.saberCombo++;p.saberTime=global.AstraCombat.saberDuration;p.saberHit=false;p.saberHits=0;p.saberQueued=false;p.saberFacing=p.facing;this._emit('sound',{name:'saber',combo:p.saberCombo});}else{if(p.saberCombo===4&&!p.onGround)p.risingHold=global.AstraCombat.rising.hold;p.saberCombo=0;p.saberQueued=false;}}if(saber&&!this._saberHeld){if(p.saberTime>0){if(p.saberCombo<3&&saberElapsed>=global.AstraCombat.saberComboWindowStart&&saberElapsed<global.AstraCombat.saberDuration)p.saberQueued=true;}else{p.risingHold=0;p.saberCombo=wantsRising?4:1;p.saberTime=global.AstraCombat.saberSpan(p);if(p.saberCombo===4&&p.onGround)p.risingWind=global.AstraCombat.rising.crouch;p.saberHit=false;p.saberHits=0;p.saberQueued=false;p.saberFacing=p.facing;this._emit('sound',{name:'saber',combo:p.saberCombo});}}
    // the saber landed a frame or two before up did, and the blade has not left the hand yet
    if(up&&p.saberCombo===1&&p.saberTime>0&&!p.saberHits&&
       saberElapsed<global.AstraCombat.risingConvert){
      p.saberCombo=4;p.saberQueued=false;p.saberTime=global.AstraCombat.rising.span-saberElapsed;
      if(p.onGround)p.risingWind=Math.max(0,global.AstraCombat.rising.crouch-saberElapsed);
    }
    // Holding the saber charges the thrust. The press has already swung, so a tap is still a tap and a
    // chain is still a chain; only a hold that reaches ready and is then let go asks for the thrust.
    // The rising cut and the thrust itself do not charge, and the second and third swings pause it, so
    // a charge is always let go with the blade already back in the hand.
    var TH=global.AstraCombat.thrust;
    if(saber&&!this._saberHeld)p.saberCharge=0;
    if(saber){
      if(p.saberCombo===4||p.saberCombo===6||p.risingHold>0)p.saberCharge=0;
      else if(!(p.saberTime>0)||p.saberCombo===1)p.saberCharge=Math.min(1,(p.saberCharge||0)+dt*TH.rate);
    }else if(this._saberHeld){
      if((p.saberCharge||0)>=TH.ready&&!(p.saberTime>0)){
        p.risingHold=0;p.saberCombo=6;p.saberTime=TH.span;p.saberHit=false;p.saberHits=0;p.saberQueued=false;p.saberFacing=p.facing;
        this._emit('sound',{name:'thrust'});
      }
      p.saberCharge=0;
    }
    this._saberHeld=saber;
    // the rise has its own weight, which is what makes it take the reference's time
    p.vy+=(p.risingUp&&p.vy<0?global.AstraCombat.rising.gravity:1100)*dt;
    if(p.vy>=0)p.risingUp=false;
    if(p.dashTime>0)p.dashTime-=dt;var oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.onGround=false;p.wallDir=0;
    this._resolve(p,oldY); if(p.onGround)p.risingHold=0; if(global.AstraCombat.runPose(p))p.runTime=((p.runTime||0)+dt*Math.abs(p.vx)/190)%global.AstraCombat.runDuration;else p.runTime=0; if(fireNormal||fireCharged){p.shootPoseTime=.12;var fm=global.AstraCombat.muzzle(p);this._spawn(fm.x,fm.y,p.facing*(fireCharged?410:500),0,'player',fireCharged,fireCharged?global.AstraCombat.chargedPower:global.AstraCombat.normalPower);s.shots++;this._emit('sound',{name:fireCharged?'charge':'shot'});} if(!p.onGround&&p.wallDir&&p.vy>180)p.vy=180;if(p.wallDir&&jumpPressed){p.vy=-390;p.vx=-p.wallDir*260;p.wallLock=.12;} if(p.wallLock>0)p.wallLock-=dt;if(p.y>420){this._die();return;} var marks=global.AstraCombat.checkpoints,reached=null;for(var ci=0;ci<marks.length;ci++)if(p.x>marks[ci].at)reached=marks[ci]; if(reached&&(!s.checkpoint.active||s.checkpoint.x!==reached.x)){s.checkpoint.active=true;s.checkpoint.x=reached.x;if(reached.heal)p.hp=p.maxHp;s.message='CHECKPOINT // ONLINE';s.messageTimer=2;this._emit('checkpoint',this.snapshot());this._emit('sound',{name:'checkpoint'});} if(p.x>global.AstraCombat.arena.gate)p.x=Math.max(p.x,global.AstraCombat.arena.gate); if(p.x>global.AstraCombat.arena.spawn&&!s.boss){s.bossIndex=0;this._spawnBoss(global.AstraCombat.stage.bosses[0]);}
    saberElapsed=global.AstraCombat.saberDuration-p.saberTime;if(p.saberCombo===6&&p.saberTime>0){var TB=global.AstraCombat.thrust,thrustAt=TB.span-p.saberTime,bite=0;while(bite<TB.hits.length&&thrustAt>=TB.hits[bite])bite++;if(bite>(p.saberHits||0)){for(var tb=p.saberHits||0;tb<bite;tb++)this._damageNearby(TB.reach,TB.power,p.saberFacing);p.saberHits=bite;p.saberHit=true;}}else if(p.saberTime>0){var stageIndex=Math.max(0,Math.min(2,(p.saberCombo||1)-1)),hitTimes=global.AstraCombat.saberHitTimes[stageIndex],landed=0;while(landed<hitTimes.length&&saberElapsed>=hitTimes[landed])landed++;if(landed>(p.saberHits||0)){var cut=global.AstraCombat.saberPower*global.AstraCombat.saberComboPower[stageIndex];for(var hitIndex=p.saberHits||0;hitIndex<landed;hitIndex++)this._damageNearby(global.AstraCombat.saberRange,cut,p.saberFacing);p.saberHits=landed;p.saberHit=true;}} 
    var stage=global.AstraCombat.stage;s.message=global.AstraStages.hintAt(stage.hints,p.x);s.section=global.AstraStages.bandAt(stage.sections,p.x).name;
    this._enemies(dt);this._bullets(dt);this._pickups(dt);this._boss(dt);if(s.boss&&s.boss.active)p.x=clamp(p.x,global.AstraCombat.arena.gate,this.worldWidth-p.w);s.camera.x=clamp(p.x-230,0,this.worldWidth-640);s.camera.y=0;s.shake=Math.max(0,s.shake-dt*3);if(s.reducedMotion)s.shake=0;s.flash=Math.max(0,s.flash-dt*3);for(var i=s.particles.length-1;i>=0;i--){var q=s.particles[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=(q.gravity===undefined?200:q.gravity)*dt;if(q.drag){var qf=Math.pow(q.drag,dt);q.vx*=qf;q.vy*=qf;}if(q.grow)q.size=Math.max(0,(q.size||0)+q.grow*dt);if(q.life<=0)s.particles.splice(i,1);}
  };
  NeonGame.prototype._resolve=function(o,oldY){var s=this.state;for(var i=0;i<s.platforms.length;i++){var q=s.platforms[i];if(!hit(o,q))continue;if(oldY+o.h<=q.y&&o.vy>=0){o.y=q.y-o.h;o.vy=0;o.onGround=true;o.coyote=.1;}else if(oldY>=q.y+q.h&&o.vy<0){o.y=q.y+q.h;o.vy=20;}else if(o.x+o.w/2<q.x+q.w/2){o.x=q.x-o.w;o.vx=0;o.wallDir=1;}else{o.x=q.x+q.w;o.vx=0;o.wallDir=-1;}}o.x=clamp(o.x,0,this.worldWidth-o.w);};
  NeonGame.prototype._damageNearby=function(range,dmg,facing){var s=this.state,p=s.player,attackFacing=facing===undefined?p.facing:facing;var segs=global.AstraCombat.saberSweep(p);function reaches(box,cx,cy,wide){if(segs)return global.AstraCombat.bladeTouches(segs,box,global.AstraCombat.saberPad(p));var dx=cx-p.x;return Math.abs(dx)<range+(wide||0)&&((dx>0?1:-1)===attackFacing)&&Math.abs(cy-(p.y+p.h/2))<(wide?75:55);}for(var i=0;i<s.enemies.length;i++){var e=s.enemies[i];if(!e.dead&&reaches(e,e.x,e.y+e.h/2,0)){e.hp-=dmg;e.flash=.12;this._particle(e.x,e.y,'#ffb52e','burst');if(e.hp<=0)this._killEnemy(e);}}if(s.boss&&s.boss.active&&!s.boss.down&&reaches(s.boss,s.boss.x,s.boss.y+s.boss.h/2,s.boss.w*.4)){s.boss.hp=Math.max(0,s.boss.hp-dmg);s.boss.flash=.12;}}
  NeonGame.prototype._enemies=function(dt){var s=this.state,p=s.player;for(var i=0;i<s.enemies.length;i++){var e=s.enemies[i];if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);if(Math.abs(e.x-p.x)>550)continue;e.fireTimer-=dt;if(e.type==='walker'){e.x=e.baseX+Math.sin(s.time*2+e.phase)*45;e.x=clamp(e.x,e.baseX-45,e.baseX+45);}if(e.type==='drone'){e.y=e.baseY+Math.sin(s.time*2+e.phase)*16;if(e.fireTimer<=0){var dx=p.x-e.x,dy=p.y-e.y,len=Math.sqrt(dx*dx+dy*dy)||1;this._spawn(e.x,e.y,dx/len*180,dy/len*180,'enemy',false,1);e.fireTimer=2.2;}}if(e.type==='turret'&&e.fireTimer<=0){this._spawn(e.x,e.y+10,(p.x<e.x?-1:1)*170,0,'enemy',false,1);e.fireTimer=1.6;}if(hit(p,e)&&p.invuln<=0){p.hp--;p.invuln=.9;s.shake=.2;this._emit('sound',{name:'hurt'});if(p.hp<=0)this._die();}}};
  // The blade clears hostile projectiles only during the visible strike, before player damage.
  NeonGame.prototype._saberDeflects=function(b){var p=this.state.player,c=global.AstraCombat;if(b.team==='player'||p.saberTime<=0)return false;var segs=c.saberSweep(p);if(segs)return c.bladeTouches(segs,{x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2},c.saberPad(p));if(p.saberCombo===6)return false;var elapsed=c.saberDuration-p.saberTime;if(elapsed<c.saberHitAt||elapsed>=c.saberDeflectEnd)return false;var facing=p.saberFacing,dx=(b.x-p.x)*facing;return dx>=0&&dx<c.saberRange+b.r&&Math.abs(b.y-(p.y+p.h/2))<55+b.r;};
  // A shell with gravity bursts on whatever it lands on.
  NeonGame.prototype._shellLands=function(b){var s=this.state;for(var i=0;i<s.platforms.length;i++){var q=s.platforms[i];if(b.x>q.x&&b.x<q.x+q.w&&b.y+b.r>=q.y&&b.y-b.r<=q.y+q.h){
    if(b.mine){this._spawn(b.x,q.y-8,0,0,'enemy',false,1,{r:7,kind:'mine',fuse:b.fuse||1.2,burst:b.burst||5,life:b.fuse||1.2});this._explode(b.x,q.y-4,'#ffb04a',.3);return true;}
    this._explode(b.x,q.y-4,'#ff9a4a',.55);return true;}}return false;};
  NeonGame.prototype._bullets=function(dt){var s=this.state,p=s.player;for(var i=s.bullets.length-1;i>=0;i--){var b=s.bullets[i];if(b.g)b.vy+=b.g*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;var remove=b.life<=0||b.x<0||b.x>this.worldWidth||b.y>430||b.y<-140;if(remove&&b.fuse&&b.life<=0)this._mineBursts(b);if(!remove&&(b.g||b.pops)&&this._shellLands(b))remove=true;if(!remove){if(b.team==='player'){for(var j=0;j<s.enemies.length;j++){var e=s.enemies[j];if(!e.dead&&hit({x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2},e)){e.hp-=b.power;e.flash=.1;remove=true;for(var z=0;z<3;z++)this._particle(b.x,b.y,'#ffe36e');if(e.hp<=0)this._killEnemy(e);}}if(s.boss&&s.boss.active&&!s.boss.down&&hit({x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2},s.boss)){s.boss.hp-=b.power;s.boss.flash=.1;remove=true;this._burst(b.x,b.y,'#ff4f9a');}}else if(this._saberDeflects(b)){remove=true;for(var k=0;k<5;k++)this._particle(b.x,b.y,'#80fff0');this._particle(b.x,b.y,'#e5ffff','ring');}else if(hit({x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2},p)&&p.invuln<=0){p.hp--;p.invuln=.8;remove=true;s.shake=.25;this._emit('sound',{name:'hurt'});if(p.hp<=0)this._die();}}if(remove)s.bullets.splice(i,1);}};
  NeonGame.prototype._pickups=function(dt){
    var s=this.state,p=s.player;dt=dt||0;
    for(var i=s.pickups.length-1;i>=0;i--){
      var k=s.pickups[i];if(k.taken)continue;
      if(k.dropped&&!k.rest){
        var was=k.y;k.vy=(k.vy||0)+900*dt;k.y+=k.vy*dt;
        if(k.vy>=0)for(var j=0;j<s.platforms.length;j++){
          var q=s.platforms[j];
          if(k.x+18>q.x&&k.x<q.x+q.w&&was+18<=q.y&&k.y+18>=q.y){k.y=q.y-18;k.vy=0;k.rest=true;break;}
        }
        if(k.y>430){s.pickups.splice(i,1);continue;}
      }
      if(hit(p,{x:k.x,y:k.y,w:18,h:18})){
        k.taken=true;
        if(k.type==='health')p.hp=Math.min(p.maxHp,p.hp+(k.heal||2));else p.dashCooldown=0;
        s.score+=25;this.onEvent('sound',{name:'pickup'});
      }
    }
  };
  // Which entry in the roster this body is fighting as.
  function bossDef(b){ return global.AstraBosses.get(b && b.id); }
  function knob(b,name){ return bossDef(b).tuning[name]; }
  // Each pattern fires once, at the moment its wind-up ends. Every number it uses comes from
  // the roster entry, so two bosses sharing an attack still do not play the same.
  NeonGame.prototype._bossFire=function(b,name){
    var s=this.state,p=s.player,dir=p.x<b.x?-1:1,cx=b.x+b.w/2,cy=b.y+b.h/2,
        floorY=(b.baseY===undefined?b.y:b.baseY)+b.h,i,a;
    b.facing=dir;
    if(name==='volley'){
      var shots=knob(b,'volleyShots');
      // alternating sides of the chest, so the spread reads as coming off the machine
      for(i=0;i<shots;i++)this._spawn(b.x+b.w*(i%2?.72:.28),b.y+b.h*.27,
        dir*(knob(b,'volleySpeed')+i*knob(b,'volleyStep')),
        knob(b,'volleyRise')+i*knob(b,'volleyFall'),'enemy',false,1);
    } else if(name==='wave'){
      // more than one wave leaves staggered, so they arrive as a rhythm rather than a wall
      for(i=0;i<knob(b,'waveCount');i++)
        this._spawn(cx+dir*(b.w*.55+i*30),floorY-12,dir*(knob(b,'waveSpeed')-i*38),0,'enemy',false,2,
          {r:knob(b,'waveRadius'),kind:'wave'});
    } else if(name==='dash'){
      b.dashTime=knob(b,'dashHold');
    } else if(name==='mortar'){
      // shells lobbed onto where he last saw the player, straddling that spot. The arc is
      // solved so they come down on the floor plane, not on the muzzle line.
      var flight=knob(b,'mortarFlight'),gv=900,aimAt=p.x+p.w/2,muzzleY=b.y+b.h*.18,
          climb=(floorY-muzzleY-gv*flight*flight/2)/flight,
          shells=knob(b,'mortarShells'),spread=knob(b,'mortarSpread');
      for(i=0;i<shells;i++){
        var land=aimAt+(i-(shells-1)/2)*spread;
        this._spawn(cx,muzzleY,(land-cx)/flight,climb,'enemy',false,1,{r:5,g:gv,kind:'shell'});
      }
    } else if(name==='ring'){
      // spawned clear of his own silhouette, or the first half second of the spread is invisible
      var ring=knob(b,'ringShots'),rs=knob(b,'ringSpeed');
      for(i=0;i<ring;i++){
        a=Math.PI*2*i/ring;
        // flattened vertically so the downward shots start above the floor rather than inside it
        this._spawn(cx+Math.cos(a)*(b.w*.66),cy+Math.sin(a)*(b.h*.44),Math.cos(a)*rs,Math.sin(a)*rs,
          'enemy',false,1,{r:5,pops:true});
      }
    } else if(name==='slam'){
      // leap marks this as the committed jump: the scurry lets go of the body until it lands
      b.vy=-knob(b,'slamLift');b.slammed=false;b.leap=true;
    } else if(name==='mines'){
      // lobbed the same way as shells, but they sit where they land and go off on a fuse
      var mf=1.1,mg=900,mClimb=(floorY-(b.y+b.h*.18)-mg*mf*mf/2)/mf,
          count=knob(b,'mineShells'),mSpread=knob(b,'mineSpread');
      for(i=0;i<count;i++){
        var at=p.x+p.w/2+(i-(count-1)/2)*mSpread;
        this._spawn(cx,b.y+b.h*.18,(at-cx)/mf,mClimb,'enemy',false,1,{r:6,g:mg,kind:'shell',mine:true});
      }
    } else if(name==='wall'){
      // a column with exactly one hole in it, which is the whole puzzle
      var rows=knob(b,'wallRows'),step=knob(b,'wallStep'),
          hole=1+Math.floor(Math.random()*Math.max(1,rows-2));
      for(i=0;i<rows;i++){
        if(i===hole)continue;
        this._spawn(cx+dir*(b.w*.5+6),floorY-18-i*step,dir*knob(b,'wallSpeed'),0,'enemy',false,1,
          {r:6,kind:'wall'});
      }
    }
  };
  // The slam only pays off when he lands: the floor throws a wave out both ways.
  NeonGame.prototype._bossSlam=function(b){
    var s=this.state,cx=b.x+b.w/2,fy=b.y+b.h,speed=knob(b,'slamWave');
    this._spawn(cx-b.w*.3,fy-12,-speed,0,'enemy',false,2,{r:7,kind:'wave'});
    this._spawn(cx+b.w*.3,fy-12,speed,0,'enemy',false,2,{r:7,kind:'wave'});
    s.shake=Math.max(s.shake,.45);
    for(var i=0;i<12;i++){
      var d=i<6?-1:1,sp=80+Math.random()*150;
      this._push({x:cx+d*b.w*.2,y:fy-6,vx:d*sp,vy:-40-Math.random()*90,life:.34,maxLife:.34,
        color:'#8ea6ad',size:2+Math.random()*3,type:'spark',gravity:620,drag:.4});
    }
    this._emit('sound',{name:'boss'});
  };
  // A mine that has run its fuse throws a short fan upward before it is gone.
  NeonGame.prototype._mineBursts=function(b){
    var shots=b.burst||5;
    this._explode(b.x,b.y,'#ffb04a',.7);
    for(var i=0;i<shots;i++){
      var a=-Math.PI/2+(i-(shots-1)/2)*.42;
      this._spawn(b.x,b.y-6,Math.cos(a)*165,Math.sin(a)*165,'enemy',false,1,{r:5,pops:true});
    }
    this.state.shake=Math.max(this.state.shake,.2);
  };
  // Everything he had in the air comes off the board with him, and the arena goes quiet.
  NeonGame.prototype._bossDown=function(b){
    var s=this.state;
    b.hp=0;b.down=true;b.downTime=0;b.deathBursts=0;b.blasted=false;
    b.dashTime=0;b.attack='down';b.timer=999;
    for(var i=s.bullets.length-1;i>=0;i--)if(s.bullets[i].team==='enemy')s.bullets.splice(i,1);
    s.shake=Math.max(s.shake,.35);
    this._emit('sound',{name:'explode'});
  };
  // Blasts walk across his frame, tightening up, and then the whole thing lets go.
  NeonGame.prototype._bossDying=function(b,dt){
    var s=this.state,C=global.AstraCombat,plan=C.bossDeath;
    b.downTime+=dt;b.flash=Math.max(0,b.flash-dt);
    if(b.y<b.baseY){b.vy=(b.vy||0)+1500*dt;b.y=Math.min(b.baseY,b.y+b.vy*dt);if(b.y>=b.baseY)b.vy=0;}
    while(b.deathBursts<plan.bursts&&C.bossDeathBurstAt(b.deathBursts)<=b.downTime){
      b.deathBursts++;
      var rx=b.x+b.w*.15+Math.random()*(b.w*.7),ry=b.y+b.h*.13+Math.random()*(b.h*.74);
      this._explode(rx,ry,b.deathBursts%2?'#ffd06a':'#ff754d',1);
      b.flash=.12;s.shake=Math.max(s.shake,.3);
      this._emit('sound',{name:'explode'});
    }
    if(!b.blasted&&b.downTime>=plan.blastAt){
      b.blasted=true;b.gone=true;
      var cx=b.x+b.w/2,cy=b.y+b.h/2;
      this._explode(cx,cy,'#fff2c4',2.3);
      for(var i=0;i<5;i++){
        var a=Math.PI*2*i/5+.4;
        this._explode(cx+Math.cos(a)*(b.w*.85),cy+Math.sin(a)*(b.h*.65),i%2?'#ffd06a':'#ff754d',1.1);
      }
      s.shake=Math.max(s.shake,1);
      s.flash=s.reducedMotion?0:.55;
      this._emit('sound',{name:'boom'});
    }
    if(b.downTime>=plan.end){
      s.score+=800;
      if(this._nextBoss())return;                 // a gauntlet sends the next one in
      b.active=false;s.mode='victory';s.message='GATEBREAKER // COMPLETE';
      this._emit('victory',this.snapshot());this._emit('sound',{name:'victory'});
    }
  };
  // Builds the boss a stage asks for. Size, armour and look all come from the roster.
  NeonGame.prototype._spawnBoss=function(id){
    var s=this.state,def=global.AstraBosses.get(id),arena=global.AstraCombat.arena;
    var hp=this.difficulty==='easy'?def.easyHp:def.hp,bottom=310;
    s.boss={id:def.id,name:def.name,title:def.title,look:def.look||'',sprite:def.sprite||'',
      x:arena.bossX,y:bottom-def.h,baseY:bottom-def.h,w:def.w,h:def.h,
      hp:hp,maxHp:hp,active:true,phase:0,healthPhase:1,attack:'tell-'+def.pool[0],
      timer:.95,flash:0,facing:-1,vy:0,leap:false,slammed:true,beat:undefined,walkTo:undefined};
    // it opens on the first beat of its routine, so the loop starts where the roster says
    this._bossBeat(s.boss,def);
    return s.boss;
  };
  // In a gauntlet the arena refills until the list runs out.
  NeonGame.prototype._nextBoss=function(){
    var s=this.state,order=global.AstraCombat.stage.bosses;
    if(!order||s.bossIndex+1>=order.length)return false;
    s.bossIndex++;
    var p=s.player;p.hp=Math.min(p.maxHp,p.hp+2);
    this._spawnBoss(order[s.bossIndex]);
    s.message='NEXT FRAME // '+s.boss.name;s.messageTimer=2.2;
    this._emit('sound',{name:'boss'});
    return true;
  };
  NeonGame.prototype._boss=function(dt){
    var s=this.state,p=s.player,b=s.boss,C=global.AstraCombat,arena=C.arena;
    if(!b||!b.active)return;
    if(b.baseY===undefined)b.baseY=b.y;
    if(b.hp<=0&&!b.down)this._bossDown(b);
    if(b.down){this._bossDying(b,dt);return;}
    var def=bossDef(b);
    b.timer-=dt;b.flash=Math.max(0,b.flash-dt);
    var ratio=b.hp/b.maxHp;b.healthPhase=ratio>.66?1:ratio>.33?2:3;
    // the slam leap tracks the player through the air and shakes the floor on landing. A
    // scurry hop rides the same gravity but lands already slammed, so it throws no wave.
    if(b.vy||b.y<b.baseY){
      b.vy=(b.vy||0)+1500*dt;b.y+=b.vy*dt;
      var toward=(p.x+p.w/2)-(b.x+b.w/2);
      if(b.leap&&Math.abs(toward)>4)b.x=clamp(b.x+(toward>0?1:-1)*knob(b,'slamTrack')*dt,arena.bossMin,arena.bossMax);
      if(b.y>=b.baseY){b.y=b.baseY;if(b.vy>0&&!b.slammed){b.slammed=true;this._bossSlam(b);}b.vy=0;b.leap=false;}
    }
    if(b.dashTime>0){b.dashTime-=dt;b.x=clamp(b.x+b.facing*knob(b,'dashSpeed')*dt,arena.bossMin,arena.bossMax);}
    // Walking only ever happens on the way to the spot the next beat asked for, and it ends
    // the moment the boss gets there.
    var state=String(b.attack||'');
    if(state.indexOf('walk-')===0&&b.dashTime<=0&&!b.leap){
      var gap=(b.walkTo===undefined?b.x:b.walkTo)-b.x;
      if(Math.abs(gap)>C.bossWalk.settle){
        var step=knob(b,'stepSpeed')*dt;
        b.x=clamp(b.x+(gap>0?Math.min(step,gap):Math.max(-step,gap)),arena.bossMin,arena.bossMax);
      } else b.timer=0;
      b.facing=(p.x+p.w/2)<b.x+b.w/2?-1:1;
    }
    // Resting is the opening: it stands, it faces you, and it starts nothing.
    if(state==='rest')b.facing=(p.x+p.w/2)<b.x+b.w/2?-1:1;
    if(b.timer<=0){
      if(state.indexOf('walk-')===0)this._bossWind(b,def,state.slice(5));
      else if(state.indexOf('tell-')===0&&C.bossPatterns[state.slice(5)]){
        var move=state.slice(5);
        b.attack=move;b.timer=C.bossPatterns[move].active;this._bossFire(b,move);
      } else if(C.bossPatterns[state])this._bossRest(b,def);
      else this._bossBeat(b,def);
    }
    if(hit(p,b)&&p.invuln<=0){p.hp-=2;p.invuln=1;s.shake=.3;if(p.hp<=0)this._die();}
  };
  // Step to the next beat of the routine and set off for the distance it asks for. Whichever
  // side of the player it is already on is the side it keeps, unless the arena is too tight
  // there to give the distance, in which case it crosses over.
  NeonGame.prototype._bossBeat=function(b,def){
    var C=global.AstraCombat,arena=C.arena,p=this.state.player,routine=C.bossRoutine(def);
    if(!routine){b.attack='rest';b.timer=.8;return;}
    b.beat=C.bossBeatAfter(def,b.beat);
    var beat=routine[b.beat],mid=p.x+p.w/2,
        side=(b.x+b.w/2)<mid?-1:1,away=C.bossBands[beat.from]||C.bossBands.mid;
    b.walkTo=clamp(mid+side*away-b.w/2,arena.bossMin,arena.bossMax);
    if(Math.abs(b.walkTo+b.w/2-mid)<away-24)
      b.walkTo=clamp(mid-side*away-b.w/2,arena.bossMin,arena.bossMax);
    b.attack='walk-'+beat.move;b.timer=C.bossWalk.cap;b.dashTime=0;
  };
  // Plant and telegraph. The wind-up is the same one the warning graphic is drawn from.
  NeonGame.prototype._bossWind=function(b,def,move){
    var C=global.AstraCombat,p=this.state.player;
    if(!C.bossPatterns[move]){this._bossBeat(b,def);return;}
    b.attack='tell-'+move;b.phase=def.pool.indexOf(move);
    b.timer=C.bossPatterns[move].tell*C.bossTellScale[b.healthPhase-1]*(def.tempo||1);
    b.facing=p.x<b.x?-1:1;b.dashTime=0;
    this._emit('sound',{name:'boss'});
  };
  // The recovery the beat asked for. Wounded it shortens, but never past the floor.
  NeonGame.prototype._bossRest=function(b,def){
    var C=global.AstraCombat,routine=C.bossRoutine(def),
        beat=routine&&routine[b.beat===undefined?0:b.beat];
    b.attack='rest';b.dashTime=0;
    b.timer=Math.max(C.bossRestFloor,(beat?beat.rest:.8)*C.bossTellScale[b.healthPhase-1]);
  };
  NeonGame.prototype._die=function(){var s=this.state;if(s.mode==='dead'||s.mode==='victory')return;this._clearMouse();s.mode='dead';s.message='SYSTEM FAILURE';s.messageTimer=999;s.shake=.5;this._emit('death',this.snapshot());};
  NeonGame.prototype.destroy=function(){this.running=false;this._clearMouse();if(this.raf)cancelAnimationFrame(this.raf);global.removeEventListener('keydown',this._keydown);global.removeEventListener('keyup',this._keyup);global.removeEventListener('blur',this._blur);if(this.canvas&&this.canvas.removeEventListener){this.canvas.removeEventListener('mousedown',this._mouseDown);this.canvas.removeEventListener('mouseup',this._mouseUp);this.canvas.removeEventListener('contextmenu',this._contextMenu);}if(this._globalMouseUp)global.removeEventListener('mouseup',this._globalMouseUp);};
  global.NeonGame=NeonGame;
})(typeof window!=='undefined'?window:globalThis);


