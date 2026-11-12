import mongoose from 'mongoose';

const { Schema } = mongoose;

const historySchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { en: String, bn: String },
    image: { type: String, default: '' },
    sku: { type: String, default: '' },
    variantId: { type: Schema.Types.ObjectId, default: null },
    variantLabel: { type: String, default: '' },
    weightValue: { type: Number, default: null },
    weightUnit: { type: String, default: '' },
    unit: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    compareAtPrice: { type: Number, default: null },
    lineTotal: { type: Number, required: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    viewToken: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    guestId: { type: String, default: '' },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true, index: true },
      email: { type: String, default: '' },
    },
    shippingAddress: {
      addressLine: { type: String, required: true },
      district: { type: String, required: true },
      area: { type: String, default: '' },
      instructions: { type: String, default: '' },
    },
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cod', 'bkash', 'nagad', 'sslcommerz'], required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], default: 'unpaid' },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    statusHistory: { type: [historySchema], default: [] },
    stockCommitted: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
export const STATUS_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
};
