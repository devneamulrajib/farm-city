import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, isAllowedOrigin, isProd } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { sanitize } from './middleware/sanitize.js';
import { errorHandler, notFound } from './middleware/error.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(sanitize);
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d' }));
  app.use('/api', apiLimiter, routes);
  if (isProd) {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist, { maxAge: '1d', index: false }));
    app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)|\/socket\.io(?:\/|$)).*/, (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(clientDist, 'index.html'), (err) => (err ? next(err) : undefined));
    });
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
