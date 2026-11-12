import mongoose from 'mongoose';

const { Schema } = mongoose;

const adminNoticeSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    refType: { type: String, enum: ['Order', 'Inquiry'], required: true },
    refId: { type: Schema.Types.ObjectId, required: true, index: true },
    href: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: {} },
    seenAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

adminNoticeSchema.index({ refType: 1, refId: 1, type: 1 }, { unique: true });
adminNoticeSchema.index({ seenAt: 1, createdAt: -1 });

export const AdminNotice = mongoose.model('AdminNotice', adminNoticeSchema);
export const ORDER_NOTICE_TYPES = ['order.new', 'order.cancelled', 'payment.failed', 'payment.refunded'];
export const REQUEST_NOTICE_TYPES = ['inquiry.new'];
