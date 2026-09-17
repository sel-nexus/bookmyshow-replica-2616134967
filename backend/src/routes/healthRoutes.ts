import { Router, type Request, type Response } from 'express';

/** Creates the dependency-free liveness route used by deployment probes. */
export function createHealthRouter(): Router {
  const router = Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok' });
  });
  return router;
}
