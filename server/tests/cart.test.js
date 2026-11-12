import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, auth, createAccount } from './helpers.js';

async function catalog() {
  const admin = await createAccount({ email: 'admin@farmcity.test', phone: '01610000009', role: 'admin' });
  const category = await request(app).post('/api/categories').set(auth(admin.token)).send({
    name: { en: 'Freshwater Fish', bn: 'মিঠা পানির মাছ' },
    attributeSchema: [],
  });
  const product = await request(app).post('/api/products').set(auth(admin.token)).send({
    name: { en: 'Tilapia', bn: 'তেলাপিয়া' },
    description: { en: 'Firm white fillets.', bn: 'সাদা মাংসের তেলাপিয়া।' },
    categoryId: category.body.data._id,
    images: [{ url: '/uploads/tilapia.jpg' }],
    basePrice: 260,
    unit: 'kg',
    stock: 4,
    allowCustomQuantity: true,
    minQuantity: 0.5,
    maxQuantity: 3,
    variants: [
      { label: '1 kg', weightValue: 1, weightUnit: 'kg', price: 260, stock: 3, isDefault: true },
    ],
    attributes: {},
  });
  return product.body.data;
}

describe('cart', () => {
  it('keeps one guest cart across localhost, loopback, and a LAN address', async () => {
    const product = await catalog();
    const guest = '33333333-3333-4333-8333-333333333333';
    const origins = ['http://localhost:4178', 'http://127.0.0.1:4178', 'http://192.168.0.106:4178'];
    const added = await request(app)
      .post('/api/cart/items')
      .set('Origin', origins[0])
      .set('x-guest-id', guest)
      .send({ productId: product.id, mode: 'variant', variantId: product.variants[0].id, quantity: 2 });
    expect(added.status).toBe(201);
    expect(added.headers['access-control-allow-origin']).toBe(origins[0]);
    expect(added.body.data.items[0].quantity).toBe(2);

    for (const origin of origins) {
      const loaded = await request(app).get('/api/cart').set('Origin', origin).set('x-guest-id', guest);
      expect(loaded.status).toBe(200);
      expect(loaded.headers['access-control-allow-origin']).toBe(origin);
      expect(loaded.body.data.items).toHaveLength(1);
      expect(loaded.body.data.items[0].name.en).toBe('Tilapia');
      expect(loaded.body.data.items[0].quantity).toBe(2);
    }
  });

  it('keeps a guest cart and merges it into the account cart', async () => {
    const product = await catalog();
    const guest = '11111111-1111-4111-8111-111111111111';
    const added = await request(app).post('/api/cart/items').set('x-guest-id', guest).send({
      productId: product.id,
      mode: 'variant',
      variantId: product.variants[0].id,
      quantity: 1,
    });
    expect(added.status).toBe(201);
    expect(added.body.data.subtotal).toBe(260);

    const updated = await request(app).patch(`/api/cart/items/${added.body.data.items[0].id}`)
      .set('x-guest-id', guest)
      .send({ quantity: 2 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.items[0].quantity).toBe(2);

    const tooMany = await request(app).patch(`/api/cart/items/${added.body.data.items[0].id}`)
      .set('x-guest-id', guest)
      .send({ quantity: 9 });
    expect(tooMany.status).toBe(400);

    const account = await createAccount({ email: 'buyer@farmcity.test', phone: '01715550101' });
    const merged = await request(app).post('/api/cart/merge').set(auth(account.token)).send({ guestId: guest });
    expect(merged.status).toBe(200);
    expect(merged.body.data.items).toHaveLength(1);
    expect(merged.body.data.items[0].quantity).toBe(2);

    const guestAfter = await request(app).get('/api/cart').set('x-guest-id', guest);
    expect(guestAfter.body.data.items).toHaveLength(0);
  });
});
