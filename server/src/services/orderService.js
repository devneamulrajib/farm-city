import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Product } from '../models/Product.js';
import { STATUS_TRANSITIONS } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { addMoney } from '../utils/money.js';
import { makeOrderNumber, makeViewToken } from '../utils/orderNumber.js';
import { pageParams } from '../utils/respond.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { getOrCreateCart, priceItems } from './cartService.js';
import { quoteDelivery } from './deliveryService.js';
import { evaluateCoupon } from './couponService.js';
import { refreshAvailability } from './catalogService.js';
import { getProvider, listPublicMethods } from './payment/registry.js';
import { getSettings } from './settingsService.js';
import { env } from '../config/env.js';
import {
  INVOICE_STATUSES,
  ensureInvoice,
  ensureInvoiceNotified,
  readInvoiceSummary,
  summarizeInvoice,
  summariesForOrders,
} from './invoiceService.js';
import {
  claimGuestNotifications,
  notifyInvoiceReady,
  onOrderCancelled,
  onOrderPlaced,
  onOrderProgress,
  onPaymentFailed,
  ownerId,
} from './notificationService.js';

let ioRef = null;
export function setOrderIo(io) {
  ioRef = io;
}

async function signal(fn) {
  try {
    await fn();
  } catch (error) {
    console.error('Notification failed:', error?.message || error);
  }
}

async function emitStatus(order) {
  if (!ioRef || !order) return;
  const invoice = await readInvoiceSummary(order);
  const payload = {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    statusHistory: order.statusHistory,
  };
  if (invoice) payload.invoice = invoice;
  ioRef.to(`order:${order._id}`).emit('order:status', payload);
  const userId = ownerId(order);
  if (userId) ioRef.to(`user:${userId}`).emit('order:status', payload);
}

export function presentOrder(order, { includeToken = false } = {}) {
  const obj = order.toObject ? order.toObject() : order;
  return {
    id: obj._id,
    orderNumber: obj.orderNumber,
    viewToken: includeToken ? obj.viewToken : undefined,
    user: obj.user,
    customer: obj.customer,
    shippingAddress: obj.shippingAddress,
    items: obj.items,
    subtotal: obj.subtotal,
    deliveryCharge: obj.deliveryCharge,
    discount: obj.discount,
    couponCode: obj.couponCode,
    total: obj.total,
    paymentMethod: obj.paymentMethod,
    paymentStatus: obj.paymentStatus,
    status: obj.status,
    statusHistory: obj.statusHistory,
    notes: obj.notes,
    cancelReason: obj.cancelReason,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function commitLine(line, session) {
  if (line.mode === 'variant') {
    const result = await Product.updateOne(
      { _id: line.product._id, variants: { $elemMatch: { _id: line.variantId, stock: { $gte: line.quantity } } } },
      { $inc: { 'variants.$.stock': -line.quantity, popularity: line.quantity } },
      { session },
    );
    if (result.modifiedCount !== 1) throw new ApiError(409, `Not enough stock for ${line.name.en}.`);
  } else {
    const result = await Product.updateOne(
      { _id: line.product._id, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity, popularity: Math.ceil(line.quantity) } },
      { session },
    );
    if (result.modifiedCount !== 1) throw new ApiError(409, `Not enough stock for ${line.name.en}.`);
  }
  await refreshAvailability(line.product._id, session);
}

async function restoreItem(item, session) {
  if (item.variantId) {
    await Product.updateOne(
      { _id: item.product, variants: { $elemMatch: { _id: item.variantId } } },
      { $inc: { 'variants.$.stock': item.quantity, popularity: -item.quantity } },
      { session },
    );
  } else {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity, popularity: -Math.ceil(item.quantity) } },
      { session },
    );
  }
  await refreshAvailability(item.product, session);
}

function snapshotItem(line) {
  return {
    product: line.product._id,
    name: { en: line.name.en, bn: line.name.bn || '' },
    image: line.image,
    sku: line.sku,
    variantId: line.variantId,
    variantLabel: line.variantLabel,
    weightValue: line.weightValue,
    weightUnit: line.weightUnit,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    compareAtPrice: line.compareAtPrice,
    lineTotal: line.lineTotal,
    attributes: line.attributes,
  };
}

async function uniqueOrderNumber(session) {
  for (let i = 0; i < 5; i += 1) {
    const orderNumber = makeOrderNumber();
    const exists = await Order.exists({ orderNumber }).session(session);
    if (!exists) return orderNumber;
  }
  throw new ApiError(500, 'Could not allocate an order number.');
}

export async function checkout({ user, guestId, input }) {
  const settings = await getSettings();
  const available = listPublicMethods(settings);
  if (!available.some((method) => method.id === input.paymentMethod)) {
    throw new ApiError(400, 'That payment method is not available.');
  }
  const provider = getProvider(input.paymentMethod);
  if (input.paymentMethod !== 'cod' && !input.email) {
    throw new ApiError(400, 'Email is required for online payment.');
  }

  const session = await mongoose.startSession();
  let order;
  let payment;
  let cartId;
  try {
    await session.withTransaction(async () => {
      const cart = await getOrCreateCart({ user, guestId, session });
      if (!cart?.items?.length) throw new ApiError(400, 'Your cart is empty.');
      cartId = cart._id;
      const priced = await priceItems(cart.items, session);
      const problems = priced.filter((line) => line.issues.length);
      if (problems.length) {
        throw new ApiError(409, problems[0].issues[0], problems.map((line) => ({
          field: String(line.productId),
          message: line.issues[0],
        })));
      }
      const subtotal = addMoney(...priced.map((line) => line.lineTotal));
      let discount = 0;
      let couponCode = '';
      if (cart.couponCode) {
        const coupon = await Coupon.findOne({ code: cart.couponCode }).session(session);
        const evaluated = evaluateCoupon(coupon, subtotal);
        if (!evaluated.ok) throw new ApiError(400, evaluated.message);
        const usageFilter = coupon.usageLimit != null ? { usedCount: { $lt: coupon.usageLimit } } : {};
        const updated = await Coupon.updateOne(
          { _id: coupon._id, ...usageFilter },
          { $inc: { usedCount: 1 } },
          { session },
        );
        if (updated.modifiedCount !== 1) throw new ApiError(400, 'This coupon has reached its usage limit.');
        discount = evaluated.discount;
        couponCode = coupon.code;
      }
      const goods = Math.max(0, addMoney(subtotal, -discount));
      const delivery = await quoteDelivery({ district: input.district, area: input.area, subtotal: goods });
      const total = addMoney(goods, delivery.charge);
      const stockCommitted = input.paymentMethod === 'cod';
      if (stockCommitted) {
        for (const line of priced) await commitLine(line, session);
      }
      const orderNumber = await uniqueOrderNumber(session);
      const created = await Order.create([{
        orderNumber,
        viewToken: makeViewToken(),
        user: user?._id,
        guestId: user ? '' : guestId,
        customer: { name: input.name, phone: input.phone, email: input.email || '' },
        shippingAddress: {
          addressLine: input.addressLine,
          district: input.district,
          area: input.area || '',
          instructions: input.instructions || '',
        },
        items: priced.map(snapshotItem),
        subtotal,
        deliveryCharge: delivery.charge,
        discount,
        couponCode,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'unpaid',
        status: 'Pending',
        stockCommitted,
        statusHistory: [{ status: 'Pending', note: 'Order placed', at: new Date(), by: user?._id || null }],
      }], { session });
      order = created[0];
      const pay = await Payment.create([{
        order: order._id,
        provider: input.paymentMethod,
        amount: total,
        status: input.paymentMethod === 'cod' ? 'pending' : 'initiated',
      }], { session });
      payment = pay[0];
      if (input.paymentMethod === 'cod') {
        cart.items = [];
        cart.couponCode = undefined;
        await cart.save({ session });
      }
    });
  } finally {
    session.endSession();
  }

  if (input.paymentMethod !== 'cod') {
    try {
      const result = await provider.initiate({ order });
      payment.providerPaymentId = result.providerPaymentId || '';
      payment.redirectUrl = result.redirectUrl || '';
      payment.rawStatus = 'initiated';
      await payment.save();
      order.paymentStatus = 'pending';
      await order.save();
      await Cart.updateOne({ _id: cartId }, { $set: { items: [], couponCode: null } });
    } catch (error) {
      if (order.couponCode) await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: -1 } });
      order.status = 'Cancelled';
      order.paymentStatus = 'failed';
      order.cancelReason = error.message;
      order.statusHistory.push({ status: 'Cancelled', note: error.message, at: new Date() });
      await order.save();
      payment.status = 'failed';
      payment.failureReason = error.message;
      await payment.save();
      await signal(() => onPaymentFailed(order));
      throw new ApiError(502, 'The payment provider could not start the payment. The order was cancelled and you were not charged.');
    }
  }

  await signal(() => onOrderPlaced(order));
  return {
    order: presentOrder(order, { includeToken: true }),
    payment: {
      method: payment.provider,
      status: payment.status,
      redirectUrl: payment.redirectUrl || '',
    },
  };
}

export function confirmationUrl(order, result) {
  const origin = env.clientOrigin[0];
  return `${origin}/order/${order.orderNumber}?token=${order.viewToken}&payment=${result}`;
}

export async function finalizeOnlinePayment({ providerId, payload }) {
  const provider = getProvider(providerId);
  if (!provider) throw new ApiError(400, 'Unknown payment provider.');
  const paymentLookup = payload.paymentID || payload.paymentRefId || payload.payment_ref_id || '';
  let payment = paymentLookup
    ? await Payment.findOne({ provider: providerId, providerPaymentId: paymentLookup })
    : null;
  if (!payment && payload.tran_id) {
    const order = await Order.findOne({ orderNumber: payload.tran_id });
    if (order) payment = await Payment.findOne({ order: order._id, provider: providerId });
  }
  if (!payment) throw new ApiError(404, 'Payment not found.');
  const order = await Order.findById(payment.order);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (payment.status === 'paid') return order;

  const verified = await provider.verify({ ...payload, expectedAmount: order.total });
  if (!verified.ok) {
    payment.status = payload.status === 'cancel' || payload.status === 'Cancelled' ? 'cancelled' : 'failed';
    payment.failureReason = verified.reason || 'Payment was not completed.';
    payment.rawStatus = verified.rawStatus || payload.status || '';
    await payment.save();
    if (!order.stockCommitted && order.status !== 'Cancelled') {
      if (order.couponCode) await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: -1 } });
      order.status = 'Cancelled';
      order.paymentStatus = 'failed';
      order.cancelReason = payment.failureReason;
      order.statusHistory.push({ status: 'Cancelled', note: payment.failureReason, at: new Date() });
      await order.save();
    }
    await emitStatus(order);
    await signal(() => onPaymentFailed(order));
    return order;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const freshOrder = await Order.findById(order._id).session(session);
      const freshPayment = await Payment.findById(payment._id).session(session);
      if (freshPayment.status === 'paid') return;
      if (!freshOrder.stockCommitted) {
        const lines = freshOrder.items.map((item) => ({
          mode: item.variantId ? 'variant' : 'custom',
          product: { _id: item.product },
          variantId: item.variantId,
          quantity: item.quantity,
          name: item.name,
        }));
        for (const line of lines) await commitLine(line, session);
        freshOrder.stockCommitted = true;
      }
      freshPayment.status = 'paid';
      freshPayment.providerTransactionId = verified.providerTransactionId || freshPayment.providerTransactionId;
      freshPayment.rawStatus = verified.rawStatus || 'paid';
      freshOrder.paymentStatus = 'paid';
      if (freshOrder.status === 'Pending') {
        freshOrder.status = 'Confirmed';
        freshOrder.statusHistory.push({ status: 'Confirmed', note: 'Payment received', at: new Date() });
      }
      await freshPayment.save({ session });
      await freshOrder.save({ session });
    });
  } finally {
    session.endSession();
  }
  const beforeStatus = order.status;
  const updated = await Order.findById(order._id);
  let invoiceResult = { invoice: null, created: false };
  if (updated && INVOICE_STATUSES.includes(updated.status)) {
    invoiceResult = await ensureInvoice(updated);
  }
  await emitStatus(updated);
  if (updated && updated.status !== beforeStatus && updated.status !== 'Cancelled') {
    await signal(() => onOrderProgress(updated, invoiceResult));
  } else if (invoiceResult.created) {
    await signal(() => notifyInvoiceReady(updated, invoiceResult.invoice));
  }
  return updated;
}

async function releaseOrder(order, { by, note }, session) {
  if (order.stockCommitted && !order.stockRestored) {
    for (const item of order.items) await restoreItem(item, session);
    order.stockRestored = true;
  }
  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
  }
  order.status = 'Cancelled';
  order.cancelReason = note || '';
  order.statusHistory.push({ status: 'Cancelled', note: note || 'Cancelled', at: new Date(), by: by || null });
  const payment = await Payment.findOne({ order: order._id }).session(session);
  if (payment && payment.status === 'paid') payment.status = 'refunded';
  else if (payment) payment.status = 'cancelled';
  if (payment) await payment.save({ session });
  if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
  else order.paymentStatus = 'failed';
}

export async function cancelOrder({ orderNumber, user, note }) {
  const session = await mongoose.startSession();
  let order;
  let refunded = false;
  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({ orderNumber, user: user._id }).session(session);
      if (!order) throw new ApiError(404, 'Order not found.');
      if (order.status !== 'Pending') throw new ApiError(400, 'Only pending orders can be cancelled here.');
      refunded = order.paymentStatus === 'paid';
      await releaseOrder(order, { by: user._id, note: note || 'Cancelled by customer' }, session);
      await order.save({ session });
    });
  } finally {
    session.endSession();
  }
  const fresh = await Order.findById(order._id);
  await emitStatus(fresh);
  await signal(() => onOrderCancelled(fresh, { refunded, notifyAdmin: true }));
  return { ...presentOrder(fresh), invoice: await readInvoiceSummary(fresh) };
}

export async function updateOrderStatus({ id, status, note, actor }) {
  if (!STATUS_TRANSITIONS[status] && status !== 'Cancelled') throw new ApiError(400, 'Unknown status.');
  const session = await mongoose.startSession();
  let order;
  let previous = null;
  let refunded = false;
  try {
    await session.withTransaction(async () => {
      order = await Order.findById(id).session(session);
      if (!order) throw new ApiError(404, 'Order not found.');
      previous = order.status;
      const allowed = STATUS_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) throw new ApiError(400, `Cannot move an order from ${order.status} to ${status}.`);
      if (status === 'Cancelled') {
        refunded = order.paymentStatus === 'paid';
        await releaseOrder(order, { by: actor?._id, note: note || 'Cancelled by the shop' }, session);
      } else {
        order.status = status;
        order.statusHistory.push({ status, note: note || '', at: new Date(), by: actor?._id || null });
        if (status === 'Delivered' && order.paymentMethod === 'cod') {
          order.paymentStatus = 'paid';
          await Payment.updateOne({ order: order._id }, { $set: { status: 'paid', rawStatus: 'collected on delivery' } }, { session });
        }
      }
      await order.save({ session });
    });
  } finally {
    session.endSession();
  }
  const fresh = await Order.findById(id).populate('user', 'name email phone');
  let invoiceResult = { invoice: null, created: false };
  if (INVOICE_STATUSES.includes(fresh.status)) {
    invoiceResult = await ensureInvoice(fresh);
  }
  await emitStatus(fresh);
  const notifyAdmin = actor?.role !== 'admin';
  if (fresh.status === 'Cancelled') {
    await signal(() => onOrderCancelled(fresh, { refunded, notifyAdmin }));
  } else if (fresh.status !== previous) {
    await signal(() => onOrderProgress(fresh, invoiceResult));
  } else if (invoiceResult.created) {
    await signal(() => notifyInvoiceReady(fresh, invoiceResult.invoice));
  }
  return fresh;
}

export async function listMyOrders(user, query) {
  const { page, limit, skip } = pageParams(query);
  const filter = { user: user._id };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  const invoices = await summariesForOrders(items);
  return {
    items: items.map((order) => ({
      ...presentOrder(order),
      invoice: invoices.get(String(order._id)) || null,
    })),
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getOwnedOrder(user, orderNumber) {
  const order = await Order.findOne({ orderNumber, user: user._id });
  if (!order) throw new ApiError(404, 'Order not found.');
  const { invoice } = await ensureInvoiceNotified(order);
  return { ...presentOrder(order), invoice: summarizeInvoice(invoice) };
}

export async function getOrderByToken(orderNumber, token) {
  const order = await Order.findOne({ orderNumber, viewToken: token });
  if (!order) throw new ApiError(404, 'Order not found.');
  return { ...presentOrder(order), invoice: await readInvoiceSummary(order) };
}

export async function trackOrder({ orderNumber, phone }) {
  const normalized = normalizeBdPhone(phone);
  if (!normalized) throw new ApiError(400, 'Enter a valid Bangladeshi mobile number.');
  const order = await Order.findOne({ orderNumber, 'customer.phone': normalized });
  if (!order) throw new ApiError(404, 'No order matches that number and phone.');
  return { ...presentOrder(order), invoice: await readInvoiceSummary(order) };
}

export async function claimGuestOrders(user) {
  if (!user?.phone) return;
  await Order.updateMany({ user: null, 'customer.phone': user.phone }, { $set: { user: user._id } });
  await claimGuestNotifications(user);
}
