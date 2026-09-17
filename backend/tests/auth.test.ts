import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initializeDatabase } from '../src/db/database';
import { AuthService } from '../src/services/authService';

let database: InstanceType<typeof DatabaseSync>;
let databasePath: string;

/** Creates a unique file-backed SQLite database for each test. */
function createTestDatabase(): InstanceType<typeof DatabaseSync> {
  databasePath = path.join(os.tmpdir(), `bookmyshow-auth-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  return initializeDatabase(databasePath);
}

afterEach(() => {
  database.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${databasePath}${suffix}`;
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  }
});

describe('AuthService', () => {
  beforeEach(() => {
    database = createTestDatabase();
  });

  it('initiates login idempotently and returns the seeded user', () => {
    const service = new AuthService(database);
    const first = service.initiateLogin('9876543210');
    const second = service.initiateLogin('9876543210');
    expect(first).toEqual({ id: 1, mobileNumber: '9876543210' });
    expect(second).toEqual(first);
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });

  it('issues a signed response for the fixed OTP and rejects a wrong OTP', () => {
    const service = new AuthService(database);
    service.initiateLogin('9123456789');
    const result = service.verifyOtp('9123456789', '1234');
    expect(result.user.mobileNumber).toBe('9123456789');
    expect(result.token.split('.')).toHaveLength(3);
    expect(() => service.verifyOtp('9123456789', '0000')).toThrow('Invalid OTP');
  });
});

describe('authentication HTTP API', () => {
  beforeEach(() => {
    database = createTestDatabase();
  });

  it('returns health without authentication', async () => {
    const response = await request(createApp(database)).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a validation error for malformed login bodies', async () => {
    const response = await request(createApp(database)).post('/api/v1/auth/login').send({ mobileNumber: 'abc' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
  });

  it('initiates login and verifies the OTP through HTTP', async () => {
    const app = createApp(database);
    const loginResponse = await request(app).post('/api/v1/auth/login').send({ mobileNumber: '9123456789' });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.mobileNumber).toBe('9123456789');

    const verifyResponse = await request(app).post('/api/v1/auth/verify').send({ mobileNumber: '9123456789', otp: '1234' });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.user).toEqual({ id: 2, mobileNumber: '9123456789' });
    expect(verifyResponse.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong OTP without redirecting or issuing a token', async () => {
    const app = createApp(database);
    await request(app).post('/api/v1/auth/login').send({ mobileNumber: '9123456789' });
    const response = await request(app).post('/api/v1/auth/verify').send({ mobileNumber: '9123456789', otp: '9999' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid OTP' });
  });

  it('protects the session boundary and accepts a valid issued token', async () => {
    const app = createApp(database);
    const unauthorized = await request(app).get('/api/v1/auth/session');
    expect(unauthorized.status).toBe(401);

    await request(app).post('/api/v1/auth/login').send({ mobileNumber: '9123456789' });
    const verified = await request(app).post('/api/v1/auth/verify').send({ mobileNumber: '9123456789', otp: '1234' });
    const authorized = await request(app).get('/api/v1/auth/session').set('Authorization', `Bearer ${verified.body.token}`);
    expect(authorized.status).toBe(200);
    expect(authorized.body.user.mobileNumber).toBe('9123456789');
  });
});

describe('authentication request boundary coverage', () => {
  beforeEach(() => {
    database = createTestDatabase();
  });

  it.each([
    {},
    { mobileNumber: '' },
    { mobileNumber: null },
    { mobileNumber: 9123456789 },
    { mobileNumber: '912345678' },
    { mobileNumber: '91234567890' },
    { mobileNumber: "9123456789' OR '1'='1" },
    { mobileNumber: '<script>alert(1)</script>' },
    { mobileNumber: '../../etc/passwd' }
  ])('rejects invalid login payload %# with an explicit error body', async (payload) => {
    const response = await request(createApp(database)).post('/api/v1/auth/login').send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });

  it.each([
    {},
    { mobileNumber: '9123456789' },
    { otp: '1234' },
    { mobileNumber: '', otp: '1234' },
    { mobileNumber: '9123456789', otp: '' },
    { mobileNumber: '9123456789', otp: null },
    { mobileNumber: 9123456789, otp: '1234' },
    { mobileNumber: '9123456789', otp: 1234 },
    { mobileNumber: '9123456789', otp: '1234', redirect: '/admin' },
    { mobileNumber: '9123456789', otp: '<script>alert(1)</script>' },
    { mobileNumber: '9123456789', otp: "' OR 1=1 --" }
  ])('rejects invalid verify payload %# without issuing a token', async (payload) => {
    const response = await request(createApp(database)).post('/api/v1/auth/verify').send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
    expect(response.body.token).toBeUndefined();
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });

  it('rejects an oversized JSON body with an explicit non-success response', async () => {
    const response = await request(createApp(database))
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ mobileNumber: '9123456789', padding: 'x'.repeat(17 * 1024) }));
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'request entity too large' });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });
});
