import mongoose from 'mongoose';

const { Schema } = mongoose;

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    issuedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
