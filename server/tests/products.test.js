import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, auth, createAccount } from './helpers.js';

const fishSchema = [
  {
    key: 'species',
    label: { en: 'Species', bn: 'প্রজাতি' },
    type: 'text',
    required: true,
    filterable: false,
    options: [],
  },
  {
    key: 'freshness',
    label: { en: 'Freshness', bn: 'টাটকা' },
    type: 'select',
    required: true,
    filterable: true,
    options: [
      { value: 'fresh', label: { en: 'Fresh', bn: 'টাটকা' } },
      { value: 'chilled', label: { en: 'Chilled', bn: 'ঠান্ডা' } },
    ],
  },
];

async function adminToken() {
  const { token } = await createAccount({
    email: 'admin@farmcity.test',
    phone: '01610000001',
    role: 'admin',
    name: 'Admin',
  });
  return token;
}

describe('products and categories', () => {
  it('validates dynamic attributes and lists products', async () => {
    const token = await adminToken();
    const category = await request(app).post('/api/categories').set(auth(token)).send({
      name: { en: 'Freshwater Fish', bn: 'মিঠা পানির মাছ' },
      attributeSchema: fishSchema,
      isVisible: true,
      isFeatured: true,
    });
    expect(category.status).toBe(201);
    const categoryId = category.body.data._id;

    const invalid = await request(app).post('/api/products').set(auth(token)).send({
      name: { en: 'Rui', bn: 'রুই' },
      description: { en: 'River carp.', bn: 'নদীর রুই।' },
      categoryId,
      images: [{ url: '/uploads/rui.jpg' }],
      basePrice: 420,
      unit: 'kg',
      attributes: { freshness: 'fresh' },
    });
    expect(invalid.status).toBe(400);

    const created = await request(app).post('/api/products').set(auth(token)).send({
      name: { en: 'Rui (Rohu)', bn: 'রুই' },
      description: { en: 'A mild river carp for daily meals.', bn: 'প্রতিদিনের রান্নায় নরম স্বাদের রুই।' },
      categoryId,
      images: [{ url: '/uploads/rui.jpg', alt: 'Rui' }],
      basePrice: 420,
      compareAtPrice: 480,
      unit: 'kg',
      stock: 6,
      allowCustomQuantity: true,
      minQuantity: 0.5,
      maxQuantity: 5,
      variants: [
        { label: '1 kg', weightValue: 1, weightUnit: 'kg', price: 420, stock: 10, isDefault: true },
      ],
      attributes: { species: 'Labeo rohita', freshness: 'fresh' },
      tags: ['rui', 'rohu'],
      isBestSeller: true,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.attributes.species).toBe('Labeo rohita');

    const customer = await createAccount({ email: 'shopper@farmcity.test', phone: '01510000001' });
    const forbidden = await request(app).post('/api/products').set(auth(customer.token)).send(created.body.data);
    expect(forbidden.status).toBe(403);

    const list = await request(app).get('/api/products').query({ q: 'rui', category: category.body.data.slug });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);

    const filtered = await request(app).get('/api/products').query({ minPrice: 500 });
    expect(filtered.body.data).toHaveLength(0);

    const detail = await request(app).get(`/api/products/${created.body.data.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.product.category.attributeSchema).toHaveLength(2);
  });
});
