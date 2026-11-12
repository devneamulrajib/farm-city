import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { DeliveryZone } from '../models/DeliveryZone.js';
import { Inquiry } from '../models/Inquiry.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Subscriber } from '../models/Subscriber.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/slug.js';
import { ok, pageParams } from '../utils/respond.js';
import { getSettings, publicSettings } from '../services/settingsService.js';
import { storeImage } from '../services/imageService.js';
import { updateOrderStatus } from '../services/orderService.js';
import { computeAvailability } from '../services/catalogService.js';

export const overview = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 13);
  const [sales, statusRows, customers, products, pending, lowStock, chart, recent] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ isDeleted: false }),
    Order.countDocuments({ status: 'Pending' }),
    Product.find({ isDeleted: false, availability: 'low_stock' }).sort({ stock: 1 }).limit(6).select('name slug stock availability unit variants'),
    Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' }, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Dhaka' } },
          total: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(6).select('orderNumber total status customer createdAt'),
  ]);
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    const label = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date(date.getTime() - i * 86400000));
    const row = chart.find((item) => item._id === label);
    days.push({ date: label, total: row?.total || 0, orders: row?.orders || 0 });
  }
  ok(res, {
    sales: sales[0]?.total || 0,
    orders: sales[0]?.count || 0,
    customers,
    products,
    pending,
    lowStockThreshold: settings.lowStockThreshold,
    lowStock: lowStock.map((product) => {
      const variantQty = (product.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
      return {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        unit: product.unit,
        availability: product.availability,
        stock: product.variants?.length ? variantQty : product.stock,
      };
    }),
    statuses: statusRows.map((row) => ({ status: row._id, count: row.count })),
    chart: days,
    recentOrders: recent,
  });
});

export const adminOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  ok(res, items, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const adminOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone isActive');
  if (!order) throw new ApiError(404, 'Order not found.');
  ok(res, order);
});

export const patchOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus({
    id: req.validated.params.id,
    status: req.validated.body.status,
    note: req.validated.body.note,
    actor: req.user,
  });
  ok(res, order);
});

export const customers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const match = { role: 'customer' };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    match.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$uid'] }, status: { $ne: 'Cancelled' } } },
            { $project: { total: 1 } },
          ],
          as: 'orders',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          isActive: 1,
          createdAt: 1,
          orderCount: { $size: '$orders' },
          spent: { $sum: '$orders.total' },
        },
      },
    ]),
    User.countDocuments(match),
  ]);
  ok(res, items, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const customerDetail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'customer' });
  if (!user) throw new ApiError(404, 'Customer not found.');
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);
  ok(res, { user: user.toSafe(), orders });
});

export const patchCustomer = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot change your own access here.');
  const user = await User.findOne({ _id: req.params.id, role: 'customer' });
  if (!user) throw new ApiError(404, 'Customer not found.');
  user.isActive = req.validated.body.isActive;
  await user.save();
  ok(res, user.toSafe());
});

export const getAdminSettings = asyncHandler(async (req, res) => {
  ok(res, await getSettings());
});

export const putAdminSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  Object.assign(settings, req.validated.body);
  settings.key = 'store';
  await settings.save();
  const threshold = settings.lowStockThreshold;
  const products = await Product.find({ isDeleted: false });
  for (const product of products) {
    const availability = computeAvailability(product, threshold);
    if (product.availability !== availability) {
      product.availability = availability;
      await product.save();
    }
  }
  ok(res, settings);
});

export const publicStore = asyncHandler(async (req, res) => {
  ok(res, publicSettings(await getSettings()));
});

export const zones = asyncHandler(async (req, res) => {
  ok(res, await DeliveryZone.find().sort({ district: 1, area: 1 }));
});

export const postZone = asyncHandler(async (req, res) => {
  const zone = await DeliveryZone.create(req.validated.body);
  ok(res, zone, null, 201);
});

export const putZone = asyncHandler(async (req, res) => {
  const zone = await DeliveryZone.findByIdAndUpdate(req.validated.params.id, req.validated.body, { new: true, runValidators: true });
  if (!zone) throw new ApiError(404, 'Delivery zone not found.');
  ok(res, zone);
});

export const removeZone = asyncHandler(async (req, res) => {
  const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
  if (!zone) throw new ApiError(404, 'Delivery zone not found.');
  ok(res, { deleted: true });
});

export const coupons = asyncHandler(async (req, res) => {
  ok(res, await Coupon.find().sort({ createdAt: -1 }));
});

export const postCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.validated.body, code: req.validated.body.code.toUpperCase() });
  ok(res, coupon, null, 201);
});

export const putCoupon = asyncHandler(async (req, res) => {
  const body = { ...req.validated.body };
  if (body.code) body.code = body.code.toUpperCase();
  const coupon = await Coupon.findByIdAndUpdate(req.validated.params.id, body, { new: true, runValidators: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  ok(res, coupon);
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  ok(res, { deleted: true });
});

export const subscribers = asyncHandler(async (req, res) => {
  ok(res, await Subscriber.find().sort({ createdAt: -1 }).limit(200));
});

export const inquiries = asyncHandler(async (req, res) => {
  ok(res, await Inquiry.find().sort({ createdAt: -1 }).limit(100));
});

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload.');
  const image = await storeImage(req.file);
  ok(res, image, null, 201);
});

export const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'Choose at least one image.');
  const images = [];
  for (const file of files) images.push(await storeImage(file));
  ok(res, images, null, 201);
});

void mongoose;
