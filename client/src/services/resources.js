import { del, get, patch, post, put } from './api.js';

export const catalogApi = {
  categories: () => get('/api/categories'),
  products: (params) => get('/api/products', { params }),
  product: (slug) => get(`/api/products/${slug}`),
  reviews: (slug) => get(`/api/reviews/product/${slug}`),
  addReview: (body) => post('/api/reviews', body),
  banners: (placement) => get('/api/banners', { params: { placement } }),
  settings: () => get('/api/settings/public'),
  zones: () => get('/api/delivery/zones'),
  quote: (body) => post('/api/delivery/quote', body),
  methods: () => get('/api/payments/methods'),
  subscribe: (email) => post('/api/newsletter/subscribe', { email }),
  inquiry: (body) => post('/api/inquiries', body),
};

export const authApi = {
  register: (body) => post('/api/auth/register', body),
  login: (body) => post('/api/auth/login', body),
  logout: () => post('/api/auth/logout', {}),
  me: () => get('/api/auth/me'),
  updateProfile: (body) => patch('/api/users/me', body),
  updatePassword: (body) => put('/api/users/me/password', body),
  addAddress: (body) => post('/api/users/me/addresses', body),
  updateAddress: (id, body) => patch(`/api/users/me/addresses/${id}`, body),
  deleteAddress: (id) => del(`/api/users/me/addresses/${id}`),
};

export const cartApi = {
  get: () => get('/api/cart'),
  add: (body) => post('/api/cart/items', body),
  update: (id, quantity) => patch(`/api/cart/items/${id}`, { quantity }),
  remove: (id) => del(`/api/cart/items/${id}`),
  coupon: (code) => post('/api/cart/coupon', { code }),
  removeCoupon: () => del('/api/cart/coupon'),
  merge: (guestId) => post('/api/cart/merge', { guestId }),
};

export const orderApi = {
  create: (body) => post('/api/orders', body),
  mine: () => get('/api/orders'),
  mineOne: (orderNumber) => get(`/api/orders/mine/${orderNumber}`),
  byToken: (orderNumber, token) => get(`/api/orders/${orderNumber}`, { params: { token } }),
  track: (body) => post('/api/orders/track', body),
  cancel: (orderNumber, note) => post(`/api/orders/${orderNumber}/cancel`, { note }),
};

export const adminApi = {
  overview: () => get('/api/admin/overview'),
  products: (params) => get('/api/admin/products', { params }),
  product: (id) => get(`/api/admin/products/${id}`),
  saveProduct: (body, id) => (id ? put(`/api/products/${id}`, body) : post('/api/products', body)),
  deleteProduct: (id) => del(`/api/products/${id}`),
  categories: () => get('/api/admin/categories'),
  saveCategory: (body, id) => (id ? put(`/api/categories/${id}`, body) : post('/api/categories', body)),
  deleteCategory: (id) => del(`/api/categories/${id}`),
  orders: (params) => get('/api/admin/orders', { params }),
  order: (id) => get(`/api/admin/orders/${id}`),
  status: (id, body) => patch(`/api/admin/orders/${id}/status`, body),
  customers: (params) => get('/api/admin/customers', { params }),
  customer: (id) => get(`/api/admin/customers/${id}`),
  customerStatus: (id, isActive) => patch(`/api/admin/customers/${id}`, { isActive }),
  settings: () => get('/api/admin/settings'),
  saveSettings: (body) => put('/api/admin/settings', body),
  providers: () => get('/api/admin/payment-providers'),
  zones: () => get('/api/admin/delivery-zones'),
  saveZone: (body, id) => (id ? put(`/api/admin/delivery-zones/${id}`, body) : post('/api/admin/delivery-zones', body)),
  deleteZone: (id) => del(`/api/admin/delivery-zones/${id}`),
  banners: () => get('/api/admin/banners'),
  saveBanner: (body, id) => (id ? put(`/api/banners/${id}`, body) : post('/api/banners', body)),
  deleteBanner: (id) => del(`/api/banners/${id}`),
  coupons: () => get('/api/admin/coupons'),
  saveCoupon: (body, id) => (id ? put(`/api/admin/coupons/${id}`, body) : post('/api/admin/coupons', body)),
  deleteCoupon: (id) => del(`/api/admin/coupons/${id}`),
  inquiries: () => get('/api/admin/inquiries'),
  subscribers: () => get('/api/admin/subscribers'),
  upload: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const { api } = await import('./api.js');
    const res = await api.post('/api/admin/uploads', form);
    return res.data;
  },
};
