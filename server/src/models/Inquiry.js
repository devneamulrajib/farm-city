import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true },
);

export const Inquiry = mongoose.model('Inquiry', inquirySchema);
