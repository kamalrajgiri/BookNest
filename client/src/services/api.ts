
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL is not configured.');
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

interface RefreshResponse {
  accessToken: string;
}

function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/');
}

function getErrorMessage(data: unknown): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message;
  }

  return 'Something went wrong.';
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        const data: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new ApiError(getErrorMessage(data), response.status);
        }

        const result = data as RefreshResponse;

        if (!result.accessToken) {
          throw new Error('Refresh response did not contain an access token.');
        }

        setAccessToken(result.accessToken);
        return result.accessToken;
      } catch {
        setAccessToken(null);
        onSessionExpired?.();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const body =
    options.body === undefined
      ? undefined
      : options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);

  const tokenUsed = accessToken;

  if (tokenUsed) {
    headers.set('Authorization', `Bearer ${tokenUsed}`);
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    body,
    credentials: 'include',
  };

  let response = await fetch(`${API_URL}${endpoint}`, requestOptions);

  if (response.status === 401 && !isAuthEndpoint(endpoint)) {
    // Another request may already have refreshed the token.
    let newToken: string | null;

    if (tokenUsed && tokenUsed !== accessToken) {
      newToken = accessToken;
    } else {
      newToken = await refreshAccessToken();
    }

    if (newToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);

      response = await fetch(`${API_URL}${endpoint}`, {
        ...requestOptions,
        headers: retryHeaders,
      });
    }
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(data), response.status);
  }

  return data as T;
}
