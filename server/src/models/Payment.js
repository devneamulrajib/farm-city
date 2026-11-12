import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, enum: ['cod', 'bkash', 'nagad', 'sslcommerz'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT' },
    status: { type: String, enum: ['pending', 'initiated', 'paid', 'failed', 'cancelled', 'refunded'], default: 'pending' },
    providerPaymentId: { type: String, default: '', index: true },
    providerTransactionId: { type: String, default: '' },
    redirectUrl: { type: String, default: '' },
    rawStatus: { type: String, default: '' },
    failureReason: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Payment = mongoose.model('Payment', paymentSchema);
