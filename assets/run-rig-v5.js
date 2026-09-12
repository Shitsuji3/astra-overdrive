(function (g) {
  'use strict';
  var TAU=Math.PI*2, SCALE=.2, EXTENT=16.245;
  var BODY=[[0,0],[314,0],[314,140],[205,140],[205,185],[160,185],[160,126],[0,126]];
  var ARM=[[142,126],[160,124],[173,137],[171,151],[154,161],[142,170],[137,189],[126,204],[108,207],[99,195],[100,180],[109,157],[121,143],[132,143]];
  var THIGH=[[146,145],[163,148],[178,158],[187,172],[187,184],[176,193],[166,187],[148,177],[137,166],[137,153]];
  var SHIN=[[180,179],[195,183],[197,196],[187,211],[185,232],[177,244],[146,246],[141,235],[145,219],[150,206],[163,199],[174,197]];
  var FOOT=[[146,235],[164,237],[174,237],[183,242],[199,248],[200,261],[137,262],[132,255],[136,244]];
  var CANNON=[[206,147],[218,144],[248,146],[273,155],[278,178],[254,188],[221,188],[207,178],[198,165]];
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function smooth(t){return t*t*(3-2*t);}
  function rigidPart(ctx,img,origin,mask,sourcePivot,destPivot,scale,angle){
    if(!img||!img.complete||!img.naturalWidth)return;
    ctx.save();ctx.translate(destPivot.x,destPivot.y);ctx.rotate(angle);ctx.scale(scale,scale);
    ctx.beginPath();ctx.moveTo(mask[0][0]-sourcePivot.x,mask[0][1]-sourcePivot.y);
    for(var i=1;i<mask.length;i++)ctx.lineTo(mask[i][0]-sourcePivot.x,mask[i][1]-sourcePivot.y);ctx.closePath();ctx.clip();
    var size=(origin.x===0&&origin.y===0)?1254:313;ctx.drawImage(img,origin.x,origin.y,size,size,-sourcePivot.x,-sourcePivot.y,size,size);ctx.restore();
  }
  function bonePart(ctx,img,origin,mask,sourceA,sourceB,destA,destB){
    var sx=sourceB.x-sourceA.x,sy=sourceB.y-sourceA.y,dx=destB.x-destA.x,dy=destB.y-destA.y;
    var sl=Math.hypot(sx,sy),dl=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)-Math.atan2(sy,sx);
    rigidPart(ctx,img,origin,mask,sourceA,destA,dl/sl,angle);
  }
  function ik(hip,ankle){var dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.hypot(dx,dy),l1=11,l2=13.5,r=clamp(d,Math.abs(l1-l2)+.001,l1+l2-.001),ux=dx/d,uy=dy/d,actual={x:hip.x+ux*r,y:hip.y+uy*r},along=(l1*l1-l2*l2+r*r)/(2*r),height=Math.sqrt(Math.max(0,l1*l1-along*along));return {knee:{x:hip.x+ux*along+uy*height,y:hip.y+uy*along-ux*height},ankle:actual};}
  function pose(phase){phase=((phase%1)+1)%1;var bob=.7*Math.cos(TAU*2*phase),keys=[[0,-EXTENT,-4],[.18,-EXTENT-2,-17],[.36,-EXTENT*.72,-28],[.55,-EXTENT*.35,-17],[.74,EXTENT*.72,-7],[1,EXTENT,-4]];function swing(u){var i=0;while(i<keys.length-2&&u>keys[i+1][0])i++;var a=keys[i],b=keys[i+1],q=(u-a[0])/(b[0]-a[0]),h00=2*q*q*q-3*q*q+1,h10=q*q*q-2*q*q+q,h01=-2*q*q*q+3*q*q,h11=q*q*q-q*q;function tan(j,k){return[(keys[k][1]-keys[j][1])/(keys[k][0]-keys[j][0]),(keys[k][2]-keys[j][2])/(keys[k][0]-keys[j][0])]};var ta=i?tan(i-1,i+1):[-2*EXTENT/.45*.55,0],tb=i+2<keys.length?tan(i,i+2):[-2*EXTENT/.45*.55,0],d=b[0]-a[0];return{x:h00*a[1]+h10*ta[0]*d+h01*b[1]+h11*tb[0]*d,y:h00*a[2]+h10*ta[1]*d+h01*b[2]+h11*tb[1]*d};}function leg(t){var stance=t<.45,u=stance?t/.45:(t-.45)/.55,v=stance?{x:EXTENT*(1-2*u),y:-4}:swing(u),hip={x:0,y:-22+bob},result=ik(hip,v);return {hip:hip,ankle:result.ankle,ik:result,stance:stance,t:t,u:u};}var l=leg(phase),r=leg((phase+.5)%1);return {phase:phase,body:{bob:bob,lean:.045+.018*Math.sin(TAU*phase)},left:l,right:r};}
  function draw(ctx,o){o=o||{};var p=pose(o.phase||0),img=o.image,flip=(o.facing||1)<0;ctx.save();ctx.translate(o.x||0,o.y||0);if(flip)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
    function limb(L){bonePart(ctx,img,{x:314,y:627},THIGH,{x:151,y:154},{x:177,y:181},L.hip,L.ik.knee);bonePart(ctx,img,{x:314,y:627},SHIN,{x:184,y:190},{x:164,y:242},L.ik.knee,L.ankle);var u=(L.t-.45)/.55,sa=Math.atan2(L.ankle.y-L.ik.knee.y,L.ankle.x-L.ik.knee.x),delta=Math.atan2(Math.sin(sa-Math.PI/2),Math.cos(sa-Math.PI/2)),a=L.stance?0:delta*Math.sin(Math.PI*u);rigidPart(ctx,img,{x:314,y:627},FOOT,{x:164,y:242},L.ankle,SCALE,a);}
    ctx.save();ctx.filter='brightness(.78)';limb(p.right);ctx.restore();var armAngle=-.55-.55*Math.cos(TAU*p.phase),armDest={x:153*SCALE-161*SCALE,y:-22+(144-183)*SCALE+p.body.bob};rigidPart(ctx,img,{x:0,y:0},ARM,{x:153,y:144},armDest,SCALE,armAngle);
    rigidPart(ctx,img,{x:0,y:0},BODY,{x:161,y:183},{x:0,y:-22+p.body.bob},SCALE,0);
    limb(p.left);var ct=cannonTransform(p.phase,!!o.aiming),gunDest={x:ct.pivot.x,y:ct.pivot.y};rigidPart(ctx,img,{x:0,y:0},CANNON,{x:202,y:164},gunDest,SCALE,ct.angle);ctx.restore();return p;}
  function cannonTransform(phase,aiming){var p=pose(phase),angle=aiming?0:.65+1.1*Math.cos(TAU*p.phase),pivot={x:8.2,y:-25.8+p.body.bob},v={x:12.9,y:.6};return{angle:angle,pivot:pivot,muzzle:{x:pivot.x+v.x*Math.cos(angle)-v.y*Math.sin(angle),y:pivot.y+v.x*Math.sin(angle)+v.y*Math.cos(angle)}};}
  g.AstraRunRig={pose:pose,draw:draw,drawAt:function(ctx,phase,o){o=o||{};o.phase=phase;return draw(ctx,o)},muzzle:function(phase,o){o=o||{};var q=cannonTransform(phase||0,!!o.aiming),x=(o.facing||1)<0?-q.muzzle.x:q.muzzle.x;return{x:(o.x||0)+x,y:(o.y||0)+q.muzzle.y,local:q.muzzle}},cannonTransform:cannonTransform,rigidPart:rigidPart,bonePart:bonePart};
})(typeof window!=='undefined'?window:globalThis);
