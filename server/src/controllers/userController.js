import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.validated.body;
  req.user.name = name;
  req.user.email = email.toLowerCase();
  req.user.phone = phone;
  await req.user.save();
  ok(res, req.user.toSafe());
});

export const updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  const matches = await user.comparePassword(req.validated.body.currentPassword);
  if (!matches) throw new ApiError(400, 'Current password is incorrect.');
  user.password = req.validated.body.newPassword;
  user.refreshTokens = [];
  await user.save();
  ok(res, { updated: true });
});

export const addAddress = asyncHandler(async (req, res) => {
  const address = req.validated.body;
  if (address.isDefault) req.user.addresses.forEach((item) => { item.isDefault = false; });
  if (!req.user.addresses.length) address.isDefault = true;
  req.user.addresses.push(address);
  await req.user.save();
  ok(res, req.user.toSafe().addresses, null, 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.validated.params.id);
  if (!address) throw new ApiError(404, 'Address not found.');
  if (req.validated.body.isDefault) req.user.addresses.forEach((item) => { item.isDefault = false; });
  Object.assign(address, req.validated.body);
  await req.user.save();
  ok(res, req.user.toSafe().addresses);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw new ApiError(404, 'Address not found.');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true;
  await req.user.save();
  ok(res, req.user.toSafe().addresses);
});
