import mongoose from 'mongoose';

const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    mode: { type: String, enum: ['variant', 'custom'], required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true, min: 0.001 },
  },
  { _id: true },
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String },
    couponCode: { type: String, uppercase: true, trim: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

cartSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
cartSchema.index({ guestId: 1 }, { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } });

export const Cart = mongoose.model('Cart', cartSchema);
