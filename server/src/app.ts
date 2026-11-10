import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'path';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

export const createApp = (): express.Application => {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxies / AWS ALB
  app.set('trust proxy', 1);

  // Security headers with Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Managed by client build
    })
  );

  // CORS allowlist
  app.use(
    cors({
      origin: [
        env.CLIENT_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Request ID tracking
  app.use(requestIdMiddleware);

  // Pino HTTP structured request logger (silent in test)
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => (req.headers['x-request-id'] as string) || req.id,
        autoLogging: {
          ignore: (req) => req.url === '/api/health',
        },
      })
    );
  }

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Static files for local file upload driver
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Global API Rate Limiter
  app.use('/api', apiLimiter);

  // Mount API Routes
  app.use('/api', routes);

  // 404 handler for undefined routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
