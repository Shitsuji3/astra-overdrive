const fs=require('fs'),{chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const br=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await br.newPage();await page.goto('http://127.0.0.1:4173/');
const d=await page.evaluate(async()=>{
  const img=new Image();img.src='assets/player-run-v4.svg';await img.decode();
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  c.getContext('2d').drawImage(img,0,0);
  return {w:img.naturalWidth,h:img.naturalHeight,png:c.toDataURL()};
});
fs.writeFileSync('qa/run-atlas.png',Buffer.from(d.png.split(',')[1],'base64'));
console.log('atlas',d.w,'x',d.h);}finally{await br.close();}})().catch(e=>{console.error(e);process.exitCode=1});
