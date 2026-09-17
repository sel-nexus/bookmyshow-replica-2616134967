import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export type PaymentMethod = 'Card' | 'UPI';

export interface CreateBookingInput {
  userId: number;
  movieId: number;
  theatreId: number;
  seats: string[];
  paymentMethod: PaymentMethod;
  totalPrice: number;
}

export interface Booking {
  id: number;
  confirmationId: string;
  movie: { id: number; title: string };
  theatre: { id: number; name: string };
  seats: string[];
  paymentMethod: PaymentMethod;
  totalPrice: number;
}

/** Represents a known booking-domain failure with its HTTP status. */
export class BookingServiceError extends Error {
  public constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'BookingServiceError';
  }
}

/** Persists bookings in SQLite and returns the joined confirmation contract. */
export class BookingService {
  public constructor(private readonly database: InstanceType<typeof DatabaseSync>) {}

  /** Creates one booking for the authenticated user after validating all references. */
  public createBooking(input: CreateBookingInput): Booking {
    const user = this.database.prepare('SELECT id FROM users WHERE id = ?').get(input.userId) as { id: number } | undefined;
    if (!user) throw new BookingServiceError('Authenticated user was not found', 401);

    const movie = this.database.prepare('SELECT id, title FROM movies WHERE id = ?').get(input.movieId) as { id: number; title: string } | undefined;
    if (!movie) throw new BookingServiceError('Movie was not found', 404);

    const theatre = this.database.prepare('SELECT id, name FROM theatres WHERE id = ?').get(input.theatreId) as { id: number; name: string } | undefined;
    if (!theatre) throw new BookingServiceError('Theatre was not found', 404);

    const mapping = this.database.prepare('SELECT 1 AS found FROM movie_theatres WHERE movie_id = ? AND theatre_id = ?').get(input.movieId, input.theatreId) as { found: number } | undefined;
    if (!mapping) throw new BookingServiceError('Theatre is not showing this movie', 404);

    const confirmationId = `BMS-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const result = this.database.prepare(`
      INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.userId, input.movieId, input.theatreId, JSON.stringify(input.seats), input.paymentMethod, input.totalPrice, confirmationId);

    return {
      id: Number(result.lastInsertRowid),
      confirmationId,
      movie,
      theatre,
      seats: input.seats,
      paymentMethod: input.paymentMethod,
      totalPrice: input.totalPrice
    };
  }
}
