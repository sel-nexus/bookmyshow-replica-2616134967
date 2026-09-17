import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { BookingService, BookingServiceError } from '../services/bookingService';

const bookingSchema = z.object({
  movieId: z.number().int().positive(),
  theatreId: z.number().int().positive(),
  seats: z.array(z.string().regex(/^[A-Z][1-9][0-9]?$/, 'Seats must use a valid seat code')).min(1).max(10).refine((seats) => new Set(seats).size === seats.length, 'Seats must be unique'),
  paymentMethod: z.enum(['Card', 'UPI']),
  totalPrice: z.number().finite().positive()
}).strict();

const confirmationIdSchema = z.string().regex(/^BMS-[A-Z0-9]{12}$/, 'Invalid confirmation ID');

/** Creates the authenticated booking endpoint for the checkout confirmation flow. */
export function createBookingRouter(bookingService: BookingService): Router {
  const router = Router();
  router.get('/bookings/:confirmationId', requireAuth, (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const confirmationId = confirmationIdSchema.parse(req.params.confirmationId);
      const booking = bookingService.getBookingByConfirmationId(confirmationId, user.id);
      res.status(200).json({ booking });
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      next(error);
    }
  });
  router.post('/bookings', requireAuth, (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const input = bookingSchema.parse(req.body);
      const booking = bookingService.createBooking({ ...input, userId: user.id });
      res.status(201).json({ booking });
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      next(error);
    }
  });
  return router;
}
