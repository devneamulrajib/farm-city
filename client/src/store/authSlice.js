import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { authApi } from '../services/resources.js';
import { setAccessToken } from '../services/api.js';

export const bootstrap = createAsyncThunk('auth/bootstrap', async () => {
  try {
    const { data } = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`, {}, { withCredentials: true });
    if (!data.data?.accessToken) {
      setAccessToken(null);
      return null;
    }
    setAccessToken(data.data.accessToken);
    return data.data.user;
  } catch {
    setAccessToken(null);
    return null;
  }
});

export const login = createAsyncThunk('auth/login', async (body) => {
  const data = await authApi.login(body);
  setAccessToken(data.data.accessToken);
  return data.data.user;
});

export const register = createAsyncThunk('auth/register', async (body) => {
  const data = await authApi.register(body);
  setAccessToken(data.data.accessToken);
  return data.data.user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {});
  setAccessToken(null);
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'loading' },
  reducers: {
    setUser(state, action) { state.user = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.fulfilled, (state, action) => { state.user = action.payload; state.status = 'ready'; })
      .addCase(bootstrap.rejected, (state) => { state.status = 'ready'; })
      .addCase(login.fulfilled, (state, action) => { state.user = action.payload; state.status = 'ready'; })
      .addCase(register.fulfilled, (state, action) => { state.user = action.payload; state.status = 'ready'; })
      .addCase(logout.fulfilled, (state) => { state.user = null; });
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
