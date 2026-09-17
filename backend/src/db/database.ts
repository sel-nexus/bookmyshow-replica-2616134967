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
  `);
  database.prepare('INSERT OR IGNORE INTO users (mobile_number) VALUES (?)').run('9876543210');
  return database;
}
