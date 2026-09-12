const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

function render(source, state) {
  const calls = [];
  let gradientId = 0, canvasId = 0;
  function normalized(v) {
    return v && typeof v === 'object' ? (v.src || v.tag || 'object') : v;
  }
  function context(tag) {
    return new Proxy({}, {
      set(target, name, value) { target[name] = value; calls.push([tag, 'set', name, normalized(value)]); return true; },
      get(target, name) {
        if (name in target) return target[name];
        if (String(name).startsWith('create')) return (...args) => {
          const g = {tag:'gradient'+(++gradientId), addColorStop(...values) { calls.push([g.tag, ...values]); }};
          calls.push([tag, name, ...args, g.tag]); return g;
        };
        return (...args) => calls.push([tag, name, ...args.map(normalized)]);
      }
    });
  }
  class Image {
    constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; }
    set src(value) {
      this._src = value; this.complete = true; this.naturalWidth = 1536; this.naturalHeight = 1024;
      if (this.onload) this.onload();
    }
    get src() { return this._src; }
  }
  const box = {Image, Date, console, document:{createElement() {
    const tag = 'canvas'+(++canvasId), ctx = context(tag);
    return {tag, getContext(){return ctx;}};
  }}};
  box.window = box;
  vm.createContext(box);
  vm.runInContext(source, box);
  box.AstraRenderer.draw(context('main'), state);
  return calls;
}
const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(__dirname, 'baseline-render.js'), 'utf8');
const restored = fs.readFileSync(path.join(root, 'render.js'), 'utf8');
const player = {x:230,y:200,w:28,h:44,hp:6,maxHp:8,facing:1,vx:0,onGround:true,charge:0,animTime:2};
const base = {time:2,mode:'playing',section:'SIGNAL YARD',score:300,camera:{x:180},player,
  platforms:[{x:120,y:300,w:500,h:60,type:'floor'}], enemies:[{x:380,y:160,w:30,type:'drone',hp:2,maxHp:3}],
  bullets:[{x:450,y:150,r:3,team:'player',charged:true}], particles:[],pickups:[]};
const variants = [
  ['idle',{}], ['run',{vx:190}], ['jump',{onGround:false}], ['dash',{dashTime:.2,vx:500}],
  ['wall',{wallDir:1,onGround:false}], ['saber',{saberTime:.2}], ['charge',{charge:1}],
  ['left',{facing:-1,vx:-190}], ['invulnerable',{invuln:1}],
];
for (const [name,changes] of variants) {
  const state = {...base,player:{...player,...changes}};
  assert.deepEqual(render(restored,state),render(original,state),name+' preserves all canvas drawing commands');
}
const boss = {...base,boss:{x:650,y:190,w:100,h:110,hp:36,maxHp:72,active:true,facing:-1,attack:'tell-slam',flash:.1}};
assert.deepEqual(render(restored,boss),render(original,boss),'boss preserves drawing commands');
console.log('PASS: 10 restored rendering states exactly match pre-fix canvas commands.');
