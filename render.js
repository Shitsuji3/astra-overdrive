/* ASTRA // OVERDRIVE procedural pixel-art renderer. */
(function(g){'use strict';var W=640,H=360;var P={ink:'#06131c',navy:'#0b2230',deep:'#102f3a',steel:'#2c6670',cyan:'#a8f7f0',ice:'#5ee6e1',blue:'#326ca4',cobalt:'#183e70',white:'#e9ffff',amber:'#ffb84a',orange:'#ff754d',coral:'#ed4c5c',pink:'#d43d72',violet:'#702a69'};
function R(c,x,y,w,h,f){c.fillStyle=f;c.fillRect(x|0,y|0,w|0,h|0)}function L(c,a,b,d,e,f,w){c.strokeStyle=f;c.lineWidth=w||1;c.beginPath();c.moveTo(a|0,b|0);c.lineTo(d|0,e|0);c.stroke()}function Q(c,a,f){c.fillStyle=f;c.beginPath();c.moveTo(a[0],a[1]);for(var i=2;i<a.length;i+=2)c.lineTo(a[i],a[i+1]);c.closePath();c.fill()}function T(c,s,x,y,z,f,a){c.font=(z||8)+'px monospace';c.textAlign=a||'left';c.textBaseline='top';c.fillStyle=f;c.fillText(s,x,y)}function C(v,a,b){return Math.max(a,Math.min(b,v))}function gx(s,x){return x-((s.camera&&s.camera.x)||0)}function G(c,x,y,r,col,a){var q=c.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,col);q.addColorStop(1,'transparent');c.globalAlpha=a;c.fillStyle=q;c.fillRect(x-r,y-r,r*2,r*2);c.globalAlpha=1}
function background(c,s,t){var cam=(s.camera&&s.camera.x)||0,gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#061722');gr.addColorStop(1,'#07131e');c.fillStyle=gr;c.fillRect(0,0,W,H);var sec=s.section||'';for(var i=0;i<25;i++){var x=i*48-(cam*.12%48),h=35+(i*37%85);R(c,x,128-h,34,h,P.navy);R(c,x+5,132-h,24,3,P.deep);for(var j=0;j<3;j++)if((i+j)%3)R(c,x+9+j*7,140-h+j*10,3,2,j%2?P.amber:P.ice)}for(i=0;i<9;i++){x=i*94-(cam*.22%94);R(c,x,58,17,204,P.deep);R(c,x+4,64,9,190,P.navy);L(c,x+5,70,x+5,247,P.steel,1);L(c,x+13,70,x+13,247,P.ink,2)}if(/reactor|boss|core/i.test(sec)){for(i=0;i<4;i++){x=92+i*157-(cam*.15%157);R(c,x,42,54,119,P.navy);R(c,x+5,47,44,108,P.deep);c.strokeStyle=P.steel;c.beginPath();c.arc(x+27,98,29,0,7);c.stroke();c.beginPath();c.arc(x+27,98,19,0,7);c.stroke();G(c,x+27,98,27,P.cyan,.12)}}else if(/pipe|plant|power/i.test(sec)){for(i=0;i<7;i++){x=18+i*105-(cam*.24%105);R(c,x,150,78,53,P.navy);R(c,x+5,155,68,42,P.deep);for(j=0;j<4;j++)L(c,x+11+j*15,160,x+11+j*15,190,j%2?P.steel:P.ice,2)}}L(c,-20,94,W+20,94,P.steel,5);L(c,-20,99,W+20,99,P.ink,2);for(i=0;i<10;i++){x=i*79-(cam*.4%79);L(c,x,158,x+37,129,P.steel,3);L(c,x+38,129,x+38,190,P.ink,5);R(c,x+43,145,24,20,P.deep);R(c,x+46,149,18,3,P.steel);L(c,x+47,158,x+63,158,P.ice,1)}for(i=0;i<45;i++){x=((i*83+t*5)%680)-20;var y=(i*47+t*17)%270;L(c,x,y,x-2,y+7,'rgba(95,207,211,.28)',1)}G(c,520-(cam*.18%640),145,100,P.cyan,.07)}
function platform(c,s,p){var x=gx(s,p.x),y=p.y,h=p.h||14;R(c,x,y,p.w,h,P.ink);R(c,x,y,p.w,4,'#42858a');R(c,x,y+5,p.w,h-5,'#102a35');L(c,x,y,x+p.w,y,P.cyan,1);for(var q=8;q<p.w;q+=26){R(c,x+q,y+8,12,2,P.ink);L(c,x+q,y+11,x+q+9,y+11,P.steel,1)}if(p.type==='floor')for(q=0;q<p.w;q+=44){var z=Math.min(18,p.w-q);Q(c,[x+q,y+14,x+q+z,y+14,x+q+z,y+19,x+q,y+19],P.amber)}}
function player(c,s,p,ghost){if(p.saberTime>0&&!ghost){c.save();c.translate(gx(s,p.x+p.w/2),p.y+p.h-3);if((p.saberFacing||p.facing)<0)c.scale(-1,1);drawComboTrail(c,p);c.restore();}var x=gx(s,p.x),y=p.y,flip=p.facing<0,run=Math.abs(p.vx||0)>1&&p.onGround,air=!p.onGround,wall=!!p.wallDir,dash=(p.dashTime||0)>0,ph=(p.animTime||s.time||0)*11,a=run?Math.sin(ph)*3:0;if(air)a=0;if(wall)a=p.wallDir>0?3:-3;c.save();c.globalAlpha=ghost?.22:1;c.translate(flip?x+p.w:x,y);if(flip)c.scale(-1,1);if(dash){Q(c,[-8,18,-32,10,-17,27,-39,25,-13,34],P.cyan);Q(c,[-5,25,-27,36,-10,39],P.ice)}Q(c,[3+a,27,13+a,27,14-a,40,10-a,43,1+a,42,-1+a,38],P.cobalt);R(c,3+a,29,8,5,P.blue);Q(c,[1+a,39,15+a,39,17+a,44,0+a,44],P.ink);Q(c,[16-a,27,25-a,27,28-a,40,25-a,43,16-a,42,14-a,38],P.cobalt);R(c,17-a,29,8,5,P.blue);Q(c,[14-a,39,28-a,39,32-a,44,14-a,44],P.ink);Q(c,[5,12,11,8,23,9,29,16,26,30,8,30,3,24],P.ink);Q(c,[7,12,12,10,22,11,26,16,24,27,9,27,6,23],P.blue);Q(c,[10,13,22,13,24,18,8,18],P.steel);R(c,12,19,8,6,P.cobalt);R(c,14,20,5,2,P.cyan);Q(c,[7,3,12,-1,22,0,27,5,25,14,8,14,4,10],P.ink);Q(c,[9,3,13,1,21,2,24,6,23,11,8,11,7,8],P.blue);Q(c,[10,5,22,4,24,8,21,10,9,9],P.cyan);R(c,13,5,8,2,P.white);R(c,12,12,8,2,P.orange);if(p.saberTime>0){L(c,26,18,42,7,P.ink,5);L(c,27,17,44,5,P.white,2);Q(c,[43,6,50,2,45,10],P.cyan);c.strokeStyle=P.cyan;c.lineWidth=2;c.beginPath();c.arc(27,18,23,-1.15,.55);c.stroke()}else{Q(c,[25,14,34,16,38,21,34,25,25,22],P.ink);Q(c,[26,16,33,17,35,21,32,23,25,20],P.blue);R(c,34,19,7,4,P.orange)}c.restore()}
function foe(c,s,e){if(e.dead)return;if(g.AstraEnemyArt&&g.AstraEnemyArt.draw(c,s,e))return;var x=gx(s,e.x),y=e.y,w=e.w||30,f=e.facing||-1,col=e.flash>0?P.white:e.type==='drone'?P.pink:P.coral;c.save();c.translate(f>0?x+w:x,y);if(f>0)c.scale(-1,1);if(e.type==='drone'){G(c,14,10,22,col,.18);Q(c,[2,7,9,1,24,1,31,8,25,16,8,16],P.ink);Q(c,[5,7,11,3,23,4,27,8,22,13,9,13],P.violet);R(c,11,7,11,3,col);L(c,3,16,0,23,col,2);L(c,27,16,31,23,col,2)}else if(e.type==='turret'){R(c,2,7,27,14,P.ink);Q(c,[5,7,26,7,31,14,27,20,4,20],P.steel);R(c,8,10,15,6,P.deep);R(c,22,11,14,4,col)}else{Q(c,[3,13,9,4,24,3,31,12,26,26,7,26],P.ink);Q(c,[7,13,11,6,22,6,27,13,23,22,9,22],P.coral);R(c,12,8,11,3,P.amber);R(c,7,23,5,7,P.steel);R(c,22,23,5,7,P.steel)}c.restore();if(e.hp<e.maxHp){var bx=gx(s,e.x);R(c,bx,y-6,w,2,P.ink);R(c,bx,y-6,w*C(e.hp/e.maxHp,0,1),2,col)}}
function boss(c,s,b){if(!b||!b.active)return;var x=gx(s,b.x),y=b.y,tele=b.attack&&(/charge|slam|laser|tele/i.test(b.attack)||((b.timer||0)%2<.35));var fk=b.h/110;if(!b.gone){G(c,x+b.w/2,y+b.h*.43,85*fk,b.flash>0?P.white:P.pink,.16);c.save();c.translate(b.facing<0?x+b.w:x,y);c.scale(b.facing<0?-fk:fk,fk);for(var i=0;i<3;i++){var ly=70+i*7;Q(c,[10+i*4,ly,27+i*3,ly,23+i,105,7+i*2,105],P.ink);L(c,14+i*4,ly+4,11+i*3,101,P.steel,3)}Q(c,[12,28,28,11,75,6,94,25,91,75,75,90,27,87,8,68],P.ink);Q(c,[18,28,31,16,72,13,87,27,84,69,70,81,30,78,15,63],b.flash>0?P.white:P.violet);Q(c,[27,30,73,27,80,41,74,61,27,63,20,49],P.deep);R(c,36,35,29,15,P.navy);R(c,42,39,17,5,P.cyan);R(c,46,40,9,2,P.white);R(c,40,55,21,3,P.coral);Q(c,[11,32,-10,19,-3,11,19,22,17,38],P.ink);Q(c,[8,31,-5,20,0,16,19,27],P.coral);Q(c,[88,30,108,17,103,9,83,22,82,39],P.ink);Q(c,[91,29,103,18,101,14,83,27],P.coral);R(c,24,22,7,4,P.amber);R(c,69,20,7,4,P.amber);if(tele){L(c,0,16,-28,5,P.coral,2);L(c,98,15,130,5,P.coral,2);c.strokeStyle=P.amber;c.setLineDash([3,3]);c.strokeRect(-8,5,120,100);c.setLineDash([])}c.restore()}R(c,150,335,340,7,P.ink);R(c,152,337,336*C(b.hp/b.maxHp,0,1),3,P.coral);T(c,(b.name||'WARDEN')+'  //  '+(b.title||''),150,324,8,P.cyan)}
// Render-only signatures. Solid cores mark the projectile; low-opacity tails are decoration.
var BOSS_FX_COLORS={warden:['#ff547c','#ffcf79'],tidebreaker:['#30cbef','#b6fff4'],coilhead:['#8d86ff','#d6ff86'],ashmaw:['#ff6934','#ffe5a3'],nullpriest:['#ae68ff','#ffb6f8'],gravelock:['#dda160','#fff0c0'],sparkwidow:['#ff59b3','#b8edff'],'obsidian-crown':['#bd91ff','#ffe4aa']};
function nextBossMarker(c,s){
  var m=s.nextBossMarker;if(!m||!s.boss||!s.boss.down)return;
  var actual=gx(s,m.x),x=C(actual,48,W-48),edge=x!==actual,y=m.y,co=bossColors(m.id),
      left=Math.max(0,g.AstraCombat.bossDeath.end-(s.boss.downTime||0));
  c.save();
  if(!edge){
    c.globalAlpha=s.reducedMotion?.16:.12+.06*Math.sin((s.time||0)*5);
    R(c,x-m.w/2,y-m.h,m.w,m.h,co[0]);
    c.globalAlpha=.85;c.setLineDash([3,3]);c.strokeStyle=co[1];c.lineWidth=1;c.strokeRect(x-m.w/2,y-m.h,m.w,m.h);c.setLineDash([]);
    c.strokeStyle=co[0];c.lineWidth=2;c.beginPath();c.ellipse(x,y-2,m.w*.7,5,0,0,Math.PI*2);c.stroke();
    Q(c,[x-5,y-m.h-9,x+5,y-m.h-9,x,y-m.h-4],co[1]);
  }
  var label=(edge?(actual<0?'◀ ':'▶ '):'')+'NEXT / '+m.name;
  var labelX=C(x,108,W-108),labelY=edge?92:y-m.h-35;
  R(c,labelX-104,labelY-3,208,27,P.ink);
  T(c,label,labelX,labelY,8,co[1],'center');
  T(c,left.toFixed(1)+'s',labelX,labelY+12,8,P.white,'center');
  c.restore();
}
var deathPictures=new WeakMap();
function playerBreak(c,s){
  var f=s.deathFx;if(!f)return;
  var t=f.time,x=gx(s,f.x),y=f.y,reduced=!!s.reducedMotion,art=deathPictures.get(f);
  if(!art&&g.document){
    art=g.document.createElement('canvas');art.width=80;art.height=80;
    var ac=art.getContext('2d'),p=Object.assign({},s.player,{x:28,y:22,vx:0,vy:0,onGround:true,invuln:0,saberTime:0,dashTime:0,shootPoseTime:0,wallDir:0});
    if(playerSheet&&playerSheet.complete&&playerSheet.naturalWidth)drawPlayerSprite(ac,{time:0,camera:{x:0},reducedMotion:reduced},p);
    else player(ac,{time:0,camera:{x:0}},p,false);
    deathPictures.set(f,art);
  }
  c.save();
  if(t<.16){
    if(art)c.drawImage(art,x-40,y-42);
    G(c,x,y,24,P.cyan,reduced?.12:.45);L(c,x-10,y-9,x+9,y+10,P.white,2);
  }else{
    var a=t-.16,fade=C((1.12-t)/.35,0,1),travel=reduced?.4:1;
    // Actual armour pixels break into twelve pieces, instead of replacing the hero with generic sparks.
    for(var i=0;i<12;i++){
      var col=i%3,row=(i/3)|0,dx=(col-1)*50+[-70,65,-85,90][row],dy=-95+row*27;
      c.save();c.globalAlpha=fade;c.translate(x+(col-1)*20+dx*a*travel,y-28+row*16+dy*a*travel+65*a*a);
      c.rotate((i%2?1:-1)*a*(reduced?.4:3.2));
      if(art)c.drawImage(art,10+col*20,10+row*16,20,16,-10,-8,20,16);
      else R(c,-3,-3,6,6,i%2?P.blue:P.cyan);
      c.restore();
    }
    var rad=8+a*(reduced?30:85);c.globalAlpha=C(1-a*1.4,0,1)*.75;
    fxArc(c,x,y,rad,0,Math.PI*2,P.ice,2);
    if(!reduced)for(var k=0;k<8;k++){var angle=k*Math.PI/4;var rr=12+a*110;
      var ex=x+Math.cos(angle)*rr,ey=y+Math.sin(angle)*rr;L(c,ex-Math.cos(angle)*8,ey-Math.sin(angle)*8,ex,ey,P.cyan,2);R(c,ex-1,ey-1,3,3,P.white);}
    if(a<.16)G(c,x,y,28*(1-a/.16)+3,P.white,reduced?.12:.65*(1-a/.16));
  }
  c.restore();
}
function bossColors(id){return BOSS_FX_COLORS[id]||BOSS_FX_COLORS.warden}
function fxArc(c,x,y,r,start,end,col,width){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.arc(x,y,r,start,end);c.stroke()}
function fanProjectile(c,s,b){
  if(b.kind!=='fan-orb')return false;
  var x=gx(s,b.x),y=b.y,r=b.r||6,angle=Math.atan2(b.vy,b.vx),t=s.reducedMotion?0:(s.time||0)*8;
  c.save();G(c,x,y,r*2.4,'#81bcff',s.reducedMotion?.12:.23);c.translate(x,y);c.rotate(angle);
  c.globalAlpha=.4;Q(c,[-r*2.3,-r*.45,-r*.5,-r*.8,r,0,-r*.5,r*.8,-r*2.3,r*.45,-r*1.5,0],'#467dc7');c.globalAlpha=1;
  var colors=['#163c79','#397bce','#8bbdf1'];
  for(var layer=0;layer<3;layer++){var radius=r-layer;c.fillStyle=colors[layer];for(var dx=-radius;dx<=radius;dx++){var h=Math.floor(Math.sqrt(Math.max(0,radius*radius-dx*dx)));R(c,dx,-h,1,h*2+1,colors[layer]);}}
  fxArc(c,0,0,r-1,-1.35,.6,'#e5f7ff',2);
  fxArc(c,-1,0,r*.5,.4+Math.sin(t)*.15,2.7+Math.sin(t)*.15,'#224c96',2);
  R(c,0,-r+2,3,2,'#ffffff');c.restore();return true;
}
function bossProjectile(c,s,b){
  if(!b.fxBoss||b.team==='player')return false;
  var x=gx(s,b.x),y=b.y,r=b.r||4,t=s.time||0,co=bossColors(b.fxBoss),reduced=!!s.reducedMotion;
  if(x<-65||x>W+65||y<-65||y>H+65)return true;
  c.save();
  G(c,x,y,r*2.7,co[0],reduced?.12:.25);
  if(b.kind==='mine'){
    var left=C(b.life/(b.fuse||1.2),0,1);
    Q(c,[x-r,y-r*.5,x,y-r,x+r,y-r*.5,x+r,y+r*.5,x,y+r,x-r,y+r*.5],P.ink);
    fxArc(c,x,y,r*.85,-Math.PI/2,-Math.PI/2+Math.PI*2*left,co[0],2);
    R(c,x-2,y-2,4,4,co[1]);
    for(var m=0;m<3;m++){var a=m*Math.PI*2/3+(reduced?0:t*1.8);L(c,x+Math.cos(a)*(r+2),y+Math.sin(a)*(r+2),x+Math.cos(a)*(r+4),y+Math.sin(a)*(r+4),co[0],1)}
  }else if(b.kind==='wall'){
    // Independent cells: never bridge the safe hole in the barrier.
    Q(c,[x-r,y-r,x+r*.4,y-r,x+r,y,x+r*.4,y+r,x-r,y+r,x-r*.4,y],co[0]);
    L(c,x,y-r+2,x+2,y,co[1],2);L(c,x+2,y,x,y+r-2,P.white,1);
    c.globalAlpha=.25;L(c,x-(b.vx<0?-1:1)*r*2,y-r*.7,x,y-r*.7,co[0],1);
  }else if(b.kind==='wave'){
    var d=b.vx<0?-1:1;
    c.translate(x,y);c.scale(d,1);
    c.globalAlpha=reduced?.18:.32;Q(c,[-r*3.5,r,-r*2,-r*.7,-r*.7,-r,r*.5,-r,r,r,-r*3.5,r],co[0]);
    c.globalAlpha=1;Q(c,[-r,r,r*.35,-r,r,-r*.65,r*.75,r],co[0]);
    Q(c,[-r*.4,r,r*.32,-r*.7,r*.52,r],co[1]);L(c,r*.35,-r,r*.8,r,P.white,1);
    for(var w=0;w<(reduced?1:3);w++){var n=((t*5+w*.33)%1);R(c,-r-25*n,r+2,5*(1-n)+1,1,co[0])}
  }else{
    var angle=Math.atan2(b.vy||0,b.vx||1),len=b.kind==='shell'?r*4:r*3;
    c.translate(x,y);c.rotate(angle);
    c.globalAlpha=reduced?.16:.35;Q(c,[-len,-r*.5,-r, -r*.8,r*.4,0,-r,r*.8],co[0]);
    c.globalAlpha=1;Q(c,[-r,0,-r*.4,-r*.8,r*.6,-r*.65,r,0,r*.6,r*.65,-r*.4,r*.8],co[0]);
    Q(c,[-r*.55,0,0,-r*.4,r*.65,0,0,r*.4],co[1]);R(c,0,-1,2,2,P.white);
    if(b.kind==='shell'){fxArc(c,0,0,r+2,-1.1,1.1,co[1],1)}
  }
  c.restore();return true;
}
function bossImpact(c,s,q){
  if(q.type!=='boss-impact')return false;
  var age=1-C(q.life/q.maxLife,0,1),x=gx(s,q.x),y=q.y,co=bossColors(q.fxBoss),size=q.size||38;
  c.save();c.globalAlpha=(1-age)*(s.reducedMotion?.4:.8);
  c.strokeStyle=co[0];c.lineWidth=2;c.beginPath();c.ellipse(x,y,size*(.2+age),3+age*7,0,0,Math.PI*2);c.stroke();
  if(!s.reducedMotion){
    for(var i=0;i<7;i++){var a=-Math.PI+(i+.5)*Math.PI/7,reach=size*(.22+age*.85),sx=x+Math.cos(a)*reach,sy=y+Math.sin(a)*reach*.6;L(c,sx,sy,sx+Math.cos(a)*7*(1-age),sy+Math.sin(a)*12*(1-age),i%2?co[0]:co[1],2)}
    c.globalAlpha=Math.max(0,1-age*3)*.6;Q(c,[x-12,y,x-6,y-10,x,y-30*(1-age),x+6,y-10,x+12,y],co[1]);
  }
  c.restore();return true;
}
function bossEnergy(c,s,b){
  if(!b||!b.active||b.down||b.gone)return;
  var raw=String(b.attack||''),tell=raw.indexOf('tell-')===0,co=bossColors(b.id),t=s.time||0,
      x=gx(s,b.x+b.w/2),y=b.y+b.h*.32,dir=b.facing<0?-1:1,reduced=!!s.reducedMotion;
  c.save();
  if(tell){
    var r=10+Math.min(.8,Math.max(0,b.timer||0))*17,spin=reduced?0:t*2;
    G(c,x,y,23,co[0],.12);
    for(var i=0;i<3;i++){var a=spin+i*Math.PI*2/3;c.globalAlpha=.65;fxArc(c,x,y,r,a,a+.8,co[0],1);
      if(!reduced){var f=(t*1.4+i/3)%1,rr=7+(1-f)*25;R(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr,2,2,co[1])}}
    c.globalAlpha=.85;R(c,x-2,y-2,4,4,co[1]);
  }else if(raw==='dash'&&b.dashTime>0){
    c.globalAlpha=reduced?.22:.5;
    for(var j=0;j<3;j++){var yy=b.y+b.h*(.25+j*.24),tail=reduced?12:28+j*8;L(c,x-dir*b.w*.4,yy,x-dir*(b.w*.4+tail),yy+3,co[j%2],2)}
    c.globalAlpha=.7;fxArc(c,x+dir*b.w*.35,b.y+b.h*.5,b.h*.44,dir>0?-1.1:2.04,dir>0?1.1:4.24,co[1],2);
  }else if(raw==='slam'&&b.leap){
    c.globalAlpha=reduced?.18:.42;fxArc(c,x,b.y+b.h*.5,b.w*.72,.1,3.04,co[0],2);
  }
  c.restore();
}

var BOSS_MOVE_NAMES={volley:'VOLLEY',wave:'GROUND WAVE',dash:'CHARGE',mortar:'MORTAR',ring:'SPREAD',slam:'SLAM',mines:'MINES',wall:'BARRIER'};
// Six patterns only work if the player can read which one is coming, so each wind-up draws
// its own warning where the attack will actually arrive.
function bossTell(c,s,b){
  if(!b||!b.active)return;
  var raw=String(b.attack||''),telling=raw.indexOf('tell-')===0,move=telling?raw.slice(5):raw,label=BOSS_MOVE_NAMES[move];
  // The recovery after an attack is the window the fight is built around, so it is said out
  // loud rather than left for the player to infer from a boss that has gone quiet.
  if(raw==='rest'){
    var beat=.55+.45*Math.abs(Math.sin((s.time||0)*7));
    c.save();c.globalAlpha=beat;T(c,'\u25bd OPEN',490,322,8,P.cyan,'right');c.restore();
  }
  if(label)T(c,(telling?'\u25b8 ':'')+label,490,telling?322:323,telling?8:7,telling?P.amber:P.steel,'right');
  if(!telling||!label)return;
  var pl=s.player||{},pw=pl.w||24,t=s.time||0,pulse=.32+.42*Math.abs(Math.sin(t*11)),
      cx=gx(s,b.x+b.w/2),top=b.y,dir=b.facing<0?-1:1,
      px=pl.x===undefined?cx:gx(s,pl.x+pw/2),
      floorY=(b.baseY===undefined?b.y:b.baseY)+b.h,i,y,ax,tx;
  c.save();c.globalAlpha=pulse;c.setLineDash([5,4]);
  if(move==='volley'){for(i=0;i<3;i++){y=top+b.h*.24+i*b.h*.13;L(c,cx+dir*(b.w*.6),y,cx+dir*(b.w*.6+84),y-16+i*16,P.amber,2)}}
  else if(move==='wave'){L(c,cx+dir*(b.w*.6),floorY-7,cx+dir*250,floorY-7,P.coral,3)}
  else if(move==='dash'){c.setLineDash([]);for(i=0;i<3;i++){ax=cx+dir*(b.w*.7+i*20);L(c,ax,top+b.h*.27,ax+dir*11,top+b.h*.5,P.amber,2);L(c,ax,top+b.h*.73,ax+dir*11,top+b.h*.5,P.amber,2)}}
  else if(move==='mortar'){c.strokeStyle=P.coral;c.lineWidth=2;for(i=-1;i<2;i++){tx=px+i*72;c.beginPath();c.arc(tx,floorY-5,11,0,7);c.stroke();L(c,tx-16,floorY-5,tx+16,floorY-5,P.coral,1);L(c,tx,floorY-21,tx,floorY+11,P.coral,1)}}
  else if(move==='ring'){c.strokeStyle=P.amber;c.lineWidth=2;c.beginPath();c.arc(cx,top+b.h/2,b.w*.8+pulse*20,0,7);c.stroke()}
  else if(move==='slam'){c.setLineDash([]);L(c,cx,top-6,cx,top-34,P.coral,3);L(c,cx-9,top-22,cx,top-35,P.coral,3);L(c,cx+9,top-22,cx,top-35,P.coral,3);c.setLineDash([5,4]);c.strokeStyle=P.coral;c.lineWidth=2;c.strokeRect(px-46,floorY-15,92,13)}
  else if(move==='mines'){c.strokeStyle=P.amber;c.lineWidth=2;for(i=-1;i<2;i++){tx=px+i*90;c.strokeRect(tx-13,floorY-17,26,15);L(c,tx-19,floorY-9,tx+19,floorY-9,P.amber,1)}}
  else if(move==='wall'){ax=cx+dir*(b.w*.5+10);c.strokeStyle=P.coral;c.lineWidth=3;L(c,ax,floorY-16,ax,floorY-186,P.coral,3);L(c,ax,floorY-16,ax+dir*30,floorY-16,P.coral,1);L(c,ax,floorY-186,ax+dir*30,floorY-186,P.coral,1)}
  c.setLineDash([]);c.restore()
}
function drawSaberCore(c,fr,rx,gy,scale,reducedMotion){var paths=[function(p){p.moveTo(129,356);p.quadraticCurveTo(101,409,51,463)},function(p){p.moveTo(139,181);p.quadraticCurveTo(70,200,43,258)},function(p){p.moveTo(151,175);p.quadraticCurveTo(143,90,178,36)},function(p){p.moveTo(218,382);p.quadraticCurveTo(398,400,376,303);p.quadraticCurveTo(365,255,329,232)},function(p){p.moveTo(159,297);p.quadraticCurveTo(248,374,350,372)},function(p){p.moveTo(196,350);p.quadraticCurveTo(265,389,358,390)},function(p){p.moveTo(170,268);p.quadraticCurveTo(245,300,301,314)},function(p){p.moveTo(130,305);p.quadraticCurveTo(100,363,64,400)}],path=paths[Math.max(0,Math.min(paths.length-1,fr|0))],a=(reducedMotion?.62:.82)*c.globalAlpha;c.save();c.scale(scale,scale);c.translate(-rx,-gy);function stroke(w,col,alpha){c.beginPath();path(c);c.lineCap='round';c.lineJoin='round';c.lineWidth=w;c.strokeStyle=col;c.globalAlpha=alpha;c.stroke()}stroke(13,P.ice,a*.42);stroke(7,P.white,a);c.globalAlpha=1;c.restore()}
function drawComboTrail(c,p){var stage=Math.max(1,Math.min(3,p.saberCombo||1)),elapsed=g.AstraCombat.saberPhase(p)*.32,fade=elapsed<.05?0:Math.min(1,Math.max(0,(elapsed-.05)/.03))*Math.max(0,1-(elapsed-.08)/.32),a=(p.reducedMotion?.45:.72)*fade;if(!a)return;c.save();c.globalAlpha=a;c.strokeStyle=stage===3?P.amber:P.cyan;c.lineWidth=stage===3?3:2;c.lineCap='round';c.beginPath();if(stage===1)c.arc(5,-28,34,-1.2,.6);else if(stage===2)c.ellipse(18,-24,42,10,0,-Math.PI,0);else{c.arc(5,-38,48,-1.2,.85);c.lineTo(37,0);}c.stroke();if(stage===3){c.globalAlpha=a*.8;c.fillStyle=P.amber;c.beginPath();c.arc(37,-2,4,0,Math.PI*2);c.fill();}c.restore()}function drawPlayerSprite(c,s,p){var run=g.AstraCombat&&g.AstraCombat.runPose?g.AstraCombat.runPose(p):Math.abs(p.vx||0)>20&&p.onGround&&!(p.dashTime>0)&&!p.saberTime&&!p.wallDir,held=!!(g.AstraCombat&&g.AstraCombat.risingHeld&&g.AstraCombat.risingHeld(p)),saber=p.saberTime>0||held,idle=g.AstraCombat&&g.AstraCombat.idlePose&&g.AstraCombat.idlePose(p);if(run||idle||saber)ensureAsset('run','assets/player-run-v4.svg');if(saber)ensureAsset('saber','assets/player-saber-v2.png');if(saber&&g.AstraSaberRig&&runAtlas&&runAtlas.complete&&runAtlas.naturalWidth){c.save();c.globalAlpha=p.invuln>0&&Math.floor((s.time||0)*16)%2?.45:1;g.AstraSaberRig.draw(c,{x:gx(s,p.x+p.w/2),y:p.y+p.h,facing:p.saberFacing,stage:g.AstraCombat.saberStage(p),phase:g.AstraCombat.saberPhase(p),image:runAtlas,reducedMotion:s.reducedMotion,fanLevel:g.AstraCombat.fanLevel(p),effectTime:s.time});c.restore();return;}var rigMode=g.AstraCombat&&g.AstraCombat.rigMode?g.AstraCombat.rigMode(p):null;if(rigMode&&rigMode!=='saber'&&g.AstraRunRig&&runAtlas&&runAtlas.complete&&runAtlas.naturalWidth){c.save();c.globalAlpha=p.invuln>0&&Math.floor((s.time||0)*16)%2?.45:1;c.translate(gx(s,p.x+p.w/2),p.y+p.h-3);var chargeFlash=saberFlash(p);if(chargeFlash)c.filter=chargeFlash;g.AstraRunRig.draw(c,{x:0,y:3,facing:p.facing,phase:g.AstraCombat.rigPhase(p),mode:rigMode,rise:g.AstraCombat.rigRise(p),aiming:g.AstraCombat.runAim(p),image:runAtlas});c.restore();return;}var atlas=saber&&saberAtlas&&saberAtlas.complete&&saberAtlas.naturalWidth?saberAtlas:run&&runAtlas&&runAtlas.complete&&runAtlas.naturalWidth?runAtlas:playerSheet,useSaber=atlas===saberAtlas,useRun=atlas===runAtlas,fr=useSaber?g.AstraCombat.saberFrame(p):useRun?g.AstraCombat.runFrame(p):combatFrame(p),scale=useSaber?.15625:useRun?g.AstraCombat.runMetadata.scale:.135,rx=useSaber?[200,205,178,190,174,216,178,217]:useRun?g.AstraCombat.runMetadata.rootX:null,gy=useSaber?[470,470,470,468,391,391,405,408]:useRun?g.AstraCombat.runMetadata.virtualGroundY:null,rect=useSaber?[[0,0,384,512],[384,0,384,512],[768,0,352,512],[1120,0,416,512],[0,512,384,512],[384,512,384,512],[768,512,352,512],[1120,512,416,512]]:useRun?g.AstraCombat.runMetadata.cells:null,cell=useRun?g.AstraCombat.runCellOrder[fr]:fr,r=rect?rect[cell]:[fr%4*384,Math.floor(fr/4)*512,384,512],center=gx(s,p.x+p.w/2),baseline=p.y+p.h-3;c.save();c.globalAlpha=p.invuln>0&&Math.floor((s.time||0)*16)%2?.45:1;c.translate(center,baseline);if((saber?p.saberFacing:p.facing)<0)c.scale(-1,1);if(saber)drawComboTrail(c,p);if(useSaber){drawSaberCore(c,fr,rx[fr],gy[fr],scale,!!s.reducedMotion);c.drawImage(atlas,r[0],r[1],r[2],r[3],-rx[cell]*scale,-gy[cell]*scale,r[2]*scale,r[3]*scale)}else if(useRun)c.drawImage(atlas,r[0],r[1],r[2],r[3],-rx[cell]*scale,-gy[cell]*scale,r[2]*scale,r[3]*scale);else{var oy=playerIdleOffset(p),dx=-24,dy=-55,split=36;c.drawImage(atlas,r[0],r[1]+split*8,r[2],(64-split)*8,dx,dy+split,48,64-split);c.drawImage(atlas,r[0],r[1],r[2],split*8,dx,dy+oy,48,split-oy)}c.restore()}
function combatFrame(p){var old=(p.saberTime>0?7:p.wallDir?6:p.dashTime>0?5:!p.onGround?4:Math.abs(p.vx||0)>1?1+((Math.floor((p.animTime||0)*12)%3)):0);var api=g.AstraCombat;if(api&&typeof api.frame==='function'){var f=api.frame(p);if(f>=0&&f<=7)return f}return old}
function combatMuzzle(s,p){var api=g.AstraCombat;if(api&&typeof api.muzzle==='function'){var m=api.muzzle(p);if(m&&isFinite(m.x)&&isFinite(m.y))return{x:gx(s,m.x),y:m.y}}var left=p.facing<0,oy=api&&typeof api.idleOffset==='function'?api.idleOffset(p):0;return{x:gx(s,p.x+(left?p.w-41:41)),y:p.y+19+oy}}
function playerIdleOffset(p){var api=g.AstraCombat;return api&&typeof api.idleOffset==='function'?api.idleOffset(p):0}
// The saber's charge, drawn the way the thrust sheet's first row is: nothing at first, a white flash
// the moment it is ready, and blue lightning crawling over the body that gathers in front of the
// fist once it is. Pixel by pixel, like the thrust's own light.
function sparkHash(a,b){var x=Math.sin(a*127.1+b*311.7+1.3)*43758.5453;return x-Math.floor(x)}
function pixelBolt(c,x0,y0,x1,y1,seed,step,col){var px=x0,py=y0,dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;c.fillStyle=col;for(var j=1;j<=4;j++){var u=j/4,off=j===4?0:(sparkHash(seed+j,step)-.5)*len*.45,qx=x0+dx*u+nx*off,qy=y0+dy*u+ny*off,m=Math.max(1,Math.round(Math.hypot(qx-px,qy-py)));for(var k=0;k<=m;k++)c.fillRect(Math.round(px+(qx-px)*k/m),Math.round(py+(qy-py)*k/m),1,1);px=qx;py=qy}}
function saberFlash(p){var api=g.AstraCombat;if(!api||!api.saberChargeShown||!api.thrust)return'';var ch=api.saberChargeShown(p),T=api.thrust;if(ch<T.ready)return'';var since=(ch-T.ready)/T.rate;return since<.05?'brightness(0) invert(1)':since<.11?'brightness(1.8) saturate(.35)':''}
function saberChargeEffects(c,s,p){var api=g.AstraCombat;if(!p||!api||!api.saberChargeShown||!api.thrust||s.mode==='paused'||s.paused)return;var ch=api.saberChargeShown(p);if(ch<=.12||p.saberCombo===7)return;var T=api.thrust,ready=ch>=T.ready,rm=!!s.reducedMotion,f=p.facing<0?-1:1,cx=gx(s,p.x+p.w/2),cy=p.y+p.h*.55,hx=Math.round(cx+f*12),hy=Math.round(p.y+p.h*.42),step=rm?0:Math.floor((s.time||0)*18),n=ready?5:1+Math.round(Math.min(1,(ch-.12)/(T.ready-.12))*3);c.save();c.imageSmoothingEnabled=false;for(var k=0;k<n;k++){var a=sparkHash(k*7.3,step),b=sparkHash(k*2.9+40,step),ang=a*Math.PI*2,rx=10+5*b,ry=15+5*b,x0=cx+Math.cos(ang)*rx,y0=cy+Math.sin(ang)*ry,x1,y1;if(ready&&k<3){x1=hx;y1=hy}else{var ang2=ang+(b<.5?1:-1)*(.7+.6*a);x1=cx+Math.cos(ang2)*rx;y1=cy+Math.sin(ang2)*ry}pixelBolt(c,x0,y0,x1,y1,k*13+1,step,k%2?'#a8d8f8':'#40a0f8')}if(ready){var r=1+Math.round(ch*1.5);c.fillStyle='#2058d8';c.fillRect(hx-r-1,hy-r,r*2+3,r*2+1);c.fillRect(hx-r,hy-r-1,r*2+1,r*2+3);c.fillStyle='#f8f8f8';c.fillRect(hx-r,hy-r+1,r*2+1,r*2-1);c.fillRect(hx-r+1,hy-r,r*2-1,r*2+1)}c.restore()}
function draw(c,s){s=s||{};var t=s.time||0;c.save();c.imageSmoothingEnabled=false;var sh=s.shake||0;c.translate((Math.sin(t*70)*sh)|0,(Math.cos(t*53)*sh*.5)|0);background(c,s,t);(s.platforms||[]).forEach(function(p){platform(c,s,p)});(s.pickups||[]).forEach(function(k){if(k.taken)return;var col=k.type==='health'?P.coral:P.cyan,x=gx(s,k.dropped?k.x+9:k.x),y=(k.dropped?k.y+9:k.y)+(k.dropped&&k.rest?Math.sin((s.time||0)*4+k.x*.07)*1.6:0);if(k.dropped){G(c,x,y,13,col,.3);R(c,x-6,y-6,12,12,P.ink);R(c,x-5,y-5,10,10,col);R(c,x-4,y-1,8,2,P.white);R(c,x-1,y-4,2,8,P.white)}else{G(c,x,y,18,col,.25);Q(c,[x,y-7,x+6,y,x,y+7,x-6,y],col)}});(s.enemies||[]).forEach(function(e){foe(c,s,e)});boss(c,s,s.boss);(s.bullets||[]).forEach(function(b){if(fanProjectile(c,s,b)||bossProjectile(c,s,b))return;var x=gx(s,b.x),co=b.team==='player'?P.orange:P.pink;if(b.kind==='wave'){var wr=b.r||7;G(c,x,b.y,wr*3,P.coral,.34);c.save();c.globalAlpha=.9;c.fillStyle=P.coral;c.beginPath();c.ellipse(x,b.y,wr,wr*1.7,0,0,Math.PI*2);c.fill();c.fillStyle=P.amber;c.beginPath();c.ellipse(x,b.y,wr*.45,wr*1.1,0,0,Math.PI*2);c.fill();c.restore()}else if(b.kind==='mine'){var mr=b.r||7,fuse=b.fuse||1.2,left=C(b.life/fuse,0,1),hot=Math.floor((s.time||0)*(7+(1-left)*22))%2;G(c,x,b.y,mr*2.6,hot?P.white:P.coral,.32);c.save();c.fillStyle=P.ink;c.beginPath();c.arc(x,b.y,mr,0,7);c.fill();c.fillStyle=hot?P.white:P.coral;c.beginPath();c.arc(x,b.y,mr*.55,0,7);c.fill();c.restore()}else if(b.kind==='wall'){var br=b.r||6;G(c,x,b.y,br*2.6,P.pink,.3);R(c,x-br,b.y-br*1.5,br*2,br*3,P.pink);R(c,x-br*.4,b.y-br,br*.8,br*2,P.white)}else if(b.kind==='shell'){var sr=b.r||5;G(c,x,b.y,sr*3,P.amber,.34);c.save();c.fillStyle=P.coral;c.beginPath();c.arc(x,b.y,sr,0,7);c.fill();c.fillStyle=P.amber;c.beginPath();c.arc(x,b.y,sr*.5,0,7);c.fill();c.restore()}else{G(c,x,b.y,12,co,.3);R(c,x-(b.r||3),b.y-1,(b.r||3)*2,3,co)}});(s.particles||[]).forEach(function(q){if(bossImpact(c,s,q))return;var a=C(q.life/(q.maxLife||1),0,1),x=gx(s,q.x),z=q.size||2,col=q.color||q.col||P.orange;if(q.type==='flash'){G(c,x,q.y,z,col,a*.85);return}if(q.type==='ring'){c.save();c.globalAlpha=a*.85;c.strokeStyle=col;c.lineWidth=q.width||2;c.beginPath();c.arc(x,q.y,z,0,7);c.stroke();c.restore();return}if(q.type==='smoke'){c.globalAlpha=a*.4;R(c,x-z/2,q.y-z/2,z,z,col);return}c.globalAlpha=a;R(c,x,q.y,z,z,col)});c.globalAlpha=1;if(s.player&&!s.deathFx){if(s.player.dashTime>0)for(var i=1;i<4;i++)player(c,s,{x:s.player.x-s.player.vx*i*3,y:s.player.y,w:s.player.w,facing:s.player.facing,vx:0,onGround:s.player.onGround,animTime:s.player.animTime},true);if(!(s.player.invuln>0&&Math.floor(t*16)%2))player(c,s,s.player,false)}c.restore()}
function hud(c,s){var p=s.player||{},hp=C((p.hp||0)/(p.maxHp||1),0,1),charge=C(g.AstraCombat&&g.AstraCombat.saberChargeShown?g.AstraCombat.saberChargeShown(p):0,0,1),ready=charge>=((g.AstraCombat&&g.AstraCombat.chargeThreshold)||.55);c.save();c.globalAlpha=.94;R(c,9,9,151,43,P.ink);L(c,9,9,160,9,P.cyan,1);T(c,'ASTRA-07',16,13,8,P.cyan);T(c,'ARMOR',16,25,7,P.white);for(var i=0;i<8;i++){R(c,53+i*12,25,9,11,i<Math.ceil(hp*8)?P.cyan:P.deep);R(c,55+i*12,27,5,7,i<Math.ceil(hp*8)?P.ice:P.ink)}T(c,p.saberCombo===7?'FAN / '+g.AstraCombat.fanLevel(p)+' VOLLEY':'CHARGE',230,12,7,P.white);R(c,230,24,104,8,P.ink);R(c,231,26,102*charge,4,ready?P.amber:P.cyan);if(ready)T(c,charge>=.99?'FULL':p.saberCombo===7?'CHARGING':'READY',338,21,7,charge>=.99?P.white:P.amber);T(c,'SCORE '+String(s.score||0).padStart(7,'0'),W-12,12,8,P.white,'right');T(c,'SECTOR '+(s.section||'SIGNAL YARD'),W-12,25,7,P.cyan,'right');c.restore()}
var baseDraw=draw,stageImg=null,stageCanvas=null,playerSheet=null,bossSprite=null,runAtlas=null,saberAtlas=null,assetRetry={stage:0,player:0,boss:0,run:0,saber:0},assetDelay={stage:1000,player:1000,boss:1000,run:1000,saber:1000},assetLoading={stage:false,player:false,boss:false,run:false,saber:false};
function ensureAsset(name,url){var current=name==='stage'?stageImg:name==='player'?playerSheet:name==='boss'?bossSprite:name==='run'?runAtlas:saberAtlas;if(current&&current.complete&&current.naturalWidth)return;var now=Date.now();if(assetLoading[name]||now<assetRetry[name])return;assetLoading[name]=true;var im=new Image();im.onload=function(){assetLoading[name]=false;assetDelay[name]=1000;if(name==='stage')stageImg=im;else if(name==='player')playerSheet=im;else if(name==='boss')bossSprite=im;else if(name==='run')runAtlas=im;else saberAtlas=im};im.onerror=function(){assetLoading[name]=false;assetRetry[name]=Date.now()+assetDelay[name];assetDelay[name]=Math.min(10000,assetDelay[name]*2)};im.src=url;if(name==='stage')stageImg=im;else if(name==='player')playerSheet=im;else if(name==='boss')bossSprite=im;else if(name==='run')runAtlas=im;else saberAtlas=im}
// Each boss may bring its own picture. They are small and only one is ever on screen, so a
// plain cache keyed by path is enough; a boss with no picture falls back to the shared frame.
var bossArt={};
function bossPicture(src){
  if(!src)return null;
  var slot=bossArt[src];
  if(!slot){
    slot=bossArt[src]={img:new Image(),failed:false};
    slot.img.onerror=function(){slot.failed=true};
    slot.img.src=src;
  }
  return (!slot.failed&&slot.img.complete&&slot.img.naturalWidth)?slot.img:null;
}
var proceduralBackground=background;
background=function(c,s,t){
  var cam=(s.camera&&s.camera.x)||0;
  ensureAsset('stage','assets/stage-city.png');
  if(stageImg.complete&&stageImg.naturalWidth){
    c.drawImage(stageImg,-32-((cam*.04)%64),-18,768,432);
    c.fillStyle='rgba(4,18,28,.12)';c.fillRect(0,0,W,H);
    for(var i=0;i<32;i++){var x=(i*83+t*5)%680-20,y=(i*47+t*17)%270;L(c,x,y,x-2,y+7,'rgba(95,207,211,.28)',1)}
    return;
  }
  proceduralBackground(c,s,t);
};
draw=function(c,s){
  s=s||{};
  ensureAsset('stage','assets/stage-city.png');
  if(!stageCanvas){stageCanvas=document.createElement('canvas');stageCanvas.width=W;stageCanvas.height=H}
  var q=stageCanvas.getContext('2d'), d=s;
  ensureAsset('player','assets/player-sheet.png');
  ensureAsset('boss','assets/boss-warden.png');
  if(s.mode==='playing'){ensureAsset('run','assets/player-run-v4.svg');ensureAsset('saber','assets/player-saber-v2.png')}
  if(s.shake){d=Object.assign({},s,{shake:s.reducedMotion?0:s.shake*14})}
  if(s.player&&playerSheet.complete&&playerSheet.naturalWidth){d=Object.assign({},d,{player:null,enemyTarget:s.player})}
  if(s.boss&&s.boss.active&&bossSprite.complete&&bossSprite.naturalWidth){d=Object.assign({},d,{boss:null})}
  q.clearRect(0,0,W,H);baseDraw(q,d);c.clearRect(0,0,W,H);c.drawImage(stageCanvas,0,0);
  if(s.player&&!s.deathFx&&playerSheet.complete&&playerSheet.naturalWidth){drawPlayerSprite(c,s,s.player);saberChargeEffects(c,s,s.player)}
  if(s.player&&!s.deathFx&&s.player.dashTime>0&&playerSheet.complete&&playerSheet.naturalWidth){var gp=s.player,gf=combatFrame(gp),gsw=384,gsh=512;for(var gi=1;gi<4;gi++){var gdx=gx(s,gp.x+gp.w/2)-24-(gp.vx||0)*gi*.022;c.save();c.globalAlpha=.15;if(gp.facing<0){c.translate(gdx+48,0);c.scale(-1,1);gdx=0}c.drawImage(playerSheet,(gf%4)*gsw,Math.floor(gf/4)*gsh,gsw,gsh,gdx,gp.y+gp.h-58,48,64);c.restore()}}
  if(s.boss&&s.boss.active&&bossSprite.complete&&bossSprite.naturalWidth){var bb=s.boss,fk=bb.h/110,dw=140*fk,dh=130*fk,bx=gx(s,bb.x)+bb.w/2-dw/2,by=bb.y-12*fk,recoil=bb.down?Math.sin((s.time||0)*44)*2.5:bb.attack&&String(bb.attack).indexOf('tell-')===0?Math.sin((s.time||0)*18)*2:0;var own=bossPicture(bb.sprite);
  // fit its own picture around the body it collides with, keeping the picture's proportions
  // The body is the machine's core, not its wingspan, so a picture is sized by height and
  // hung on the middle of it: feet on the body's floor, head a little over the top.
  if(own){var k=bb.h*1.16/own.naturalHeight;dw=own.naturalWidth*k;dh=own.naturalHeight*k;bx=gx(s,bb.x)+bb.w/2-dw/2;by=bb.y+bb.h-dh}
  if(!bb.gone){c.save();c.globalAlpha=bb.flash>0?.72:1;if(!own&&bb.look)c.filter=bb.look;if(bb.facing<0){c.translate(bx+dw,0);c.scale(-1,1);bx=0}
    var frame=own||bossSprite;
    c.drawImage(frame,0,0,frame.naturalWidth,frame.naturalHeight,bx,by+recoil,dw,dh);c.restore();}R(c,146,317,348,32,P.ink);T(c,(bb.name||'WARDEN').split('').join(' ')+'  //  '+(bb.title||''),150,322,8,P.cyan);R(c,150,334,340,7,P.deep);R(c,152,336,336*C(bb.hp/bb.maxHp,0,1),3,P.coral)}
  if(s.boss&&s.boss.active){bossEnergy(c,s,s.boss);bossTell(c,s,s.boss);}
  nextBossMarker(c,s);
  playerBreak(c,s);
  if(s.checkpoint&&s.checkpoint.active){var cx=gx(s,s.checkpoint.x);G(c,cx,s.checkpoint.y-18,20,P.cyan,.2);R(c,cx-2,s.checkpoint.y-18,4,18,P.steel);R(c,cx-5,s.checkpoint.y-20,10,4,P.cyan);T(c,'CP',cx-7,s.checkpoint.y-31,7,P.cyan)}
  if(s.flash>0&&!s.reducedMotion){c.save();c.globalAlpha=Math.min(.85,s.flash);c.fillStyle='#ffffff';c.fillRect(0,0,W,H);c.restore()}
  if(s.mode==='playing'&&s.message&&s.messageTimer>0){R(c,180,62,280,24,P.ink);L(c,180,62,460,62,P.amber,1);T(c,s.message,320,70,8,P.white,'center')}
  hud(c,s)
};g.AstraRenderer={draw:draw}})(window);



