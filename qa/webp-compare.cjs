// Renders the same frozen frame from the working copy (PNG art) and from the built bundle
// (WebP art) and writes them one above the other, so the re-encoding can be judged.
//
//   node server.cjs            (working copy on 4173)
//   node server.cjs release 4174
//   node qa/webp-compare.cjs
const fs=require('fs');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function frame(br,url,tag){
  const page=await br.newPage({viewport:{width:640,height:360}});
  await page.goto(url);
  await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
  await page.waitForTimeout(2500);
  const png=await page.evaluate(async()=>{
    const s=game.state,c=document.querySelector('canvas');
    game.running=false;cancelAnimationFrame(game.raf);AstraAudio.stop();
    s.player.x=420;s.player.y=270;s.player.vx=0;s.player.vy=0;s.player.facing=1;s.player.animTime=1.3;
    s.player.invuln=0;s.time=1.3;s.particles=[];s.bullets=[];
    // freeze every moving thing to the same place, or the diff measures animation, not encoding
    for(const e of s.enemies){e.x=e.baseX;e.y=e.baseY;e.flash=0;}
    s.boss=null;s.pickups.forEach(k=>{k.taken=false});
    s.camera.x=Math.max(0,Math.min(s.player.x-230,s.worldWidth-640));
    await new Promise(r=>setTimeout(r,120));
    AstraRenderer.draw(c.getContext('2d'),s);
    return c.toDataURL();
  });
  fs.writeFileSync('qa/_frame-'+tag+'.png',Buffer.from(png.split(',')[1],'base64'));
  await page.close();
}
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{await frame(br,'http://127.0.0.1:4173/','png');await frame(br,'http://127.0.0.1:4174/','webp');}finally{await br.close()}
console.log('frames captured');})();
