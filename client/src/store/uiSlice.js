import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    locale: localStorage.getItem('farmcity_locale') || 'en',
    miniCart: false,
    mobileNav: false,
  },
  reducers: {
    setLocale(state, action) {
      state.locale = action.payload;
      localStorage.setItem('farmcity_locale', action.payload);
    },
    setMiniCart(state, action) { state.miniCart = action.payload; },
    setMobileNav(state, action) { state.mobileNav = action.payload; },
  },
});

export const { setLocale, setMiniCart, setMobileNav } = uiSlice.actions;
export default uiSlice.reducer;
