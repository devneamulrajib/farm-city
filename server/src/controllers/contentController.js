import { Inquiry } from '../models/Inquiry.js';
import { Subscriber } from '../models/Subscriber.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { listActiveZones, quoteDelivery } from '../services/deliveryService.js';

export const subscribe = asyncHandler(async (req, res) => {
  const email = req.validated.body.email.toLowerCase();
  const existing = await Subscriber.findOne({ email });
  if (existing) {
    existing.isActive = true;
    await existing.save();
    return ok(res, { subscribed: true, already: true });
  }
  await Subscriber.create({ email, source: 'footer' });
  ok(res, { subscribed: true, already: false }, null, 201);
});

export const createInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.create(req.validated.body);
  ok(res, { id: inquiry._id }, null, 201);
});

export const deliveryZones = asyncHandler(async (req, res) => {
  ok(res, await listActiveZones());
});

export const deliveryQuote = asyncHandler(async (req, res) => {
  ok(res, await quoteDelivery(req.validated.body));
});
