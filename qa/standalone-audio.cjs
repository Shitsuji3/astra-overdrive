// Use the real YouTube SDK outside YouTube, with the browser's normal autoplay policy.
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.tracks = []; window.audioContexts = []; window.effectStarts = 0;
      const A = window.Audio, C = window.AudioContext;
      window.Audio = function (...args) { const a = new A(...args); tracks.push(a); return a; };
      window.AudioContext = function (...args) {
        const c = new C(...args), gain = c.createGain.bind(c), source = c.createBufferSource.bind(c);
        c.gains = []; audioContexts.push(c);
        c.createGain = () => {const n = gain(); c.gains.push(n); return n;};
        c.createBufferSource = () => {
          const n = source(), start = n.start.bind(n);
          n.start = (...args) => {effectStarts++; return start(...args);};
          return n;
        };
        return c;
      };
    });
    await page.goto(process.env.PLAYABLES_URL || 'http://127.0.0.1:4175/');
    await page.waitForFunction(() => !document.querySelector('#platform-loading'));
    assert.equal(await page.evaluate(() => ytgame.IN_PLAYABLES_ENV), false);
    await page.locator('[data-action=help-menu]').click();
    await page.waitForFunction(() => tracks[0].currentTime > .1);
    assert.equal(await page.evaluate(() => tracks[0].muted), false);
    await page.locator('[data-action=close]').click();
    await page.locator('[data-action=boss-rush]').click();
    await page.waitForFunction(() => tracks.at(-1).currentTime > .2);
    const music = await page.evaluate(() => ({paused:tracks.at(-1).paused, muted:tracks.at(-1).muted, volume:tracks.at(-1).volume}));
    assert.equal(music.paused, false); assert.equal(music.muted, false); assert.ok(music.volume > 0);
    await page.waitForTimeout(150);
    await page.evaluate(() => AstraAudio.sound('saber', {combo:1}));
    assert.ok(await page.evaluate(() => effectStarts > 0));
    assert.equal(await page.evaluate(() => audioContexts.at(-1).state), 'running');
    assert.ok(await page.evaluate(() => audioContexts.at(-1).gains[0].gain.value > 0));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => tracks.at(-1).volume), music.volume / 2);
    assert.equal(await page.evaluate(() => tracks.at(-1).paused), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({titleBgm:true, gameBgm:music, saberSE:true, pauseHalfVolume:true, errors}));
  } finally {await browser.close();}
})().catch(e => {console.error(e);process.exitCode=1;});
