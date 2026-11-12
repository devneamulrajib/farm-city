export function money(amount) {
  const value = Number(amount || 0);
  const fraction = Math.round(value * 100) % 100 === 0 ? 0 : 2;
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })}`;
}

export function lx(value, lang = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.bn || '';
}

export function media(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || ''}${url}`;
}

export function dhaka(date, lang = 'en') {
  if (!date) return '';
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function idOf(doc) {
  return doc?.id || doc?._id;
}

export function discountPercent(price, compare) {
  if (!compare || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

export function defaultCartPayload(product) {
  const variant = product.variants?.find((item) => item.isDefault && item.stock > 0)
    || product.variants?.find((item) => item.stock > 0);
  if (variant) return { productId: product.id, mode: 'variant', variantId: variant.id, quantity: 1 };
  if (product.stock >= (product.minQuantity || 1)) {
    return { productId: product.id, mode: 'custom', quantity: product.minQuantity || 1 };
  }
  return null;
}

export function apiError(error) {
  return error?.response?.data?.message || error?.message || 'Something went wrong.';
}

export function roundQty(value) {
  return Math.round(Number(value) * 1000) / 1000;
}
