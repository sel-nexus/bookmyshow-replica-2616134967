/** Represents the public identity returned by authentication endpoints. */
export interface User {
  id: number;
  mobileNumber: string;
}

/** Represents the signed claims used by the protected session boundary. */
export interface AuthClaims {
  userId: number;
  mobileNumber: string;
}

/** Represents the response from successful OTP verification. */
export interface VerifyResponse {
  token: string;
  user: User;
}

/** Represents a movie available in the catalogue. */
export interface Movie {
  id: number;
  title: string;
}

/** Represents a theatre available for a movie. */
export interface Theatre {
  id: number;
  name: string;
}

/** Adds the authenticated user to Express requests after middleware succeeds. */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
