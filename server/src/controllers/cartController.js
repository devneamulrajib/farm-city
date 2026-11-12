import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import {
  addCartItem,
  applyCoupon,
  clearCart,
  getOrCreateCart,
  mergeGuestCart,
  presentCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '../services/cartService.js';

function identity(req) {
  if (req.user) return { user: req.user, guestId: null };
  const guestId = req.get('x-guest-id');
  if (!guestId) throw new ApiError(400, 'Missing guest cart.');
  return { user: null, guestId };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(identity(req));
  ok(res, await presentCart(cart));
});

export const postItem = asyncHandler(async (req, res) => {
  const cart = await addCartItem({ ...identity(req), payload: req.validated.body });
  ok(res, cart, null, 201);
});

export const patchItem = asyncHandler(async (req, res) => {
  const cart = await updateCartItem({
    ...identity(req),
    itemId: req.validated.params.itemId,
    quantity: req.validated.body.quantity,
  });
  ok(res, cart);
});

export const deleteItem = asyncHandler(async (req, res) => {
  ok(res, await removeCartItem({ ...identity(req), itemId: req.params.itemId }));
});

export const deleteCart = asyncHandler(async (req, res) => {
  ok(res, await clearCart(identity(req)));
});

export const postCoupon = asyncHandler(async (req, res) => {
  ok(res, await applyCoupon({ ...identity(req), code: req.validated.body.code }));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  ok(res, await removeCoupon(identity(req)));
});

export const postMerge = asyncHandler(async (req, res) => {
  ok(res, await mergeGuestCart({ user: req.user, guestId: req.validated.body.guestId }));
});
