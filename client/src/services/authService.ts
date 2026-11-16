import { apiRequest, setAccessToken } from './api';

import type {
  AuthResponse,
  RegisterResponse,
  LogoutResponse,
} from '../types/auth';

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export async function register(
  credentials: RegisterCredentials
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: credentials,
  });
}

export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  setAccessToken(response.accessToken);

  return response;
}

let sessionRefreshPromise: Promise<AuthResponse> | null = null;

export function refreshSession(): Promise<AuthResponse> {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = apiRequest<AuthResponse>(
      '/auth/refresh',
      { method: 'POST' }
    )
      .then((response) => {
        setAccessToken(response.accessToken);
        return response;
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
}

export async function logout(): Promise<LogoutResponse> {
  try {
    return await apiRequest<LogoutResponse>('/auth/logout', {
      method: 'POST',
    });
  } finally {
    setAccessToken(null);
  }
}