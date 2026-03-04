import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { EmissionEntry, TodaySummary, EmissionCategory, EmissionFactor } from '../../types';

interface EmissionState {
  entries: EmissionEntry[];
  todaySummary: TodaySummary | null;
  categories: EmissionCategory[];
  factors: EmissionFactor[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: EmissionState = {
  entries: [],
  todaySummary: null,
  categories: [],
  factors: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

// ── THUNKS ────────────────────────────────────────────────────────────────────

export const fetchTodaySummary = createAsyncThunk(
  'emissions/fetchToday',
  async () => {
    const res = await api.get('/emissions/today/');
    return res.data;
  }
);

export const fetchEntries = createAsyncThunk(
  'emissions/fetchEntries',
  async (params?: { date?: string; category?: string }) => {
    const res = await api.get('/emissions/entries/', { params });
    return res.data.results ?? res.data;
  }
);

export const addEntry = createAsyncThunk(
  'emissions/addEntry',
  async (data: { factor: number; quantity: number; note?: string; date: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/emissions/entries/', data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Giriş eklenemedi');
    }
  }
);

export const deleteEntry = createAsyncThunk(
  'emissions/deleteEntry',
  async (id: string) => {
    await api.delete(`/emissions/entries/${id}/`);
    return id;
  }
);

export const fetchCategories = createAsyncThunk(
  'emissions/fetchCategories',
  async () => {
    const res = await api.get('/emissions/categories/');
    return res.data;
  }
);

export const fetchFactors = createAsyncThunk(
  'emissions/fetchFactors',
  async (categorySlug?: string) => {
    const params = categorySlug ? { category__slug: categorySlug } : {};
    const res = await api.get('/emissions/factors/', { params });
    return res.data;
  }
);

// ── SLICE ────────────────────────────────────────────────────────────────────

const emissionSlice = createSlice({
  name: 'emissions',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    // Today summary
    builder.addCase(fetchTodaySummary.fulfilled, (s, a) => { s.todaySummary = a.payload; });

    // Entries
    builder.addCase(fetchEntries.pending, (s) => { s.isLoading = true; });
    builder.addCase(fetchEntries.fulfilled, (s, a) => { s.isLoading = false; s.entries = a.payload; });
    builder.addCase(fetchEntries.rejected, (s) => { s.isLoading = false; });

    // Add entry
    builder.addCase(addEntry.pending, (s) => { s.isSubmitting = true; s.error = null; });
    builder.addCase(addEntry.fulfilled, (s, a) => {
      s.isSubmitting = false;
      s.entries.unshift(a.payload);
    });
    builder.addCase(addEntry.rejected, (s, a) => { s.isSubmitting = false; s.error = String(a.payload); });

    // Delete entry
    builder.addCase(deleteEntry.fulfilled, (s, a) => {
      s.entries = s.entries.filter(e => e.id !== a.payload);
    });

    // Categories & Factors
    builder.addCase(fetchCategories.fulfilled, (s, a) => {
      s.categories = a.payload?.results ?? a.payload ?? [];
    });
    builder.addCase(fetchFactors.fulfilled, (s, a) => {
      s.factors = a.payload?.results ?? a.payload ?? [];
    });
  },
});

export const { clearError } = emissionSlice.actions;
export default emissionSlice.reducer;
