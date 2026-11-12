import { Order } from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import { invoiceForOrder } from '../services/invoiceService.js';

async function sendInvoice(res, order) {
  if (!order) throw new ApiError(404, 'Order not found.');
  const invoice = await invoiceForOrder(order);
  if (!invoice) throw new ApiError(404, 'An invoice is not available for this order yet.');
  ok(res, invoice);
}

export const myInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber, user: req.user._id });
  await sendInvoice(res, order);
});

export const adminInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  await sendInvoice(res, order);
});
