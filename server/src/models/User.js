import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    label: { type: String, trim: true, default: 'Home' },
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    addressLine: { type: String, trim: true, required: true },
    district: { type: String, trim: true, required: true },
    area: { type: String, trim: true, default: '' },
    instructions: { type: String, trim: true, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    addresses: { type: [addressSchema], default: [] },
    refreshTokens: {
      type: [
        new Schema(
          {
            jti: String,
            tokenHash: String,
            expiresAt: Date,
          },
          { _id: false },
        ),
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.bcryptCost);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafe = function toSafe() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isActive: this.isActive,
    addresses: this.addresses,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
