const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(process.env.RENDERER_FILE || path.join(__dirname, '..', 'render.js'), 'utf8');

function harness() {
  let now = 0;
  const requests = [], drawn = [];
  const context = new Proxy({}, {get(target, key) {
    if (key in target) return target[key];
    if (String(key).startsWith('create')) return () => ({addColorStop(){}});
    if (key === 'drawImage') return image => {if (image.src) drawn.push(image.src);};
    return () => {};
  }});
  class Image {
    constructor() {this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}
    set src(url) {this._src=url;requests.push(this);}
    get src() {return this._src;}
  }
  const sandbox = {Image,Date:{now:()=>now},document:{createElement:()=>({getContext:()=>context})}};
  sandbox.window = sandbox;
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  const state = {mode:'paused',time:2,camera:{x:0},player:{x:50,y:200,w:28,h:44,hp:8,maxHp:8,facing:1,onGround:true},boss:{x:400,y:160,w:100,h:110,hp:72,maxHp:72,active:true}};
  return {requests,drawn,setTime(t){now=t;},draw(){sandbox.AstraRenderer.draw(context,state);},
    fail(image){image.complete=true;image.naturalWidth=0;if(image.onerror)image.onerror();},
    succeed(image){image.complete=true;image.naturalWidth=1536;image.naturalHeight=1024;if(image.onload)image.onload();}};
}

test('pending image requests are not duplicated across frames',()=>{
  const h=harness();h.draw();assert.equal(h.requests.length,3);
  h.setTime(50000);for(let i=0;i<30;i++)h.draw();assert.equal(h.requests.length,3);
});

test('asynchronous failure recovers while paused and retries from error time',()=>{
  const h=harness();h.draw();h.setTime(5000);h.requests.slice().forEach(h.fail);
  assert.doesNotThrow(()=>h.draw());assert.equal(h.requests.length,3);
  h.setTime(5999);h.draw();assert.equal(h.requests.length,3);
  h.setTime(6000);h.draw();assert.equal(h.requests.length,6);
  h.requests.slice(3).forEach(h.succeed);h.draw();
  for(const url of ['assets/stage-city.png','assets/player-sheet.png','assets/boss-warden.png'])assert.ok(h.drawn.includes(url),'restored drawImage: '+url);
  h.setTime(1000000);for(let i=0;i<20;i++)h.draw();assert.equal(h.requests.length,6);
});

test('repeated failures back off to ten seconds without frame storms',()=>{
  const h=harness();let now=0;h.draw();
  for(const delay of [1000,2000,4000,8000,10000,10000]){
    const count=h.requests.length;h.requests.slice(-3).forEach(h.fail);
    h.setTime(now+delay-1);assert.doesNotThrow(()=>h.draw());assert.equal(h.requests.length,count);
    now+=delay;h.setTime(now);h.draw();assert.equal(h.requests.length,count+3);
  }
});

test('one failed asset does not reload successful or pending assets',()=>{
  const h=harness();h.draw();h.succeed(h.requests[0]);h.fail(h.requests[2]);
  h.setTime(1000);h.draw();assert.equal(h.requests.length,4);
  assert.equal(h.requests[3].src,'assets/boss-warden.png');
  h.succeed(h.requests[1]);h.succeed(h.requests[3]);h.draw();
  assert.ok(h.drawn.includes('assets/player-sheet.png'));assert.ok(h.drawn.includes('assets/boss-warden.png'));
  h.setTime(100000);h.draw();assert.equal(h.requests.length,4);
});
