import { createServer as createViteDevServer } from 'vite';
import express, { type Express } from 'express';
import { type Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteDevServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: path.resolve(__dirname, '../client'),
  });

  app.use(vite.ssrLoadModule);
  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await vite.transformIndexHtml(url, '');
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const appHtml = await render(url);
      const html = template.replace(`<!--ssr-outlet-->`, appHtml);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const clientDistPath = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

export function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
