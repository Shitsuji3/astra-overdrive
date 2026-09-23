// Builds the shippable game into release/ and packs dist/ASTRA-OVERDRIVE-web.zip.
//
//   npm run build
//
// The build swaps every shipping image for the WebP that tools/make-webp.py produced, at the
// same pixel dimensions, and leaves the masters in assets/ untouched. Tests, QA scripts and
// working notes are not part of the output.
//
// It refuses to finish if anything the shipped files reference is missing, if a source image
// is newer than its WebP, or if any file reaches outside the bundle for something. That last
// rule is what keeps the build self-contained, which is what portable hosting and YouTube
// Playables both require.
//
//   node tools/build-release.cjs --ci
//
// drops the two steps that only make sense on the machine the art is edited on. A fresh clone
// has no meaningful modification times, so the stale-WebP check would be reading noise; and a
// build server deploys the folder rather than the zip, so packing it needs no PowerShell.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CI = process.argv.includes('--ci');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'release');
const ZIP = path.join(ROOT, 'dist', 'ASTRA-OVERDRIVE-web.zip');

// Copied as they are. index.html must sit at the root of the bundle.
const VERBATIM = [
  'index.html', 'style.css', 'manifest.webmanifest',
  'game.js', 'render.js', 'audio.js', 'ui.js', 'mastery.js',
  'assets/art-cache.js', 'assets/bosses.js', 'assets/stages.js', 'assets/run-rig-v6.js', 'assets/saber-rig.js',
  'assets/enemies-v2.js',
  'assets/charge-sounds.js', 'assets/saber-sound.js', 'assets/saber-hit-sound.js',
  'assets/title-core-glow.svg',
  'assets/brand/icon-32.png', 'assets/brand/icon-192.png', 'assets/brand/icon-512.png',
  'assets/brand/apple-touch-icon.png', 'assets/brand/social-card.jpg',
  // the boss portraits the stage select shows
  'assets/bosses/warden-portrait.webp',
  'assets/bosses/tidebreaker-portrait.webp',
  'assets/bosses/coilhead-portrait.webp',
  'assets/bosses/ashmaw-portrait.webp',
  'assets/bosses/nullpriest-portrait.webp',
  'assets/bosses/gravelock-portrait.webp',
  'assets/bosses/sparkwidow-portrait.webp',
  'assets/bosses/obsidian-crown-portrait.webp',
  // and the artwork each one is drawn with in its own arena
  'assets/bosses/tidebreaker.webp',
  'assets/bosses/coilhead.webp',
  'assets/bosses/ashmaw.webp',
  'assets/bosses/nullpriest.webp',
  'assets/bosses/gravelock.webp',
  'assets/bosses/sparkwidow.webp',
  'assets/bosses/obsidian-crown.webp'
];
// Re-encoded art and music. The key is what the code asks for; the value is what ships in its place,
// taken from assets/web/ (tools/make-webp.py for pictures, tools/make-audio.py for the music).
const REPLACED = {
  'assets/title-bgm.mp3': 'assets/title-bgm.mp3',
  'assets/stage1-bgm.mp3': 'assets/stage1-bgm.mp3',
  'assets/title-art.png': 'assets/title-art.webp',
  'assets/stage-city.png': 'assets/stage-city.webp',
  'assets/boss-warden.png': 'assets/boss-warden.webp',
  'assets/enemy-atlas-v2.png': 'assets/enemy-atlas-v2.webp',
  'assets/player-sheet.png': 'assets/player-sheet.webp',
  'assets/player-saber-v2.png': 'assets/player-saber-v2.webp',
  'assets/saber-turn-atlas.png': 'assets/saber-turn-atlas.webp',
  // same name either way: the SVG wrapper is identical, only its payload was re-encoded
  'assets/player-run-v4.svg': 'assets/player-run-v4.svg'
};
const TEXT = /\.(html|css|js|webmanifest|json|svg)$/;

function fail(message) { console.error('build failed: ' + message); process.exit(1); }

function wipe(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function target(relative) {
  const to = path.join(OUT, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  return to;
}
function putText(relative, body) { fs.writeFileSync(target(relative), body, 'utf8'); }
function putFile(relative, source) { fs.copyFileSync(source, target(relative)); }

// every "assets/..." the shipped text asks for, so nothing can quietly go missing
function referencesIn(body) {
  return [...body.matchAll(/["'(]((?:\.\/)?assets\/[A-Za-z0-9._\-/]+)["')]/g)]
    .map(m => m[1].replace(/^\.\//, ''));
}

function build() {
  wipe(OUT);
  const shipped = new Map();

  // 1. the re-encoded art, and a check that it is not stale
  for (const [asked, ships] of Object.entries(REPLACED)) {
    const source = path.join(ROOT, asked);
    const encoded = path.join(ROOT, 'assets', 'web', path.basename(ships));
    const tool = /.mp3$/.test(asked) ? 'tools/make-audio.py' : 'tools/make-webp.py';
    if (!fs.existsSync(encoded))
      fail(`${path.relative(ROOT, encoded)} is missing. Run: python ${tool}`);
    if (!CI && fs.existsSync(source) && fs.statSync(source).mtimeMs > fs.statSync(encoded).mtimeMs)
      fail(`${asked} is newer than its re-encoded copy. Run: python ${tool}`);
    putFile(ships, encoded);
    shipped.set(ships, fs.statSync(encoded).size);
  }

  // 2. everything else, with image references pointed at what actually ships
  for (const relative of VERBATIM) {
    const source = path.join(ROOT, relative);
    if (!fs.existsSync(source)) fail(`${relative} is missing`);
    if (TEXT.test(relative)) {
      let body = fs.readFileSync(source, 'utf8');
      for (const [asked, ships] of Object.entries(REPLACED))
        if (asked !== ships) body = body.split(asked).join(ships);
      putText(relative, body);
      shipped.set(relative, Buffer.byteLength(body));
    } else {
      putFile(relative, source);
      shipped.set(relative, fs.statSync(source).size);
    }
  }

  // 3. nothing may point at a file that is not in the bundle, or at another site
  const problems = [];
  for (const relative of [...shipped.keys()].filter(f => TEXT.test(f))) {
    const body = fs.readFileSync(path.join(OUT, relative), 'utf8');
    for (const asked of referencesIn(body)) {
      // a reference ending in "/" is a folder prefix the code completes at runtime, such as
      // the boss portraits. Those files are named in VERBATIM, so a missing one still fails.
      if (asked.endsWith('/')) continue;
      if (!shipped.has(asked)) problems.push(`${relative} asks for ${asked}, which does not ship`);
    }
    for (const external of body.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/g) || [])
      problems.push(`${relative} reaches outside the bundle: ${external.slice(0, 70)}`);
  }
  // what landed on disk must weigh what we think we shipped, or a copy went wrong
  for (const [relative, size] of shipped) {
    const written = fs.statSync(path.join(OUT, relative)).size;
    if (written !== size) problems.push(`${relative} wrote ${written} bytes, expected ${size}`);
  }
  if (problems.length) fail('\n  ' + problems.join('\n  '));

  return shipped;
}

function pack() {
  fs.mkdirSync(path.dirname(ZIP), { recursive: true });
  if (fs.existsSync(ZIP)) fs.rmSync(ZIP);
  execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `Compress-Archive -Path '${path.join(OUT, '*')}' -DestinationPath '${ZIP}' -CompressionLevel Optimal`],
    { stdio: 'inherit' });
}

const shipped = build();
if (!CI) pack();

const rows = [...shipped.entries()].sort((a, b) => b[1] - a[1]);
const total = rows.reduce((sum, row) => sum + row[1], 0);
const firstLoad = rows.filter(r => !/(stage1|title)-bgm/.test(r[0])).reduce((s, r) => s + r[1], 0);
for (const [file, size] of rows)
  console.log(String(Math.round(size / 1024)).padStart(6) + ' KB  ' + file);
console.log('');
console.log(`${rows.length} files`);
console.log(`bundle              ${(total / 1048576).toFixed(2)} MB`);
console.log(`without the music   ${(firstLoad / 1048576).toFixed(2)} MB`);
if (!CI)
  console.log(`zip                 ${(fs.statSync(ZIP).size / 1048576).toFixed(2)} MB  ${path.relative(ROOT, ZIP)}`);
