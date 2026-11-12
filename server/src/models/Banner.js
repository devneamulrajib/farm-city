import mongoose from 'mongoose';

const { Schema } = mongoose;

const bannerSchema = new Schema(
  {
    placement: { type: String, enum: ['hero', 'promo', 'announcement'], required: true, index: true },
    title: { en: { type: String, default: '' }, bn: { type: String, default: '' } },
    subtitle: { en: { type: String, default: '' }, bn: { type: String, default: '' } },
    image: { url: { type: String, default: '' }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } },
    link: { type: String, default: '' },
    ctaLabel: { en: { type: String, default: '' }, bn: { type: String, default: '' } },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Banner = mongoose.model('Banner', bannerSchema);
