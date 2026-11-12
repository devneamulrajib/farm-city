import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import {
  adminCounts,
  listAdminNotices,
  listCustomerNotifications,
  markAdminNoticesSeen,
  markCustomerNotificationsRead,
} from '../services/notificationService.js';

function idList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => mongoose.isValidObjectId(id));
}

export const myNotifications = asyncHandler(async (req, res) => {
  const { items, unread } = await listCustomerNotifications(req.user, { limit: req.query.limit });
  ok(res, items, { unread });
});

export const readNotifications = asyncHandler(async (req, res) => {
  const all = req.body?.all === true;
  const id = mongoose.isValidObjectId(req.body?.id) ? req.body.id : null;
  if (!all && !id) throw new ApiError(400, 'Choose a notification to mark as read.');
  const unread = await markCustomerNotificationsRead(req.user, { id, all });
  ok(res, { unread });
});

export const adminNoticeSummary = asyncHandler(async (req, res) => {
  ok(res, await adminCounts());
});

export const adminNotices = asyncHandler(async (req, res) => {
  const { items, counts } = await listAdminNotices({ limit: req.query.limit });
  ok(res, items, counts);
});

export const seeAdminNotices = asyncHandler(async (req, res) => {
  const ids = idList(req.body?.ids);
  const refIds = idList(req.body?.refIds);
  const refId = mongoose.isValidObjectId(req.body?.refId) ? req.body.refId : null;
  const refType = ['Order', 'Inquiry'].includes(req.body?.refType) ? req.body.refType : null;
  if (!ids.length && !(refType && (refId || refIds.length))) {
    throw new ApiError(400, 'Nothing to mark as seen.');
  }
  ok(res, await markAdminNoticesSeen({ ids, refType, refId, refIds }));
});
