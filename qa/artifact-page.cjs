// Plays the page that gets published as an Artifact, wrapped in the same skeleton the Artifact
// host puts around it, so the stripped-down page is proved to be a complete game and not just a
// file that looks right.
//
//   npm run build
//   node tools/make-artifact-page.cjs
//   node server.cjs release 4174
//   node qa/artifact-page.cjs
//
// It writes the wrapped page into the bundle, plays it, and removes it again. What this cannot
// prove is how the Artifact host's own content rules treat the files: that needs the published
// URL opened by someone signed in.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE
  || 'C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'dist', 'artifact-page.html');
const PREVIEW = path.join(ROOT, 'release', 'artifact-preview.html');
const URL = (process.env.GAME_URL || 'http://127.0.0.1:4174/') + 'artifact-preview.html';

// The wrapper an Artifact supplies: a charset, a viewport, and a small reset. Nothing else.
const SKELETON = body => `<!doctype html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#faf9f7}
img{max-width:100%}[hidden]{display:none!important}</style></head>
<body>
${body}`;

(async () => {
  if (!fs.existsSync(PAGE)) throw new Error('dist/artifact-page.html is missing. Run: node tools/make-artifact-page.cjs');
  fs.writeFileSync(PREVIEW, SKELETON(fs.readFileSync(PAGE, 'utf8')), 'utf8');

  const br = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await br.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [], missing = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
    await page.goto(URL);
    await page.waitForTimeout(900);

    // the title screen has to be the game's own, not the host's bare page
    const look = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      art: getComputedStyle(document.querySelector('.title-art')).backgroundImage.slice(0, 60),
      menu: document.querySelectorAll('.menu-item:not([hidden])').length
    }));

    // every mission is on the board, with its boss portrait loaded
    await page.locator('[data-action=stage-select]').click();
    await page.waitForTimeout(500);
    const board = await page.evaluate(() => {
      const faces = [...document.querySelectorAll('.node-face img')];
      return { nodes: document.querySelectorAll('.stage-node').length,
        portraits: faces.length, drawn: faces.filter(i => i.naturalWidth > 0).length,
        map: !!document.querySelector('.select-map svg .site') };
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // and it actually plays: run right, fire, and watch the world go by
    await page.locator('[data-action=stage-select]').click();await page.locator('.stage-node.active').click();
    await page.waitForTimeout(700);
    await page.keyboard.down('d');
    await page.waitForTimeout(2500);
    await page.keyboard.up('d');
    const played = await page.evaluate(() => ({
      stage: game.state.stage.id, x: Math.round(game.state.player.x),
      enemies: game.state.enemies.length, music: !!document.querySelector('audio') ||
        !!(window.AstraAudio && true) }));

    // the soundtrack is the one file big enough to be worth checking arrived
    const bgm = await page.evaluate(async () => {
      const r = await fetch('assets/stage1-bgm.mp3', { method: 'GET' });
      return { ok: r.ok, type: r.headers.get('content-type'),
        bytes: (await r.blob()).size };
    });

    console.log(JSON.stringify({ look, board, played, bgm, missing, errors }, null, 1));
    const bad = [];
    if (look.menu < 4) bad.push('the menu did not render');
    if (!/url\(/.test(look.art)) bad.push('the title art did not load');
    if (board.nodes !== 9) bad.push(`${board.nodes} missions on the board`);
    if (board.drawn !== board.portraits) bad.push('a boss portrait did not load');
    if (!board.map) bad.push('the map did not draw');
    if (played.x < 200) bad.push(`the player did not move: x=${played.x}`);
    if (!bgm.ok || bgm.bytes < 1e6) bad.push('the soundtrack did not arrive');
    if (missing.length) bad.push('missing files: ' + missing.join(', '));
    if (errors.length) bad.push('page errors: ' + errors.join(' / '));
    if (bad.length) throw new Error(bad.join('\n  '));
    console.log('the artifact page is a complete, playable game');
  } finally {
    await br.close();
    fs.rmSync(PREVIEW, { force: true });
  }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
