// Compare every requested reference pose with actual body-only and flame-on game draws.
// Rear armor / weapon identity are reviewed in the images, not inferred from backTurn.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const folder = path.join(__dirname, process.env.RISING_16_QA_DIR || 'rising-back16-20261003');
fs.mkdirSync(folder, { recursive: true });
const referencePath = 'C:/Users/situz/Pictures/Screenshots/スクリーンショット 2026-10-03 150835.png';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage(); const errors = [], failed = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('requestfailed', r => failed.push(r.url()));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.evaluate(() => AstraRenderer.preload());
    await page.waitForFunction(() => AstraSaberRig.risingReady);
    const result = await page.evaluate(async refUrl => {
      const base = new Image(); base.src = 'assets/player-run-v4.svg'; await base.decode();
      const ref = new Image(); ref.src = refUrl; await ref.decode();
      const ends = [.045,.115,.18,.25,.32,.39,.46,.53,.60,.67,.73,.79,.85,.92,.965,1];
      const phases = ends.map((end,i) => ((i ? ends[i-1] : 0) + end) / 2);
      const bounds = [[17,76],[78,160],[162,231],[237,305],[310,379],[385,453],[459,527],[534,605],
        [26,103],[105,178],[181,252],[255,324],[328,397],[402,473],[483,538],[544,591]];
      const feet = [50,109,177,253,326,401,474,548,52,125,200,275,348,421,510,562];
      const cvs = document.createElement('canvas'); cvs.width = 1920; cvs.height = 1800;
      const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false;
      const names = ['参照', '実際の体のみ：右手セイバー／左腕バスター', 'ゲーム内の描画：炎を接続'];
      const draws = [], nativeDraw = c.drawImage.bind(c);
      c.drawImage = function (img) {
        if (img.src && img.src.includes('player-rising-back16-')) draws.push(img.src);
        return nativeDraw(...arguments);
      };
      const poses = [];
      for (let block = 0; block < 2; block++) for (let row = 0; row < 3; row++) {
        const top = block * 900 + row * 300;
        c.fillStyle = row ? '#f5f6f8' : '#0d1420'; c.fillRect(0, top, 1920, 300);
        c.fillStyle = row ? '#243a51' : '#edf3fa'; c.font = 'bold 17px Meiryo';
        c.fillText(`${names[row]} ${block*8+1}～${block*8+8}`, 12, top + 24);
        for (let col = 0; col < 8; col++) {
          const i = block * 8 + col, x = col * 240, y = top + 30;
          c.save(); c.beginPath(); c.rect(x, y, 240, 270); c.clip();
          if (!row) {
            const [l,r] = bounds[i], sy = block ? 115 : 0, scale = 2;
            c.drawImage(ref,l,sy,r-l+1,104,x+90+(l-feet[i])*scale,y+55,(r-l+1)*scale,208);
          } else {
            c.translate(x + 90, y + 236); c.scale(row === 1 ? 2.6 : 1.25, row === 1 ? 2.6 : 1.25);
            AstraSaberRig.draw(c,{image:base,stage:4,phase:phases[i],facing:1,bodyOnly:row===1});
          }
          c.restore(); c.strokeStyle = '#9ca8b8'; c.strokeRect(x,y,240,270);
          c.fillStyle = row ? '#243a51' : '#edf3fa'; c.font = '14px Meiryo';
          c.fillText(`${i+1} / ${i===0?'引き':i===1?'低い背面構え':i<14?'背面':i===14?'正面へ戻る':'腕を開く'}`,x+8,top+293);
        }
      }
      const directions = [];
      c.drawImage = function(img) {
        if(img.src && img.src.includes('player-rising-back16-')) directions.push({xAxis:Math.sign(c.getTransform().a),url:img.src});
        return nativeDraw(...arguments);
      };
      for(const reduced of [false,true]) for(const facing of [1,-1]) for(let i=0;i<16;i++) {
        const p = AstraSaberRig.pose(4,phases[i]), flame=AstraSaberRig.plume(p);
        c.save(); c.translate(-2000,-2000);
        AstraSaberRig.draw(c,{image:base,stage:4,phase:phases[i],facing,reducedMotion:reduced,bodyOnly:true});
        c.restore();
        poses.push({expectedFrame:i,phase:phases[i],facing,reduced,pose:p,flame,
          hit:AstraSaberRig.fireSlices(4,phases[i],AstraRunRig.build)});
      }
      const close = document.createElement('canvas'); close.width=1280; close.height=345;
      const cc=close.getContext('2d');cc.imageSmoothingEnabled=false;
      cc.fillStyle='#f5f6f8';cc.fillRect(0,0,close.width,close.height);
      const selected=[1,4,11,15],labels=['低い背面構え','背面で上昇','背面の追い振り','正面で腕を開く'];
      selected.forEach((i,col)=>{
        cc.save();cc.beginPath();cc.rect(col*320,0,320,345);cc.clip();
        cc.translate(col*320+140,300);cc.scale(4.8,4.8);
        AstraSaberRig.draw(cc,{image:base,stage:4,phase:phases[i],facing:1,bodyOnly:true});cc.restore();
        cc.strokeStyle='#d4dce5';cc.strokeRect(col*320,0,320,345);
        cc.fillStyle='#243a51';cc.font='17px Meiryo';cc.fillText(labels[col],col*320+10,333);
      });
      return {png:cvs.toDataURL(),closeUp:close.toDataURL(),draws,poses,directions};
    }, 'data:image/png;base64,' + fs.readFileSync(referencePath).toString('base64'));
    assert.equal(result.draws.length,32);
    assert.equal(result.draws.filter(s=>s.includes('back16-a-v4')).length,16);
    assert.equal(result.draws.filter(s=>s.includes('back16-b-v4')).length,16);
    assert.equal(result.poses.length,64);
    result.poses.forEach((r,i)=>{
      assert.equal(r.pose.risingFrame,r.expectedFrame,'All16 requested poses have their own time slot');
      assert.equal(result.directions[i].xAxis,r.facing,'Body and attack use one facing transform');
      assert.equal(r.pose.backTurn>=.8,r.expectedFrame>=1&&r.expectedFrame<=13,'Rear period and front return are distinct');
      if(r.phase<.67&&r.flame){
        const p=r.pose,dx=p.hand.x-p.hip.x,dy=p.hand.y-p.hip.y;
        const h={x:p.hip.x+dx*Math.cos(p.spin)-dy*Math.sin(p.spin),y:p.hip.y+dx*Math.sin(p.spin)+dy*Math.cos(p.spin)};
        assert.ok(Math.hypot(h.x-r.flame.root.x,h.y-r.flame.root.y)<.001,'Fire uses the rotated emitter before detachment');
      }
    });
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    fs.writeFileSync(path.join(folder,'reference-16-comparison.png'),Buffer.from(result.png.split(',')[1],'base64'));
    fs.writeFileSync(path.join(folder,'back-poses-closeup.png'),Buffer.from(result.closeUp.split(',')[1],'base64'));
    delete result.closeUp;
    delete result.png;
    fs.writeFileSync(path.join(folder,'reference-16-report.json'),JSON.stringify({...result,errors,failed},null,2));
    console.log(JSON.stringify({bodyAndFireDraws:result.draws.length,poses:result.poses.length,atlases:2,errors,failed}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
