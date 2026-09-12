(function(g){
  'use strict';
  var turnAtlas=null,turnReady=false,turnLoading=false,turnRetry=0;
  function loadTurn(){
    if(turnReady||turnLoading||typeof Image==='undefined'||Date.now()<turnRetry)return;
    turnLoading=true;var im=new Image();im.onload=function(){turnAtlas=im;turnReady=true;turnLoading=false};
    im.onerror=function(){turnLoading=false;turnRetry=Date.now()+2000};im.src='assets/saber-turn-atlas.png';
  }
  loadTurn();
  function ease(a,b,x){var u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);}

  // Reference GIF: 0–11 overhead cut, 12–19 waist sweep on a wide split stance, 20–31 deep overhead cut.
  // Retarget the poses to the existing hero's rigid armor pieces, in ground-relative pixels.
  var BODY=[[148,136],[175,136],[191,144],[207,144],[212,169],[205,185],[160,185],[146,165]];
  var HEAD=[[157,73],[234,73],[234,147],[187,151],[153,131]];
  var SCARF=[[62,93],[105,93],[121,113],[165,114],[173,126],[145,138],[107,137],[76,123],[62,131]];
  var UPPER=[[144,139],[155,141],[161,151],[153,164],[143,173],[127,168],[123,157],[132,146]];
  var FORE=[[134,157],[150,163],[145,180],[138,198],[127,207],[108,207],[99,195],[100,180],[112,166]];
  var THIGH=[[146,145],[163,148],[178,158],[187,172],[187,184],[176,193],[166,187],[148,177],[137,166],[137,153]];
  var SHIN=[[180,179],[195,183],[197,196],[187,211],[185,232],[177,244],[146,246],[141,235],[145,219],[150,206],[163,199],[174,197]];
  var FOOT=[[146,235],[164,237],[174,237],[183,242],[199,248],[200,261],[137,262],[132,255],[136,244]];
  var CANNON=[[206,147],[218,144],[248,146],[273,155],[278,178],[254,188],[221,188],[207,178],[198,165]];
  // time, hip x/y, torso lean, hand x/y, blade angle, forward foot, rear foot.
  // Every stage steps the lead foot out and drives the trailing leg back, as in the reference:
  // frames 3–11 plant wide under a forward pitch, 12–19 open the chest, 20–31 sink lower and wider.
  // Stage 3 is the finisher: it rocks back onto the trailing leg, raises the blade high behind the
  // head, then drives a long overhead cut down past the knee while the front foot plants wide.
  var keys=[
    [[0,0,-23,.02,7,-27,-.80,8,-8],[.10,-2,-23.5,-.16,-6,-33,-1.10,8,-10],
     [.22,-3,-23,-.24,-10,-39,-.85,9,-12],[.32,0,-21,.18,8,-43,-1.75,14,-17],
     [.44,1,-21,.20,17,-36,-.35,13,-19],[.56,2,-20.5,.23,22,-22,.55,12,-21],
     [.70,2,-20.5,.25,23,-14,.95,12,-22],[.88,2,-20.7,.23,22,-15,.82,12,-22],
     [1,4,-20,.24,18,-20,.95,18,-16]],
    [[0,4,-20,.24,18,-20,.95,18,-16],[.12,2,-19,.30,20,-24,-.20,16,-17],
     [.24,3,-17.5,.34,23,-22,.10,21,-20],[.38,2,-16.5,.20,17,-22,.90,23,-22],
     [.50,1,-18.5,.04,-10,-25,1.80,20,-20],[.62,0,-21,-.02,-22,-27,2.70,14,-14],
     [.74,-1,-21.5,-.04,-24,-28,3.15,13,-13],[.86,-1,-21.8,0,-20,-29,3.30,12,-12],
     [1,0,-22,.04,6,-29,-.90,12,-12]],
    // GIF 20–22 contains the lift and cut; 23–30 holds the low follow-through.
    // Do not replay the first cut's long wind-up for the finisher.
    [[0,0,-22,.04,6,-29,-.90,12,-12],[.08,-2,-23,-.18,-6,-34,-1.10,10,-13],
     [.16,-4,-23.5,-.34,-10,-39,-.85,11,-15],[.23,0,-21,.18,8,-43,-2.00,16,-18],
     [.31,1,-19,.34,16,-40,-.80,19,-21],[.41,3,-18.5,.35,20,-22,.55,22,-21],
     [.51,3,-17.5,.40,17,-13,1.15,23,-22],[.92,3,-17.8,.38,17,-14,.90,23,-22],
     [1,0,-23,.025,8,-27,.70,8,-8]]
  ];
  function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
  // Thigh 12.5 plus shin 15 is all the leg there is. Keep every planted foot inside that reach, and
  // once the hips sink into a lunge push the trailing foot out until the leg is extended rather than
  // folded, which is what stops the shin from lying flat along the floor.
  var LEG_MAX=27.25, LEG_TAUT=26.9;
  function plant(x,footY,hip,extend){
    var rise=footY-hip.y,ahead=x>=hip.x?1:-1,span=Math.abs(x-hip.x);
    if(extend){
      var taut=Math.sqrt(Math.max(0,LEG_TAUT*LEG_TAUT-rise*rise));
      if(taut>span)span+=(taut-span)*extend;
    }
    return hip.x+ahead*Math.min(span,Math.sqrt(Math.max(0,LEG_MAX*LEG_MAX-rise*rise)));
  }
  function pose(stage,t){
    stage=clamp(stage|0,1,3);t=clamp(t,0,1);var list=keys[stage-1],i=0;
    while(i<list.length-2&&t>list[i+1][0])i++;
    var a=list[i],b=list[i+1],span=b[0]-a[0],raw=clamp((t-a[0])/span,0,1),u=raw*raw*(3-2*raw);
    var rate=6*raw*(1-raw)/span,leanRate=(b[3]-a[3])*rate,driveRate=(b[1]-a[1])*rate;
    var v=a.map(function(n,j){return n+(b[j]-n)*u});
    var hip={x:v[1],y:v[2]},lean=v[3];
    // Waist rotation is distinct from a forward bend; the head keeps watching the target.
    // The second slash squares the body up to the camera, so the chest broadens and the shoulders
    // swing right around rather than merely rotating a little.
    var twist=stage===2?ease(.28,.57,t)*(1-ease(.86,1,t)):0;
    var chestWidth=1+.85*twist;
    // How wide the legs are split drives the rear heel lift, so every stance reads as a lunge.
    var open=clamp((v[7]-v[8]-30)/13,0,1);
    var lunge=clamp((v[2]+21)/3.5,0,1);
    function bodyPoint(x,y){return{x:hip.x+x*Math.cos(lean)-y*Math.sin(lean),y:hip.y+x*Math.sin(lean)+y*Math.cos(lean)}}
    var hand={x:v[4],y:v[5]},shoulder=bodyPoint(3.5-15.5*twist,-9);
    // Keep armor lengths stable when a drawn reference hand lies beyond the rig's reach.
    var dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.hypot(dx,dy);
    if(d>17){hand={x:shoulder.x+dx*17/d,y:shoulder.y+dy*17/d};}
    return{stage:stage,t:t,hip:hip,lean:lean,hand:hand,shoulder:shoulder,
      neck:bodyPoint(4-3.6*twist,-8.4),chestWidth:chestWidth,twist:twist,
      rearShoulder:bodyPoint(-3+15.5*twist,-9),angle:v[6],open:open,
      viewTurn:stage===2?ease(.24,.49,t)*(1-ease(.86,1,t)):0,
      leanRate:leanRate,driveRate:driveRate,
      frontFoot:{x:plant(v[7],-4,hip,0),y:-4},
      rearFoot:{x:plant(v[8],-4-1.5*open,hip,lunge),y:-4-1.5*open},
      frontFootAngle:-.10*open*(1-.65*twist),rearFootAngle:.26*open*(1-.65*twist)};
  }
  function joint(a,b,l1,l2,bend){
    var dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.01,Math.hypot(dx,dy)),r=clamp(d,Math.abs(l1-l2)+.01,l1+l2-.01);
    var along=(l1*l1-l2*l2+r*r)/(2*r),h=Math.sqrt(Math.max(0,l1*l1-along*along));
    return{x:a.x+dx/d*along+dy/d*h*bend,y:a.y+dy/d*along-dx/d*h*bend};
  }
  function blade(p){
    var t=p.t,ignite=p.stage===3?.04:.1,visible=t>ignite&&t<.95;
    var growth=p.stage===2?ease(.10,.23,t):.25*ease(ignite,p.stage===3?.16:.22,t)+.75*ease(p.stage===3?.16:.22,p.stage===3?.31:.44,t);
    var length=(p.stage===3?57:48)*growth;
    // In the GIF the broad smear clears first; the narrow blade remains in the held pose.
    var fade=p.stage===2?.60:.72;length*=t>fade?Math.max(.08,1-ease(fade,.96,t)):1;
    var x,y;
    if(p.stage===2){var a=p.angle;x=p.hip.x+4+Math.cos(a)*length-p.hand.x;y=p.hip.y-8+Math.sin(a)*length*.15-p.hand.y;}
    else{x=Math.cos(p.angle)*length;y=Math.sin(p.angle)*length;}
    return{root:p.hand,tip:{x:p.hand.x+x,y:p.hand.y+y>-4?-4+6*Math.tanh((p.hand.y+y+4)/6):p.hand.y+y},visible:visible};
  }
  // Hand-relative contours traced from GIF 4–8 and 21–26: tip, outer controls,
  // inner controls. Both ends taper; the lower end stays at the actual saber hand.
  // A rotating ellipse could not reproduce the low, bowl-shaped follow-through.
  var smearKeys=[
    [[.30,-22,-17,-12,-35,1,-15,-7,-17,-15,-21],
     [.44,-7,-47,24,-44,43,-11,20,-17,6,-38],
     [.56,6,-55,45,-38,53,17,31,0,25,-22],
     [.70,33,-27,39,20,23,22,16,10,32,9],
     [.80,35,-2,30,20,10,7,10,1,24,11]],
    [[.21,-31,-21,-20,-37,-5,-19,-12,-15,-23,-23],
     [.41,-15,-53,20,-55,50,-20,20,-5,24,-33],
     [.51,-10,-57,45,-45,55,30,37,12,35,-25],
     [.60,40,-32,64,27,22,32,37,12,56,2],
     [.68,53,0,50,26,23,26,24,13,43,16],
     [.78,33,18,26,26,8,17,12,12,25,20]]
  ];
  function smear(p){
    if(p.stage===2)return null;
    var list=smearKeys[p.stage===3?1:0],start=list[0][0],end=p.stage===3?.82:.84;
    if(p.t<start||p.t>=end)return null;
    var i=0;while(i<list.length-2&&p.t>list[i+1][0])i++;
    var a=list[i],b=list[i+1],u=ease(a[0],b[0],p.t);
    return{points:a.slice(1).map(function(n,j){return n+(b[j+1]-n)*u}),
      alpha:ease(start,start+.02,p.t)*(1-ease(p.stage===3?.72:.73,end,p.t))};
  }
  function trail(ctx,p,reduced){
    var shape=smear(p);if(!shape)return;
    var v=shape.points.slice();
    // Bezier controls overshoot the sampled outer rim so the filled belly reaches it.
    v[2]*=1.6;v[4]*=1.6;if(v[3]>0)v[3]*=1.65;if(v[5]>0)v[5]*=1.65;
    ctx.save();ctx.translate(p.hand.x,p.hand.y);
    function crescent(scale,color,alpha){
      ctx.save();ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(v[0],v[1]);
      ctx.bezierCurveTo(v[2],v[3],v[4],v[5],0,0);
      ctx.bezierCurveTo(v[6],v[7],v[8],v[9],v[0],v[1]);
      ctx.closePath();ctx.fillStyle=color;ctx.globalAlpha*=shape.alpha*alpha;ctx.fill();ctx.restore();
    }
    if(!reduced)crescent(1.055,'#15964f',.30);
    crescent(1,'#2dc775',1);crescent(.965,'#a0f5c3',1);crescent(.91,'#f4fff9',1);
    ctx.restore();
  }
  function horizontalTrail(ctx,p,front){
    if(p.t<.23||p.t>.64)return;
    var cx=p.hip.x+4,cy=p.hip.y-8,fade=Math.min(1,(p.t-.23)/.10)*(1-ease(.45,.64,p.t));
    var radius=48,head=p.angle,span=Math.min(3.8,Math.max(.1,.8+head*2.2));
    ctx.save();ctx.beginPath();ctx.rect(cx-65,front?cy:cy-24,130,24);ctx.clip();
    function ribbon(width,color,opacity){
      ctx.beginPath();var inside=[];
      for(var i=0;i<=36;i++){var u=i/36,a=head-span*u,w=width*Math.pow(Math.sin(Math.PI*u),.6);var x=cx+radius*Math.cos(a),y=cy+radius*.15*Math.sin(a);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);inside.push({x:cx+(radius-w)*Math.cos(a),y:cy+(radius*.15-w*.32)*Math.sin(a)});}
      for(var j=inside.length-1;j>=0;j--)ctx.lineTo(inside[j].x,inside[j].y);
      ctx.closePath();ctx.fillStyle=color;ctx.globalAlpha*=opacity*fade;ctx.fill();
    }
    var alpha=ctx.globalAlpha;ribbon(11,'#30bc70',.8);ctx.globalAlpha=alpha;ribbon(8,'#9cfcc5',.95);ctx.globalAlpha=alpha;ribbon(5.5,'#f1fff7',1);ctx.restore();
  }
  function draw(ctx,o){
    var rig=g.AstraRunRig;if(!rig||!o.image||!o.image.complete||!o.image.naturalWidth)return false;
    loadTurn();var p=pose(o.stage,o.phase),img=o.image;
    // Match the redrawn idle build so the character keeps the same proportions mid-swing.
    var build=rig.build||{x:1,y:1};
    ctx.save();ctx.translate(o.x||0,o.y||0);if(o.facing<0)ctx.scale(-1,1);ctx.scale(build.x,build.y);ctx.imageSmoothingEnabled=false;
    if(p.stage===2)horizontalTrail(ctx,p,false);else trail(ctx,p,o.reducedMotion);
    function part(mask,a,b,c,d){rig.bonePart(ctx,img,{x:314,y:627},mask,a,b,c,d)}
    function leg(foot,angle){
      var knee=joint(p.hip,foot,12.5,15,1);
      part(THIGH,{x:151,y:154},{x:177,y:181},p.hip,knee);
      part(SHIN,{x:184,y:190},{x:164,y:242},knee,foot);
      ctx.save();ctx.translate(foot.x,foot.y);ctx.scale(1,build.limb||1);ctx.translate(-foot.x,-foot.y);
      rig.rigidPart(ctx,img,{x:314,y:627},FOOT,{x:164,y:242},foot,.2,angle||0);ctx.restore();
    }
    function arm(shoulder,hand){
      var elbow=joint(shoulder,hand,8,9,-1);
      rig.bonePart(ctx,img,{x:0,y:0},UPPER,{x:153,y:144},{x:139,y:164},shoulder,elbow);
      rig.rightForearm(ctx,img,elbow,hand,true);
    }
    // The lead leg is the anatomical left, which is the far side: shade it and draw it first.
    ctx.save();ctx.filter='brightness(.72)';leg(p.frontFoot,p.frontFootAngle);ctx.restore();
    // The reference keeps the off arm bent below the shoulder during the waist sweep.
    // Raising and extending that elbow instead reads as an unrelated buster aiming pose.
    // During a downward cut the reference counterbalances with the off arm pulled back.
    // Let that same guard unwind into stage two instead of changing it at the stage boundary.
    // GIF 23–30 tucks the off arm in front, unlike the first cut's rearward counterbalance.
    var finishGuard=p.stage===3?ease(.23,.41,p.t)*(1-ease(.92,1,p.t)):0;
    var guard=ease(-23,-20.5,p.hip.y)*(1-p.twist)*(1-finishGuard);
    var rearElbow={x:p.rearShoulder.x-4+7*p.twist-3*guard+8*finishGuard,y:p.rearShoulder.y+5+3*p.twist-6*guard};
    rig.bonePart(ctx,img,{x:0,y:0},UPPER,{x:153,y:144},{x:139,y:164},p.rearShoulder,rearElbow);
    rig.rigidPart(ctx,img,{x:0,y:0},CANNON,{x:202,y:164},rearElbow,.18,(1.2-p.lean-1.4*p.twist)*(1-guard)+3*guard);
    leg(p.rearFoot,p.rearFootAngle);
    // Scarf follows the cut's acceleration, then settles during the held follow-through.
    var scarfAngle=-.06+clamp(.17*p.leanRate+.05*p.driveRate,-1.15,1.15);
    rig.rigidPart(ctx,img,{x:0,y:0},SCARF,{x:165,y:123},{x:p.neck.x-3,y:p.neck.y-3.5},.2,scarfAngle);
    if(turnReady&&p.stage===2&&p.viewTurn>.20){
      // Reference: the torso opens during the horizontal sweep, but the face keeps looking at the target.
      // Only use the chest region of the turn atlas. Never draw its camera-facing helmet.
      var column=p.viewTurn>.65?1:0,scale=.047;
      ctx.save();ctx.translate(p.hip.x,p.hip.y);ctx.rotate(p.lean*(1-p.viewTurn)*.5);
      ctx.drawImage(turnAtlas,column*512,510,512,320,-256*scale,-310*scale,512*scale,320*scale);ctx.restore();
    }else{
      ctx.save();ctx.translate(p.hip.x,p.hip.y);ctx.rotate(p.lean);
      rig.rigidPart(ctx,img,{x:0,y:0},BODY,{x:161,y:183},{x:0,y:0},.2,0);ctx.restore();
    }
    rig.rigidPart(ctx,img,{x:0,y:0},HEAD,{x:181,y:141},p.neck,.2,p.lean*.12-.02);
    arm(p.shoulder,p.hand);
    if(p.stage===2)horizontalTrail(ctx,p,true);
    var b=blade(p);
    if(b.visible&&(!smear(p)||smear(p).alpha<.35)){
      ctx.save();ctx.lineCap='round';
      function line(width,color){ctx.beginPath();ctx.moveTo(b.root.x,b.root.y);ctx.quadraticCurveTo((b.root.x+b.tip.x)*.5+3*Math.sin(p.t*7),(b.root.y+b.tip.y)*.5-(p.stage===2?1.5:5)*Math.sin(p.t*Math.PI),b.tip.x,b.tip.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
      line(5,'#35d77b');line(2.4,'#f3fff9');ctx.restore();
    }
    // A small grip stays attached to the wrist throughout every sweep.
    ctx.save();ctx.translate(p.hand.x,p.hand.y);ctx.rotate(p.angle);ctx.fillStyle='#122d45';ctx.fillRect(-4,-2,6,4);ctx.fillStyle='#b8eaf1';ctx.fillRect(-3,-1,5,2);ctx.restore();
    ctx.restore();return true;
  }
  // The blade in feet-relative game pixels, already carrying the rig's build stretch, so the
  // game can hit with the edge that is actually drawn instead of a fixed box.
  function segment(stage,phase,build){
    var q=pose(stage,phase),b=blade(q),bx=(build&&build.x)||1,by=(build&&build.y)||1;
    return{root:{x:b.root.x*bx,y:b.root.y*by},tip:{x:b.tip.x*bx,y:b.tip.y*by},visible:b.visible};
  }
  // The arc the edge has travelled through, sampled back over the window the trail draws.
  function sweep(stage,phase,build,samples){
    var n=samples||9,from=Math.max(.12,phase-.34),out=[];
    for(var i=0;i<=n;i++){
      var seg=segment(stage,from+(phase-from)*(i/n),build);
      if(seg.visible)out.push(seg);
    }
    if(!out.length){var now=segment(stage,phase,build);if(now.visible)out.push(now);}
    return out;
  }
  g.AstraSaberRig={pose:pose,blade:blade,draw:draw,segment:segment,sweep:sweep,
    get turnReady(){return turnReady}};
})(typeof window!=='undefined'?window:globalThis);
