import mongoose from 'mongoose';

const { Schema } = mongoose;

const localized = { en: { type: String, trim: true, default: '' }, bn: { type: String, trim: true, default: '' } };

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    sku: { type: String, trim: true, default: '' },
    label: { type: String, required: true, trim: true },
    weightValue: { type: Number, required: true, min: 0 },
    weightUnit: { type: String, enum: ['kg', 'gram', 'piece', 'pack'], required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    name: { en: { type: String, required: true, trim: true }, bn: { type: String, trim: true, default: '' } },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: localized,
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],
    images: { type: [imageSchema], default: [] },
    basePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    unit: { type: String, enum: ['kg', 'gram', 'piece', 'pack'], required: true },
    stock: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    availability: { type: String, enum: ['in_stock', 'low_stock', 'out_of_stock'], default: 'in_stock', index: true },
    variants: { type: [variantSchema], default: [] },
    allowCustomQuantity: { type: Boolean, default: false },
    minQuantity: { type: Number, default: 0.5 },
    maxQuantity: { type: Number, default: 10 },
    quantityStep: { type: Number, default: 0.5 },
    attributes: { type: Schema.Types.Mixed, default: {} },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestSeller: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    popularity: { type: Number, default: 0, index: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    tags: [{ type: String, trim: true, lowercase: true }],
    sku: { type: String, trim: true, default: '' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

productSchema.index(
  { 'name.en': 'text', 'name.bn': 'text', 'description.en': 'text', 'description.bn': 'text', tags: 'text' },
  { weights: { 'name.en': 10, 'name.bn': 10, tags: 6, 'description.en': 2, 'description.bn': 2 }, name: 'ProductTextIndex' },
);

export const Product = mongoose.model('Product', productSchema);
