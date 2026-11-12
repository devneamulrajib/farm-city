import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    source: { type: String, default: 'footer' },
  },
  { timestamps: true },
);

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
