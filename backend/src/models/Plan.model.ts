import { Schema, model } from 'mongoose';
import { IPlan } from '../types';

const priceMatrixSchema = new Schema(
  {
    carType: {
      type: String,
      enum: ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Van'],
      required: true,
    },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priceMatrix: { type: [priceMatrixSchema], required: true },
    attributes: { type: [String], default: [] },
    durationDays: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

planSchema.index({ isActive: 1 });

export const Plan = model<IPlan>('Plan', planSchema);
