from pathlib import Path

def edit(name, old, new, count=1):
    p=Path(name)
    s=p.read_text(encoding='utf-8-sig')
    assert s.count(old)==count,(name,old,s.count(old))
    p.write_text(s.replace(old,new),encoding='utf-8')

edit('game.js',
     '  combat.runPhase = function (p) { return ((p.runTime || 0) / combat.runDuration) % 1; };',
     '''  combat.runPhase = function (p) { return ((p.runTime || 0) / combat.runDuration) % 1; };
  // Keep the firing pose while charging, then ease back into the arm swing.
  combat.runAim = function (p) {
    if (p.charge > 0) return 1;
    var t = Math.max(0, Math.min(1, (p.shootPoseTime || 0) / .08));
    return t * t * (3 - 2 * t);
  };''')
edit('game.js','aiming:p.shootPoseTime>0||p.charge>0','aiming:combat.runAim(p)')
edit('render.js','aiming:p.shootPoseTime>0||p.charge>0','aiming:g.AstraCombat.runAim(p)')
edit('assets/run-rig-v6.js','!!o.aiming','o.aiming',2)
edit('assets/run-rig-v6.js','a=aiming?0:u.lean+u.gunSwing',
     'a=(u.lean+u.gunSwing)*(1-clamp(Number(aiming)||0,0,1))')
edit('package.json','node --check game.js','node --check assets/run-rig-v6.js && node --check game.js')

# Include the returning arm pose in the independent rendered-muzzle sweep.
edit('qa/upper-body/independent-acceptance.cjs','for(const aiming of [false,true])','for(const aiming of [0,.5,1])')
edit('qa/upper-body/independent-acceptance.cjs','shootPoseTime:aiming?.1:0','shootPoseTime:aiming===1?.1:aiming===.5?.04:0')
