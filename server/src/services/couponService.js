import { fromPaisa, toPaisa } from '../utils/money.js';

export function evaluateCoupon(coupon, subtotal) {
  if (!coupon || !coupon.isActive) return { ok: false, message: 'This coupon is not active.' };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, message: 'This coupon is not active yet.' };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, message: 'This coupon has expired.' };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: 'This coupon has reached its usage limit.' };
  }
  if (subtotal < (coupon.minOrder || 0)) {
    return { ok: false, message: `This coupon needs an order of at least ৳${coupon.minOrder}.` };
  }
  let discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  discount = fromPaisa(toPaisa(discount));
  return { ok: true, discount };
}
