import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { filesRouter } from './routes/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Express app: API + (in production) static React build.
 */
export function createApp() {
  const app = express();

  // When Nginx (or a load balancer) sits in front, this lets Express read X-Forwarded-* correctly
  if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'smart-file-share-api' });
  });

  app.use('/api/files', filesRouter);

  // Serve Vite build when NODE_ENV=production; Docker copies the built app to backend/public
  const publicDir = path.join(__dirname, '../public');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  return app;
}
