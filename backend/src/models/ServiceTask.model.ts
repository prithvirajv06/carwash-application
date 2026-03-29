import { Schema, model, Types } from 'mongoose';
import { IServiceTask } from '../types';

const serviceTaskSchema = new Schema<IServiceTask>(
  {
    carId: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    status: {
      type: String,
      enum: ['Pending', 'InProgress', 'Done', 'Rejected'],
      default: 'Pending',
    },
    adminReview: { type: String },
    scheduledDate: { type: Date, required: true },
    completionDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

serviceTaskSchema.index({ employeeId: 1, status: 1 });
serviceTaskSchema.index({ carId: 1, scheduledDate: -1 });
serviceTaskSchema.index({ scheduledDate: 1, status: 1 });

export const ServiceTask = model<IServiceTask>('ServiceTask', serviceTaskSchema);
