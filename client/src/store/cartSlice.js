import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cartApi } from '../services/resources.js';
import { guestId } from '../services/api.js';

const empty = { items: [], subtotal: 0, discount: 0, total: 0, coupon: null };

// A cart read that started before a write must not replace the newer cart.
let cartEpoch = 0;

async function readCart() {
  const epoch = cartEpoch;
  const data = (await cartApi.get()).data;
  return { data, epoch };
}

async function writeCart(request) {
  const epoch = ++cartEpoch;
  const data = (await request()).data;
  return { data, epoch };
}

export const fetchCart = createAsyncThunk('cart/fetch', () => readCart());
export const addToCart = createAsyncThunk('cart/add', (body) => writeCart(() => cartApi.add(body)));
export const updateCartQty = createAsyncThunk('cart/qty', ({ id, quantity }) => writeCart(() => cartApi.update(id, quantity)));
export const removeFromCart = createAsyncThunk('cart/remove', (id) => writeCart(() => cartApi.remove(id)));
export const applyCoupon = createAsyncThunk('cart/coupon', (code) => writeCart(() => cartApi.coupon(code)));
export const clearCoupon = createAsyncThunk('cart/clearCoupon', () => writeCart(() => cartApi.removeCoupon()));
export const mergeCart = createAsyncThunk('cart/merge', () => writeCart(() => cartApi.merge(guestId())));

const cartSlice = createSlice({
  name: 'cart',
  initialState: { cart: empty, status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    const save = (state, action) => {
      if (!action.payload || action.payload.epoch !== cartEpoch) return;
      state.cart = action.payload.data || empty;
      state.status = 'ready';
    };
    builder
      .addCase(fetchCart.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCart.fulfilled, save)
      .addCase(fetchCart.rejected, (state) => { state.status = 'ready'; })
      .addCase(addToCart.fulfilled, save)
      .addCase(updateCartQty.fulfilled, save)
      .addCase(removeFromCart.fulfilled, save)
      .addCase(applyCoupon.fulfilled, save)
      .addCase(clearCoupon.fulfilled, save)
      .addCase(mergeCart.fulfilled, save);
  },
});

export default cartSlice.reducer;
