import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { CatalogueService } from '../services/catalogueService';

const movieIdSchema = z.coerce.number().int().positive();

/** Creates protected catalogue routes for movies and theatre mappings. */
export function createCatalogueRouter(catalogueService: CatalogueService): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/movies', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.status(200).json({ movies: catalogueService.listMovies() });
    } catch (error) {
      next(error);
    }
  });

  router.get('/theatres', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsedMovieId = movieIdSchema.safeParse(req.query.movieId);
      if (!parsedMovieId.success) {
        res.status(400).json({ error: 'movieId must be a positive integer' });
        return;
      }
      res.status(200).json({ theatres: catalogueService.listTheatres(parsedMovieId.data) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
