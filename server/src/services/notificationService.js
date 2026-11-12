import { AdminNotice, ORDER_NOTICE_TYPES } from '../models/AdminNotice.js';
import { CustomerNotification } from '../models/CustomerNotification.js';

let ioRef = null;
export function setNotificationIo(io) {
  ioRef = io;
}

const STATUS_TYPE = {
  Confirmed: 'order.confirmed',
  Processing: 'order.processing',
  'Out for Delivery': 'order.out',
  Delivered: 'order.delivered',
  Cancelled: 'order.cancelled',
};

export function ownerId(order) {
  if (!order?.user) return null;
  const id = order.user._id || order.user;
  return id || null;
}

function presentCustomer(doc) {
  return {
    id: doc._id,
    type: doc.type,
    orderNumber: doc.orderNumber,
    invoiceNumber: doc.invoiceNumber || '',
    href: doc.href,
    readAt: doc.readAt,
    createdAt: doc.createdAt,
  };
}

function presentAdmin(doc) {
  return {
    id: doc._id,
    type: doc.type,
    refType: doc.refType,
    refId: doc.refId,
    href: doc.href,
    data: doc.data || {},
    seenAt: doc.seenAt,
    createdAt: doc.createdAt,
  };
}

export async function adminCounts() {
  const rows = await AdminNotice.aggregate([
    { $match: { seenAt: null } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  let orders = 0;
  let requests = 0;
  let total = 0;
  for (const row of rows) {
    total += row.count;
    if (ORDER_NOTICE_TYPES.includes(row._id)) orders += row.count;
    else requests += row.count;
  }
  return { total, orders, requests };
}

function emitAdminCounts(counts) {
  if (!ioRef) return;
  ioRef.to('admins').emit('admin:counts', counts);
}

function emitAdminNotice(notice, counts) {
  if (!ioRef) return;
  ioRef.to('admins').emit('admin:notices', { notice: presentAdmin(notice), counts });
}

async function unreadFor(userId) {
  if (!userId) return 0;
  return CustomerNotification.countDocuments({ user: userId, readAt: null });
}

async function emitCustomer(userId, notification) {
  if (!ioRef || !userId) return;
  const unread = await unreadFor(userId);
  const payload = { unread };
  if (notification) payload.notification = presentCustomer(notification);
  ioRef.to(`user:${userId}`).emit(notification ? 'notification:new' : 'notification:count', payload);
}

export async function createCustomerNotification(order, { type, invoiceNumber = '', href } = {}) {
  if (!order?._id || !type) return null;
  const existing = await CustomerNotification.findOne({ order: order._id, type });
  if (existing) return existing;
  const userId = ownerId(order);
  let doc;
  try {
    doc = await CustomerNotification.create({
      user: userId,
      phone: order.customer?.phone || '',
      type,
      order: order._id,
      orderNumber: order.orderNumber || '',
      invoiceNumber,
      href: href || `/account/orders/${order.orderNumber}`,
    });
  } catch (error) {
    if (error?.code === 11000) return CustomerNotification.findOne({ order: order._id, type });
    throw error;
  }
  await emitCustomer(userId, doc);
  return doc;
}

export async function notifyInvoiceReady(order, invoice) {
  if (!invoice) return null;
  return createCustomerNotification(order, {
    type: 'invoice.ready',
    invoiceNumber: invoice.invoiceNumber,
    href: `/account/orders/${order.orderNumber}/invoice`,
  });
}

export async function onOrderProgress(order, { invoice, created } = {}) {
  const type = STATUS_TYPE[order?.status];
  if (type) await createCustomerNotification(order, { type });
  if (created && invoice) await notifyInvoiceReady(order, invoice);
}

export async function onOrderPlaced(order) {
  return createAdminNotice({
    type: 'order.new',
    refType: 'Order',
    refId: order._id,
    href: `/admin/orders/${order._id}`,
    data: {
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || '',
      phone: order.customer?.phone || '',
      total: order.total,
      paymentMethod: order.paymentMethod,
    },
  });
}

export async function onOrderCancelled(order, { refunded = false, notifyAdmin = true } = {}) {
  await createCustomerNotification(order, { type: 'order.cancelled' });
  if (notifyAdmin) {
    await createAdminNotice({
      type: 'order.cancelled',
      refType: 'Order',
      refId: order._id,
      href: `/admin/orders/${order._id}`,
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || '',
        phone: order.customer?.phone || '',
        total: order.total,
      },
    });
  }
  if (refunded) {
    await createAdminNotice({
      type: 'payment.refunded',
      refType: 'Order',
      refId: order._id,
      href: `/admin/orders/${order._id}`,
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || '',
        total: order.total,
      },
    });
  }
}

export async function onPaymentFailed(order) {
  await createCustomerNotification(order, { type: 'payment.failed' });
  return createAdminNotice({
    type: 'payment.failed',
    refType: 'Order',
    refId: order._id,
    href: `/admin/orders/${order._id}`,
    data: {
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || '',
      phone: order.customer?.phone || '',
      total: order.total,
      reason: order.cancelReason || '',
    },
  });
}

export async function notifyInquiry(inquiry) {
  const message = String(inquiry.message || '');
  return createAdminNotice({
    type: 'inquiry.new',
    refType: 'Inquiry',
    refId: inquiry._id,
    href: '/admin/settings#inquiries',
    data: {
      name: inquiry.name || '',
      phone: inquiry.phone || '',
      email: inquiry.email || '',
      message: message.slice(0, 280),
    },
  });
}

async function createAdminNotice({ type, refType, refId, href, data }) {
  const existing = await AdminNotice.findOne({ type, refType, refId });
  if (existing) return existing;
  let doc;
  try {
    doc = await AdminNotice.create({ type, refType, refId, href, data });
  } catch (error) {
    if (error?.code === 11000) return AdminNotice.findOne({ type, refType, refId });
    throw error;
  }
  const counts = await adminCounts();
  emitAdminNotice(doc, counts);
  return doc;
}

export async function listCustomerNotifications(user, { limit = 30 } = {}) {
  const size = Math.min(50, Math.max(1, Number(limit) || 30));
  const [items, unread] = await Promise.all([
    CustomerNotification.find({ user: user._id }).sort({ createdAt: -1 }).limit(size),
    unreadFor(user._id),
  ]);
  return { items: items.map(presentCustomer), unread };
}

export async function markCustomerNotificationsRead(user, { id, all = false } = {}) {
  const filter = { user: user._id, readAt: null };
  if (!all) {
    if (!id) return unreadFor(user._id);
    filter._id = id;
  }
  await CustomerNotification.updateMany(filter, { $set: { readAt: new Date() } });
  const unread = await unreadFor(user._id);
  await emitCustomer(user._id, null);
  return unread;
}

export async function listAdminNotices({ limit = 40 } = {}) {
  const size = Math.min(80, Math.max(1, Number(limit) || 40));
  const [items, counts] = await Promise.all([
    AdminNotice.find().sort({ createdAt: -1 }).limit(size),
    adminCounts(),
  ]);
  return { items: items.map(presentAdmin), counts };
}

export async function markAdminNoticesSeen({ ids, refType, refId, refIds } = {}) {
  const filter = { seenAt: null };
  if (ids?.length) filter._id = { $in: ids };
  else if (refType && refId) {
    filter.refType = refType;
    filter.refId = refId;
  } else if (refType && refIds?.length) {
    filter.refType = refType;
    filter.refId = { $in: refIds };
  } else {
    return adminCounts();
  }
  await AdminNotice.updateMany(filter, { $set: { seenAt: new Date() } });
  const counts = await adminCounts();
  emitAdminCounts(counts);
  return counts;
}

export async function unseenOrderIds(orderIds) {
  if (!orderIds?.length) return new Set();
  const rows = await AdminNotice.find({
    seenAt: null,
    refType: 'Order',
    refId: { $in: orderIds },
  }).distinct('refId');
  return new Set(rows.map((id) => String(id)));
}

export async function claimGuestNotifications(user) {
  if (!user?.phone || !user?._id) return;
  await CustomerNotification.updateMany(
    { user: null, phone: user.phone },
    { $set: { user: user._id } },
  );
}
