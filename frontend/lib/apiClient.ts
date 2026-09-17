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

/** Represents an expected HTTP failure that the form can render without logging. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

type RequestOptions = RequestInit & { transport?: 'fetch' | 'xhr' };

/** Reads an XHR response using the same error normalization as fetch. */
function requestWithXhr<T>(url: string, init: RequestOptions): Promise<{ body: T; status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? 'GET', url);
    xhr.withCredentials = true;
    Object.entries(init.headers ?? {}).forEach(([name, value]) => {
      if (typeof value === 'string') xhr.setRequestHeader(name, value);
    });
    xhr.onload = () => {
      try {
        resolve({ body: JSON.parse(xhr.responseText) as T, status: xhr.status });
      } catch {
        resolve({ body: {} as T, status: xhr.status });
      }
    };
    xhr.onerror = () => reject(new Error('Unable to reach the cinema service. Please try again.'));
    xhr.send(typeof init.body === 'string' ? init.body : null);
  });
}

/** Sends a typed request to the versioned auth API and normalizes failures. */
async function request<T>(path: string, init: RequestOptions): Promise<T> {
  let response: Response;
  let body: { error?: string };
  if (init.transport === 'xhr') {
    const xhrResponse = await requestWithXhr<{ error?: string }>(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    body = xhrResponse.body;
    if (xhrResponse.status < 200 || xhrResponse.status >= 300) {
      throw new ApiError(body.error ?? 'The request could not be completed.', xhrResponse.status);
    }
    return body as T;
  }
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      credentials: 'include'
    });
  } catch {
    throw new Error('Unable to reach the cinema service. Please try again.');
  }
  body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiError(body.error ?? 'The request could not be completed.', response.status);
  }
  return body as T;
}

/** Starts an OTP login for a mobile number. */
export function login(mobileNumber: string): Promise<{ message: string; user: ApiUser }> {
  return request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ mobileNumber }) });
}

/** Verifies an OTP and receives the backend-issued session token. */
export function verify(mobileNumber: string, otp: string): Promise<VerifyResult> {
  return request('/api/v1/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, otp }),
    transport: 'xhr',
  });
}

/** Checks the protected session boundary using the stored bearer token. */
export function getSession(token: string): Promise<{ user: ApiUser }> {
  return request('/api/v1/auth/session', { headers: { Authorization: `Bearer ${token}` } });
}
