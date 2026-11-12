import mongoose from 'mongoose';

const { Schema } = mongoose;
const localized = { en: { type: String, default: '' }, bn: { type: String, default: '' } };

const settingSchema = new Schema(
  {
    key: { type: String, unique: true, default: 'store' },
    storeName: { type: String, default: 'Farm City' },
    logo: { url: { type: String, default: '' }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } },
    tagline: localized,
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    address: localized,
    about: localized,
    hours: localized,
    announcement: {
      enabled: { type: Boolean, default: false },
      text: localized,
      link: { type: String, default: '' },
    },
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
    payments: {
      cod: { enabled: { type: Boolean, default: true } },
      bkash: { enabled: { type: Boolean, default: false } },
      nagad: { enabled: { type: Boolean, default: false } },
      sslcommerz: { enabled: { type: Boolean, default: false } },
    },
    defaultDeliveryCharge: { type: Number, default: 120 },
    freeDeliveryThreshold: { type: Number, default: 3500 },
    lowStockThreshold: { type: Number, default: 5 },
    highlights: {
      type: [
        new Schema(
          {
            icon: { type: String, default: 'fish' },
            title: localized,
            text: localized,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    testimonials: {
      type: [
        new Schema(
          {
            name: String,
            location: String,
            rating: { type: Number, default: 5 },
            quote: localized,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Setting = mongoose.model('Setting', settingSchema);
