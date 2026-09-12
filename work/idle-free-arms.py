from pathlib import Path
def edit(name,old,new,count=1):
    p=Path(name);s=p.read_text(encoding='utf-8-sig');assert s.count(old)==count,(name,old,s.count(old));p.write_text(s.replace(old,new),encoding='utf-8')
edit('game.js',
    '  combat.runPose = function (p) { return !!p && p.onGround && Math.abs(p.vx || 0) > 20 && !(p.dashTime > 0) && !(p.saberTime > 0) && !p.wallDir; };',
    '''  combat.runPose = function (p) { return !!p && p.onGround && Math.abs(p.vx || 0) > 20 && !(p.dashTime > 0) && !(p.saberTime > 0) && !p.wallDir; };
  combat.idlePose = function (p) { return !!p && p.onGround && Math.abs(p.vx || 0) <= 20 && !(p.dashTime > 0) && !(p.saberTime > 0) && !p.wallDir; };
  combat.idlePhase = function (p) { return p.reducedMotion ? 0 : ((p.animTime || 0) / 2.8) % 1; };''')
edit('game.js','  combat.muzzle = function (p) {',
    '''  combat.muzzle = function (p) {
    if (global.AstraRunRig && combat.idlePose(p)) return global.AstraRunRig.muzzle(combat.idlePhase(p),{x:p.x+p.w/2,y:p.y+p.h,facing:p.facing,idle:true,aiming:combat.runAim(p)});''')
edit('render.js','saber=p.saberTime>0;if(run)ensureAsset',
    'saber=p.saberTime>0,idle=g.AstraCombat&&g.AstraCombat.idlePose&&g.AstraCombat.idlePose(p);if(run||idle)ensureAsset')
edit('render.js','if(run&&g.AstraRunRig&&runAtlas','if((run||idle)&&g.AstraRunRig&&runAtlas')
edit('render.js','phase:g.AstraCombat.runPhase(p),aiming:',
    'phase:run?g.AstraCombat.runPhase(p):g.AstraCombat.idlePhase(p),idle:!!idle,aiming:')

# Standing/landing now uses the same articulated character rather than the legacy aiming-only sprite.
edit('tests/combat-polish.test.cjs',
    "const phase=api.runPhase(p),q=2*Math.PI*phase,bob=1.2*Math.sin(2*q),ang=.09+.035*Math.sin(2*q-.35),sw=.6*Math.sin(q),cpX=Math.cos(ang)*(8.2+sw)+3.8*Math.sin(ang),cpY=Math.sin(ang)*(8.2+sw)-3.8*Math.cos(ang),x=pose==='running'?p.x+p.w/2+facing*(cpX+12.9):p.x+p.w/2-24+(facing<0?48-a[0]/8:a[0]/8),y=pose==='running'?p.y+p.h-23+bob+cpY+.6:p.y+p.h-58+a[1]/8;",
    "const running=pose==='running',grounded=running||pose==='standing'||pose==='landing',phase=running?p.runTime/.5:p.animTime/2.8,q=2*Math.PI*phase,bob=running?1.2*Math.sin(2*q):.55*Math.sin(q),ang=running?.09+.035*Math.sin(2*q-.35):.025+.012*Math.sin(q),sw=(running?.6:.4)*Math.sin(q),cpX=Math.cos(ang)*(8.2+sw)+3.8*Math.sin(ang),cpY=Math.sin(ang)*(8.2+sw)-3.8*Math.cos(ang),x=grounded?p.x+p.w/2+facing*(cpX+12.9):p.x+p.w/2-24+(facing<0?48-a[0]/8:a[0]/8),y=grounded?p.y+p.h-23+bob+cpY+.6:p.y+p.h-58+a[1]/8;")
