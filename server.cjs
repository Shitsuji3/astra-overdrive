const http = require('http'),
  fs = require('fs'),
  path = require('path');
// node server.cjs [folder] [port] - defaults to the project itself on 4173, so
// "node server.cjs release 4174" serves a build next to the working copy.
const root = path.resolve(__dirname, process.argv[2] || '.');
const port = Number(process.argv[3] || process.env.PORT || 4173);
// Match YouTube's documented iframe policy during local Playables testing.
const playableCsp = process.argv.includes('--playables')
  ? "default-src 'none'; script-src 'report-sample' 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.youtube.com/game_api/v0 https://www.youtube.com/game_api/v0/ https://www.youtube.com/game_api/v1 https://www.youtube.com/game_api/v1/; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' blob: data:; sandbox allow-pointer-lock allow-same-origin allow-scripts; base-uri 'self'; manifest-src 'self'; worker-src 'self' blob:"
  : null;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};
function send(r, c, b) {
  r.writeHead(c, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  r.end(b);
}
http
  .createServer((req, res) => {
    let decoded;
    try {
      decoded = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch (e) {
      return send(res, 400, 'Bad request');
    }
    if (decoded === '/' || decoded === '') decoded = '/index.html';
    const target = path.resolve(root, '.' + decoded),
      rel = path.relative(root, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return send(res, 403, 'Forbidden');
    fs.stat(target, (err, st) => {
      if (err) return send(res, 404, 'Not found');
      if (!st.isFile()) return send(res, 404, 'Not found');
      const stream = fs.createReadStream(target);
      stream.on('error', () => {
        if (!res.headersSent) send(res, 500, 'Read error');
        else res.destroy();
      });
      const headers = {
        'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': 'no-cache'
      };
      if (playableCsp) headers['Content-Security-Policy'] = playableCsp;
      res.writeHead(200, headers);
      stream.pipe(res);
    });
  })
  .listen(port, '127.0.0.1', () => console.log('ASTRA // OVERDRIVE  ' + root + '  http://127.0.0.1:' + port));
