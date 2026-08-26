import express, { Express } from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes';
import { env } from './config/env';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Health endpoint directly at root GET /health
  app.use('/health', healthRoutes);

  // API router mounted under /api
  app.use('/api', apiRoutes);

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
