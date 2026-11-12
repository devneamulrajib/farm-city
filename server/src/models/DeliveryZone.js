import mongoose from 'mongoose';

const { Schema } = mongoose;

const deliveryZoneSchema = new Schema(
  {
    district: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: '' },
    charge: { type: Number, required: true, min: 0 },
    eta: { en: { type: String, default: '' }, bn: { type: String, default: '' } },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deliveryZoneSchema.index({ district: 1, area: 1 }, { unique: true });

export const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
