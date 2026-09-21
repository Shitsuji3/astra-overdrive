const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.sampleStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){if(this.buffer)sampleStarts.push(this.buffer.duration);return start.apply(this,a);};});
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');await p.locator('[data-action=boss-rush]').click();await p.waitForTimeout(700);
 const result=await p.evaluate(()=>{AstraAudio.setMuted(false);sampleStarts=[];AstraAudio.sound('saber',{combo:1});AstraAudio.sound('saber-hit');const layered=sampleStarts.slice();AstraAudio.setMuted(true);AstraAudio.sound('saber-hit');return{layered,afterMute:sampleStarts.length};});
 assert.equal(result.layered.length,2);assert.ok(result.layered.some(x=>Math.abs(x-.375)<.001));assert.equal(result.afterMute,2);assert.deepEqual(errors,[]);
 console.log('Provided impact decoded; swing and impact start independently; mute respected; browser errors 0');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
