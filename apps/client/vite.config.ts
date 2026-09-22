import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * The original game's audio lives in `assets/sierra/audio`, outside the repo
 * and outside `public/`, so it is never committed and never lands in a build
 * (DESIGN decision log 2026-09-22). In development it is served at `/audio/`,
 * where the client's local asset source looks for it. Without the folder the
 * game runs silent.
 */
function sierraAudio(): Plugin {
  const root = resolve(__dirname, '../../assets/sierra/audio');
  const types: Record<string, string> = { '.ogg': 'audio/ogg', '.json': 'application/json', '.mid': 'audio/midi' };
  return {
    name: 'sierra-audio',
    apply: 'serve',
    configureServer(server) {
      if (!existsSync(root)) server.config.logger.warn(`[sierra-audio] ${root} is missing: the game will be silent. See assets/README.md.`);
      server.middlewares.use('/audio', (req, res, next) => {
        const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!));
        const file = join(root, rel);
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next();
        const size = statSync(file).size;
        res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
        if (range && (range[1] || range[2])) {
          const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
          const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          if (start > end || start >= size) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${size}`);
            res.end();
            return;
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          createReadStream(file, { start, end }).pipe(res);
          return;
        }
        res.setHeader('Content-Length', String(size));
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sierraAudio()],
  server: { port: 5174 },
});
