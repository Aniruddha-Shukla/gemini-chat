import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, isProd } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';

export const app = express();

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: env.clientUrls }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api', notFound);

// In production, serve the built React app from the same origin (run `npm run build` first).
const clientDist = path.resolve(import.meta.dirname, '../../client/dist');
if (isProd && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Any non-API route returns index.html so client-side routing works on refresh.
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);
