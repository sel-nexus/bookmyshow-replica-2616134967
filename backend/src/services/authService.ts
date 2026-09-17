import type { DatabaseSync } from 'node:sqlite';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { AuthClaims, User, VerifyResponse } from '../types/domain';

const DEMO_OTP = '1234';

/** Provides database-backed mobile authentication and signed session issuance. */
export class AuthService {
  public constructor(private readonly database: InstanceType<typeof DatabaseSync>) {}

  /** Creates the user record if needed and reports that the OTP step is ready. */
  public initiateLogin(mobileNumber: string): User {
    const normalizedMobileNumber = mobileNumber.trim();
    this.database.prepare('INSERT OR IGNORE INTO users (mobile_number) VALUES (?)').run(normalizedMobileNumber);
    const row = this.database
      .prepare('SELECT id, mobile_number AS mobileNumber FROM users WHERE mobile_number = ?')
      .get(normalizedMobileNumber) as User | undefined;
    if (!row) {
      throw new Error('Unable to initialize login');
    }
    return row;
  }

  /** Verifies the fixed demo OTP and returns a real HS256 JWT with the public user. */
  public verifyOtp(mobileNumber: string, otp: string): VerifyResponse {
    const normalizedMobileNumber = mobileNumber.trim();
    if (otp !== DEMO_OTP) {
      throw new AuthServiceError('Invalid OTP', 401);
    }
    const user = this.findUser(normalizedMobileNumber);
    if (!user) {
      throw new AuthServiceError('Mobile number has not started login', 401);
    }
    const claims: AuthClaims = { userId: user.id, mobileNumber: user.mobileNumber };
    const token = jwt.sign(claims, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '2h',
      issuer: config.jwtIssuer,
      audience: config.jwtAudience
    });
    return { token, user };
  }

  /** Looks up a user by its normalized mobile number. */
  public findUser(mobileNumber: string): User | null {
    const row = this.database
      .prepare('SELECT id, mobile_number AS mobileNumber FROM users WHERE mobile_number = ?')
      .get(mobileNumber.trim()) as User | undefined;
    return row ?? null;
  }
}

/** Represents an expected authentication failure with its HTTP status. */
export class AuthServiceError extends Error {
  public constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

/** Exposes the demo OTP to route-level tests without putting it in the UI contract. */
export const demoOtp = DEMO_OTP;
