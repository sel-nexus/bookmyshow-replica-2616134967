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

async function getAuthToken(app: ReturnType<typeof createApp>): Promise<string> {
  await request(app).post('/api/v1/auth/login').send({ mobileNumber: '9123456789' });
  const response = await request(app).post('/api/v1/auth/verify').send({ mobileNumber: '9123456789', otp: '1234' });
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
});
