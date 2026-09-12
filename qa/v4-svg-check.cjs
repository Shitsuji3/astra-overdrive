const fs=require('node:fs');
const {chromium}=require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
const page=await browser.newPage({viewport:{width:1024,height:800}});await page.goto('file:///C:/Users/situz/Documents/ChatGPT/Astragemes/index.html');
const report=await page.evaluate(async()=>{game.running=false;cancelAnimationFrame(game.raf);const im=new Image();im.src='assets/player-run-v4.svg';await im.decode();
const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#14343e';c.fillRect(0,0,512,384);
const edges=[0,314,627,940,1254],rx=[176.5,160,153.5,151.5,170.5,155,154.5,153.5,176,163,152.5,149,171,151.5,159,151],gy=[300,305,303,303,285,280,280,286,268,273,274,268,248,249,244,249];
for(let i=0;i<16;i++){const x=i%4,y=Math.floor(i/4),sx=edges[x],sy=edges[y],sw=edges[x+1]-sx,sh=edges[y+1]-sy,scale=.30,px=x*128+62,py=y*96+86;c.fillStyle='#609399';c.fillRect(x*128,py+2,128,1);c.drawImage(im,sx,sy,sw,sh,px-rx[i]*scale,py-gy[i]*scale,sw*scale,sh*scale);c.fillStyle='white';c.fillText(String(i),x*128+4,y*96+12);}
canvas.id='preview';canvas.style='width:1024px;height:768px;image-rendering:pixelated';document.body.style='margin:0;padding:0;display:block;background:#14343e';document.body.replaceChildren(canvas);return {native:[im.naturalWidth,im.naturalHeight]};});
fs.mkdirSync('qa/motion-v4',{recursive:true});await page.locator('#preview').screenshot({path:'qa/motion-v4/svg-contact.png'});console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
