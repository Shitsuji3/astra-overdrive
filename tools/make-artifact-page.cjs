// Turns the built bundle's index.html into the single page an Artifact host wants.
//
//   npm run build
//   node tools/make-artifact-page.cjs
//
// An Artifact supplies its own <!doctype>, <html>, <head> and <body>, and renders the file it
// is given inside that body. So this strips the document wrapper and keeps everything the game
// actually needs: the title, the stylesheet link, the markup and the scripts. The supporting
// files ship beside it untouched, which is why the page can go on referencing them by the same
// relative paths the real bundle uses.
//
// Head tags that only matter to a real host — the social card, the manifest, the icons — are
// dropped, because the Artifact carries its own card and icon.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'release', 'index.html');
const TARGET = path.join(ROOT, 'dist', 'artifact-page.html');

function fail(message) { console.error('artifact page failed: ' + message); process.exit(1); }

if (!fs.existsSync(SOURCE)) fail('release/index.html is missing. Run: npm run build');
const html = fs.readFileSync(SOURCE, 'utf8');

const head = html.match(/<head>([\s\S]*?)<\/head>/i);
const body = html.match(/<body>([\s\S]*?)<\/body>/i);
if (!head || !body) fail('release/index.html is not shaped the way this expects');

const title = (head[1].match(/<title>[\s\S]*?<\/title>/i) || [])[0];
const styles = head[1].match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
if (!title) fail('the page has no <title>');
if (!styles.length) fail('the page pulls in no stylesheet');

const page = [title, ...styles, body[1]].join('\n') + '\n';

// nothing may reach outside the bundle, the same rule the build itself enforces
for (const external of page.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/g) || [])
  fail('the page reaches outside the bundle: ' + external.slice(0, 70));
// and every file it asks for has to be one the bundle actually ships
for (const asked of [...page.matchAll(/["'(]((?:\.\/)?(?:assets\/|[a-z-]+\.(?:js|css)))/g)]
  .map(m => m[1].replace(/^\.\//, ''))) {
  if (asked.endsWith('/')) continue;
  if (!fs.existsSync(path.join(ROOT, 'release', asked))) fail(asked + ' is not in the bundle');
}

fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.writeFileSync(TARGET, page, 'utf8');

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push(path.relative(path.join(ROOT, 'release'), full).split(path.sep).join('/'));
  }
})(path.join(ROOT, 'release'));

console.log(path.relative(ROOT, TARGET) + '  ' + page.length + ' bytes');
console.log('publish it with these ' + (files.length - 1) + ' supporting files, root "release":');
console.log(JSON.stringify(files.filter(f => f !== 'index.html').sort()));
