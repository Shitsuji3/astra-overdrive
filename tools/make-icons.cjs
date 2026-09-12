// Draws the browser-tab icon set and the link-preview card.
// The card is a real screenshot of the title screen, so what people see in a shared link is
// what they get. The icons are the title's own italic A on the game's dark ground.
//
//   node tools/make-icons.cjs          (needs the dev server on 4173)
//
// Writes into assets/brand/. Run again if the title screen is redesigned.
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const OUT = path.join(__dirname, '..', 'assets', 'brand');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    // the link-preview card: the title screen at the size link unfurlers expect
    const card = await br.newPage({ viewport: { width: 1200, height: 630 } });
    await card.goto('http://127.0.0.1:4173/');
    await card.waitForTimeout(1200);
    // JPEG, because link unfurlers are the least fussy about it and it keeps the card small
    fs.writeFileSync(path.join(OUT, 'social-card.jpg'), await card.screenshot({ type: 'jpeg', quality: 86 }));
    await card.close();

    // the tab icon, drawn at each size so the small ones stay legible
    const page = await br.newPage({ viewport: { width: 600, height: 600 } });
    await page.goto('http://127.0.0.1:4173/');
    const icons = await page.evaluate(async (sizes) => {
      const out = {};
      for (const size of sizes) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const x = c.getContext('2d');
        x.fillStyle = '#06131c'; x.fillRect(0, 0, size, size);
        // a thin frame reads as a HUD panel even at 32px
        x.strokeStyle = '#5ee6e1'; x.lineWidth = Math.max(1, size * .045);
        x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, size - x.lineWidth, size - x.lineWidth);
        x.save();
        x.translate(size * .5, size * .56);
        x.font = `italic 900 ${Math.round(size * .74)}px "Trebuchet MS", system-ui, sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = '#081419'; x.fillText('A', size * .035, size * .035);
        x.fillStyle = '#f4efe2'; x.fillText('A', 0, 0);
        x.restore();
        out[size] = c.toDataURL();
      }
      return out;
    }, [32, 180, 192, 512]);
    for (const [size, data] of Object.entries(icons)) {
      const name = size === '180' ? 'apple-touch-icon.png' : `icon-${size}.png`;
      fs.writeFileSync(path.join(OUT, name), Buffer.from(data.split(',')[1], 'base64'));
    }
    await page.close();

    for (const f of fs.readdirSync(OUT).sort())
      console.log(String(Math.round(fs.statSync(path.join(OUT, f)).size / 1024)).padStart(5), 'KB ', f);
  } finally { await br.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
