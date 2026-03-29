import { Schema, model, Types } from 'mongoose';
import { ISubscription } from '../types';

const subscriptionSchema = new Schema<ISubscription>(
  {
    carId: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending',
    },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ carId: 1, status: 1 });
subscriptionSchema.index({ expiryDate: 1 });

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
