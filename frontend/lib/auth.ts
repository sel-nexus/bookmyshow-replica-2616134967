import type { ApiUser } from './apiClient';

const tokenKey = 'bookmyshow.auth.token';
const userKey = 'bookmyshow.auth.user';
const mobileKey = 'bookmyshow.auth.mobile';

/** Reads a stored token safely in browser-only contexts. */
export function readToken(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(tokenKey);
}

/** Persists the backend-issued token and public user for session rehydration. */
export function saveSession(token: string, user: ApiUser): void {
  window.localStorage.setItem(tokenKey, token);
  window.localStorage.setItem(userKey, JSON.stringify(user));
}

/** Reads the last mobile number so the verification step is refresh-safe. */
export function readMobileNumber(): string {
  return typeof window === 'undefined' ? '' : window.localStorage.getItem(mobileKey) ?? '';
}

/** Stores the mobile number between login initiation and OTP verification. */
export function saveMobileNumber(mobileNumber: string): void {
  window.localStorage.setItem(mobileKey, mobileNumber);
}

/** Reads the cached user without trusting it for protected requests. */
export function readCachedUser(): ApiUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(userKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

/** Clears local session state after logout or an invalid token response. */
export function clearSession(): void {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(userKey);
}
