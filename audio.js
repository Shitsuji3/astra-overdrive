(function(g){'use strict';
var ac=null,master=.4,music=.45,sfx=.7,muted=false,paused=false,playing=false,resultMode=false,media=null,seGain;
function ensureMedia(){if(!media){media=new Audio('assets/stage1-bgm.mp3');media.loop=true;media.preload='auto'}return media}
function syncMedia(){if(media){media.volume=Math.max(0,Math.min(1,music*master*(paused||resultMode?.5:1)));media.muted=muted}}
function playMedia(){try{var p=ensureMedia().play();if(p&&typeof p.catch==='function')p.catch(function(){})}catch(e){}}
function boot(){if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();seGain=ac.createGain();seGain.connect(ac.destination)}if(ac.state==='suspended')ac.resume();seGain.gain.value=muted?0:sfx*master;prepareChargeSamples();prepareSaberSample();prepareSaberHitSample()}
function tone(f,d,type,v){if(muted||!ac)return;var o=ac.createOscillator(),n=ac.createGain(),now=ac.currentTime;o.type=type;o.frequency.value=f;n.gain.setValueAtTime(.0001,now);n.gain.exponentialRampToValueAtTime(Math.min(.3,Math.max(.001,v)),now+.008);n.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(n).connect(seGain);o.start(now);o.stop(now+d+.02)}
function noise(d,v){if(muted||!ac)return;var b=ac.createBuffer(1,ac.sampleRate*d,ac.sampleRate),a=b.getChannelData(0);for(var i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);var s=ac.createBufferSource(),n=ac.createGain();n.gain.value=Math.min(.12,v);s.buffer=b;s.connect(n).connect(seGain);s.start()}
// Cache layered energy blasts: a short muzzle transient, descending plasma
// harmonics, a low body, and a quiet tail. No downloads or per-shot synthesis.
var blasts={};
function blastBuffer(charged){
  var key=charged?'charge':'shot';if(blasts[key])return blasts[key];
  var rate=ac.sampleRate,duration=charged?.46:.19;
  var buffer=ac.createBuffer(1,Math.ceil(rate*duration),rate),data=buffer.getChannelData(0);
  var phase=0,bodyPhase=0,filtered=0,seed=charged?7301:1907,peak=0;
  for(var i=0;i<data.length;i++){
    var t=i/rate,attack=1-Math.exp(-t/.0015),end=Math.min(1,(duration-t)/.025);
    var frequency=charged?145+1050*Math.exp(-t/ .052):260+1350*Math.exp(-t/.023);
    phase+=Math.PI*2*frequency/rate;
    bodyPhase+=Math.PI*2*((charged?58:100)+(charged?105:140)*Math.exp(-t/.018))/rate;
    seed=(Math.imul(seed,1664525)+1013904223)|0;
    var white=(seed>>>0)/2147483648-1;filtered+=.17*(white-filtered);
    var plasma=(Math.sin(phase+.6*Math.sin(phase*1.97))+ .22*Math.sin(phase*2.01))*Math.exp(-t/(charged?.11:.043));
    var body=Math.sin(bodyPhase)*Math.exp(-t/(charged?.13:.035));
    var snap=(white-filtered)*Math.exp(-t/.008);
    var air=filtered*Math.exp(-t/(charged?.085:.027));
    data[i]=attack*end*(.48*plasma+(charged?.43:.25)*body+.17*snap+.22*air);
  }
  // Tiny decaying reflections add size without washing out rapid fire.
  var dry=new Float32Array(data),delay=Math.round(rate*(charged?.037:.023));
  for(i=0;i<data.length;i++){
    if(i>=delay)data[i]+=.16*dry[i-delay];
    if(i>=delay*2)data[i]+=.055*dry[i-delay*2];
    data[i]*=Math.min(1,(data.length-1-i)/(rate*.012));
    peak=Math.max(peak,Math.abs(data[i]));
  }
  var level=(charged?.59:.4)/Math.max(peak,.001);
  for(i=0;i<data.length;i++)data[i]*=level;
  blasts[key]=buffer;return buffer;
}
function blaster(charged){if(muted||!ac)return;var source=ac.createBufferSource();source.buffer=blastBuffer(charged);source.playbackRate.value=charged?1:.99+Math.random()*.02;source.connect(seGain);source.onended=function(){source.disconnect()};source.start()}
// Cached explosion bodies. Four layers: the crack of the shell splitting, a noise roar
// pushed through a low-pass that closes as it decays, a deep roll under it, and a pitched
// body over a sub. 'explode' is a short bright mob kill; 'boom' is the boss going up.
var booms={};
function explosionBuffer(kind){
  if(booms[kind])return booms[kind];
  var big=kind==='boom',rate=ac.sampleRate,duration=big?2.1:.62;
  var buffer=ac.createBuffer(1,Math.ceil(rate*duration),rate),data=buffer.getChannelData(0);
  var seed=big?9187:4231,low=0,roll=0,bodyPhase=0,subPhase=0,peak=0,i;
  for(i=0;i<data.length;i++){
    var t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)|0;
    var white=(seed>>>0)/2147483648-1;
    var cut=(big?.52:.55)*Math.exp(-t/(big?.30:.11))+(big?.006:.014);
    low+=cut*(white-low);
    roll+=.05*(low-roll);
    var crack=(white-low)*Math.exp(-t/(big?.024:.009));
    var roar=low*Math.exp(-t/(big?.46:.15));
    var deep=roll*Math.exp(-t/(big?.85:.26));
    bodyPhase+=Math.PI*2*((big?64:104)+(big?190:250)*Math.exp(-t/(big?.09:.04)))/rate;
    subPhase+=Math.PI*2*((big?34:52)+(big?26:30)*Math.exp(-t/(big?.5:.2)))/rate;
    var body=Math.sin(bodyPhase)*Math.exp(-t/(big?.26:.085));
    var sub=Math.sin(subPhase)*Math.exp(-t/(big?.75:.24));
    var attack=1-Math.exp(-t/.0006),end=Math.min(1,(duration-t)/.08);
    data[i]=attack*end*(.85*roar+(big?1.1:.7)*deep+.6*body+(big?.95:.6)*sub+(big?.9:.55)*crack);
  }
  // two reflections give the blast a room without smearing the hit
  var dry=new Float32Array(data),delay=Math.round(rate*(big?.085:.041));
  for(i=0;i<data.length;i++){
    if(i>=delay)data[i]+=(big?.34:.2)*dry[i-delay];
    if(i>=delay*2)data[i]+=(big?.17:.07)*dry[i-delay*2];
    peak=Math.max(peak,Math.abs(data[i]));
  }
  var level=(big?.92:.62)/Math.max(peak,.001);
  for(i=0;i<data.length;i++)data[i]*=level;
  booms[kind]=buffer;return buffer;
}
var lastExplosion=-1;
function explosion(kind){
  if(muted||!ac)return;
  var big=kind==='boom',now=ac.currentTime;
  var source=ac.createBufferSource(),gain=ac.createGain();
  source.buffer=explosionBuffer(kind);
  source.playbackRate.value=big?1:.93+Math.random()*.14;   // no two kills sound alike
  // kills that land together must not stack into clipping
  gain.gain.value=(big?1:.85)*(now-lastExplosion<.09?.55:1);
  lastExplosion=now;
  source.connect(gain).connect(seGain);
  source.onended=function(){source.disconnect();gain.disconnect()};
  source.start(now);
}
var saberHitSample=null,saberHitLoading=false;
function prepareSaberHitSample(){
 if(saberHitSample||saberHitLoading||!ac||!g.AstraSaberHitSample)return;
 saberHitLoading=true;var raw=atob(g.AstraSaberHitSample),bytes=new Uint8Array(raw.length);
 for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 ac.decodeAudioData(bytes.buffer).then(function(b){saberHitSample=b;saberHitLoading=false;},function(){saberHitLoading=false;});
}
function saberHitSound(){
 if(muted||!ac||!saberHitSample)return;
 var source=ac.createBufferSource();source.buffer=saberHitSample;source.connect(seGain);
 source.onended=function(){source.disconnect();};source.start();
}
var saberSample=null,saberLoading=false;
function prepareSaberSample(){
  if(saberSample||saberLoading||!ac||!g.AstraSaberSample)return;
  saberLoading=true;var raw=atob(g.AstraSaberSample),bytes=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  ac.decodeAudioData(bytes.buffer).then(function(buffer){saberSample=buffer;saberLoading=false},function(){saberLoading=false});
}
function saberSound(stage){
  if(muted||!ac||!saberSample)return;
  var source=ac.createBufferSource();source.buffer=saberSample;
  source.connect(seGain);source.onended=function(){source.disconnect()};source.start();
}
var charging=null,chargeSamples={},sampleLoading=false;
function prepareChargeSamples(){
  if(sampleLoading||chargeSamples.hold||!ac||!g.AstraChargeSamples)return;
  sampleLoading=true;
  function decode(name){var raw=atob(g.AstraChargeSamples[name]),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return ac.decodeAudioData(bytes.buffer)}
  Promise.all([decode('hold'),decode('fire')]).then(function(buffers){chargeSamples.hold=buffers[0];chargeSamples.fire=buffers[1];sampleLoading=false;},function(){sampleLoading=false;});
}
function stopCharge(){
  if(!charging)return;var voice=charging;charging=null;var now=ac.currentTime;
  voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.008);
  voice.source.stop(now+.045);
}
function setCharge(level){
  level=Math.max(0,Math.min(1,Number(level)||0));
  if(level<.08||muted||paused||resultMode||!playing){stopCharge();return;}
  boot();if(charging||!chargeSamples.hold)return;
  var source=ac.createBufferSource(),gain=ac.createGain(),now=ac.currentTime;
  source.buffer=chargeSamples.hold;source.loop=true;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1.8,now+.02);
  source.connect(gain).connect(seGain);
  source.onended=function(){source.disconnect();gain.disconnect()};
  charging={source:source,gain:gain};source.start(now);
}
function chargeShot(){
  if(muted||!ac||!chargeSamples.fire)return;
  var source=ac.createBufferSource(),gain=ac.createGain();source.buffer=chargeSamples.fire;
  gain.gain.value=1.1;source.connect(gain).connect(seGain);
  source.onended=function(){source.disconnect();gain.disconnect()};source.start();
}
function sound(n,detail){boot();if(n==='saber-hit'){saberHitSound();return;}if(n==='thrust'){stopCharge();chargeShot();saberSound(6);return;}if(n==='saber'){saberSound(detail&&detail.combo||1);return;}if(n==='explode'||n==='boom'){explosion(n);return;}if(n==='shot'||n==='charge'){stopCharge();if(n==='charge')chargeShot();else blaster(false);return;}var m={move:[180,.045,'square',.12],select:[440,.09,'square',.18],jump:[220,.1,'square',.14],dash:[90,.12,'sawtooth',.18],hurt:[80,.18,'sawtooth',.2],pickup:[740,.08,'sine',.15],checkpoint:[520,.2,'square',.18],boss:[130,.2,'sawtooth',.2],death:[70,.35,'sawtooth',.2],victory:[660,.25,'square',.2]};var x=m[n]||m.select;tone(x[0],x[1],x[2],x[3])}
g.AstraAudio={sound:sound,setCharge:setCharge,start:function(){stopCharge();boot();paused=false;resultMode=false;var m=ensureMedia();m.currentTime=0;playing=true;syncMedia();playMedia()},stop:function(){stopCharge();playing=false;paused=false;resultMode=false;syncMedia();if(media){media.pause();media.currentTime=0}},setMaster:function(v){master=Math.max(0,Math.min(1,Number(v)||0));syncMedia();if(seGain)seGain.gain.value=muted?0:sfx*master},setMusic:function(v){music=Math.max(0,Math.min(1,Number(v)||0));syncMedia()},setSfx:function(v){sfx=Math.max(0,Math.min(1,Number(v)||0));if(seGain)seGain.gain.value=muted?0:sfx*master},setMuted:function(v){muted=!!v;if(muted)stopCharge();if(seGain)seGain.gain.value=muted?0:sfx*master;syncMedia()},setResultMode:function(v){resultMode=!!v;if(resultMode)stopCharge();syncMedia()},setPaused:function(v){paused=!!v;if(paused)stopCharge();syncMedia()}}})(window);
