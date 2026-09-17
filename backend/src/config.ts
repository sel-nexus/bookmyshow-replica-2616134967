import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_PATH: z.string().min(1).default('./data/bookmyshow.sqlite'),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('bookmyshow-replica'),
  JWT_AUDIENCE: z.string().min(1).default('bookmyshow-web')
});

const parsedEnvironment = environmentSchema.safeParse(process.env);
if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnvironment.error.message}`);
}

/** Validated application configuration loaded once at startup. */
export const config = {
  port: parsedEnvironment.data.PORT,
  corsOrigins: parsedEnvironment.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  databasePath: parsedEnvironment.data.DATABASE_PATH,
  jwtSecret: parsedEnvironment.data.JWT_SECRET,
  jwtIssuer: parsedEnvironment.data.JWT_ISSUER,
  jwtAudience: parsedEnvironment.data.JWT_AUDIENCE
} as const;
