import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  login as loginService,
  register as registerService,
  refreshSession,
  logout as logoutService,
} from '../../services/authService';

import type {
  User,
  AuthResponse,
} from '../../types/auth';

import type {
  LoginCredentials,
  RegisterCredentials,
} from '../../services/authService';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

export const login = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await loginService(credentials);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const register = createAsyncThunk<
  User,
  RegisterCredentials,
  { rejectValue: string }
>(
  'auth/register',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await registerService(credentials);
      return response.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const initializeAuth = createAsyncThunk<
  AuthResponse | null
>(
  'auth/initialize',
  async () => {
    try {
      return await refreshSession();
    } catch {
      return null;
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await logoutService();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    sessionExpired(state) {
      state.user = null;
      state.status = 'unauthenticated';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = 'authenticated';
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.payload ?? 'Login failed.';
      })

      // Registration
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'unauthenticated';
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.payload ?? 'Registration failed.';
      })

      // Initial session restoration
      .addCase(initializeAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.status = 'authenticated';
        } else {
          state.user = null;
          state.status = 'unauthenticated';
        }
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      });
  },

});

export const { clearAuthError, sessionExpired } = authSlice.actions;

export default authSlice.reducer;