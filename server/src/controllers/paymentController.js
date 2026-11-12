import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { getSettings } from '../services/settingsService.js';
import { listAdminProviders, listPublicMethods } from '../services/payment/registry.js';
import { confirmationUrl, finalizeOnlinePayment } from '../services/orderService.js';

export const methods = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  ok(res, listPublicMethods(settings));
});

export const adminProviders = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  ok(res, listAdminProviders(settings));
});

function redirect(res, order, result) {
  res.redirect(confirmationUrl(order, result));
}

export const bkashCallback = asyncHandler(async (req, res) => {
  const order = await finalizeOnlinePayment({
    providerId: 'bkash',
    payload: { paymentID: req.query.paymentID, status: req.query.status },
  });
  const result = order.paymentStatus === 'paid' ? 'success' : req.query.status === 'cancel' ? 'cancel' : 'failed';
  redirect(res, order, result);
});

export const nagadCallback = asyncHandler(async (req, res) => {
  const payload = { ...req.query, ...req.body };
  const order = await finalizeOnlinePayment({ providerId: 'nagad', payload });
  redirect(res, order, order.paymentStatus === 'paid' ? 'success' : 'failed');
});

export const sslSuccess = asyncHandler(async (req, res) => {
  const order = await finalizeOnlinePayment({ providerId: 'sslcommerz', payload: req.body || {} });
  redirect(res, order, order.paymentStatus === 'paid' ? 'success' : 'failed');
});

export const sslFail = asyncHandler(async (req, res) => {
  const order = await finalizeOnlinePayment({
    providerId: 'sslcommerz',
    payload: { ...(req.body || {}), status: 'failed' },
  });
  redirect(res, order, 'failed');
});

export const sslCancel = asyncHandler(async (req, res) => {
  const order = await finalizeOnlinePayment({
    providerId: 'sslcommerz',
    payload: { ...(req.body || {}), status: 'cancel' },
  });
  redirect(res, order, 'cancel');
});

export const sslIpn = asyncHandler(async (req, res) => {
  const order = await finalizeOnlinePayment({ providerId: 'sslcommerz', payload: req.body || {} });
  ok(res, { orderNumber: order.orderNumber, paymentStatus: order.paymentStatus });
});
