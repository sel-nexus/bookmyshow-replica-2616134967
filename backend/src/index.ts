import { createApp } from './app';
import { config } from './config';
import { initializeDatabase } from './db/database';

const database = initializeDatabase();
const app = createApp(database);

/** Starts the HTTP server after database initialization has completed. */
app.listen(config.port, () => {
  // Deliberately log only the bind address; secrets and credentials stay private.
  console.log(`BookMyShow auth API listening on port ${config.port}`);
});
