/** Represents the public user shape returned by the auth API. */
export interface ApiUser {
  id: number;
  mobileNumber: string;
}

/** Represents successful OTP verification. */
export interface VerifyResult {
  token: string;
  user: ApiUser;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Sends a typed request to the versioned auth API and normalizes failures. */
async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      credentials: 'include'
    });
  } catch {
    throw new Error('Unable to reach the cinema service. Please try again.');
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? 'The request could not be completed.');
  }
  return body as T;
}

/** Starts an OTP login for a mobile number. */
export function login(mobileNumber: string): Promise<{ message: string; user: ApiUser }> {
  return request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ mobileNumber }) });
}

/** Verifies an OTP and receives the backend-issued session token. */
export function verify(mobileNumber: string, otp: string): Promise<VerifyResult> {
  return request('/api/v1/auth/verify', { method: 'POST', body: JSON.stringify({ mobileNumber, otp }) });
}

/** Checks the protected session boundary using the stored bearer token. */
export function getSession(token: string): Promise<{ user: ApiUser }> {
  return request('/api/v1/auth/session', { headers: { Authorization: `Bearer ${token}` } });
}
