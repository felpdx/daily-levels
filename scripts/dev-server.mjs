import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  const file = join(process.cwd(), path === '\\' || path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));
