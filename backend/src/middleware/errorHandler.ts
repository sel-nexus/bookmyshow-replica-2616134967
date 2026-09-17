import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AuthServiceError } from '../services/authService';

/** Converts known and unknown route failures into a stable JSON error shape. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request body', details: error.issues });
    return;
  }
  if (error instanceof AuthServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: message });
};
