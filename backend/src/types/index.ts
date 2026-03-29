import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type UserRole = 'customer' | 'admin' | 'employee' | 'superadmin';

export type CarType = 'Hatchback' | 'Sedan' | 'SUV' | 'MUV' | 'Luxury' | 'Van';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export type TaskStatus = 'Pending' | 'InProgress' | 'Done' | 'Rejected';

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PriceMatrix {
  carType: CarType;
  apartmentId: string;
  price: number;
}

export interface DashboardStats {
  newCustomers: { weekly: number; monthly: number };
  activeCustomers: number;
  revenue: { monthly: number; yearly: number };
  employeePerformance: EmployeePerformance[];
}

export interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  washesPerDay: number;
  washesPerWeek: number;
  washesPerMonth: number;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  apartmentId?: Types.ObjectId;
  passwordHash?: string;
  isFirstLogin: boolean;
  isActive: boolean;
  firebaseUid?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICar extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  nickname: string;
  type: CarType;
  licensePlate: string;
  parkingLotInfo: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IPlan extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  priceMatrix: PriceMatrix[];
  attributes: string[];
  durationDays: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  carId: Types.ObjectId;
  planId: Types.ObjectId;
  userId: Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  expiryDate: Date;
  createdAt: Date;
}

export interface IDropdownConfig extends Document {
  _id: Types.ObjectId;
  label: string;
  value: string;
  category: string;
  parentId?: Types.ObjectId;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface IServiceTask extends Document {
  _id: Types.ObjectId;
  carId: Types.ObjectId;
  employeeId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  status: TaskStatus;
  adminReview?: string;
  scheduledDate: Date;
  completionDate?: Date;
  notes?: string;
  createdAt: Date;
}

export interface IPayment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  invoiceUrl?: string;
  invoiceNumber: string;
  createdAt: Date;
}

export interface IApartment extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  city: string;
  pincode: string;
  isActive: boolean;
  createdAt: Date;
}
