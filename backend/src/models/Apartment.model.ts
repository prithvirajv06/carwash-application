import { Schema, model } from 'mongoose';
import { IApartment } from '../types';

const apartmentSchema = new Schema<IApartment>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

apartmentSchema.index({ city: 1, isActive: 1 });

export const Apartment = model<IApartment>('Apartment', apartmentSchema);
