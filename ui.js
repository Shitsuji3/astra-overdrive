(function(){'use strict';
var modalReturn=null;var $=function(s){return document.querySelector(s)},title=$('#title'),shell=$('#game-shell'),overlay=$('#overlay'),modal=$('#modal'),picker=$('#stage-select'),menu=[].slice.call(document.querySelectorAll('.menu-item')),selected=0,game=null,key='astra-overdrive-save',settings={};try{settings=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){}
function save(){try{localStorage.setItem(key,JSON.stringify(settings))}catch(e){}}
function hud(s){if(!s)return;var el=document.querySelector('#hud-time');if(!el)return;var t=Math.floor(s.timeElapsed||0);el.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}function active(n){var v=menu.filter(function(b){return !b.hidden});selected=(n+v.length)%v.length;menu.forEach(function(b,i){var yes=!b.hidden&&v.indexOf(b)===selected;b.classList.toggle('active',yes);if(yes)b.focus()})}
function guide(){modalReturn=document.activeElement;modal.hidden=false;$('#modal-content').innerHTML='<div class="eyebrow">PILOT MANUAL</div><h2>操作ガイド</h2><table class="guide-table"><tr><th>操作</th><th>キーボード</th><th>ゲームパッド</th></tr><tr><td>移動</td><td>A / D　← / →</td><td>左スティック</td></tr><tr><td>ジャンプ</td><td>Space / Z</td><td>A</td></tr><tr><td>ダッシュ</td><td>Shift / X</td><td>B</td></tr><tr><td>射撃</td><td>J または左クリック（離すと1発）</td><td>X</td></tr><tr><td>セイバー</td><td>K または右クリック</td><td>Y</td></tr><tr><td>溜め突き</td><td>K 長押し→READYで離す</td><td>Y 長押し</td></tr><tr><td>斬り上げ</td><td>↑ / W ＋ セイバー</td><td>上 ＋ Y</td></tr><tr><td>壁蹴り</td><td>壁につかまり＋ジャンプ</td><td>壁際＋A</td></tr></table><p>ESC / P / Start　ポーズ</p><p>メニュー：十字キー / 左スティックで選択、A で決定、B で戻る（設定のスライダーは左右）</p>'}
function settingsModal(){modalReturn=document.activeElement;modal.hidden=false;var m=settings.music===undefined?.45:settings.music,s=settings.sfx===undefined?.7:settings.sfx;$('#modal-content').innerHTML='<div class="eyebrow">SYSTEM CONFIG</div><h2>システム設定</h2><label class="settings-row">BGM <input id="music" type="range" min="0" max="100" value="'+Math.round(m*100)+'"></label><label class="settings-row">SE <input id="sfx" type="range" min="0" max="100" value="'+Math.round(s*100)+'"></label><label class="settings-row">MUTE <input id="mute" type="checkbox" '+(settings.muted?'checked':'')+'></label><label class="settings-row">EASY MODE <input id="easy" type="checkbox" '+(settings.easy?'checked':'')+'></label><label class="settings-row">REDUCED MOTION <input id="motion" type="checkbox" '+(settings.motion?'checked':'')+'></label><button data-action="close">CLOSE</button>';['music','sfx','mute','easy','motion'].forEach(function(id){$('#'+id).onchange=function(){settings.music=+$('#music').value/100;settings.sfx=+$('#sfx').value/100;settings.muted=$('#mute').checked;settings.easy=$('#easy').checked;settings.motion=$('#motion').checked;save();AstraAudio.setMusic(settings.music);AstraAudio.setSfx(settings.sfx);AstraAudio.setMuted(settings.muted);if(game)game.setOptions({reducedMotion:settings.motion})}})}
function closeModal(){modal.hidden=true;if(modalReturn&&modalReturn.isConnected)modalReturn.focus();else if(game){var b=$('#overlay-actions button');if(b)b.focus()}}
function stageList(){return (window.AstraStages&&AstraStages.list)||[]}
function armedStage(){var l=stageList();if(!l.length)return null;
  for(var i=0;i<l.length;i++)if(l[i].id===settings.stage)return l[i];
  return l[0]}
function clock(t){t=Math.floor(t||0);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function recordOf(id){return (settings.records&&settings.records[id])||{}}
function showArmed(){var a=armedStage(),el=$('#current-stage');if(el&&a)el.textContent='SELECTED // '+a.number+'. '+a.name}
// The select screen is a board: the missions ring a map of the city the way a campaign map
// reads. Where a mission sits on the board is here; where it sits on the map is in stages.js.
// Columns run 1..5 across, rows are the top strip, the map, then the bottom strip. There are
// eight reserved spots and a centre; a ninth run stage would simply flow in after them.
var BOARD=[[1,1],[2,1],[4,1],[5,1],[1,3],[2,3],[4,3],[5,3]],CENTRE=[3,1];
// The plate the city stands on, and the darker core inside it.
var PLATE='M60 118 L118 66 L214 38 L330 26 L470 24 L610 30 L716 48 L806 76 L852 110 '+
  'L840 156 L764 190 L640 208 L490 216 L342 212 L210 198 L110 168 Z';
var CORE='M300 96 L430 62 L590 66 L690 104 L676 160 L520 186 L372 176 L300 138 Z';
// Blocks of city, placed by hand so none of them sits under a mission pin.
var DISTRICTS=[[128,120,34,22],[170,94,26,16],[250,150,40,18],[300,56,30,14],[352,92,22,26],
  [402,158,34,16],[506,42,26,18],[548,148,30,20],[620,114,26,22],[700,148,34,18],
  [726,94,24,16],[770,58,30,14],[214,120,28,14],[462,150,30,14]];
var nodes=[],pins={},pick=0;

function bossName(id){return (window.AstraBosses?AstraBosses.get(id):{}).name||id}
function facingOf(def){
  var frames=(def.bosses||[]).map(bossName);
  return frames.length>1?frames.length+' FRAMES':frames[0]||'';
}
// A run stage is announced by whoever waits at the end of it. A gauntlet has no single face,
// so it gets a mark of its own instead of borrowing one boss's portrait.
function faceOf(def){
  if(def.kind==='gauntlet')return '<svg class="node-emblem" viewBox="0 0 48 48" aria-hidden="true">'+
    '<circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="13"/>'+
    '<path d="M24 3v42M3 24h42" class="thin"/>'+
    '<text x="24" y="29" text-anchor="middle">x'+(def.bosses||[]).length+'</text></svg>';
  var last=(def.bosses||[])[(def.bosses||[]).length-1];
  return last?'<img src="assets/bosses/'+last+'-portrait.webp" alt="" loading="lazy">':'';
}

// The map is drawn once per opening and then only lit differently, so the sweep on the active
// site does not restart every time the cursor moves.
function buildMap(list){
  var routes='',marks='',grid='',i,c=null;
  list.forEach(function(d){if(d.kind==='gauntlet'&&d.site)c=d.site});
  for(i=72;i<856;i+=48)grid+='<line x1="'+i+'" y1="16" x2="'+i+'" y2="220"/>';
  for(i=34;i<216;i+=26)grid+='<line x1="48" y1="'+i+'" x2="864" y2="'+i+'"/>';
  var blocks=DISTRICTS.map(function(d){
    return '<rect x="'+d[0]+'" y="'+d[1]+'" width="'+d[2]+'" height="'+d[3]+'"/>';
  }).join('');
  list.forEach(function(d){
    if(!d.site||!c||d.kind==='gauntlet')return;
    routes+='<line x1="'+c.x+'" y1="'+c.y+'" x2="'+d.site.x+'" y2="'+d.site.y+'"/>';
  });
  list.forEach(function(d){
    if(!d.site)return;
    marks+='<g class="site'+(d.kind==='gauntlet'?' core':'')+'" data-site="'+d.id+'" '+
      'transform="translate('+d.site.x+' '+d.site.y+')">'+
      '<circle class="hit" r="24"/><circle class="halo" r="19"/>'+
      '<path class="pip" d="M0 -11 L11 0 L0 11 L-11 0 Z"/>'+
      '<text y="4">'+(d.kind==='gauntlet'?'\u2605':d.number)+'</text></g>';
  });
  return '<svg viewBox="0 0 900 230" preserveAspectRatio="xMidYMid meet" focusable="false">'+
    '<defs><clipPath id="plate-clip"><path d="'+PLATE+'"/></clipPath></defs>'+
    '<path class="plate" d="'+PLATE+'"/>'+
    '<g class="grid" clip-path="url(#plate-clip)">'+grid+'</g>'+
    '<path class="core-plate" d="'+CORE+'"/>'+
    '<g class="blocks" clip-path="url(#plate-clip)">'+blocks+'</g>'+
    '<g class="routes">'+routes+'</g>'+marks+'</svg>';
}

function showDetail(def){
  var host=$('#stage-detail');if(!host)return;
  var r=recordOf(def.id);
  host.innerHTML='<span class="detail-no">'+String(def.number).padStart(2,'0')+'</span>'+
    '<span class="detail-main"><b>'+def.name+'</b><small>'+def.subtitle+'</small>'+
    '<em>'+def.blurb+'</em></span>'+
    '<span class="detail-side"><i>BOSS // '+facingOf(def)+'</i>'+(r.cleared
      ? '<u>CLEAR</u>BEST '+(r.bestScore||0)+'\u3000TIME '+clock(r.bestTime)
      : '<u class="locked">NO RECORD</u>')+'</span>';
}

function markPick(n){
  if(!nodes.length)return;
  pick=(n+nodes.length)%nodes.length;
  nodes.forEach(function(b,i){b.classList.toggle('active',i===pick);if(i===pick)b.focus()});
  var def=nodes[pick].def;
  for(var id in pins)pins[id].setAttribute('class',pins[id].dataset.base+(id===def.id?' on':''));
  showDetail(def);
}
// The cursor moves by where the tiles actually are on screen, so the same four keys work
// whether the board is wrapped around the map or stacked into a plain grid on a phone.
// Straight ahead beats far off to one side; with nothing ahead it comes round the other edge.
function stepPick(dx,dy){
  var here=nodes[pick].getBoundingClientRect();
  var fx=here.left+here.width/2,fy=here.top+here.height/2,best=pick,score=Infinity;
  nodes.forEach(function(n,i){
    if(i===pick)return;
    var r=n.getBoundingClientRect(),x=r.left+r.width/2-fx,y=r.top+r.height/2-fy;
    var along=dx?x*dx:y*dy,across=dx?Math.abs(y):Math.abs(x);
    var s=along>1?along+across*3:1e6+along+across*3;
    if(s<score){score=s;best=i}
  });
  markPick(best);
}

function buildPicker(){
  var board=$('#stage-board'),map=$('#stage-map');if(!board)return;
  var list=stageList();
  nodes.forEach(function(b){b.remove()});nodes=[];pins={};
  map.innerHTML=buildMap(list);
  [].slice.call(map.querySelectorAll('.site')).forEach(function(g){
    g.dataset.base=g.getAttribute('class');pins[g.dataset.site]=g;
    // the map is a second way to reach the same missions: a pin moves the cursor onto its own
    g.addEventListener('click',function(){
      for(var i=0;i<nodes.length;i++)if(nodes[i].def.id===g.dataset.site){
        if(i!==pick)AstraAudio.sound('move');
        markPick(i);return;
      }
    });
  });
  var runs=list.filter(function(d){return d.kind!=='gauntlet'});
  list.forEach(function(def){
    var r=recordOf(def.id),spot=def.kind==='gauntlet'?CENTRE:BOARD[runs.indexOf(def)];
    var b=document.createElement('button');
    b.className='stage-node'+(def.kind==='gauntlet'?' node-core':'')+(spot?'':' node-spare');
    b.type='button';b.setAttribute('role','menuitem');
    b.dataset.action='launch-stage';b.dataset.stage=def.id;
    // a mission with no reserved spot flows into the grid rather than going missing
    if(spot){b.style.setProperty('--col',spot[0]);b.style.setProperty('--row',spot[1])}
    b.def=def;
    b.innerHTML='<span class="node-face">'+faceOf(def)+'</span>'+
      '<span class="node-no">'+String(def.number).padStart(2,'0')+'</span>'+
      '<b class="node-name">'+def.name+'</b>'+
      '<span class="stage-rec">'+(r.cleared?'<b>CLEAR</b>':'<span class="locked">NO RECORD</span>')+'</span>';
    board.appendChild(b);nodes.push(b);
  });
  var armed=armedStage(),at=0;
  nodes.forEach(function(b,i){if(armed&&b.def.id===armed.id)at=i});
  markPick(at);
}
function openPicker(){title.hidden=true;picker.hidden=false;buildPicker()}
// Backing out keeps whatever the cursor was on, so the title's SELECTED line and the next
// the next launch agree with the last thing that was looked at.
function closePicker(){if(nodes[pick]){settings.stage=nodes[pick].def.id;save()}picker.hidden=true;title.hidden=false;showArmed();active(0)}
function pause(){overlay.hidden=false;$('#overlay-kicker').textContent='MISSION CONTROL';$('#overlay-title').textContent='PAUSED';$('#overlay-copy').textContent='MISSION SUSPENDED';$('#overlay-actions').innerHTML='<button data-action="resume">RESUME / 再開</button><button data-action="guide">操作ガイド</button><button data-action="settings">システム設定</button><button data-action="fullscreen">FULLSCREEN</button><button data-action="title">ABORT / タイトルへ</button>'}
function record(p){
  var id=(p.stage&&p.stage.id)||(armedStage()||{}).id;if(!id)return {};
  var all=settings.records||(settings.records={}),r=all[id]||(all[id]={});
  var t=Math.floor(p.timeElapsed||0);
  r.cleared=true;r.bestScore=Math.max(r.bestScore||0,p.score||0);
  if(!r.bestTime||t<r.bestTime)r.bestTime=t;
  save();return r;
}
function finish(kind,p){if(kind==='victory'){var best=0;try{best=+localStorage.getItem(key+'-best')||0}catch(e){}best=Math.max(best,p.score||0);try{localStorage.setItem(key+'-best',best)}catch(e){}var r=record(p);var t=Math.floor(p.timeElapsed||0),rank=(p.score||0)>1500?'S':(p.score||0)>800?'A':'B';overlay.hidden=false;$('#overlay-title').textContent='MISSION COMPLETE';$('#overlay-kicker').textContent=((p.stage&&p.stage.name)||'MISSION');$('#overlay-copy').innerHTML='TIME '+clock(t)+'<br>KILLS '+(p.kills||0)+'　SCORE '+(p.score||0)+'<br>STAGE BEST '+(r.bestScore||0)+'　RANK '+rank;$('#overlay-actions').innerHTML='<button data-action="replay">REPLAY / もう一度</button><button data-action="title">TITLE / 戻る</button>'}else{overlay.hidden=false;$('#overlay-title').textContent='SYSTEM FAILURE';$('#overlay-copy').textContent='再起動して作戦を継続しますか？';$('#overlay-actions').innerHTML='<button data-action="retry">RETRY / 再試行</button><button data-action="title">TITLE / 戻る</button>'}}
function start(){AstraAudio.start();AstraAudio.setPaused(false);title.hidden=true;shell.hidden=false;overlay.hidden=true;modal.hidden=true;if(!game)game=new NeonGame($('#game'),{onEvent:function(t,p){if(t==='charge-state'){AstraAudio.setCharge(p.level);return;}if(t!=='sound')hud(p);if(t==='start'){overlay.hidden=true;AstraAudio.setResultMode(false);AstraAudio.setPaused(false)}if(t==='sound')AstraAudio.sound(p.name,p);if(t==='pause-request'){AstraAudio.setPaused(true);pause()}if(t==='resume'){AstraAudio.setPaused(false);overlay.hidden=true}if(t==='death'){AstraAudio.setResultMode(true);AstraAudio.sound('death');finish('death',p)}if(t==='victory'){AstraAudio.setResultMode(true);AstraAudio.sound('victory');finish('victory',p)}}});window.game=game;game.setOptions({reducedMotion:!!settings.motion});var armed=armedStage();game.start({difficulty:settings.easy?'easy':'normal',character:'astra',stage:armed&&armed.id})}
document.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b)return;var a=b.dataset.action;if(a==='continue')start();else if(a==='stage-select'){openPicker();AstraAudio.sound('select')}else if(a==='select-back'){closePicker();AstraAudio.sound('move')}else if(a==='launch-stage'){settings.stage=b.dataset.stage;save();picker.hidden=true;showArmed();start()}else if(a==='guide')guide();else if(a==='settings')settingsModal();else if(a==='close'){modal.hidden=true}else if(a==='resume'){overlay.hidden=true;AstraAudio.setPaused(false);game.resume()}else if(a==='retry'){overlay.hidden=true;AstraAudio.setPaused(false);game.retry()}else if(a==='replay'){start()}else if(a==='fullscreen'&&document.documentElement.requestFullscreen){var full=document.documentElement.requestFullscreen();if(full&&full.catch)full.catch(function(){})}else if(a==='title'){AstraAudio.stop();AstraAudio.setPaused(true);overlay.hidden=true;modal.hidden=true;if(game)game.toTitle();shell.hidden=true;picker.hidden=true;title.hidden=false;showArmed();active(0)}});
document.addEventListener('keydown',function(e){if(!modal.hidden){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeModal()}return}if(!picker.hidden){
  if(e.key==='Escape'){e.preventDefault();closePicker();return}
  if(e.key==='ArrowRight'){e.preventDefault();stepPick(1,0);AstraAudio.sound('move')}
  if(e.key==='ArrowLeft'){e.preventDefault();stepPick(-1,0);AstraAudio.sound('move')}
  if(e.key==='ArrowDown'){e.preventDefault();stepPick(0,1);AstraAudio.sound('move')}
  if(e.key==='ArrowUp'){e.preventDefault();stepPick(0,-1);AstraAudio.sound('move')}
  if(e.key==='Enter'&&document.activeElement.classList.contains('stage-node')){e.preventDefault();document.activeElement.click()}
  return}
if(!title.hidden){if(e.key==='ArrowDown'){e.preventDefault();active(selected+1);AstraAudio.sound('move')}if(e.key==='ArrowUp'){e.preventDefault();active(selected-1);AstraAudio.sound('move')}if(e.key==='Enter'&&document.activeElement.classList.contains('menu-item')){e.preventDefault();document.activeElement.click()}}},true);
document.querySelectorAll('[data-input]').forEach(function(b){var a=b.dataset.input;var press=0;b.addEventListener('pointerdown',function(e){e.preventDefault();if(b.setPointerCapture)try{b.setPointerCapture(e.pointerId)}catch(z){}press++;if(a==='pause'){if(game)game.pause()}else if(game)game.setInput(a,true)});// The engine latches the press, so letting go here can be immediate. Holding the button on
// for a couple of animation frames used to be the way round a lost tap, and it was not
// reliable: animation frames and game steps do not come at the same rate.
function release(){if(a==='pause'||!game)return;game.setInput(a,false)}b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release)});
// A gamepad works every menu the way the keyboard does: the title, stage select, the guide and settings,
// and the pause and result panels. The D-pad or left stick moves, A confirms, B goes back, and Start
// confirms on the title and in stage select and closes a modal. Confirm and back act when the button is
// let go, and only if it went down on the same screen. Acting on the press handed the game a button still
// held down - A on RESUME came back as a jump - and the Start that pauses the game would, on its release,
// have acted on the pause panel it had just opened. While a modal is open the game leaves Start alone, so it
// cannot resume underneath the modal.
var PAD={dead:.5,delay:.38,repeat:.12},padHeld={},padArmed={},padWas=null;
function padScreen(){return !modal.hidden?'modal':!picker.hidden?'picker':!overlay.hidden?'overlay':!title.hidden?'title':null}
// The pad's cursor on things that have no active state of their own: panel buttons and settings.
function padFocus(el){[].slice.call(document.querySelectorAll('.pad-focus')).forEach(function(x){if(x!==el)x.classList.remove('pad-focus')});if(el){el.classList.add('pad-focus');el.focus()}}
function padList(screen){
  if(screen==='overlay')return [].slice.call(document.querySelectorAll('#overlay-actions button'));
  var own=[].slice.call(document.querySelectorAll('#modal-content input,#modal-content button'));
  return own.length?own:[modal.querySelector('.close')].filter(Boolean);
}
function padStep(screen,dir){
  var items=padList(screen);if(!items.length)return;
  var i=items.indexOf(document.activeElement);
  i=i<0?(dir>0?0:items.length-1):(i+dir+items.length)%items.length;
  padFocus(items[i]);AstraAudio.sound('move');
}
// Left and right slide a volume in steps of five and save it through the slider's own change handler.
function padNudge(el,dir){
  if(!el||el.type!=='range')return false;
  var v=Math.max(+el.min,Math.min(+el.max,+el.value+dir*5));
  if(v!==+el.value){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));AstraAudio.sound('move')}
  return true;
}
function padMove(screen,dx,dy){
  if(screen==='title'){if(dy){active(selected+dy);AstraAudio.sound('move')}return}
  if(screen==='picker'){if(nodes.length){stepPick(dx,dy);AstraAudio.sound('move')}return}
  if(screen==='modal'&&dx&&padNudge(document.activeElement,dx))return;
  padStep(screen,dy||dx);
}
function padConfirm(screen){
  var el=document.activeElement;
  if(screen==='title'){if(!el||!el.classList.contains('menu-item'))el=menu.filter(function(b){return !b.hidden})[selected]}
  else if(screen==='picker'){if(!el||!el.classList.contains('stage-node'))el=nodes[pick]}
  else{
    var items=padList(screen);if(items.indexOf(el)<0)el=items[0];
    if(el&&el.type==='range')return;
    if(el&&el.dataset.action==='close'){closeModal();return}
  }
  if(el)el.click();
}
function padBack(screen){
  if(screen==='modal')closeModal();
  else if(screen==='picker')closePicker();
  else if(screen==='overlay'&&game&&game.state&&game.state.mode==='paused'){var r=$('#overlay-actions [data-action=resume]');if(r)r.click();return}
  else return;
  AstraAudio.sound('move');
}
function padRead(){
  var pads=navigator.getGamepads?navigator.getGamepads():null;if(!pads)return null;
  var g=pads[0];for(var i=0;!g&&i<pads.length;i++)g=pads[i];if(!g)return null;
  var on=function(n){return !!(g.buttons[n]&&g.buttons[n].pressed)},x=g.axes[0]||0,y=g.axes[1]||0;
  return{up:on(12)||y<-PAD.dead,down:on(13)||y>PAD.dead,left:on(14)||x<-PAD.dead,right:on(15)||x>PAD.dead,a:on(0),b:on(1),start:on(9)};
}
function padFrame(now){
  requestAnimationFrame(padFrame);
  var screen=padScreen(),s=padRead(),t=now/1000;
  if(game)game.menuOwnsPad=!modal.hidden;
  if(screen!==padWas){padArmed={};padWas=screen}
  if(!s){padHeld={};return}
  [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]].forEach(function(d){
    var k=d[0],h=padHeld[k];
    if(!s[k]){delete padHeld[k];return}
    // a direction already held in play when a menu appears waits to be pressed again
    if(!h){padHeld[k]={next:screen?t+PAD.delay:Infinity};if(screen)padMove(screen,d[1],d[2])}
    else if(screen&&t>=h.next){h.next=t+PAD.repeat;padMove(screen,d[1],d[2])}
  });
  ['a','b','start'].forEach(function(k){
    if(s[k]){if(!padHeld[k]){padHeld[k]=true;padArmed[k]=screen}return}
    if(!padHeld[k])return;
    delete padHeld[k];
    var armed=padArmed[k];delete padArmed[k];
    if(!screen||armed!==screen)return;
    if(k==='a')padConfirm(screen);
    else if(k==='b')padBack(screen);
    else if(screen==='title'||screen==='picker')padConfirm(screen);
    else if(screen==='modal')padBack(screen);
    // on the pause panel Start belongs to the game, which resumes on the press
    else if(!(game&&game.state&&game.state.mode==='paused'))padConfirm(screen);
  });
}
requestAnimationFrame(padFrame);
document.addEventListener('keydown',function(){padFocus(null)},true);
document.addEventListener('pointerdown',function(){padFocus(null)},true);
AstraAudio.setMusic(settings.music===undefined?.45:settings.music);AstraAudio.setSfx(settings.sfx===undefined?.7:settings.sfx);AstraAudio.setMuted(!!settings.muted);setInterval(function(){if(game&&game.state)hud(game.state)},250);showArmed();active(0);
})();
