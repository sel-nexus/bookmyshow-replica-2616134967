import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initializeDatabase } from '../src/db/database';
import { BookingService } from '../src/services/bookingService';

let database: InstanceType<typeof DatabaseSync>;
let databasePath: string;

function createTestDatabase(): InstanceType<typeof DatabaseSync> {
  databasePath = path.join(os.tmpdir(), `bookmyshow-booking-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  return initializeDatabase(databasePath);
}

async function getAuthToken(app: ReturnType<typeof createApp>, mobileNumber = '9123456789'): Promise<string> {
  await request(app).post('/api/v1/auth/login').send({ mobileNumber });
  const response = await request(app).post('/api/v1/auth/verify').send({ mobileNumber, otp: '1234' });
  return response.body.token as string;
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'Card', totalPrice: 450, ...overrides };
}

afterEach(() => {
  database.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${databasePath}${suffix}`;
    if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
});

describe('BookingService', () => {
  beforeEach(() => { database = createTestDatabase(); });

  it('persists a booking and can re-query the stored ownership and fields', () => {
    const booking = new BookingService(database).createBooking({ userId: 1, movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'Card', totalPrice: 450 });
    const row = database.prepare('SELECT user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id FROM bookings WHERE id = ?').get(booking.id) as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: 1, movie_id: 1, theatre_id: 1, payment_method: 'Card', total_price: 450, confirmation_id: booking.confirmationId });
    expect(JSON.parse(row.seats as string)).toEqual(['A1', 'A2', 'A3']);
  });

  it('rejects unknown movie, theatre mapping, and missing user references', () => {
    const service = new BookingService(database);
    expect(() => service.createBooking({ userId: 1, movieId: 999, theatreId: 1, seats: ['A1'], paymentMethod: 'UPI', totalPrice: 150 })).toThrow('Movie was not found');
    expect(() => service.createBooking({ userId: 1, movieId: 1, theatreId: 999, seats: ['A1'], paymentMethod: 'UPI', totalPrice: 150 })).toThrow('Theatre was not found');
    expect(() => service.createBooking({ userId: 999, movieId: 1, theatreId: 1, seats: ['A1'], paymentMethod: 'UPI', totalPrice: 150 })).toThrow('Authenticated user was not found');
  });
});

describe('booking HTTP API', () => {
  beforeEach(() => { database = createTestDatabase(); });

  it('returns 201 with the backend confirmation and persists valid booking data', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(validPayload());
    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({ id: 1, movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'Card', totalPrice: 450 });
    expect(response.body.booking.confirmationId).toMatch(/^BMS-[A-Z0-9]{12}$/);
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings WHERE user_id = 2').get()).toEqual({ count: 1 });
  });

  it('returns the persisted booking by confirmation ID for its owner', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const created = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(validPayload());
    const response = await request(app).get(`/api/v1/bookings/${created.body.booking.confirmationId}`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ booking: created.body.booking });
  });

  it('returns 404 for an unknown confirmation ID', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).get('/api/v1/bookings/BMS-AAAAAAAAAAAA').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Booking was not found' });
  });

  it.each(['/api/v1/bookings/not-a-confirmation', '/api/v1/bookings/BMS-too-short', '/api/v1/bookings/BMS-AAAAAAAAAAA!'])('returns 400 for malformed confirmation IDs: %s', async (url) => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
  });

  it('returns 401 for an invalid bearer token on retrieval', async () => {
    const response = await request(createApp(database)).get('/api/v1/bookings/BMS-AAAAAAAAAAAA').set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });

  it('returns 404 when another authenticated user requests the confirmation', async () => {
    const app = createApp(database);
    const ownerToken = await getAuthToken(app);
    const otherUserToken = await getAuthToken(app, '9234567890');
    const created = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${ownerToken}`).send(validPayload());
    const response = await request(app).get(`/api/v1/bookings/${created.body.booking.confirmationId}`).set('Authorization', `Bearer ${otherUserToken}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Booking was not found' });
  });

  it('returns 401 when no bearer token is supplied', async () => {
    const response = await request(createApp(database)).post('/api/v1/bookings').send(validPayload());
    expect(response.status).toBe(401);
  });

  it.each([
    validPayload({ paymentMethod: 'Bitcoin' }),
    validPayload({ seats: [] }),
    validPayload({ seats: ['A1', 'A1'] }),
    validPayload({ totalPrice: 0 }),
    validPayload({ totalPrice: -10 }),
    validPayload({ totalPrice: '450' })
  ])('returns 400 for invalid booking payload %#', async (payload) => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(payload);
    expect(response.status).toBe(400);
  });

  it.each([
    validPayload({ movieId: 999 }),
    validPayload({ theatreId: 999 }),
    validPayload({ movieId: 1, theatreId: 999 })
  ])('returns 404 for unknown or incompatible catalogue references %#', async (payload) => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(payload);
    expect(response.status).toBe(404);
  });

  it.each([
    'movieId',
    'theatreId',
    'seats',
    'paymentMethod',
    'totalPrice'
  ])('rejects a booking body missing only %s with the validation contract', async (missingField) => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const payload = validPayload();
    delete payload[missingField];
    const response = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it.each([
    validPayload({ movieId: 0 }),
    validPayload({ movieId: -1 }),
    validPayload({ movieId: 1.5 }),
    validPayload({ theatreId: 0 }),
    validPayload({ theatreId: -1 }),
    validPayload({ theatreId: 1.5 }),
    validPayload({ movieId: "1 OR 1=1" }),
    validPayload({ theatreId: '<script>alert(1)</script>' }),
    validPayload({ seats: ['../../etc/passwd'] }),
    validPayload({ seats: ['<img src=x onerror=alert(1)>'] }),
    validPayload({ paymentMethod: "' OR 1=1 --" }),
    validPayload({ extra: 'unexpected' })
  ])('rejects invalid, hostile, or unknown booking fields %# without persisting a row', async (payload) => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('rejects an oversized booking body before service persistence', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...validPayload(), padding: 'x'.repeat(17 * 1024) }));
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'request entity too large' });
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('returns the incompatible mapping error and leaves bookings unchanged', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(validPayload({ movieId: 1, theatreId: 999 }));
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Theatre was not found' });
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });

    database.prepare('DELETE FROM movie_theatres WHERE movie_id = 1 AND theatre_id = 1').run();
    expect(database.prepare('SELECT movie_id, theatre_id FROM movie_theatres WHERE movie_id = 1 AND theatre_id = 1').get()).toBeUndefined();
    const incompatible = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(validPayload({ movieId: 1, theatreId: 1 }));
    expect(incompatible.status).toBe(404);
    expect(incompatible.body).toEqual({ error: 'Theatre is not showing this movie' });
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });
});

describe('SQLite booking constraints', () => {
  beforeEach(() => {
    database = createTestDatabase();
    database.exec('PRAGMA foreign_keys = ON');
  });

  it('enforces unique, required, payment, and positive-price constraints in the file-backed database', () => {
    expect(() => database.prepare('INSERT INTO users (mobile_number) VALUES (?)').run('9876543210')).toThrow();
    expect(() => database.prepare('INSERT INTO movies (title) VALUES (?)').run('Paradise')).toThrow();
    expect(() => database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, null, 'Card', 450, 'BMS-DUPLICATE')).toThrow();
    expect(() => database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, '[]', 'Bitcoin', 450, 'BMS-INVALIDPAY')).toThrow();
    expect(() => database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, '[]', 'Card', 0, 'BMS-ZEROPRICE')).toThrow();
    expect(() => database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, '[]', 'Card', -1, 'BMS-NEGPRICE')).toThrow();
    database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, '["A1"]', 'Card', 150, 'BMS-UNIQUE123456');
    expect(() => database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, '["A2"]', 'UPI', 150, 'BMS-UNIQUE123456')).toThrow();
  });

  it('restricts deleting referenced catalogue rows and cascades deleting the owning user', () => {
    database.prepare('INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price, confirmation_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 1, '["A1"]', 'Card', 150, 'BMS-FKDELETE1234');
    expect(() => database.prepare('DELETE FROM movies WHERE id = 1').run()).toThrow();
    expect(() => database.prepare('DELETE FROM theatres WHERE id = 1').run()).toThrow();
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 1 });
    database.prepare('DELETE FROM users WHERE id = 1').run();
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });
});
