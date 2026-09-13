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
     [1,0,-23,.025,8,-27,.70,8,-8]],
    // Stage 4, the rising cut, keyed off the eleven-frame sheet. It is not part of the chain
    // and it is not a swing in place. The blade is first thrown out behind at chest height,
    // then swept down through the legs and forward along the floor as the body sinks, and the
    // launch rides a plume up two body heights. Through all of that the figure arches BACKWARD,
    // five to twenty degrees behind vertical, which is what stops the leap reading as a fall.
    // The last two columns are the extra this one motion needs: spin turns the whole figure
    // about its hip, and lift pulls the feet up off the floor of its own box.
    // The angle column carries the flame the long way round - out behind at 3.05, down through
    // the front, and up to a shade past vertical - so the sweep never jumps across the body.
    // time hipX hipY lean handX handY  angle  foot+ foot-  spin  lift
    [[0,     0, -21,  .12,   2, -22,  2.20,   9,  -9,    0,   0],
     [.035, -1, -20, -.10, -10, -27,  3.05,  10, -10,  -.07,  0],
     [.085,  2, -15,  .30,  17, -11,   .20,  14, -12,   .05,  0],
     [.14,   3, -18,  .10,  20, -20,  -.66,   9,  -8,  -.08,  2],
     [.26,   3, -21, -.02,  19, -26,  -.71,   8,  -7,  -.13,  3],
     [.46,   3, -22, -.08,  18, -32,  -.71,   7,  -6,  -.21,  3],
     [.67,   3, -22, -.06,  18, -34,  -.73,   7,  -6,  -.17,  2],
     [.85,   2, -21, -.12,  16, -31,  -.50,   8,  -6,  -.24,  2],
     [1,     0, -22,  .02,   8, -30, -1.60,   8,  -8,  -.10,  0]],
    // Stage 5 is not an attack. It is the ride down: the sheet's last three frames snap the
    // arms wide as the plume tears off, then hold a short blade overhead all the way to the
    // floor. It runs on its own clock once the rising cut's own span has run out.
    [[0,    0, -20, -.02,   2, -34, -1.71,  11, -11,  -.14,  1],
     [.45,  0, -21, -.10,   0, -33, -2.18,   9,  -9,  -.20,  0],
     [1,    1, -21,  .02,   3, -32, -1.36,   8,  -8,  -.08,  0]],
    // Stage 6 is the charged thrust, keyed off the thirty-frame sheet. It is let go from a hold, not
    // chained, so it starts and ends on the standing pose. The body leans in and the arm comes forward
    // while the light forms ahead of the fist (row one, last two frames), then it steps into a long low
    // lunge and drives the arm out level (row two), holds that lunge while the lance is out and while it
    // breaks up (rows three and four), then straightens (row five). The angle column only turns the
    // grip: the light always runs level, straight ahead of the fist.
    // time hipX  hipY  lean handX handY angle foot+ foot-
    [[0,     0, -23,   .02,   7, -27,  -.80,   8,  -8],
     [.08,   1, -21.5,  .14,  13, -25,   0,    12, -11],
     [.14,   2, -20,   .22,  17, -24,   0,    15, -15],
     [.22,   3, -18.5, .30,  20, -22,   0,    19, -19],
     [.36,   4, -17,   .38,  25, -21,   0,    22, -22],
     [.62,   4, -17,   .38,  25, -21,   0,    22, -22],
     [.80,   3, -18,   .32,  22, -22,   0,    21, -21],
     [.90,   1, -21,   .12,  12, -25,  -.40,  13, -13],
     [1,     0, -23,   .02,   7, -27,  -.80,   8,  -8]]
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
    stage=clamp(stage|0,1,6);t=clamp(t,0,1);var list=keys[stage-1],i=0;
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
      spin:v[9]||0,lift:v[10]||0,
      frontFoot:{x:plant(v[7],-4-(v[10]||0),hip,0),y:-4-(v[10]||0)},
      rearFoot:{x:plant(v[8],-4-1.5*open-(v[10]||0),hip,lunge),y:-4-1.5*open-(v[10]||0)},
      frontFootAngle:-.10*open*(1-.65*twist),rearFootAngle:.26*open*(1-.65*twist)};
  }
  // Where a point on the figure ends up once the whole thing has turned about its hip. Only
  // the rising cut uses this; every other motion keeps its feet under it and spins nothing.
  function spun(p,pt){
    if(!p.spin)return pt;
    var c=Math.cos(p.spin),s=Math.sin(p.spin),dx=pt.x-p.hip.x,dy=pt.y-p.hip.y;
    return{x:p.hip.x+dx*c-dy*s,y:p.hip.y+dx*s+dy*c};
  }
  function joint(a,b,l1,l2,bend){
    var dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.01,Math.hypot(dx,dy)),r=clamp(d,Math.abs(l1-l2)+.01,l1+l2-.01);
    var along=(l1*l1-l2*l2+r*r)/(2*r),h=Math.sqrt(Math.max(0,l1*l1-along*along));
    return{x:a.x+dx/d*along+dy/d*h*bend,y:a.y+dy/d*along-dx/d*h*bend};
  }
  // The flame. One axis, three lives: the crescent thrown out behind during the windup, the
  // low pass along the floor at the bottom of the crouch, and the plume that carries the leap.
  // The sheet's plume runs about one and a third body heights long and one and a tenth wide;
  // the windup crescent is three quarters long and half as wide; the floor pass sits between.
  function plume(p){
    // the ride down keeps a short blade of the same flame overhead
    if(p.stage===5){
      // full from the first frame: stage four hands over a blade already lit, and easing
      // this one up from nothing put a gap between the two
      var held=1-ease(.86,1,p.t);
      if(held<=.02)return null;
      return{root:spun(p,p.hand),angle:p.angle,length:26,width:8,alpha:.90*held};
    }
    if(p.stage!==4)return null;
    var grow=ease(.08,.16,p.t),die=1-ease(.86,.94,p.t),body=grow*die;
    var sweep=ease(.045,.080,p.t)*(1-ease(.10,.145,p.t));
    var wind=ease(.006,.028,p.t)*(1-ease(.045,.070,p.t));
    // longest as it erupts, settling back over the rise, the way the sheet's does
    var surge=1+.24*(1-ease(.16,.44,p.t));
    // what the plume collapses into, which is what the ride down carries on holding
    var held=ease(.87,.95,p.t);
    if(body<=.01&&sweep<=.01&&wind<=.01&&held<=.01)return null;
    // past the top it lets go of the wrist and keeps going up on its own momentum while the
    // body begins to fall, which is what the sheet's tear-off frame shows
    var tear=ease(.76,.94,p.t)*(1-held),root=spun(p,p.hand);
    if(tear>.01)root={x:root.x-5*tear,y:root.y-26*tear};
    return{root:root,angle:p.angle,
      // The solid mass is stubby - about one and a third body heights long against four
      // fifths wide - and the wisps and embers are what carry the measured extent out to the
      // reference's 1.9. Setting the band itself to that length made a missile.
      length:13+72*body*surge+30*sweep+30*wind+13*held,width:7+36*body+11*sweep+8*wind,
      alpha:Math.min(1,body*1.25+sweep+wind+.90*held)};
  }
  function blade(p){
    var t=p.t,ignite=p.stage===3?.04:.1,visible=t>ignite&&t<.95;
    var growth=p.stage===2?ease(.10,.23,t):.25*ease(ignite,p.stage===3?.16:.22,t)+.75*ease(p.stage===3?.16:.22,p.stage===3?.31:.44,t);
    var length=(p.stage===4?53:p.stage===3?57:48)*growth;
    // In the GIF the broad smear clears first; the narrow blade remains in the held pose.
    var fade=p.stage===2?.60:.72;length*=t>fade?Math.max(.08,1-ease(fade,.96,t)):1;
    var x,y;
    if(p.stage===2){var a=p.angle;x=p.hip.x+4+Math.cos(a)*length-p.hand.x;y=p.hip.y-8+Math.sin(a)*length*.15-p.hand.y;}
    else{x=Math.cos(p.angle)*length;y=Math.sin(p.angle)*length;}
    if(p.stage===6){
      var fx=thrustFx(p),grip={x:p.hand.x,y:p.hand.y};
      if(fx.orb)return{root:grip,tip:{x:fx.orb.x+fx.orb.rx,y:p.hand.y},visible:true};
      // the lance only cuts while it is whole; its dashes are a picture of it going
      if(fx.lance&&fx.lance.broken<.5)return{root:grip,tip:{x:fx.lance.x+fx.lance.len,y:p.hand.y},visible:true};
      return{root:grip,tip:grip,visible:false};
    }
    if(p.stage>=4){
      var f=plume(p);
      if(!f)return{root:spun(p,p.hand),tip:spun(p,p.hand),visible:false};
      return{root:f.root,tip:{x:f.root.x+Math.cos(f.angle)*f.length,y:f.root.y+Math.sin(f.angle)*f.length},visible:true};
    }
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
     [.78,33,18,26,26,8,17,12,12,25,20]],
    // The rising cut, which travels the arc the other way: off the floor behind the heel,
    // forward through the waist, and up to full stretch overhead.
    [[.18,2,26,20,22,16,2,5,9,12,19],
     [.30,28,14,36,-4,28,-26,15,-3,28,-6],
     [.42,36,-20,32,-42,13,-50,13,-17,28,-34],
     [.54,15,-48,-3,-55,-17,-42,-2,-23,7,-46],
     [.66,-5,-46,-23,-36,-24,-19,-11,-17,-15,-34]]
  ];
  function smear(p){
    if(p.stage===2||p.stage===6)return null;
    var list=smearKeys[p.stage===4?2:p.stage===3?1:0],start=list[0][0],
        end=p.stage===4?.76:p.stage===3?.82:.84,
        from=p.stage===4?.64:p.stage===3?.72:.73;
    if(p.t<start||p.t>=end)return null;
    var i=0;while(i<list.length-2&&p.t>list[i+1][0])i++;
    var a=list[i],b=list[i+1],u=ease(a[0],b[0],p.t);
    return{points:a.slice(1).map(function(n,j){return n+(b[j+1]-n)*u}),
      alpha:ease(start,start+.02,p.t)*(1-ease(from,end,p.t))};
  }
  // The flame, drawn as nested tongues along its own axis: a dark rim, orange body, amber
  // heart and a white core, the way the reference's plume is banded. Behind the figure it is
  // only a glow; in front it is the whole shape, because it swallows the arm.
  // The reference's fire, measured off the GIF frame by frame: 1.9 body heights along its axis
  // and 0.8 across, forty degrees off vertical, re-forming on an eight frame loop, and by
  // colour share sixty eight per cent white and yellow against three per cent red.
  //
  // It is a hand-drawn pixel raster, and that is the part that matters. Nine attempts at
  // stacking smooth filled shapes could be put on every one of those numbers and still came
  // out a smooth oval with concentric bands, because that is what filled shapes make. So the
  // fire is generated in the same medium: a pixel field, thresholded and quantised, blitted
  // with smoothing off.
  //
  // Its outline is lopsided, and it took three tries to measure it cleanly. Warm-pixel masks counted
  // the reference hero's red armour and gold hair as fire - they share nothing with the fire's own
  // palette but are just as warm - which moved both the shape and the colour far enough to fit this to
  // the wrong target, including a bulge on the trailing edge a third of the way along that the
  // reference does not have. Measured on the fire's own colours along its own axis: the trailing edge
  // is at its widest right at the hand, where dark red fire hangs below it, and tapers from there;
  // the leading edge starts narrow, is near full width within a fifth of the length, and eases off
  // toward a rounded tip. One symmetric profile drew a smooth leaf.
  // Half widths from the axis, base to tip.
  var FIRE_UP=[[0,.27],[.05,.31],[.15,.91],[.25,.94],[.35,.82],[.45,.84],[.55,.73],[.65,.65],[.75,.63],[.85,.61],[.95,.44],[.985,.36],[1,.10]];
  var FIRE_DN=[[0,.53],[.05,.61],[.15,1.00],[.25,.60],[.35,.84],[.45,.68],[.55,.70],[.65,.64],[.75,.71],[.85,.74],[.95,.76],[.985,.60],[1,.20]];
  function fireLerp(tab,u){
    for(var i=0;i<tab.length-1;i++){
      var a=tab[i],b=tab[i+1];
      if(u<=b[0])return a[1]+(b[1]-a[1])*((u-a[0])/(b[0]-a[0]||1));
    }
    return tab[tab.length-1][1];
  }
  // One side's half width: a negative side is the leading edge, a positive one the trailing.
  function fireSide(u,side){return fireLerp(side<0?FIRE_UP:FIRE_DN,u);}
  // The mean of the two sides, which is what sizes the field.
  function fireHalf(u){return .5*(fireLerp(FIRE_UP,u)+fireLerp(FIRE_DN,u));}
  // The fire's own nine colours, coolest first, with nothing between them. An earlier ladder was
  // read off every warm pixel in the GIF, and so took three of the hero's colours for fire: his
  // white armour #f0f0f0, his gold hair #e8c838 and his red armour #f01000. The fire uses none of
  // them. Its real hottest value is a lavender white, #f8f0f8, and that is the most common colour
  // in the whole plume - a quarter of it. Read this time as the colours that turn up in the rising
  // frames but never on the hero standing still.
  // s is the temperature at which each one takes over, set at the quantiles of the fitted heat so each
  // colour covers its measured share of the plume.
  var FIRE=[
    {c:'#981810',s:0},
    {c:'#c81810',s:.097},
    {c:'#e82810',s:.385},
    {c:'#f05818',s:.637},
    {c:'#f88818',s:.932},
    {c:'#f8d828',s:1.382},
    {c:'#f8f040',s:1.7},
    {c:'#f8f8b8',s:1.828},
    {c:'#f8f0f8',s:2.178}
  ];
  // Deterministic, so the field holds still for as long as the churn step lasts. Random per
  // draw call would strobe at sixty frames a second.
  function fireHash(a,b){var x=Math.sin(a*127.1+b*311.7+1.3)*43758.5453;return x-Math.floor(x);}
  // Value noise on a coarse lattice, smoothly interpolated: this is what breaks the fire into
  // blotches and holes instead of bands.
  function fireNoise(x,y,step,scale){
    var gx=x/scale,gy=y/scale,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    var a=fireHash(ix*1.7+iy*97.3,step),b=fireHash((ix+1)*1.7+iy*97.3,step),
        c=fireHash(ix*1.7+(iy+1)*97.3,step),d=fireHash((ix+1)*1.7+(iy+1)*97.3,step);
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  // Every number that shapes the fire's temperature, in one place, so it can be fitted against the
  // reference without touching the code that draws it.
  //   base, gain, reach, curve  along the axis: base + gain * min(1, u*reach)^curve
  //   lead, edge                hotter toward the leading edge, cooler out at either edge
  //   rim, rimPow               how the outermost sliver cools
  //   grain                     how far the noise swings the heat either way
  //   cut                       the floor: anything colder is drawn in the coldest red
  // Fitted, not tuned by eye: a small search drove these against the reference's colour placement in
  // each fifth of its length and on each side of its far half, holding every fifth's lit area within
  // a tenth of what it was so the outline did not shift underneath. The old curve rose from .52 at the
  // hand to .94 at the tip, far too gently, and the fire came out yellow at the hand where the
  // reference is two thirds red and dark red. It now starts cold and climbs steeply.
  var FIRE_HEAT={base:.222,gain:2.007,reach:3.158,curve:1.878,lead:.701,edge:.044,rim:.34,rimPow:5,grain:.436,cut:.095};
  // How hot one cell of the fire is, or -1 where there is no fire at all. Pulled out of the
  // bake so the colour share it produces can be counted without a canvas.
  //   px,y  cell position in the plume's frame, y negative toward the leading edge
  //   u     how far along the axis, 0 at the hand
  //   hw    the fire's half width at that u
  // The full plume's length, which a flame's size is measured against.
  var FIRE_FULL=85;
  //   size  how big this flame is against the full plume, 1 when omitted. A short flame gets less of
  //         the heat ramp, so it stays yellow and orange instead of cramming the whole ramp into a few
  //         pixels and coming out white.
  function fireHeat(px,y,u,hw,step,size){
    if(hw<.6)return -1;
    // Each side is measured against its own edge, so the leading side billows and the trailing
    // side tears. hw is the mean half width, so this rescales it to the side the cell is on.
    var uc=Math.max(0,Math.min(1,u)),mean=Math.max(.05,fireHalf(uc)),
        side=hw*fireSide(uc,y)/mean;
    // Both edges tear, the trailing one far harder. Measured at fine resolution against the
    // reference, at 1.10 the lower tongues stood half as tall again as its tongues - spiky rather
    // than ragged - while the upper edge, with no tear of its own at all, was two and a half times
    // too smooth: a ruled line where the reference has small broken bumps.
    if(y>0)side*=1+.85*(fireNoise(px*.9+300,uc*40,step+13,4.5)-.5);
    else side*=1+.34*(fireNoise(px*1.3+700,uc*40,step+29,3.2)-.5);
    if(side<.6)return -1;
    var v=y/side;
    if(v<-1.25||v>1.25)return -1;
    var H=FIRE_HEAT;
    // hot toward the tip and the leading edge, cold at the root and the trailing edge
    var heat=H.base+H.gain*(size===undefined?1:size)*Math.pow(Math.min(1,Math.max(0,uc*H.reach)),H.curve)-H.lead*v-H.edge*Math.abs(v);
    // only the outermost sliver is cooled, so the red reads as an outline and not a band
    heat*=1-H.rim*Math.pow(Math.min(1.25,Math.abs(v)),H.rimPow);
    // two octaves: big blotches, then a fine grain that tears the edge
    var n=.62*fireNoise(px,y,step,6.5)+.38*fireNoise(px*1.7+40,y*1.7,step+31,2.6);
    heat=heat*(1-H.grain+2*H.grain*n);
    // Too cold to glow is not the same as no fire. Cutting these cells away let the heat decide the
    // outline as well as the colour, so every colour fit moved the silhouette, and the dark red that
    // hangs below the reference's hand could never be drawn: that side runs coldest and was removed.
    // The outline now comes from the edge tables and their tears alone.
    if(heat<=H.cut)heat=H.cut;
    // a few holes punched clean through. At game size too many of these read as speckle
    // against the factory rather than as fire, so the cut sits low.
    // They stay out of the cream and lavender cells: peppered through the palest part they show the
    // factory behind and read as dirt at game size, and the reference's holes sit in its cooler body.
    if(heat<FIRE[7].s&&fireNoise(px*2.6+11,y*2.6,step+77,3.2)<.16)return -1;
    return heat;
  }
  // Which of the nine values a heat lands on.
  function fireBand(heat){
    for(var q=FIRE.length-1;q>=0;q--)if(heat>=FIRE[q].s)return q;
    return 0;
  }
  var fireCache={key:'',canvas:null,ox:0,oy:0};
  // Bakes one churn step of the fire into an offscreen canvas, in the plume's own frame: x runs
  // along the axis from the hand, y across it, negative toward the leading edge.
  // The size of the offscreen field one churn step of the fire is baked into.
  function fireField(len,wide){
    var half=Math.ceil(wide*.5*2.60)+7;
    return{half:half,W:Math.ceil(len)+12,H:half*2+2};
  }
  // Every lit cell of one churn step. fn gets the cell's column and row in the field, its top-left corner
  // in the plume's own frame (x along the axis from the hand, y across it, negative toward the leading
  // edge) and its heat. The bake paints exactly these cells and the hit shape is measured against exactly
  // these cells, so the picture and the reach cannot drift apart.
  function forEachFireCell(len,wide,step,fn){
    var size=Math.sqrt(Math.max(.3,Math.min(1,len/FIRE_FULL))),F=fireField(len,wide);
    for(var px=0;px<F.W;px++){
      var u=(px-4)/Math.max(1,len);
      if(u<-.05||u>1.06)continue;
      var hw=wide*.5*fireHalf(Math.max(0,Math.min(1,u)));
      if(hw<.6)continue;
      for(var py=0;py<F.H;py++){
        var y=py-F.half-1,heat=fireHeat(px,y,u,hw,step,size);
        if(heat<0)continue;
        fn(px,py,px-4,y,heat);
      }
    }
  }
  function bakeFire(len,wide,step,reduced){
    var key=len+'x'+wide+'@'+step+(reduced?'r':'');
    if(fireCache.key===key)return fireCache;
    var F=fireField(len,wide),W=F.W,H=F.H;
    var cv=(typeof document!=='undefined')?document.createElement('canvas'):null;
    if(!cv)return null;
    cv.width=W;cv.height=H;
    var c=cv.getContext('2d'),img=c.createImageData(W,H),d=img.data;
    var rgb=FIRE.map(function(b){var n=parseInt(b.c.slice(1),16);
      return [(n>>16)&255,(n>>8)&255,n&255];});
    forEachFireCell(len,wide,step,function(px,py,x,y,heat){
      var k=fireBand(heat),o=(py*W+px)*4;
      d[o]=rgb[k][0];d[o+1]=rgb[k][1];d[o+2]=rgb[k][2];d[o+3]=255;
    });
    c.putImageData(img,0,0);
    fireCache={key:key,canvas:cv,ox:-4,oy:-(F.half+1)};
    return fireCache;
  }
  // The rising cut's flame counts as out, for hitting, once it is this opaque. Below it the flame is only
  // fading in or out.
  var FIRE_BITES_FROM=.35;
  // How far out the lit cells reach, as a multiple of the edge tables: fireHeat keeps cells to a quarter
  // past each table edge, and the torn edges swing either side of that.
  var FIRE_REACH=1.25;
  // How many slices across the flame make up its hit shape.
  var FIRE_SLICES=16;
  // The flame's lit cells as drawn at this moment of a stage: cell centres in feet-relative game pixels
  // with the build stretch applied, facing right. For checking the hit shape against the picture.
  function fireCells(stage,phase,build,reduced){
    var q=pose(stage,phase),f=(stage===4||stage===5)?plume(q):null,out=[];
    if(!f||f.alpha<FIRE_BITES_FROM)return out;
    var len=Math.round(f.length),wide=Math.round(f.width),step=reduced?0:Math.floor(q.t*34)%8;
    var bx=(build&&build.x)||1,by=(build&&build.y)||1,c=Math.cos(f.angle),s=Math.sin(f.angle);
    forEachFireCell(len,wide,step,function(px,py,x,y){
      var cx=x+.5,cy=y+.5;
      out.push({x:(f.root.x+cx*c-cy*s)*bx,y:(f.root.y+cx*s+cy*c)*by});
    });
    return out;
  }
  // The flame's outline as hit segments: slices across it from the leading edge to the trailing edge, both
  // edges joined up, and the axis, all read off the same edge tables the bake draws from. Feet-relative
  // game pixels with the build stretch applied, facing right, like segment(). The torn edges, holes and
  // drips are left out: they re-form every few frames, and a hit shape that flickered with them would miss
  // things the flame plainly covers. reach overrides FIRE_REACH, for measuring.
  function fireSlices(stage,phase,build,reach){
    var q=pose(stage,phase),f=(stage===4||stage===5)?plume(q):null,out=[];
    if(!f||f.alpha<FIRE_BITES_FROM)return out;
    var r=reach===undefined?FIRE_REACH:reach,len=Math.round(f.length),w=Math.round(f.width)*.5*r;
    var bx=(build&&build.x)||1,by=(build&&build.y)||1,c=Math.cos(f.angle),s=Math.sin(f.angle);
    function at(x,y){return{x:(f.root.x+x*c-y*s)*bx,y:(f.root.y+x*s+y*c)*by};}
    function lead(u){return at(u*len,-w*fireSide(u,-1));}
    function trail(u){return at(u*len,w*fireSide(u,1));}
    out.push({a:at(0,0),b:at(len,0)});
    for(var k=0;k<=FIRE_SLICES;k++){
      var u=k/FIRE_SLICES;
      out.push({a:lead(u),b:trail(u)});
      if(k<FIRE_SLICES){var v=(k+1)/FIRE_SLICES;out.push({a:lead(u),b:lead(v)});out.push({a:trail(u),b:trail(v)});}
    }
    return out;
  }
  function drawPlume(ctx,p,reduced){
    var f=plume(p);if(!f)return;
    var churn=reduced?0:Math.floor(p.t*34)%8;
    var baked=bakeFire(Math.round(f.length),Math.round(f.width),churn,reduced);
    if(!baked||!baked.canvas)return;
    ctx.save();ctx.translate(f.root.x,f.root.y);ctx.rotate(f.angle);
    ctx.globalAlpha=Math.min(1,ctx.globalAlpha*f.alpha);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(baked.canvas,baked.ox,baked.oy);
    // Loose drips and embers. The reference sheds about twelve per frame, most of them off its
    // trailing edge; seven scattered evenly on both sides read as sparks, not as fire falling apart.
    if(!reduced){
      var DRIP=['#c81810','#e82810','#f05818','#f88818'];
      for(var e=0;e<12;e++){
        var e1=fireHash(e*13.1,churn),e2=fireHash(e*17.7+80,churn),e3=fireHash(e*5.3+160,churn);
        var trailing=e%4!==3,uu=.18+.74*e1,
            edge=f.width*.5*fireSide(uu,trailing?1:-1);
        ctx.fillStyle=DRIP[Math.floor(e3*DRIP.length)];
        ctx.fillRect(Math.round(f.length*uu),
                     Math.round(trailing?edge*(1.05+.55*e2):-edge*(1.05+.35*e2)),
                     1+Math.round(e3),1+Math.round(2*e2));
      }
    }
    ctx.restore();
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
  // The thrust's light, read off the sheet frame by frame. Row one ends with a small light forming in
  // the drawn-back fist. Row two: it swells into an egg at the fist, is driven out ahead as a round orb,
  // flashes hollow, then forms again at the fist and stretches. Row three is the lance - a little over
  // two body heights, a white core in blue, thickest in a bulge that runs out along it, a bright knot at
  // the fist and a sharp point. Row four thins it and breaks it into dashes where it stands, nearest the
  // fist first. Row five has no light at all. Positions are in the rig's own pixels.
  var THRUST_LANCE=90;
  // the scarf's angle while the lunge streams it straight back, the way the sheet's hair flies out behind
  var THRUST_SCARF=-.16;
  // dark rim, blue, pale blue, white
  var THRUST_INK=['#2058d8','#40a0f8','#a8d8f8','#f8f8f8'];
  function thrustFx(p){
    var t=p.t,h=p.hand,out={orb:null,lance:null,arcs:0};
    if(t<.12){
      var r=1.5+3.5*ease(0,.10,t);
      out.orb={x:h.x+r*.9,y:h.y,rx:r,ry:r,ring:false};out.arcs=ease(.05,.12,t);
    }else if(t<.19){
      var g1=ease(.12,.19,t),ex=5+4*g1;
      out.orb={x:h.x+ex*.8,y:h.y,rx:ex,ry:5+1.5*g1,ring:false};out.arcs=1;
    }else if(t<.25){
      out.orb={x:h.x+9+8*ease(.19,.25,t),y:h.y,rx:8,ry:8,ring:false};out.arcs=.6;
    }else if(t<.29){
      out.orb={x:h.x+20,y:h.y,rx:8.5,ry:8.5,ring:true};out.arcs=.3;
    }else if(t<.36){
      var g3=ease(.32,.36,t),sx=6+8*g3;
      out.orb={x:h.x+sx*.85,y:h.y,rx:sx,ry:4-1.5*g3,ring:false};out.arcs=1-g3;
    }else if(t<.80){
      var grow=ease(.36,.41,t),thin=ease(.62,.70,t);
      out.lance={x:h.x+2,len:THRUST_LANCE*(.3+.7*grow),thick:2.2-1.1*thin,
        pulse:.10+.75*ease(.37,.62,t),broken:ease(.66,.80,t)};
      out.arcs=.5*(1-ease(.36,.46,t));
    }
    return out;
  }
  // A pixel ellipse built from columns, the way the sheet's orb is drawn: dark rim, blue, pale band,
  // white heart. The hollow frame keeps a white ring round a pale inside.
  function pixelOrb(ctx,o,hollow){
    var layers=hollow?[[1,THRUST_INK[0]],[0,THRUST_INK[3]],[-1.6,THRUST_INK[2]]]
                     :[[1,THRUST_INK[0]],[0,THRUST_INK[1]],[-1,THRUST_INK[2]],[-2.2,THRUST_INK[3]]];
    var cx=Math.round(o.x),cy=Math.round(o.y);
    for(var L=0;L<layers.length;L++){
      var rx=o.rx+layers[L][0],ry=o.ry+layers[L][0];if(rx<.5||ry<.5)continue;
      ctx.fillStyle=layers[L][1];
      for(var dx=-Math.ceil(rx);dx<=Math.ceil(rx);dx++){
        var q=1-(dx/rx)*(dx/rx);if(q<=0)continue;
        var hy=Math.round(ry*Math.sqrt(q));ctx.fillRect(cx+dx,cy-hy,1,hy*2+1);
      }
    }
  }
  // The lance, one column at a time, as nested bands about the axis. It is bright, as the sheet's is: a
  // one-pixel dark rim, blue only where it bulges, a pale band, and everything inside that white.
  function pixelLance(ctx,l,y,reduced){
    var x0=Math.round(l.x),n=Math.round(l.len),yc=Math.round(y),pulse=reduced?.3:l.pulse;
    for(var i=0;i<=n;i++){
      var u=i/Math.max(1,n);
      if(l.broken>0){
        if(u<l.broken*.5)continue;
        if(i%9>=9*(1-.8*l.broken))continue;
      }
      var half=l.thick*Math.min(1,.45+u*14)*(u>.72?Math.max(.18,1-(u-.72)/.28):1)
              +1.5*Math.exp(-Math.pow((u-pulse)/.07,2))*(1-l.broken);
      var hh=Math.round(half),x=x0+i;
      if(hh<=0){ctx.fillStyle=THRUST_INK[1];ctx.fillRect(x,yc,1,1);continue;}
      ctx.fillStyle=THRUST_INK[0];ctx.fillRect(x,yc-hh,1,hh*2+1);
      var e=hh-1;
      if(hh>=3){ctx.fillStyle=THRUST_INK[1];ctx.fillRect(x,yc-e,1,e*2+1);e--;}
      if(e>=0){ctx.fillStyle=THRUST_INK[2];ctx.fillRect(x,yc-e,1,e*2+1);e--;}
      if(e>=0){ctx.fillStyle=THRUST_INK[3];ctx.fillRect(x,yc-e,1,e*2+1);}
    }
  }
  // Lightning, one pixel at a time: a few short zigzags off the light, back along the arm toward the
  // shoulder and out around the orb, re-drawn every few frames.
  function thrustArcs(ctx,p,fx){
    var step=Math.floor(p.t*45),h=p.hand,s=p.shoulder,n=Math.max(1,Math.round(4*Math.min(1,fx.arcs)));
    for(var k=0;k<n;k++){
      var a=fireHash(k*7.1,step),b=fireHash(k*3.3+50,step);
      var x0=fx.orb?fx.orb.x+fx.orb.rx*(.2*a-.4):h.x+3,y0=h.y+(b-.5)*(fx.orb?fx.orb.ry*1.8:5);
      var x1=k<2?s.x-1+5*b:x0-7-9*a,y1=k<2?s.y+(a-.5)*8:y0+(b-.5)*13;
      var px=x0,py=y0;ctx.fillStyle=k%2?THRUST_INK[2]:THRUST_INK[1];
      for(var j=1;j<=4;j++){
        var u=j/4,off=j===4?0:(fireHash(k*11+j,step)-.5)*5,qx=x0+(x1-x0)*u,qy=y0+(y1-y0)*u+off,
            m=Math.max(1,Math.round(Math.hypot(qx-px,qy-py)));
        for(var e=0;e<=m;e++)ctx.fillRect(Math.round(px+(qx-px)*e/m),Math.round(py+(qy-py)*e/m),1,1);
        px=qx;py=qy;
      }
    }
  }
  function drawThrust(ctx,p,reduced){
    var fx=thrustFx(p);
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(!reduced&&fx.arcs>.02)thrustArcs(ctx,p,fx);
    if(fx.orb)pixelOrb(ctx,fx.orb,fx.orb.ring);
    if(fx.lance){
      pixelLance(ctx,fx.lance,p.hand.y,reduced);
      if(fx.lance.broken<.35)pixelOrb(ctx,{x:p.hand.x+2,y:p.hand.y,rx:2.6,ry:2.6},false);
    }
    ctx.restore();
  }
  function draw(ctx,o){
    var rig=g.AstraRunRig;if(!rig||!o.image||!o.image.complete||!o.image.naturalWidth)return false;
    loadTurn();var p=pose(o.stage,o.phase),img=o.image;
    // Match the redrawn idle build so the character keeps the same proportions mid-swing.
    var build=rig.build||{x:1,y:1};
    ctx.save();ctx.translate(o.x||0,o.y||0);if(o.facing<0)ctx.scale(-1,1);ctx.scale(build.x,build.y);ctx.imageSmoothingEnabled=false;
    var spin=p.spin||0;
    if(p.stage===4||p.stage===5)drawPlume(ctx,p,o.reducedMotion);
    else if(p.stage===2)horizontalTrail(ctx,p,false);else if(p.stage!==6)trail(ctx,p,o.reducedMotion);
    // The rising cut turns the whole figure about its hip; the flame is drawn outside that turn
    // because its angle was measured against the world, not against the body.
    if(spin){ctx.save();ctx.translate(p.hip.x,p.hip.y);ctx.rotate(spin);ctx.translate(-p.hip.x,-p.hip.y);}
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
    // The sheet snaps both arms wide the instant the plume tears off, then draws them back in.
    var fling=p.stage===5?(1-ease(0,.42,p.t)):0;
    var rearElbow={x:p.rearShoulder.x-4+7*p.twist-3*guard+8*finishGuard-9*fling,
                   y:p.rearShoulder.y+5+3*p.twist-6*guard-7*fling};
    rig.bonePart(ctx,img,{x:0,y:0},UPPER,{x:153,y:144},{x:139,y:164},p.rearShoulder,rearElbow);
    rig.rigidPart(ctx,img,{x:0,y:0},CANNON,{x:202,y:164},rearElbow,.18,(1.2-p.lean-1.4*p.twist)*(1-guard)+3*guard);
    leg(p.rearFoot,p.rearFootAngle);
    // Scarf follows the cut's acceleration, then settles during the held follow-through.
    var scarfAngle=-.06+clamp(.17*p.leanRate+.05*p.driveRate,-1.15,1.15);
    // The thrust's lunge is one long drive forward, and reading the scarf off its rates flicked it bolt
    // upright, at the start and again on the way back up. The sheet's hair streams straight back for as
    // long as the arm is out, so the thrust never reads the rates: it eases from rest to streaming and home.
    if(p.stage===6){var streaming=ease(0,.20,p.t)*(1-ease(.80,.97,p.t));scarfAngle=-.06*(1-streaming)+THRUST_SCARF*streaming;}
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
    // the thrust's light is in front of the fist and the arm, as it is on the sheet
    if(p.stage===6)drawThrust(ctx,p,o.reducedMotion);
    if(spin)ctx.restore();
    var b=blade(p);
    // The rising cut and the ride down carry fire, already drawn behind the figure; only the
    // three chained swings draw a struck edge here.
    if(p.stage<4&&b.visible&&(!smear(p)||smear(p).alpha<.35)){
      ctx.save();ctx.lineCap='round';
      function line(width,color){ctx.beginPath();ctx.moveTo(b.root.x,b.root.y);ctx.quadraticCurveTo((b.root.x+b.tip.x)*.5+3*Math.sin(p.t*7),(b.root.y+b.tip.y)*.5-(p.stage===2?1.5:5)*Math.sin(p.t*Math.PI),b.tip.x,b.tip.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
      line(5,'#35d77b');line(2.4,'#f3fff9');ctx.restore();
    }
    // A small grip stays attached to the wrist throughout every sweep.
    var grip=spin?spun(p,p.hand):p.hand;
    ctx.save();ctx.translate(grip.x,grip.y);ctx.rotate(p.angle+spin);ctx.fillStyle='#122d45';ctx.fillRect(-4,-2,6,4);ctx.fillStyle='#b8eaf1';ctx.fillRect(-3,-1,5,2);ctx.restore();
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
    fire:FIRE,fireHash:fireHash,fireHalf:fireHalf,fireSide:fireSide,fireNoise:fireNoise,
    fireHeat:fireHeat,fireBand:fireBand,fireTune:FIRE_HEAT,thrust:thrustFx,
    plume:plume,fireCells:fireCells,fireSlices:fireSlices,
    get turnReady(){return turnReady}};
})(typeof window!=='undefined'?window:globalThis);
