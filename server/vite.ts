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
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../client/src'),
        '@shared': path.resolve(__dirname, '../shared'),
        '@assets': path.resolve(__dirname, '../attached_assets'),
      },
    },
  });

  // Apply Vite middleware to all Vite-related routes
  app.use(vite.middlewares);
  
  // Catch-all for SPA routes (but NOT API routes or Vite routes)
  app.get('*', async (req, res, next) => {
    try {
      // Skip API routes and Vite routes completely
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/src/') ||
          req.path.startsWith('/@') ||
          req.path.startsWith('/node_modules/') ||
          req.path.startsWith('/assets/')) {
        return next();
      }
      
      const url = req.originalUrl;
      
      // Read the HTML template file
      const templatePath = path.resolve(__dirname, '../client/index.html');
      const template = await vite.transformIndexHtml(url, await import('fs').then(fs => fs.promises.readFile(templatePath, 'utf-8')));
      
      // For SPA, just serve the template
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
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
