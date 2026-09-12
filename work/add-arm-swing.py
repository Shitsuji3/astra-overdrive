from pathlib import Path

p=Path('assets/run-rig-v6.js')
s=p.read_text(encoding='utf-8-sig')
start=s.index('  function upperPose(')
s=s[:start]+'''  // Each arm is driven from its shoulder, with an independently bent elbow.
  var UPPER_ARM=[[144,139],[155,141],[161,151],[153,164],[143,173],[127,168],[123,157],[132,146]];
  var FOREARM=[[134,157],[150,163],[145,180],[138,198],[127,207],[108,207],[99,195],[100,180],[112,166]];
  function upperPose(phase,idle){
    var q=TAU*phase;
    return idle?{lean:.025+.012*Math.sin(q),sway:.4*Math.sin(q)}
      :{lean:.09+.035*Math.sin(2*q-.35),sway:.6*Math.sin(q)};
  }
  function standingPose(phase){
    phase=((phase%1)+1)%1;
    var bob=.55*Math.sin(TAU*phase),hip={x:0,y:-23+bob};
    function leg(x){var r=ik(hip,{x:x,y:-4});return{hip:hip,ankle:r.ankle,ik:r,stance:true,t:0,u:0};}
    return{phase:phase,body:{bob:bob},left:leg(8),right:leg(-8)};
  }
  function armPose(phase,aiming,idle){
    var q=TAU*phase,w=clamp(Number(aiming)||0,0,1);
    var frontShoulder={x:3.5,y:-9},rearShoulder={x:-2.5,y:-9};
    var frontSwing=idle?.1+.23*Math.sin(q):-.9*Math.cos(q);
    var rearSwing=idle?-.2-.23*Math.sin(q):.9*Math.cos(q);
    function elbow(s,a){return{x:s.x+7.5*Math.sin(a),y:s.y+7.5*Math.cos(a)};}
    var fe=elbow(frontShoulder,frontSwing),re=elbow(rearShoulder,rearSwing);
    // Raise the whole weapon arm to aim; the idle/run elbow is otherwise free.
    fe.x+=(8.2-fe.x)*w;fe.y+=(-3.8-fe.y)*w;
    var fa=idle?.65+.2*Math.sin(q):.45+.85*Math.cos(q);
    var ra=idle?.6-.2*Math.sin(q):.45-.85*Math.cos(q);
    return{front:{shoulder:frontShoulder,elbow:fe,angle:fa},
      rear:{shoulder:rearShoulder,elbow:re,wrist:{x:re.x+8*Math.cos(ra),y:re.y+8*Math.sin(ra)}},aim:w};
  }
  function cannonTransform(phase,aiming,idle){
    var p=idle?standingPose(phase):pose(phase),u=upperPose(p.phase,idle),arms=armPose(p.phase,aiming,idle);
    var c=Math.cos(u.lean),s=Math.sin(u.lean),e=arms.front.elbow;
    var pivot={x:c*(e.x+u.sway)-s*e.y,y:-23+p.body.bob+s*(e.x+u.sway)+c*e.y};
    var a=(u.lean+arms.front.angle)*(1-arms.aim),ca=Math.cos(a),sa=Math.sin(a);
    return{angle:a,pivot:pivot,muzzle:{x:pivot.x+ca*12.9-sa*.6,y:pivot.y+sa*12.9+ca*.6}};
  }
  function draw(ctx,o){
    o=o||{};
    var p=o.idle?standingPose(o.phase||0):pose(o.phase||0),upper=upperPose(p.phase,o.idle),arms=armPose(p.phase,o.aiming,o.idle),img=o.image;
    ctx.save();ctx.translate(o.x||0,o.y||0);if((o.facing||1)<0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
    function limb(l){
      bonePart(ctx,img,{x:314,y:627},THIGH,{x:151,y:154},{x:177,y:181},l.hip,l.ik.knee);
      bonePart(ctx,img,{x:314,y:627},SHIN,{x:184,y:190},{x:164,y:242},l.ik.knee,l.ankle);
      rigidPart(ctx,img,{x:314,y:627},FOOT,{x:164,y:242},l.ankle,SCALE,l.stance?0:.9*Math.sin(Math.PI*l.u));
    }
    function torsoSpace(){ctx.translate(0,-23+p.body.bob);ctx.rotate(upper.lean);ctx.translate(upper.sway,0);}
    function upperArm(a){bonePart(ctx,img,{x:0,y:0},UPPER_ARM,{x:153,y:144},{x:139,y:164},a.shoulder,a.elbow);}
    ctx.save();ctx.filter='brightness(.78)';limb(p.right);ctx.restore();
    ctx.save();torsoSpace();upperArm(arms.rear);
    bonePart(ctx,img,{x:0,y:0},FOREARM,{x:139,y:164},{x:115,y:192},arms.rear.elbow,arms.rear.wrist);ctx.restore();
    limb(p.left);
    ctx.save();torsoSpace();rigidPart(ctx,img,{x:0,y:0},BODY,{x:161,y:183},{x:0,y:0},SCALE,0);upperArm(arms.front);ctx.restore();
    var ct=cannonTransform(p.phase,o.aiming,o.idle);
    rigidPart(ctx,img,{x:0,y:0},CANNON,{x:202,y:164},ct.pivot,SCALE,ct.angle);
    ctx.restore();return p;
  }
  g.AstraRunRig=g.AstraRunRigV6={pose:pose,standingPose:standingPose,armPose:armPose,upperPose:upperPose,draw:draw,
    drawAt:function(ctx,phase,o){o=o||{};o.phase=phase;return draw(ctx,o)},
    muzzle:function(phase,o){o=o||{};var q=cannonTransform(phase||0,o.aiming,o.idle),x=(o.facing||1)<0?-q.muzzle.x:q.muzzle.x;return{x:(o.x||0)+x,y:(o.y||0)+q.muzzle.y,local:q.muzzle}},
    cannonTransform:cannonTransform,rigidPart:rigidPart,bonePart:bonePart};
})(typeof window!=='undefined'?window:globalThis);
'''
p.write_text(s,encoding='utf-8')
