import cors from 'cors';
import express, { type Express } from 'express';
import { config } from './config';
import type { DatabaseSync } from 'node:sqlite';
import { errorHandler } from './middleware/errorHandler';
import { AuthService } from './services/authService';
import { createAuthRouter } from './routes/authRoutes';
import { createHealthRouter } from './routes/healthRoutes';

/** Builds the Express application with the production route and middleware order. */
export function createApp(databaseConnection: InstanceType<typeof DatabaseSync>): Express {
  const app = express();
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));
  app.use('/api/health', createHealthRouter());
  app.use('/api/v1/auth', createAuthRouter(new AuthService(databaseConnection)));
  app.use(errorHandler);
  return app;
}

