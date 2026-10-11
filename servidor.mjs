// Servidor para ver la invitación en la computadora: node servidor.mjs
// Solo entrega los archivos de la página; todo lo demás responde 404.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));

// ===== Archivos que se pueden abrir desde el navegador =====
const publicFiles = new Set([
  'index.html',
  'confirmar.html',
  'estilos.css',
  'experiencia.css',
  'adriana.css',
  'configuracion.js',
  'datos.js',
  'servicios.js',
  'app.js',
  'experiencia.js',
  'musica.js',
  'confirmar.js',
  'Audio.mp3',
]);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

// ===== Atiende cada petición =====
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, '.' + name);
    const relative = path.relative(root, file);
    if (
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      relative.split(path.sep).some((part) => part.startsWith('.'))
    ) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const publicAsset =
      relative.startsWith('assets' + path.sep) &&
      ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.woff2', '.ttf'].includes(
        path.extname(file).toLowerCase(),
      );
    if (!publicFiles.has(relative) && !publicAsset) {
      res.writeHead(404);
      res.end('No encontrado');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') res.end();
    else res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
    res.end('No encontrado');
  }
});
const port = Number(process.env.XV_PUERTO || 4173);
server.listen(port, '127.0.0.1', () => console.log(`Adriana Victoria: http://127.0.0.1:${port}/`));
