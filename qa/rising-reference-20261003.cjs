// Reproducible pose comparison and real-input playback for the user's rising-cut sheet.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const label = process.argv[2] || 'after';
const outDir = path.join(__dirname, process.env.RISING_QA_DIR || 'rising-reference-20261003');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/');
    await page.locator('[data-action="boss-rush"]').click();
    await page.waitForFunction(() => window.game && game.state && game.state.mode === 'playing');
    await page.evaluate(() => AstraRenderer.preload());
    if (label !== 'before') await page.waitForFunction(() => AstraSaberRig.risingReady);
    if (label === 'before') {
      // Load the saved rig in this isolated QA page; the workspace game stays on the new rig.
      const savedRig = process.env.RISING_BASE_ZIP
        ? execFileSync('C:/Users/situz/AppData/Local/Programs/Python/Python313/python.exe', ['-c', 'import sys,zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("assets/saber-rig.js"))', process.env.RISING_BASE_ZIP], { encoding: 'utf8' })
        : execFileSync('git', ['show', `${process.env.RISING_BASE_REF || '11fd1ed'}:assets/saber-rig.js`], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
      await page.evaluate(source => { (0, eval)(source); }, savedRig);
    }
    const result = await page.evaluate(async () => {
      const image = new Image();
      image.src = 'assets/player-run-v4.svg';
      await image.decode();
      const poses = [[0, 0], [4, 0], [4, .035], [4, .085], [4, .20], [4, .46], [4, .67], [4, .88], [5, 0], [5, .2], [5, .45]];
      const sheets = {}, geometry = [];
      const rigidPart = AstraRunRig.rigidPart;
      let frontHead = 0, frontBody = 0;
      AstraRunRig.rigidPart = function (ctx, im, cell, mask) {
        if (mask.length === 5 && mask[0][0] === 157 && mask[0][1] === 73) frontHead++;
        if (mask.length === 8 && mask[0][0] === 148 && mask[0][1] === 136) frontBody++;
        return rigidPart.apply(this, arguments);
      };
      for (const reduced of [false, true]) for (const facing of [1, -1]) {
        const sheet = document.createElement('canvas');
        sheet.width = 11 * 340; sheet.height = 350;
        const c = sheet.getContext('2d');
        c.fillStyle = '#f7f7f7'; c.fillRect(0, 0, sheet.width, sheet.height);
        for (let i = 0; i < poses.length; i++) {
          const [stage, phase] = poses[i];
          const pose = stage ? AstraSaberRig.pose(stage, phase) : null;
          const row = { stage, phase, facing, reduced, pose, flame: pose ? AstraSaberRig.plume(pose) : null,
            hit: stage ? AstraSaberRig.fireSlices(stage, phase, AstraRunRig.build) : [] };
          geometry.push(row); frontHead = frontBody = 0;
          c.save(); c.translate(i * 340 + 120, 300); c.scale(2, 2);
          if (stage) assertDraw(AstraSaberRig.draw(c, { image, stage, phase, facing, reducedMotion: reduced }));
          else AstraRunRig.draw(c, { image, mode: 'idle', phase: 0, facing });
          row.frontHead = frontHead; row.frontBody = frontBody;
          c.restore();
          c.strokeStyle = '#d5d9de'; c.strokeRect(i * 340, 0, 340, 350);
          c.fillStyle = '#41505e'; c.font = '12px sans-serif';
          c.fillText(`${i + 1}: ${stage ? `stage ${stage} / ${phase}` : 'idle'}`, i * 340 + 6, 338);
        }
        sheets[`${facing < 0 ? 'left' : 'right'}${reduced ? '-reduced' : ''}`] = sheet.toDataURL();
      }
      AstraRunRig.rigidPart = rigidPart;
      function assertDraw(drawn) { if (!drawn) throw Error('Saber rig art failed to draw'); }
      game.start({ stage: 'signal-yard' });
      game.running = false; cancelAnimationFrame(game.raf);
      const s = game.state, p = s.player;
      s.enemies = []; s.bullets = []; s.boss = null; s.particles = [];
      game._enemies = () => {}; game._boss = () => {};
      let x0 = 400;
      for (let x = 40; x < 3000; x += 10) {
        const floor = s.platforms.some(q => q.y === 310 && q.x <= x && q.x + q.w >= x + 24);
        const roof = s.platforms.some(q => q.y < 310 && q.y > 110 && q.x < x + 40 && q.x + q.w > x - 12);
        if (floor && !roof) { x0 = x; break; }
      }
      p.x = x0; p.y = 270; p.vx = p.vy = 0; p.facing = p.saberFacing = 1; p.onGround = true;
      s.camera.x = Math.max(0, x0 - 250); s.camera.shake = 0;
      return { sheets, x0, geometry };
    });
    for (const [name, url] of Object.entries(result.sheets)) {
      fs.writeFileSync(path.join(outDir, `${label}-${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
    fs.writeFileSync(path.join(outDir, `${label}-poses.json`), JSON.stringify(result.geometry));
    if (process.env.RISING_CHECK_BACK === '1' && label !== 'before') {
      for (const row of result.geometry) if (row.stage === 4 && row.phase >= .085) {
        assert.ok(row.pose.backTurn >= .8, `Back view during rising phase ${row.phase}`);
        assert.equal(row.frontHead, 0, 'Rising cut must not draw the front face');
        assert.equal(row.frontBody, 0, 'Rising cut must not draw the chest core');
      }
      assert.ok(result.geometry.find(row => row.stage === 4 && row.phase === .085).pose.hip.y > -15, 'Deep low stance');
      assert.ok(result.geometry.find(row => row.stage === 5 && row.phase === .45).pose.backTurn === 0, 'Return to forward view');
    }
    // Use the real keyboard listener; the simulation clock alone is advanced manually.
    await page.keyboard.down('ArrowUp'); await page.keyboard.down('k');
    await page.evaluate(() => game._tick(1 / 60));
    await page.keyboard.up('k'); await page.keyboard.up('ArrowUp');
    const playback = await page.evaluate(animate => {
      const s = game.state, p = s.player, C = AstraCombat;
      if (p.saberCombo !== 4) throw Error('ArrowUp + K failed to start the rising cut');
      const samples = [], poses = [], captures = [.0167, .0333, .05, .0833, .1567, .3567, .5167, .6867, .79, .87, .98];
      let focus = null;
      const frames = [];
      const strip = document.createElement('canvas'); strip.width = 640 * captures.length; strip.height = 360;
      const c = strip.getContext('2d'), main = document.querySelector('#game').getContext('2d');
      const startY = 270;
      let apex = 0, apexAt = 0, landAt = null, heldFrames = 0, i = 0;
      for (let frame = 1; frame <= 100; frame++) {
        const time = frame / 60;
        const stage = C.saberStage(p), phase = C.saberPhase(p);
        if (C.risingHeld(p)) heldFrames++;
        if (startY - p.y > apex) { apex = startY - p.y; apexAt = time; }
        if (frame > 12 && p.onGround && landAt === null) landAt = time;
        poses.push({ time, stage, phase, y: p.y,
          risingFrame: stage === 4 || stage === 5 ? AstraSaberRig.pose(stage, phase).risingFrame : null });
        if (animate && frame <= 70) {
          s.camera.shake = 0; AstraRenderer.draw(main, s);
          frames.push(main.canvas.toDataURL());
        }
        while (i < captures.length && time >= captures[i] - .002) {
          s.camera.shake = 0; AstraRenderer.draw(main, s);
          c.drawImage(main.canvas, i * 640, 0);
          if (i === 6) focus = main.canvas.toDataURL();
          samples.push({ time, stage, phase, y: p.y }); i++;
        }
        game._tick(1 / 60);
      }
      return { combo: 4, apex, apexAt, landAt, heldFrames, samples, png: strip.toDataURL(), focus, poses, frames };
    }, label === 'after' && process.env.RISING_ANIMATE === '1');
    fs.writeFileSync(path.join(outDir, `${label}-game.png`), Buffer.from(playback.png.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(outDir, `${label}-game-frame.png`), Buffer.from(playback.focus.split(',')[1], 'base64'));
    delete playback.png;
    delete playback.focus;
    if (playback.frames.length) {
      const frameDir = path.join(outDir, 'frames'); fs.mkdirSync(frameDir, { recursive: true });
      playback.frames.forEach((url, i) => fs.writeFileSync(path.join(frameDir, `${String(i).padStart(3, '0')}.png`), Buffer.from(url.split(',')[1], 'base64')));
    }
    delete playback.frames;
    assert.ok(playback.apex > 80 && playback.apex < 105, 'Existing leap height');
    assert.ok(playback.landAt < 1.2 && playback.heldFrames > 0, 'Ride down and landing');
    assert.equal(errors.length, 0, errors.join('\n'));
    fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(playback, null, 2));
    if (label === 'after' && fs.existsSync(path.join(outDir, 'before-right.png'))) {
      const refPath = process.env.RISING_REFERENCE || 'C:/Users/situz/Desktop/ゲームAstra/スクリーンショット 2026-09-12 191734.png';
      const data = filename => 'data:image/png;base64,' + fs.readFileSync(filename).toString('base64');
      const comparison = await page.evaluate(async urls => {
        const images = await Promise.all(urls.map(async url => { const im = new Image(); im.src = url; await im.decode(); return im; }));
        const frames = [2, 3, 4, 6, 7, 8, 10];
        const refBounds = [[27,52],[54,77],[79,121],[128,173],[179,223],[228,274],[277,323],[329,375],[381,407],[413,437],[444,463]];
        const refFeet = [40,64,103,142,188,238,286,342,396,424,453];
        const names = ['後ろへ引く', '低く払う', '振り上げ', '上昇', '炎が離れる', '腕を開く', '落下・戻り'];
        const cv = document.createElement('canvas'); cv.width = 7 * 340; cv.height = 3 * 370;
        const c = cv.getContext('2d'); c.fillStyle = '#f7f7f7'; c.fillRect(0, 0, cv.width, cv.height);
        c.imageSmoothingEnabled = false;
        for (let row = 0; row < 3; row++) {
          c.fillStyle = '#243a51'; c.font = 'bold 18px Meiryo, sans-serif';
          c.fillText(['参照画像', '変更前', '変更後'][row], 12, row * 370 + 25);
          for (let cell = 0; cell < frames.length; cell++) {
            const i = frames[cell], x = cell * 340, y = row * 370 + 35;
            c.save(); c.beginPath(); c.rect(x, y, 340, 330); c.clip();
            if (row === 0) {
              const [left, right] = refBounds[i], z = 3.4;
              c.drawImage(images[0], left, 0, right - left + 1, 69, x + 120 - (refFeet[i] - left) * z, y + 300 - 60 * z, (right - left + 1) * z, 69 * z);
            } else c.drawImage(images[row], i * 340, 0, 340, 350, x, y, 340, 350);
            c.restore(); c.strokeStyle = '#d5d9de'; c.strokeRect(x, y, 340, 330);
            c.fillStyle = '#41505e'; c.font = '14px Meiryo, sans-serif'; c.fillText(names[cell], x + 9, y + 322);
          }
        }
        return cv.toDataURL();
      }, [data(refPath), data(path.join(outDir, 'before-right.png')), data(path.join(outDir, 'after-right.png'))]);
      fs.writeFileSync(path.join(outDir, 'comparison.png'), Buffer.from(comparison.split(',')[1], 'base64'));
      const before = JSON.parse(fs.readFileSync(path.join(outDir, 'before.json'), 'utf8'));
      for (const key of ['apex', 'apexAt', 'landAt', 'heldFrames']) assert.equal(playback[key], before[key], `Preserved ${key}`);
    }
    console.log(JSON.stringify({ label, files: outDir, apex: playback.apex, apexAt: playback.apexAt, landAt: playback.landAt, heldFrames: playback.heldFrames, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
