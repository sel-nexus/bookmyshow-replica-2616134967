import fs from 'node:fs';
import path from 'node:path';
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
import { config } from '../config';

/** Opens SQLite and ensures the authentication schema and demo user exist. */
export function initializeDatabase(databasePath: string = config.databasePath): InstanceType<typeof DatabaseSync> {
  const resolvedPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const database = new DatabaseSync(resolvedPath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile_number TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS theatres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS movie_theatres (
      movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      theatre_id INTEGER NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
      PRIMARY KEY (movie_id, theatre_id)
    );
  `);
  database.prepare('INSERT OR IGNORE INTO users (mobile_number) VALUES (?)').run('9876543210');

  const movieTitles = ['Paradise', 'Bloody Romeo', 'OG2'];
  const theatreNames = ['Sandhya 70mm', 'Sudharsham 70mm', 'Allu Cinemas'];
  const insertMovie = database.prepare('INSERT OR IGNORE INTO movies (title) VALUES (?)');
  const insertTheatre = database.prepare('INSERT OR IGNORE INTO theatres (name) VALUES (?)');
  for (const title of movieTitles) insertMovie.run(title);
  for (const name of theatreNames) insertTheatre.run(name);

  const movieRows = database.prepare('SELECT id FROM movies WHERE title IN (?, ?, ?)').all(...movieTitles) as Array<{ id: number }>;
  const theatreRows = database.prepare('SELECT id FROM theatres WHERE name IN (?, ?, ?)').all(...theatreNames) as Array<{ id: number }>;
  const insertMapping = database.prepare('INSERT OR IGNORE INTO movie_theatres (movie_id, theatre_id) VALUES (?, ?)');
  for (const movie of movieRows) {
    for (const theatre of theatreRows) insertMapping.run(movie.id, theatre.id);
  }
  return database;
}
