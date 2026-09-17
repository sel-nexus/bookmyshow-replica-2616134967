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

  /** Retrieves one booking only when it belongs to the authenticated user. */
  public getBookingByConfirmationId(confirmationId: string, userId: number): Booking {
    const row = this.database.prepare(`
      SELECT
        b.id,
        b.confirmation_id AS confirmationId,
        b.seats,
        b.payment_method AS paymentMethod,
        b.total_price AS totalPrice,
        m.id AS movieId,
        m.title AS movieTitle,
        t.id AS theatreId,
        t.name AS theatreName
      FROM bookings b
      INNER JOIN movies m ON m.id = b.movie_id
      INNER JOIN theatres t ON t.id = b.theatre_id
      WHERE b.confirmation_id = ? AND b.user_id = ?
    `).get(confirmationId, userId) as {
      id: number;
      confirmationId: string;
      seats: string;
      paymentMethod: PaymentMethod;
      totalPrice: number;
      movieId: number;
      movieTitle: string;
      theatreId: number;
      theatreName: string;
    } | undefined;

    if (!row) throw new BookingServiceError('Booking was not found', 404);

    return {
      id: row.id,
      confirmationId: row.confirmationId,
      movie: { id: row.movieId, title: row.movieTitle },
      theatre: { id: row.theatreId, name: row.theatreName },
      seats: JSON.parse(row.seats) as string[],
      paymentMethod: row.paymentMethod,
      totalPrice: row.totalPrice
    };
  }

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
