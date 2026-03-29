import { Schema, model, Types } from 'mongoose';
import { IDropdownConfig } from '../types';

const dropdownConfigSchema = new Schema<IDropdownConfig>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    parentId: { type: Types.ObjectId, ref: 'DropdownConfig', default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dropdownConfigSchema.index({ category: 1, isActive: 1 });
dropdownConfigSchema.index({ parentId: 1 });
dropdownConfigSchema.index({ category: 1, value: 1 }, { unique: true });

export const DropdownConfig = model<IDropdownConfig>('DropdownConfig', dropdownConfigSchema);
