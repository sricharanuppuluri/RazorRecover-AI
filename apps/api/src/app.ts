import express, { Express } from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import { securityHeaders } from './middleware/security.middleware';
import { createRateLimiter } from './middleware/rate-limiter.middleware';
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes';
import { env } from './config/env';
import { HealthController } from './controllers/health.controller';
import { DemoDataService } from './services/demo-data.service';

const healthController = new HealthController();

export function createApp(): Express {
  // Ensure synthetic demo data is seeded for local/offline run
  DemoDataService.seedAll().catch((err) => {
    console.warn('[DemoDataService] Background seed warning:', err.message);
  });

  const app = express();

  // Security Headers
  app.use(securityHeaders);

  // Rate Limiting (100 req per minute default)
  app.use(createRateLimiter({ windowMs: 60 * 1000, max: 100 }));

  // CORS
  app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }));

  // Request Body Parsing
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Health and Readiness endpoints at root GET /health & GET /ready
  app.use('/health', healthRoutes);
  app.get('/ready', healthController.getReadiness);

  // API router mounted under /api
  app.use('/api', apiRoutes);
  app.get('/api/ready', healthController.getReadiness);

  // Fallback 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      error: {
        message: `Route ${req.method} ${req.originalUrl} not found`,
        code: 'NOT_FOUND'
      }
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
