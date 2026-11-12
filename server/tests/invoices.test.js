import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Invoice } from '../src/models/Invoice.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { CustomerNotification } from '../src/models/CustomerNotification.js';
import { backfillInvoices } from '../src/services/invoiceService.js';
import { app, auth, createAccount } from './helpers.js';

async function placeOrder({ token, phone = '01819001122', guest }) {
  const admin = token ? null : await createAccount({ email: 'admin-setup@farmcity.test', phone: '01612220001', role: 'admin', name: 'Shop Admin' });
  const adminToken = token?.admin || admin.token;
  const stamp = `${phone.slice(-4)}-${Math.random().toString(16).slice(2, 6)}`;
  const category = await request(app).post('/api/categories').set(auth(adminToken)).send({
    name: { en: `Popular Fish ${stamp}`, bn: 'জনপ্রিয় মাছ' },
  });
  const productRes = await request(app).post('/api/products').set(auth(adminToken)).send({
    name: { en: `Pangas ${stamp}`, bn: 'পাঙ্গাস' },
    description: { en: 'A soft everyday fish.', bn: 'নরম মাংসের পাঙ্গাস।' },
    categoryId: category.body.data._id,
    images: [{ url: '/uploads/pangas.jpg' }],
    basePrice: 200,
    unit: 'kg',
    stock: 10,
    variants: [{ label: '1 kg', weightValue: 1, weightUnit: 'kg', price: 200, stock: 10, isDefault: true, sku: `PAN-${stamp}` }],
  });
  const area = `Dhanmondi ${stamp}`;
  await request(app).post('/api/admin/delivery-zones').set(auth(adminToken)).send({
    district: 'Dhaka', area, charge: 70, eta: { en: 'Same day', bn: 'আজই' },
  });
  const product = productRes.body.data;
  const cartHeaders = guest ? { 'x-guest-id': guest } : auth(token.buyer);
  await request(app).post('/api/cart/items').set(cartHeaders).send({
    productId: product.id, mode: 'variant', variantId: product.variants[0].id, quantity: 2,
  });
  const orderRes = await request(app).post('/api/orders').set(cartHeaders).send({
    name: 'Karim Uddin',
    phone,
    addressLine: '12 Road 8, Dhanmondi',
    district: 'Dhaka',
    area,
    paymentMethod: 'cod',
  });
  return { adminToken, order: orderRes.body.data.order, status: orderRes.status };
}

describe('invoices and notifications', () => {
  it('creates an invoice when an order is confirmed and keeps it through delivery', async () => {
    const buyer = await createAccount({ email: 'karim@farmcity.test', phone: '01819001122', name: 'Karim Uddin' });
    const admin = await createAccount({ email: 'admin@farmcity.test', phone: '01612220009', role: 'admin', name: 'Shop Admin' });
    const placed = await placeOrder({ token: { admin: admin.token, buyer: buyer.token } });
    expect(placed.status).toBe(201);
    const order = placed.order;

    const pendingInvoice = await request(app).get(`/api/orders/mine/${order.orderNumber}/invoice`).set(auth(buyer.token));
    expect(pendingInvoice.status).toBe(404);

    const summary = await request(app).get('/api/admin/notices/summary').set(auth(admin.token));
    expect(summary.body.data.total).toBe(1);
    expect(summary.body.data.orders).toBe(1);

    const confirmed = await request(app).patch(`/api/admin/orders/${order.id}/status`).set(auth(admin.token)).send({ status: 'Confirmed', note: 'Packed on ice' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.invoice.invoiceNumber).toMatch(/^INV-\d{8}-[A-F0-9]{6}$/);
    const invoiceNumber = confirmed.body.data.invoice.invoiceNumber;

    const notes = await request(app).get('/api/notifications').set(auth(buyer.token));
    expect(notes.body.meta.unread).toBe(2);
    expect(notes.body.data.map((item) => item.type).sort()).toEqual(['invoice.ready', 'order.confirmed']);

    const invoice = await request(app).get(`/api/orders/mine/${order.orderNumber}/invoice`).set(auth(buyer.token));
    expect(invoice.status).toBe(200);
    expect(invoice.body.data.invoiceNumber).toBe(invoiceNumber);
    expect(invoice.body.data.currency).toBe('BDT');
    expect(invoice.body.data.total).toBe(470);
    expect(invoice.body.data.items[0].name.bn).toBe('পাঙ্গাস');
    expect(invoice.body.data.items[0].quantity).toBe(2);
    expect(invoice.body.data.items[0].unitPrice).toBe(200);
    expect(invoice.body.data.store.name).toBe('Farm City');
    expect(invoice.body.data.customer.phone).toBe('01819001122');

    const stranger = await createAccount({ email: 'other@farmcity.test', phone: '01911001122', name: 'Other' });
    const denied = await request(app).get(`/api/orders/mine/${order.orderNumber}/invoice`).set(auth(stranger.token));
    expect(denied.status).toBe(404);
    const hidden = await request(app).get('/api/notifications').set(auth(stranger.token));
    expect(hidden.body.data).toHaveLength(0);

    const adminInvoice = await request(app).get(`/api/admin/orders/${order.id}/invoice`).set(auth(admin.token));
    expect(adminInvoice.body.data.invoiceNumber).toBe(invoiceNumber);

    for (const status of ['Processing', 'Out for Delivery', 'Delivered']) {
      const moved = await request(app).patch(`/api/admin/orders/${order.id}/status`).set(auth(admin.token)).send({ status });
      expect(moved.status).toBe(200);
      expect(moved.body.data.invoice.invoiceNumber).toBe(invoiceNumber);
    }
    expect(await Invoice.countDocuments({ order: order.id })).toBe(1);
    const delivered = await request(app).get(`/api/orders/mine/${order.orderNumber}/invoice`).set(auth(buyer.token));
    expect(delivered.body.data.paymentStatus).toBe('paid');
    expect(delivered.body.data.status).toBe('Delivered');

    const after = await request(app).get('/api/notifications').set(auth(buyer.token));
    const types = after.body.data.map((item) => item.type);
    expect(types).toEqual(expect.arrayContaining(['order.confirmed', 'order.processing', 'order.out', 'order.delivered', 'invoice.ready']));
    expect(types.filter((type) => type === 'invoice.ready')).toHaveLength(1);

    const read = await request(app).post('/api/notifications/read').set(auth(buyer.token)).send({ all: true });
    expect(read.body.data.unread).toBe(0);

    const seen = await request(app).post('/api/admin/notices/seen').set(auth(admin.token)).send({ refType: 'Order', refId: order.id });
    expect(seen.body.data.orders).toBe(0);
    expect(seen.body.data.total).toBe(0);
  });

  it('backfills invoices for confirmed or delivered orders and notifies the customer', async () => {
    const buyer = await createAccount({ email: 'delivered@farmcity.test', phone: '01819002233', name: 'Karim Uddin' });
    const admin = await createAccount({ email: 'admin2@farmcity.test', phone: '01612220008', role: 'admin', name: 'Shop Admin' });
    const placed = await placeOrder({ token: { admin: admin.token, buyer: buyer.token }, phone: '01819002233' });
    await Order.updateOne({ _id: placed.order.id }, {
      $set: { status: 'Delivered', paymentStatus: 'paid' },
      $push: { statusHistory: { status: 'Delivered', note: 'Left at the door', at: new Date('2026-11-12T08:00:00.000Z') } },
    });
    expect(await Invoice.countDocuments({ order: placed.order.id })).toBe(0);

    const created = await backfillInvoices();
    expect(created).toBe(1);
    const again = await backfillInvoices();
    expect(again).toBe(0);
    const invoice = await Invoice.findOne({ order: placed.order.id });
    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.issuedAt.toISOString()).toBe('2026-11-12T08:00:00.000Z');

    const notes = await request(app).get('/api/notifications').set(auth(buyer.token));
    expect(notes.body.data.some((item) => item.type === 'invoice.ready' && item.invoiceNumber === invoice.invoiceNumber)).toBe(true);

    const view = await request(app).get(`/api/admin/orders/${placed.order.id}`).set(auth(admin.token));
    expect(view.body.data.invoice.invoiceNumber).toBe(invoice.invoiceNumber);
  });

  it('notifies admins when a customer cancels, a payment fails, or a message arrives', async () => {
    const buyer = await createAccount({ email: 'cancel@farmcity.test', phone: '01819003344', name: 'Karim Uddin' });
    const admin = await createAccount({ email: 'admin3@farmcity.test', phone: '01612220007', role: 'admin', name: 'Shop Admin' });
    const placed = await placeOrder({ token: { admin: admin.token, buyer: buyer.token }, phone: '01819003344' });
    const cancelled = await request(app).post(`/api/orders/${placed.order.orderNumber}/cancel`).set(auth(buyer.token)).send({ note: 'Changed my mind' });
    expect(cancelled.body.data.status).toBe('Cancelled');

    const notices = await request(app).get('/api/admin/notices').set(auth(admin.token));
    const types = notices.body.data.map((item) => item.type);
    expect(types).toContain('order.new');
    expect(types).toContain('order.cancelled');

    const customerNotes = await request(app).get('/api/notifications').set(auth(buyer.token));
    expect(customerNotes.body.data.map((item) => item.type)).toContain('order.cancelled');

    const failedOrder = await placeOrder({ token: { admin: admin.token, buyer: buyer.token }, phone: '01819003344' });
    await Order.updateOne({ _id: failedOrder.order.id }, { $set: { stockCommitted: false } });
    await Payment.updateOne({ order: failedOrder.order.id }, { $set: { provider: 'sslcommerz' } });
    const failed = await request(app).post('/api/payments/sslcommerz/fail').redirects(0).send({ tran_id: failedOrder.order.orderNumber, status: 'failed' });
    expect(failed.status).toBe(302);
    const stored = await Order.findById(failedOrder.order.id);
    expect(stored.status).toBe('Cancelled');
    const paymentNotes = await CustomerNotification.find({ order: failedOrder.order.id });
    expect(paymentNotes.map((item) => item.type)).toContain('payment.failed');
    const adminAfter = await request(app).get('/api/admin/notices/summary').set(auth(admin.token));
    expect(adminAfter.body.data.orders).toBeGreaterThanOrEqual(1);

    const inquiry = await request(app).post('/api/inquiries').send({ name: 'Rina', phone: '01710000000', email: 'rina@example.com', message: 'Do you deliver hilsa to Uttara?' });
    expect(inquiry.status).toBe(201);
    const withRequest = await request(app).get('/api/admin/notices/summary').set(auth(admin.token));
    expect(withRequest.body.data.requests).toBe(1);
    const seen = await request(app).post('/api/admin/notices/seen').set(auth(admin.token)).send({ refType: 'Inquiry', refIds: [inquiry.body.data.id] });
    expect(seen.body.data.requests).toBe(0);
  });

  it('attaches guest notifications when the customer signs in with the checkout phone', async () => {
    const admin = await createAccount({ email: 'admin4@farmcity.test', phone: '01612220006', role: 'admin', name: 'Shop Admin' });
    const placed = await placeOrder({ token: { admin: admin.token }, guest: '33333333-3333-4333-8333-333333333333', phone: '01819004455' });
    await request(app).patch(`/api/admin/orders/${placed.order.id}/status`).set(auth(admin.token)).send({ status: 'Confirmed' });
    const before = await CustomerNotification.find({ order: placed.order.id });
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((item) => item.user == null)).toBe(true);

    const buyer = await createAccount({ email: 'guest@farmcity.test', phone: '01819004455', name: 'Karim Uddin' });
    const notes = await request(app).get('/api/notifications').set(auth(buyer.token));
    expect(notes.body.data.length).toBeGreaterThan(0);
    const invoice = await request(app).get(`/api/orders/mine/${placed.order.orderNumber}/invoice`).set(auth(buyer.token));
    expect(invoice.status).toBe(200);
  });
});
