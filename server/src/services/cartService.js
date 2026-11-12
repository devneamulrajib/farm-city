import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';
import { addMoney, mulMoney } from '../utils/money.js';
import { evaluateCoupon } from './couponService.js';

const GUEST_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function roundQty(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

export function assertGuestId(guestId) {
  if (!GUEST_RE.test(String(guestId || ''))) throw new ApiError(400, 'Missing guest cart.');
  return String(guestId);
}

export async function getOrCreateCart({ user, guestId, create = false, session }) {
  const query = user ? { user: user._id || user } : { guestId: assertGuestId(guestId) };
  let cart = await Cart.findOne(query).session(session || null);
  if (!cart && create) {
    cart = new Cart(user ? { user: user._id || user, items: [] } : { guestId: query.guestId, items: [] });
    await cart.save({ session });
  }
  return cart;
}

export function priceItem(product, item) {
  const base = {
    productId: product?._id || item.product,
    mode: item.mode,
    variantId: item.variantId || null,
    quantity: item.quantity,
    issues: [],
    lineTotal: 0,
  };
  if (!product || product.isDeleted || !product.isAvailable) {
    return { ...base, issues: ['This product is no longer available.'] };
  }
  if (item.mode === 'variant') {
    const variant = (product.variants || []).find((entry) => String(entry._id) === String(item.variantId));
    if (!variant) return { ...base, issues: ['That weight is no longer sold.'], name: product.name, slug: product.slug, image: product.images?.[0]?.url || '' };
    const quantity = Math.round(Number(item.quantity));
    const issues = [];
    if (quantity < 1) issues.push('Choose at least 1.');
    if (variant.stock < quantity) issues.push(`Only ${variant.stock} left for ${variant.label}.`);
    return {
      ...base,
      product,
      quantity,
      issues,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      lineTotal: issues.length ? 0 : mulMoney(variant.price, quantity),
      name: product.name,
      slug: product.slug,
      image: product.images?.[0]?.url || '',
      sku: variant.sku || product.sku || '',
      variantLabel: variant.label,
      weightValue: variant.weightValue,
      weightUnit: variant.weightUnit,
      unit: product.unit,
      attributes: product.attributes || {},
      variant,
    };
  }
  let quantity = roundQty(item.quantity);
  if (['piece', 'pack'].includes(product.unit)) quantity = Math.max(1, Math.round(quantity));
  const issues = [];
  if (product.variants?.length && !product.allowCustomQuantity) issues.push('Choose a listed weight.');
  if (quantity < product.minQuantity) issues.push(`Minimum is ${product.minQuantity} ${product.unit}.`);
  if (quantity > product.maxQuantity) issues.push(`Maximum is ${product.maxQuantity} ${product.unit}.`);
  if (Number(product.stock) < quantity) issues.push(`Only ${product.stock} ${product.unit} left.`);
  return {
    ...base,
    product,
    quantity,
    issues,
    unitPrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    lineTotal: issues.length ? 0 : mulMoney(product.basePrice, quantity),
    name: product.name,
    slug: product.slug,
    image: product.images?.[0]?.url || '',
    sku: product.sku || '',
    variantLabel: `${quantity} ${product.unit}`,
    weightValue: quantity,
    weightUnit: product.unit,
    unit: product.unit,
    attributes: product.attributes || {},
    variant: null,
  };
}

export async function priceItems(items, session) {
  const ids = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: ids } }).session(session || null);
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return items.map((item) => priceItem(byId.get(String(item.product)), item));
}

function presentLine(item, priced) {
  return {
    id: item._id,
    productId: priced.productId,
    slug: priced.slug || '',
    name: priced.name || { en: 'Unavailable item', bn: '' },
    image: priced.image || '',
    mode: item.mode,
    variantId: item.variantId,
    variantLabel: priced.variantLabel || '',
    unit: priced.unit || '',
    quantity: priced.quantity,
    unitPrice: priced.unitPrice || 0,
    compareAtPrice: priced.compareAtPrice || null,
    lineTotal: priced.lineTotal || 0,
    issues: priced.issues,
  };
}

export async function presentCart(cart) {
  if (!cart || !cart.items?.length) {
    return { id: cart?._id || null, items: [], subtotal: 0, discount: 0, total: 0, coupon: null };
  }
  const priced = await priceItems(cart.items);
  const lines = cart.items.map((item, index) => presentLine(item, priced[index]));
  const subtotal = addMoney(...lines.filter((line) => !line.issues.length).map((line) => line.lineTotal));
  let discount = 0;
  let coupon = null;
  if (cart.couponCode) {
    const found = await Coupon.findOne({ code: cart.couponCode });
    const result = evaluateCoupon(found, subtotal);
    if (result.ok) {
      discount = result.discount;
      coupon = { code: found.code, discount, description: found.description };
    } else {
      coupon = { code: cart.couponCode, discount: 0, error: result.message };
    }
  }
  return {
    id: cart._id,
    items: lines,
    subtotal,
    discount,
    total: Math.max(0, addMoney(subtotal, -discount)),
    coupon,
  };
}

function sameLine(line, payload) {
  return String(line.product) === String(payload.productId)
    && line.mode === payload.mode
    && String(line.variantId || '') === String(payload.variantId || '');
}

export async function addCartItem({ user, guestId, payload }) {
  const cart = await getOrCreateCart({ user, guestId, create: true });
  const product = await Product.findById(payload.productId);
  const preview = priceItem(product, { ...payload, quantity: payload.quantity });
  if (!product) throw new ApiError(404, 'Product not found.');
  if (preview.issues.length) throw new ApiError(400, preview.issues[0]);
  const match = cart.items.find((line) => sameLine(line, payload));
  const nextQty = match ? roundQty(match.quantity + payload.quantity) : payload.quantity;
  const check = priceItem(product, { ...payload, quantity: nextQty });
  if (check.issues.length) throw new ApiError(400, check.issues[0]);
  if (match) match.quantity = check.quantity;
  else cart.items.push({ product: product._id, mode: payload.mode, variantId: payload.variantId || null, quantity: check.quantity });
  await cart.save();
  return presentCart(cart);
}

export async function updateCartItem({ user, guestId, itemId, quantity }) {
  const cart = await getOrCreateCart({ user, guestId });
  if (!cart) throw new ApiError(404, 'Cart not found.');
  const line = cart.items.id(itemId);
  if (!line) throw new ApiError(404, 'Cart item not found.');
  const product = await Product.findById(line.product);
  const check = priceItem(product, { mode: line.mode, variantId: line.variantId, quantity, product: line.product });
  if (check.issues.length) throw new ApiError(400, check.issues[0]);
  line.quantity = check.quantity;
  await cart.save();
  return presentCart(cart);
}

export async function removeCartItem({ user, guestId, itemId }) {
  const cart = await getOrCreateCart({ user, guestId });
  if (!cart) throw new ApiError(404, 'Cart not found.');
  cart.items = cart.items.filter((item) => String(item._id) !== String(itemId));
  await cart.save();
  return presentCart(cart);
}

export async function clearCart({ user, guestId }) {
  const cart = await getOrCreateCart({ user, guestId });
  if (cart) {
    cart.items = [];
    cart.couponCode = undefined;
    await cart.save();
  }
  return presentCart(cart);
}

export async function applyCoupon({ user, guestId, code }) {
  const cart = await getOrCreateCart({ user, guestId, create: true });
  const snapshot = await presentCart({ ...cart.toObject(), couponCode: undefined, items: cart.items });
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  const result = evaluateCoupon(coupon, snapshot.subtotal);
  if (!result.ok) throw new ApiError(400, result.message);
  cart.couponCode = coupon.code;
  await cart.save();
  return presentCart(cart);
}

export async function removeCoupon({ user, guestId }) {
  const cart = await getOrCreateCart({ user, guestId });
  if (cart) {
    cart.couponCode = undefined;
    await cart.save();
  }
  return presentCart(cart);
}

export async function mergeGuestCart({ user, guestId }) {
  if (!guestId || !GUEST_RE.test(guestId)) return presentCart(await getOrCreateCart({ user, create: true }));
  const guest = await Cart.findOne({ guestId });
  let cart = await Cart.findOne({ user: user._id });
  if (!cart) cart = new Cart({ user: user._id, items: [] });
  if (guest) {
    for (const item of guest.items) {
      const match = cart.items.find((line) => sameLine(line, { productId: item.product, mode: item.mode, variantId: item.variantId }));
      if (match) match.quantity = roundQty(match.quantity + item.quantity);
      else cart.items.push({ product: item.product, mode: item.mode, variantId: item.variantId, quantity: item.quantity });
    }
    if (!cart.couponCode && guest.couponCode) cart.couponCode = guest.couponCode;
    await guest.deleteOne();
  }
  await cart.save();
  return presentCart(cart);
}
