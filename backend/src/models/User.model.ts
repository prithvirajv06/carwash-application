import { Schema, model, Types } from 'mongoose';
import { IUser } from '../types';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['customer', 'admin', 'employee', 'superadmin'], default: 'customer' },
    apartmentId: { type: Types.ObjectId, ref: 'Apartment' },
    passwordHash: { type: String },
    isFirstLogin: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    firebaseUid: { type: String, sparse: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ role: 1, isActive: 1 });

export const User = model<IUser>('User', userSchema);
