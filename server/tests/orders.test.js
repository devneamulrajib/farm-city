import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Product } from '../src/models/Product.js';
import { app, auth, createAccount } from './helpers.js';

describe('orders', () => {
  it('checks out with cash on delivery, snapshots price, and restores stock on cancel', async () => {
    const admin = await createAccount({ email: 'admin@farmcity.test', phone: '01612220001', role: 'admin', name: 'Shop Admin' });
    const category = await request(app).post('/api/categories').set(auth(admin.token)).send({
      name: { en: 'Popular Fish', bn: 'জনপ্রিয় মাছ' },
      attributeSchema: [
        { key: 'origin', label: { en: 'Origin', bn: 'উৎস' }, type: 'text', required: true, options: [] },
      ],
    });
    const productRes = await request(app).post('/api/products').set(auth(admin.token)).send({
      name: { en: 'Pangas', bn: 'পাঙ্গাস' },
      description: { en: 'A soft everyday fish.', bn: 'নরম মাংসের পাঙ্গাস।' },
      categoryId: category.body.data._id,
      images: [{ url: '/uploads/pangas.jpg' }],
      basePrice: 200,
      unit: 'kg',
      stock: 5,
      variants: [
        { label: '1 kg', weightValue: 1, weightUnit: 'kg', price: 200, compareAtPrice: 230, stock: 8, isDefault: true },
      ],
      attributes: { origin: 'Mymensingh farms' },
    });
    const product = productRes.body.data;
    await request(app).post('/api/admin/delivery-zones').set(auth(admin.token)).send({
      district: 'Dhaka',
      area: 'Dhanmondi',
      charge: 70,
      eta: { en: 'Same day', bn: 'আজই' },
    });

    const methods = await request(app).get('/api/payments/methods');
    expect(methods.body.data.map((method) => method.id)).toEqual(['cod']);

    const guest = '22222222-2222-4222-8222-222222222222';
    await request(app).post('/api/cart/items').set('x-guest-id', guest).send({
      productId: product.id,
      mode: 'variant',
      variantId: product.variants[0].id,
      quantity: 2,
    });
    const orderRes = await request(app).post('/api/orders').set('x-guest-id', guest).send({
      name: 'Karim Uddin',
      phone: '01819001122',
      email: '',
      addressLine: '12 Road 8, Dhanmondi',
      district: 'Dhaka',
      area: 'Dhanmondi',
      instructions: 'Call on arrival',
      paymentMethod: 'cod',
    });
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.data.order;
    expect(order.subtotal).toBe(400);
    expect(order.deliveryCharge).toBe(70);
    expect(order.total).toBe(470);
    expect(order.items[0].name.en).toBe('Pangas');
    expect(order.items[0].unitPrice).toBe(200);
    expect(order.items[0].variantLabel).toBe('1 kg');
    expect(order.paymentMethod).toBe('cod');
    expect(order.status).toBe('Pending');
    expect(orderRes.body.data.payment.redirectUrl).toBe('');

    const stored = await Product.findById(product.id);
    expect(stored.variants[0].stock).toBe(6);

    await Product.updateOne({ _id: product.id }, { $set: { basePrice: 999, 'variants.0.price': 999 } });
    const viewed = await request(app).get(`/api/orders/${order.orderNumber}`).query({ token: order.viewToken });
    expect(viewed.body.data.items[0].unitPrice).toBe(200);

    const tracked = await request(app).post('/api/orders/track').send({
      orderNumber: order.orderNumber,
      phone: '+8801819001122',
    });
    expect(tracked.status).toBe(200);

    const buyer = await createAccount({ email: 'karim@farmcity.test', phone: '01819001122', name: 'Karim Uddin' });
    const mine = await request(app).get('/api/orders').set(auth(buyer.token));
    expect(mine.body.data).toHaveLength(1);

    const cancelled = await request(app).post(`/api/orders/${order.orderNumber}/cancel`).set(auth(buyer.token)).send({ note: 'Changed my mind' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('Cancelled');
    const restored = await Product.findById(product.id);
    expect(restored.variants[0].stock).toBe(8);

    await request(app).post('/api/cart/items').set(auth(buyer.token)).send({
      productId: product.id,
      mode: 'variant',
      variantId: product.variants[0].id,
      quantity: 1,
    });
    const second = await request(app).post('/api/orders').set(auth(buyer.token)).send({
      name: 'Karim Uddin',
      phone: '01819001122',
      addressLine: '12 Road 8, Dhanmondi',
      district: 'Dhaka',
      area: 'Dhanmondi',
      paymentMethod: 'cod',
    });
    expect(second.status).toBe(201);
    const denied = await request(app).patch(`/api/admin/orders/${second.body.data.order.id}/status`)
      .set(auth(buyer.token))
      .send({ status: 'Confirmed' });
    expect(denied.status).toBe(403);

    const moved = await request(app).patch(`/api/admin/orders/${second.body.data.order.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'Confirmed', note: 'Packed on ice' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.status).toBe('Confirmed');
  });
});
