import mongoose from 'mongoose';

const { Schema } = mongoose;

const customerNotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    phone: { type: String, default: '', index: true },
    type: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    orderNumber: { type: String, default: '' },
    invoiceNumber: { type: String, default: '' },
    href: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerNotificationSchema.index({ user: 1, createdAt: -1 });
customerNotificationSchema.index(
  { order: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: { $type: 'string' } } },
);

export const CustomerNotification = mongoose.model('CustomerNotification', customerNotificationSchema);
