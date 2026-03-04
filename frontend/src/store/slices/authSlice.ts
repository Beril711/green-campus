import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,
};

// ── ASYNC THUNKS ──────────────────────────────────────────────────────────────

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; first_name: string; last_name: string; password: string; password_confirm: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register/', data);
      await _saveTokens(res.data.tokens.access, res.data.tokens.refresh);
      return res.data;
    } catch (err: any) {
      const errorData = err.response?.data;
      // Backend validation hatalarını okunabilir mesaja çevir
      if (errorData && typeof errorData === 'object') {
        const messages = Object.entries(errorData)
          .map(([field, errors]) => {
            const errorList = Array.isArray(errors) ? errors.join(', ') : String(errors);
            return `${field}: ${errorList}`;
          })
          .join('\n');
        return rejectWithValue(messages || 'Kayıt başarısız');
      }
      return rejectWithValue(typeof errorData === 'string' ? errorData : 'Kayıt başarısız');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login/', data);
      await _saveTokens(res.data.access, res.data.refresh);
      // Kullanıcı bilgilerini çek
      const meRes = await api.get('/auth/me/');
      return { user: meRes.data, tokens: res.data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Giriş başarısız');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    const { auth } = getState() as { auth: AuthState };
    try {
      if (auth.refreshToken) {
        await api.post('/auth/logout/', { refresh: auth.refreshToken });
      }
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!accessToken || !refreshToken) return null;

      const meRes = await api.get('/auth/me/');
      return { user: meRes.data, accessToken, refreshToken };
    } catch {
      return null;
    }
  }
);

// Yardımcı
async function _saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync('accessToken', access);
  await SecureStore.setItemAsync('refreshToken', refresh);
}

// ── SLICE ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    setUser: (state, action: PayloadAction<User>) => { state.user = action.payload; },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(register.fulfilled, (s, a) => {
      s.isLoading = false;
      s.user = a.payload.user;
      s.accessToken = a.payload.tokens.access;
      s.refreshToken = a.payload.tokens.refresh;
    });
    builder.addCase(register.rejected, (s, a) => { s.isLoading = false; s.error = String(a.payload); });

    // Login
    builder.addCase(login.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(login.fulfilled, (s, a) => {
      s.isLoading = false;
      s.user = a.payload.user;
      s.accessToken = a.payload.tokens.access;
      s.refreshToken = a.payload.tokens.refresh;
    });
    builder.addCase(login.rejected, (s, a) => { s.isLoading = false; s.error = String(a.payload); });

    // Logout
    builder.addCase(logout.fulfilled, (s) => {
      s.user = null; s.accessToken = null; s.refreshToken = null;
    });

    // Load stored
    builder.addCase(loadStoredAuth.fulfilled, (s, a) => {
      if (a.payload) {
        s.user = a.payload.user;
        s.accessToken = a.payload.accessToken;
        s.refreshToken = a.payload.refreshToken;
      }
    });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
