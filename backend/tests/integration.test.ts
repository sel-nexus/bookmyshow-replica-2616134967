import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initializeDatabase } from '../src/db/database';

let database: InstanceType<typeof DatabaseSync>;
let databasePath: string;

function createTestDatabase(): InstanceType<typeof DatabaseSync> {
  databasePath = path.join(os.tmpdir(), `bookmyshow-integration-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  return initializeDatabase(databasePath);
}

async function authenticate(app: ReturnType<typeof createApp>): Promise<{ token: string; userId: number }> {
  const login = await request(app).post('/api/v1/auth/login').send({ mobileNumber: '9123456789' });
  expect(login.status).toBe(200);
  expect(login.body).toEqual({ message: 'OTP ready', user: { id: 2, mobileNumber: '9123456789' } });

  const verify = await request(app).post('/api/v1/auth/verify').send({ mobileNumber: '9123456789', otp: '1234' });
  expect(verify.status).toBe(200);
  expect(verify.body.user).toEqual({ id: 2, mobileNumber: '9123456789' });
  expect(verify.body.token).toEqual(expect.any(String));
  return { token: verify.body.token as string, userId: verify.body.user.id as number };
}

function bookingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    movieId: 2,
    theatreId: 3,
    seats: ['B1', 'B2'],
    paymentMethod: 'UPI',
    totalPrice: 300,
    ...overrides
  };
}

afterEach(() => {
  database.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${databasePath}${suffix}`;
    if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
});

describe('cross-feature backend integration', () => {
  beforeEach(() => {
    database = createTestDatabase();
  });

  it('chains auth, catalogue, theatre mapping, and booking against one SQLite file', async () => {
    const app = createApp(database);
    const { token, userId } = await authenticate(app);

    const movies = await request(app).get('/api/v1/movies').set('Authorization', `Bearer ${token}`);
    expect(movies.status).toBe(200);
    expect(movies.body).toEqual({ movies: [{ id: 1, title: 'Paradise' }, { id: 2, title: 'Bloody Romeo' }, { id: 3, title: 'OG2' }] });

    const theatres = await request(app).get('/api/v1/theatres?movieId=2').set('Authorization', `Bearer ${token}`);
    expect(theatres.status).toBe(200);
    expect(theatres.body).toEqual({ theatres: [{ id: 1, name: 'Sandhya 70mm' }, { id: 2, name: 'Sudharsham 70mm' }, { id: 3, name: 'Allu Cinemas' }] });

    const booking = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload());
    expect(booking.status).toBe(201);
    expect(booking.body.booking).toMatchObject({
      id: 1,
      movie: { id: 2, title: 'Bloody Romeo' },
      theatre: { id: 3, name: 'Allu Cinemas' },
      seats: ['B1', 'B2'],
      paymentMethod: 'UPI',
      totalPrice: 300
    });
    expect(booking.body.booking.confirmationId).toMatch(/^BMS-[A-Z0-9]{12}$/);

    const stored = database.prepare('SELECT user_id, movie_id, theatre_id, seats, payment_method, total_price FROM bookings WHERE id = 1').get() as Record<string, unknown>;
    expect(stored).toEqual({ user_id: userId, movie_id: 2, theatre_id: 3, seats: '["B1","B2"]', payment_method: 'UPI', total_price: 300 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users WHERE id = ?').get(userId)).toEqual({ count: 1 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM movies WHERE id = 2').get()).toEqual({ count: 1 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM theatres WHERE id = 3').get()).toEqual({ count: 1 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings WHERE user_id = ? AND movie_id = 2 AND theatre_id = 3').get(userId)).toEqual({ count: 1 });
  });

  it('propagates auth and catalogue failures without creating orphan bookings', async () => {
    const app = createApp(database);
    const { token } = await authenticate(app);

    const invalidToken = await request(app).get('/api/v1/movies').set('Authorization', 'Bearer invalid-token');
    expect(invalidToken.status).toBe(401);
    expect(invalidToken.body).toEqual({ error: 'Invalid or expired token' });

    const unknownMovie = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload({ movieId: 999 }));
    expect(unknownMovie.status).toBe(404);
    expect(unknownMovie.body).toEqual({ error: 'Movie was not found' });

    const unknownTheatre = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload({ theatreId: 999 }));
    expect(unknownTheatre.status).toBe(404);
    expect(unknownTheatre.body).toEqual({ error: 'Theatre was not found' });

    database.prepare('DELETE FROM movie_theatres WHERE movie_id = 1 AND theatre_id = 1').run();
    const incompatible = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload({ movieId: 1, theatreId: 1 }));
    expect(incompatible.status).toBe(404);
    expect(incompatible.body).toEqual({ error: 'Theatre is not showing this movie' });

    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 2 });
  });
});
