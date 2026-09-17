import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initializeDatabase } from '../src/db/database';
import { CatalogueService } from '../src/services/catalogueService';

let database: InstanceType<typeof DatabaseSync>;
let databasePath: string;

/** Creates an isolated file-backed SQLite database for a catalogue test. */
function createTestDatabase(): InstanceType<typeof DatabaseSync> {
  databasePath = path.join(os.tmpdir(), `bookmyshow-catalogue-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  return initializeDatabase(databasePath);
}

/** Obtains a real JWT through the authentication HTTP boundary. */
async function getAuthToken(app: ReturnType<typeof createApp>): Promise<string> {
  await request(app).post('/api/v1/auth/login').send({ mobileNumber: '9123456789' });
  const response = await request(app).post('/api/v1/auth/verify').send({ mobileNumber: '9123456789', otp: '1234' });
  return response.body.token as string;
}

afterEach(() => {
  database.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${databasePath}${suffix}`;
    if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
});

describe('catalogue service', () => {
  beforeEach(() => {
    database = createTestDatabase();
  });

  it('reads seeded movies and theatre mappings from SQLite', () => {
    const service = new CatalogueService(database);
    expect(service.listMovies().map((movie) => movie.title)).toEqual(['Paradise', 'Bloody Romeo', 'OG2']);
    expect(service.listTheatres(1).map((theatre) => theatre.name)).toEqual(['Sandhya 70mm', 'Sudharsham 70mm', 'Allu Cinemas']);
    expect(database.prepare('SELECT COUNT(*) AS count FROM movie_theatres').get()).toEqual({ count: 9 });
  });

  it('returns no theatres for an unknown movie mapping', () => {
    expect(new CatalogueService(database).listTheatres(99999)).toEqual([]);
  });
});

describe('catalogue HTTP API', () => {
  beforeEach(() => {
    database = createTestDatabase();
  });

  it('returns the seeded movies for an authenticated request', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).get('/api/v1/movies').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ movies: [{ id: 1, title: 'Paradise' }, { id: 2, title: 'Bloody Romeo' }, { id: 3, title: 'OG2' }] });
  });

  it('returns mapped theatres for an authenticated movie selection', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).get('/api/v1/theatres?movieId=2').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ theatres: [{ id: 1, name: 'Sandhya 70mm' }, { id: 2, name: 'Sudharsham 70mm' }, { id: 3, name: 'Allu Cinemas' }] });
  });

  it('requires authentication on both catalogue endpoints', async () => {
    const app = createApp(database);
    const movies = await request(app).get('/api/v1/movies');
    const theatres = await request(app).get('/api/v1/theatres?movieId=1');
    expect(movies.status).toBe(401);
    expect(theatres.status).toBe(401);
  });

  it('rejects malformed movieId at the request boundary', async () => {
    const app = createApp(database);
    const token = await getAuthToken(app);
    const response = await request(app).get('/api/v1/theatres?movieId=not-a-number').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'movieId must be a positive integer' });
  });
});
