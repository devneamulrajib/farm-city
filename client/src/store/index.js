import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice.js';
import cart from './cartSlice.js';
import ui from './uiSlice.js';

export const store = configureStore({
  reducer: { auth, cart, ui },
});
