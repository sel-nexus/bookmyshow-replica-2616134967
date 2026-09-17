import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import type { User } from '../types/domain';
import { requireAuth } from '../middleware/authMiddleware';

const mobileNumberSchema = z.string().trim().regex(/^\d{10}$/, 'Mobile number must contain exactly 10 digits');
const loginSchema = z.object({ mobileNumber: mobileNumberSchema }).strict();
const verifySchema = z.object({ mobileNumber: mobileNumberSchema, otp: z.string().regex(/^\d{4}$/, 'OTP must contain exactly 4 digits') }).strict();

/** Creates authentication routes backed by the supplied SQLite service. */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/login', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const input = loginSchema.parse(req.body);
      const user = authService.initiateLogin(input.mobileNumber);
      res.status(200).json({ message: 'OTP ready', user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verify', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const input = verifySchema.parse(req.body);
      const result = authService.verifyOtp(input.mobileNumber, input.otp);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/session', requireAuth, (req: Request, res: Response): void => {
    const user: User | undefined = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.status(200).json({ user });
  });

  return router;
}
