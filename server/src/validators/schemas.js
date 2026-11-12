import { z } from 'zod';
import { normalizeBdPhone } from '../utils/phone.js';

const empty = z.object({}).passthrough();

export const bdPhone = z.string().trim().transform((value, ctx) => {
  const phone = normalizeBdPhone(value);
  if (!phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX).' });
    return z.NEVER;
  }
  return phone;
});

const password = z.string().min(8).max(72)
  .regex(/[A-Za-z]/, 'Use at least one letter')
  .regex(/\d/, 'Use at least one number');

const localized = z.object({
  en: z.string().trim().min(1).max(180),
  bn: z.string().trim().max(180).optional().default(''),
});

const longText = z.object({
  en: z.string().trim().min(1).max(5000),
  bn: z.string().trim().max(5000).optional().default(''),
});

const optionalText = z.object({
  en: z.string().trim().max(5000).optional().default(''),
  bn: z.string().trim().max(5000).optional().default(''),
});

const image = z.object({
  url: z.string().trim().min(1),
  publicId: z.string().optional().default(''),
  alt: z.string().optional().default(''),
});

const option = z.object({
  value: z.string().trim().min(1).max(60),
  label: z.object({
    en: z.string().trim().min(1).max(80),
    bn: z.string().trim().max(80).optional().default(''),
  }),
});

const attributeField = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,40}$/, 'Use a lowercase key such as freshness'),
  label: z.object({
    en: z.string().trim().min(1).max(80),
    bn: z.string().trim().max(80).optional().default(''),
  }),
  type: z.enum(['text', 'number', 'select', 'multiselect', 'boolean']),
  options: z.array(option).optional().default([]),
  required: z.boolean().optional().default(false),
  filterable: z.boolean().optional().default(false),
  unit: z.string().trim().max(20).optional().default(''),
  help: optionalText.optional(),
}).superRefine((field, ctx) => {
  if (['select', 'multiselect'].includes(field.type) && field.options.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Add at least one option', path: ['options'] });
  }
});

const variant = z.object({
  _id: z.string().optional(),
  sku: z.string().trim().max(40).optional().default(''),
  label: z.string().trim().min(1).max(40),
  weightValue: z.coerce.number().positive(),
  weightUnit: z.enum(['kg', 'gram', 'piece', 'pack']),
  price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(),
  stock: z.coerce.number().min(0),
  isDefault: z.boolean().optional().default(false),
});

const productBody = z.object({
  name: localized,
  description: longText,
  categoryId: z.string().min(1),
  categoryIds: z.array(z.string()).optional().default([]),
  images: z.array(image).min(1),
  basePrice: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(),
  unit: z.enum(['kg', 'gram', 'piece', 'pack']),
  stock: z.coerce.number().min(0).optional().default(0),
  isAvailable: z.boolean().optional().default(true),
  variants: z.array(variant).optional().default([]),
  allowCustomQuantity: z.boolean().optional().default(false),
  minQuantity: z.coerce.number().positive().optional().default(0.5),
  maxQuantity: z.coerce.number().positive().optional().default(10),
  quantityStep: z.coerce.number().positive().optional().default(0.5),
  attributes: z.record(z.any()).optional().default({}),
  isFeatured: z.boolean().optional().default(false),
  isBestSeller: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).optional().default([]),
  sku: z.string().trim().max(40).optional().default(''),
});

const categoryBody = z.object({
  name: localized,
  slug: z.string().trim().max(80).optional().default(''),
  description: optionalText.optional(),
  image: image.optional(),
  icon: z.string().trim().max(40).optional().default(''),
  iconImage: image.nullable().optional(),
  parentId: z.string().nullable().optional(),
  isVisible: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().optional().default(0),
  attributeSchema: z.array(attributeField).optional().default([]),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().optional(),
  sort: z.enum(['popular', 'newest', 'price_asc', 'price_desc']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availability: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  bestSeller: z.enum(['true', 'false']).optional(),
  newArrival: z.enum(['true', 'false']).optional(),
  onSale: z.enum(['true', 'false']).optional(),
}).passthrough();

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    phone: bdPhone,
    password,
  }),
  query: empty,
  params: empty,
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(3).max(120),
    password: z.string().min(1),
  }),
  query: empty,
  params: empty,
});

export const profileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    phone: bdPhone,
  }),
  query: empty,
  params: empty,
});

export const passwordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
  query: empty,
  params: empty,
});

const addressBody = z.object({
  label: z.string().trim().max(40).optional().default('Home'),
  name: z.string().trim().max(80).optional().default(''),
  phone: bdPhone.optional(),
  addressLine: z.string().trim().min(4).max(240),
  district: z.string().trim().min(2).max(60),
  area: z.string().trim().max(80).optional().default(''),
  instructions: z.string().trim().max(240).optional().default(''),
  isDefault: z.boolean().optional().default(false),
});

export const addressSchema = z.object({ body: addressBody, query: empty, params: empty });
export const addressUpdateSchema = z.object({
  body: addressBody,
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

export const listSchema = z.object({ body: empty, params: empty, query: listQuery });
export const slugSchema = z.object({ body: empty, query: empty, params: z.object({ slug: z.string().min(1) }) });
export const idSchema = z.object({ body: empty, query: empty, params: z.object({ id: z.string().min(1) }) });

export const productSchema = z.object({ body: productBody, query: empty, params: empty });
export const productUpdateSchema = z.object({
  body: productBody,
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});
export const categorySchema = z.object({ body: categoryBody, query: empty, params: empty });
export const categoryUpdateSchema = z.object({
  body: categoryBody.partial().extend({ attributeSchema: z.array(attributeField).optional() }),
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

export const cartItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    mode: z.enum(['variant', 'custom']),
    variantId: z.string().nullable().optional(),
    quantity: z.coerce.number().positive(),
  }).superRefine((body, ctx) => {
    if (body.mode === 'variant' && !body.variantId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose a weight.', path: ['variantId'] });
    }
  }),
  query: empty,
  params: empty,
});

export const cartQtySchema = z.object({
  body: z.object({ quantity: z.coerce.number().positive() }),
  query: empty,
  params: z.object({ itemId: z.string().min(1) }),
});

export const couponSchema = z.object({
  body: z.object({ code: z.string().trim().min(2).max(30) }),
  query: empty,
  params: empty,
});

export const checkoutSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    phone: bdPhone,
    email: z.union([z.string().trim().email().max(120), z.literal('')]).optional(),
    addressLine: z.string().trim().min(4).max(240),
    district: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).optional().default(''),
    instructions: z.string().trim().max(240).optional().default(''),
    paymentMethod: z.enum(['cod', 'bkash', 'nagad', 'sslcommerz']),
  }),
  query: empty,
  params: empty,
});

export const trackSchema = z.object({
  body: z.object({ orderNumber: z.string().trim().min(4).max(40), phone: z.string().trim().min(8) }),
  query: empty,
  params: empty,
});

export const cancelSchema = z.object({
  body: z.object({ note: z.string().trim().max(240).optional().default('') }),
  query: empty,
  params: z.object({ orderNumber: z.string().min(1) }),
});

export const reviewSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional().default(''),
  }),
  query: empty,
  params: empty,
});

export const subscribeSchema = z.object({
  body: z.object({ email: z.string().trim().email().max(120) }),
  query: empty,
  params: empty,
});

export const inquirySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.union([z.string().trim().email().max(120), z.literal('')]).optional(),
    phone: z.string().trim().max(20).optional().default(''),
    message: z.string().trim().min(5).max(4000),
  }),
  query: empty,
  params: empty,
});

export const quoteSchema = z.object({
  body: z.object({
    district: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).optional().default(''),
    subtotal: z.coerce.number().min(0).optional().default(0),
  }),
  query: empty,
  params: empty,
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum(['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled']),
    note: z.string().trim().max(240).optional().default(''),
  }),
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

export const customerStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

const bannerBody = z.object({
  placement: z.enum(['hero', 'promo', 'announcement']),
  title: optionalText,
  subtitle: optionalText.optional(),
  image: image.optional(),
  link: z.string().trim().max(200).optional().default(''),
  ctaLabel: optionalText.optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().optional().default(0),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const bannerSchema = z.object({ body: bannerBody, query: empty, params: empty });
export const bannerUpdateSchema = z.object({
  body: bannerBody.partial(),
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

const couponBody = z.object({
  code: z.string().trim().min(2).max(30),
  description: optionalText.optional(),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().positive(),
  minOrder: z.coerce.number().min(0).optional().default(0),
  maxDiscount: z.coerce.number().min(0).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const couponWriteSchema = z.object({ body: couponBody, query: empty, params: empty });
export const couponUpdateSchema = z.object({
  body: couponBody.partial(),
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

const zoneBody = z.object({
  district: z.string().trim().min(2).max(60),
  area: z.string().trim().max(80).optional().default(''),
  charge: z.coerce.number().min(0),
  eta: optionalText.optional(),
  isActive: z.boolean().optional().default(true),
});

export const zoneSchema = z.object({ body: zoneBody, query: empty, params: empty });
export const zoneUpdateSchema = z.object({
  body: zoneBody.partial(),
  query: empty,
  params: z.object({ id: z.string().min(1) }),
});

export const settingsSchema = z.object({
  body: z.object({
    storeName: z.string().trim().min(2).max(80),
    logo: image.nullable().optional(),
    tagline: optionalText,
    phone: z.string().trim().max(30),
    email: z.union([z.string().trim().email(), z.literal('')]),
    whatsapp: z.string().trim().max(30).optional().default(''),
    address: optionalText,
    about: optionalText,
    hours: optionalText,
    announcement: z.object({
      enabled: z.boolean(),
      text: optionalText,
      link: z.string().trim().max(200).optional().default(''),
    }),
    social: z.object({
      facebook: z.string().trim().max(200).optional().default(''),
      instagram: z.string().trim().max(200).optional().default(''),
    }),
    payments: z.object({
      cod: z.object({ enabled: z.boolean() }),
      bkash: z.object({ enabled: z.boolean() }),
      nagad: z.object({ enabled: z.boolean() }),
      sslcommerz: z.object({ enabled: z.boolean() }),
    }),
    defaultDeliveryCharge: z.coerce.number().min(0),
    freeDeliveryThreshold: z.coerce.number().min(0),
    lowStockThreshold: z.coerce.number().int().min(0),
    highlights: z.array(z.object({
      icon: z.string().trim().max(40),
      title: optionalText,
      text: optionalText,
    })).max(8),
    testimonials: z.array(z.object({
      name: z.string().trim().min(2).max(80),
      location: z.string().trim().max(80).optional().default(''),
      rating: z.coerce.number().min(1).max(5).optional().default(5),
      quote: optionalText,
    })).max(12),
  }),
  query: empty,
  params: empty,
});

export const mergeSchema = z.object({
  body: z.object({ guestId: z.string().uuid() }),
  query: empty,
  params: empty,
});

export const orderQuerySchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    q: z.string().optional(),
    status: z.string().optional(),
  }).passthrough(),
});
