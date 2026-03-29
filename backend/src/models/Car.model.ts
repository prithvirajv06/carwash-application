import { Schema, model, Types } from 'mongoose';
import { ICar } from '../types';

const carSchema = new Schema<ICar>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nickname: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Van'],
      required: true,
    },
    licensePlate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    parkingLotInfo: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

carSchema.index({ userId: 1, isActive: 1 });

export const Car = model<ICar>('Car', carSchema);
