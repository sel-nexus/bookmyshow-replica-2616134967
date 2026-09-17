import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { AuthClaims, User } from '../types/domain';

/** Requires a valid bearer JWT and attaches its user identity to the request. */
export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.header('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const claims = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience
    }) as AuthClaims;
    const user: User = { id: claims.userId, mobileNumber: claims.mobileNumber };
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
