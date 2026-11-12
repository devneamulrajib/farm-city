import mongoose from 'mongoose';

const { Schema } = mongoose;

const localized = { en: { type: String, trim: true, default: '' }, bn: { type: String, trim: true, default: '' } };

const optionSchema = new Schema(
  {
    value: { type: String, required: true, trim: true },
    label: localized,
  },
  { _id: false },
);

const attributeFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { en: { type: String, required: true, trim: true }, bn: { type: String, trim: true, default: '' } },
    type: { type: String, enum: ['text', 'number', 'select', 'multiselect', 'boolean'], required: true },
    options: { type: [optionSchema], default: [] },
    required: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },
    unit: { type: String, trim: true, default: '' },
    help: localized,
  },
  { _id: false },
);

const categorySchema = new Schema(
  {
    name: { en: { type: String, required: true, trim: true }, bn: { type: String, trim: true, default: '' } },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: localized,
    image: { url: { type: String, default: '' }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } },
    icon: { type: String, trim: true, default: '' },
    iconImage: { url: { type: String, default: '' }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    attributeSchema: { type: [attributeFieldSchema], default: [] },
  },
  { timestamps: true },
);

export const Category = mongoose.model('Category', categorySchema);
