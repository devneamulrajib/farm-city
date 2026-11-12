import crypto from 'crypto';
import { Invoice } from '../models/Invoice.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { dhakaDateStamp } from '../utils/orderNumber.js';
import { getSettings } from './settingsService.js';
import { notifyInvoiceReady } from './notificationService.js';

export const INVOICE_STATUSES = ['Confirmed', 'Processing', 'Out for Delivery', 'Delivered'];

export function makeInvoiceNumber(date = new Date()) {
  const stamp = dhakaDateStamp(date);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${stamp}-${rand}`;
}

function issuedAtFromHistory(order) {
  const history = order.statusHistory || [];
  const confirmed = history.find((entry) => entry.status === 'Confirmed' && entry.at);
  if (confirmed) return new Date(confirmed.at);
  const billable = history.find((entry) => INVOICE_STATUSES.includes(entry.status) && entry.at);
  if (billable) return new Date(billable.at);
  if (order.createdAt) return new Date(order.createdAt);
  return new Date();
}

export function summarizeInvoice(invoice) {
  if (!invoice) return null;
  return {
    id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
  };
}

export async function readInvoiceSummary(order) {
  if (!order?._id) return null;
  const invoice = await Invoice.findOne({ order: order._id }).select('invoiceNumber issuedAt');
  return summarizeInvoice(invoice);
}

export async function summariesForOrders(orders) {
  const ids = orders.map((order) => order._id).filter(Boolean);
  if (!ids.length) return new Map();
  const invoices = await Invoice.find({ order: { $in: ids } }).select('order invoiceNumber issuedAt');
  return new Map(invoices.map((invoice) => [String(invoice.order), summarizeInvoice(invoice)]));
}

export async function ensureInvoice(order) {
  if (!order?._id) return { invoice: null, created: false };
  const existing = await Invoice.findOne({ order: order._id });
  if (existing) return { invoice: existing, created: false };
  if (!INVOICE_STATUSES.includes(order.status)) return { invoice: null, created: false };

  const issuedAt = issuedAtFromHistory(order);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await Invoice.create({
        invoiceNumber: makeInvoiceNumber(issuedAt),
        order: order._id,
        issuedAt,
      });
      return { invoice: created, created: true };
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const again = await Invoice.findOne({ order: order._id });
      if (again) return { invoice: again, created: false };
    }
  }
  throw new ApiError(500, 'Could not allocate an invoice number.');
}

async function tellCustomer(order, invoice) {
  try {
    await notifyInvoiceReady(order, invoice);
  } catch (error) {
    console.error('Invoice notification failed:', error?.message || error);
  }
}

export async function ensureInvoiceNotified(order) {
  const result = await ensureInvoice(order);
  if (result.created && result.invoice) await tellCustomer(order, result.invoice);
  return result;
}

export function presentInvoice(invoice, order, settings) {
  const obj = order.toObject ? order.toObject() : order;
  const address = settings.address?.toObject?.() || settings.address || { en: '', bn: '' };
  const logo = settings.logo?.url
    ? { url: settings.logo.url, alt: settings.logo.alt || settings.storeName || 'Farm City' }
    : null;
  return {
    id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    currency: 'BDT',
    orderId: obj._id,
    orderNumber: obj.orderNumber,
    orderCreatedAt: obj.createdAt,
    status: obj.status,
    paymentMethod: obj.paymentMethod,
    paymentStatus: obj.paymentStatus,
    customer: obj.customer,
    shippingAddress: obj.shippingAddress,
    items: (obj.items || []).map((item) => ({
      id: item._id,
      name: item.name,
      sku: item.sku || '',
      variantLabel: item.variantLabel || '',
      quantity: item.quantity,
      unit: item.unit || '',
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: obj.subtotal,
    deliveryCharge: obj.deliveryCharge,
    discount: obj.discount,
    couponCode: obj.couponCode || '',
    total: obj.total,
    notes: obj.notes || '',
    store: {
      name: settings.storeName || 'Farm City',
      phone: settings.phone || '',
      email: settings.email || '',
      address,
      logo,
    },
  };
}

export async function invoiceForOrder(order) {
  if (!order) return null;
  const { invoice } = await ensureInvoiceNotified(order);
  if (!invoice) return null;
  const settings = await getSettings();
  return presentInvoice(invoice, order, settings);
}

export async function backfillInvoices() {
  const invoicedIds = await Invoice.distinct('order');
  const orders = await Order.find({
    status: { $in: INVOICE_STATUSES },
    _id: { $nin: invoicedIds },
  });
  let created = 0;
  for (const order of orders) {
    const result = await ensureInvoiceNotified(order);
    if (result.created) created += 1;
  }
  if (created) console.log(`Created ${created} missing invoice${created === 1 ? '' : 's'}.`);
  return created;
}
