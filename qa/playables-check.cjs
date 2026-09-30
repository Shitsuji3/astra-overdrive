// Exercise the shipping Playables bundle under YouTube's CSP with a deterministic SDK host.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const URL = process.env.PLAYABLES_URL || 'http://127.0.0.1:4175/';
const SDK = 'https://www.youtube.com/game_api/v1';
const MOCK = `
window.host = {calls:[], callbacks:{}, enabled:false, failLoad:false, failSave:false,
 saved:JSON.stringify({version:1,settings:{music:.2,sfx:.3,motion:true},best:432}), warnings:0};
window.ytgame = {IN_PLAYABLES_ENV:true,game:{
 firstFrameReady(){host.calls.push('first')},gameReady(){host.calls.push('ready')},
 async loadData(){host.calls.push('load');await new Promise(r=>setTimeout(r,300));
  if(host.failLoad) throw Error('Load failed');return host.saved},
 async saveData(raw){host.calls.push('save');await new Promise(r=>setTimeout(r,10));
  if(host.failSave) throw Error('Save failed');host.saved=raw}
},system:{isAudioEnabled(){return host.enabled},
 onAudioEnabledChange(f){host.callbacks.audio=f},onPause(f){host.callbacks.pause=f},onResume(f){host.callbacks.resume=f}
},health:{logWarning(){host.warnings++}}};`;
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--autoplay-policy=no-user-gesture-required'] });
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [], failures = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
    page.on('request', r => { if (!r.url().startsWith(URL) && r.url() !== SDK && !r.url().startsWith('data:')) external.push(r.url()); });
    await page.route(SDK, r => r.fulfill({ contentType: 'application/javascript', body: MOCK }));
    await page.addInitScript(() => {
      window.storageAccesses = 0;
      for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, {
        get() { storageAccesses++; throw Error('Forbidden storage'); }, configurable: true
      });
      window.tracks = []; window.contexts = [];
      const OriginalAudio = window.Audio, OriginalContext = window.AudioContext;
      window.Audio = function (...args) { const a = new OriginalAudio(...args); tracks.push(a); return a; };
      window.AudioContext = function (...args) { const a = new OriginalContext(...args); contexts.push(a); return a; };
    });
    await page.goto(URL);
    await page.waitForFunction(() => host.calls.includes('ready'));
    assert.ok(await page.evaluate(() => host.calls.indexOf('first') < host.calls.indexOf('ready')));
    assert.equal(await page.evaluate(() => tracks[0].volume), .2 * .4 * .5);
    assert.equal(await page.evaluate(() => tracks[0].muted), true);
    assert.equal(await page.locator('#platform-loading').count(), 0);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.getByRole('button', {name:'Boss Rush', exact:true}).count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'boss-rush');
    results.push('first frame → cloud load → interactive title; saved settings restored');
    await page.locator('[data-action=help-menu]').click();
    await page.locator('[data-action=guide]').click();
    assert.doesNotMatch(await page.locator('#modal-content').innerText(), /[\u3040-\u30ff\u3400-\u9fff]/);
    await page.screenshot({ path: 'qa/playables-controls.png' });
    await page.locator('[data-action=close]').click();
    await page.locator('[data-action=settings]').click();
    assert.equal(await page.locator('#mute').count(), 0);
    await page.locator('#music').fill('30');
    await page.locator('#music').dispatchEvent('change');
    await page.waitForFunction(() => JSON.parse(host.saved).settings.music === .3);
    await page.reload();
    await page.waitForFunction(() => host.calls.includes('ready'));
    // Reloaded host starts from the same known cloud fixture; its persistent round-trip is tested below.
    await page.locator('[data-action=boss-rush]').click();
    await page.waitForFunction(() => window.game && game.state.boss);
    await page.evaluate(() => { game.state.player.invuln = 1e9; AstraAudio.setMuted(false); AstraAudio.setSfx(1); });
    assert.equal(await page.evaluate(() => tracks.at(-1).muted), true);
    await page.evaluate(() => host.callbacks.audio(true));
    assert.equal(await page.evaluate(() => tracks.at(-1).muted), false);
    results.push('YouTube mute cannot be overridden by game settings');
    await page.evaluate(() => { host.callbacks.pause(); window.frozenTime = game.state.time; window.frozenX = game.state.player.x; });
    const frozen = await page.locator('#game').screenshot();
    await page.keyboard.press('Escape');
    await page.keyboard.press('d');
    await page.waitForTimeout(350);
    assert.deepEqual(await page.locator('#game').screenshot(), frozen);
    assert.ok(await page.evaluate(() => game.state.time === frozenTime && game.state.player.x === frozenX && game.raf === 0));
    assert.equal(await page.evaluate(() => tracks.at(-1).paused), true);
    assert.equal(await page.evaluate(() => contexts.at(-1).state), 'suspended');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
      host.callbacks.audio(true);
    });
    assert.equal(await page.evaluate(() => contexts.at(-1).state), 'suspended');
    await page.evaluate(() => host.callbacks.resume());
    await page.waitForFunction(() => game.state.time > frozenTime);
    assert.equal(await page.evaluate(() => game.state.mode), 'playing');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => game.state.mode), 'paused');
    await page.evaluate(() => { host.callbacks.pause(); host.callbacks.resume(); });
    assert.equal(await page.evaluate(() => game.state.mode), 'paused');
    results.push('SDK pause freezes pixels, simulation, input and audio; manual pause retained');
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur'));
    });
    assert.equal(await page.evaluate(() => game.state.mode), 'playing');
    await page.evaluate(() => {
      game.onEvent('boss-record', { id:'warden', difficulty:'normal', time:10, hits:0, practice:false });
    });
    await page.waitForFunction(() => JSON.parse(host.saved).settings.bossRecords?.['normal:warden']?.clears === 1);
    const save = await page.evaluate(() => host.saved);
    assert.ok(save.length * 2 < 64 * 1024);
    await page.evaluate(() => { game._die(); host.callbacks.pause(); });
    const deathTime = await page.evaluate(() => game.state.deathFx.time);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => game.state.deathFx.time), deathTime);
    await page.evaluate(() => host.callbacks.resume());
    await page.waitForFunction(() => !document.querySelector('#overlay').hidden);
    assert.equal(await page.evaluate(() => game.state.mode), 'dead');
    assert.equal(await page.locator('[data-action=share-result]').count(), 0);
    await page.evaluate(() => {
      game.state.mode = 'victory';
      game.onEvent('victory', game.snapshot());
    });
    assert.equal(await page.locator('[data-action=share-result]').count(), 0);
    assert.equal(await page.locator('[data-action=records]').count(), 1);
    results.push('English controls; death animation also freezes and resumes correctly');
    await page.route(SDK, r => r.fulfill({ contentType: 'application/javascript', body: MOCK + '\nhost.saved=' + JSON.stringify(save) + ';' }));
    await page.reload();
    await page.waitForFunction(() => host.calls.includes('ready'));
    assert.equal(await page.evaluate(() => AstraPlatform.best), 432);
    results.push('boss clear uses SDK save; cloud round-trip retains records and legacy best');
    await page.screenshot({ path: 'qa/playables-title.png' });
    await page.route(SDK, r => r.fulfill({ contentType: 'application/javascript', body: MOCK + '\nhost.failLoad=true;' }));
    await page.reload();
    await page.waitForFunction(() => host.warnings > 0);
    assert.equal(await page.evaluate(() => host.calls.includes('save')), false);
    assert.equal(await page.evaluate(() => host.calls.includes('ready')), false);
    assert.equal(await page.evaluate(() => document.querySelector('#app').inert), true);
    await page.evaluate(() => { host.failLoad = false; });
    assert.equal(await page.getByRole('button', { name:'Retry', exact:true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => host.calls.includes('ready'));
    assert.equal(await page.evaluate(() => storageAccesses), 0);
    results.push('failed load blocks writes and interaction; retry recovers with no local storage');
    assert.deepEqual(errors, []); assert.deepEqual(failures, []); assert.deepEqual(external, []);
    const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await mobile.route(SDK, r => r.fulfill({ contentType: 'application/javascript', body: MOCK }));
    await mobile.goto(URL); await mobile.waitForFunction(() => host.calls.includes('ready'));
    await mobile.locator('[data-action=boss-rush]').tap();
    assert.ok(await mobile.locator('[data-input=saber]').isVisible());
    await mobile.locator('[data-input=right]').tap();
    await mobile.screenshot({ path: 'qa/playables-mobile.png' });
    results.push('mobile landscape boots with touch controls (desktop emulation)');
    await mobile.setViewportSize({width:390,height:844});
    const touchBounds = await mobile.locator('.touch-controls button').evaluateAll(buttons => buttons.map(b => {
      const r=b.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};
    }));
    assert.ok(touchBounds.every(r => r.x >= 0 && r.right <= 390 && r.y >= 0 && r.bottom <= 844));
    await mobile.screenshot({path:'qa/playables-portrait.png'});
    results.push('mobile portrait keeps all touch buttons in view (desktop emulation)');
    fs.writeFileSync('qa/playables-results.json', JSON.stringify({ results, errors, failures, external, saveBytes:save.length*2 }, null, 2));
    console.log(JSON.stringify({results, errors, saveBytes:save.length*2}, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
