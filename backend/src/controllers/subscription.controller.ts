import { Response, NextFunction } from 'express';
import dayjs from 'dayjs';
import { Subscription } from '../models/Subscription.model';
import { Car } from '../models/Car.model';
import { Plan } from '../models/Plan.model';
import { Payment } from '../models/Payment.model';
import { User } from '../models/User.model';
import { Apartment } from '../models/Apartment.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound, buildPaginationMeta } from '../utils/response';
import { createOrder, verifyPaymentSignature } from '../services/razorpay.service';
import { generateInvoicePDF } from '../services/invoice.service';
import { sendSubscriptionConfirmation } from '../services/mail.service';
import { generateInvoiceNumber } from '../utils/password';

export const initiateSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { carId, planId } = req.body;

    const [car, plan, user] = await Promise.all([
      Car.findOne({ _id: carId, userId, isActive: true }),
      Plan.findOne({ _id: planId, isActive: true }),
      User.findById(userId),
    ]);

    if (!car) { sendNotFound(res, 'Car not found'); return; }
    if (!plan) { sendNotFound(res, 'Plan not found'); return; }
    if (!user?.apartmentId) { sendError(res, 'Please complete your profile with apartment details'); return; }

    const priceEntry = plan.priceMatrix.find(
      (p) => p.carType === car.type && p.apartmentId.toString() === user.apartmentId!.toString()
    );

    if (!priceEntry) {
      sendError(res, 'No pricing available for your car type and apartment');
      return;
    }

    const activeSubscription = await Subscription.findOne({
      carId,
      status: 'active',
      expiryDate: { $gt: new Date() },
    });

    if (activeSubscription) {
      sendError(res, 'This car already has an active subscription');
      return;
    }

    const startDate = new Date();
    const expiryDate = dayjs(startDate).add(plan.durationDays, 'day').toDate();

    const subscription = await Subscription.create({
      carId,
      planId,
      userId,
      status: 'pending',
      startDate,
      expiryDate,
    });

    const invoiceNumber = generateInvoiceNumber();
    const receipt = `rcpt_${subscription._id.toString().slice(-8)}`;

    const order = await createOrder(priceEntry.price, 'INR', receipt);

    await Payment.create({
      userId,
      subscriptionId: subscription._id,
      amount: priceEntry.price,
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: order.id,
      invoiceNumber,
    });

    sendCreated(res, {
      subscriptionId: subscription._id,
      orderId: order.id,
      amount: priceEntry.price,
      currency: 'INR',
      invoiceNumber,
      keyId: process.env.RAZORPAY_ID,
    }, 'Subscription initiated. Complete payment to activate.');
  } catch (err) {
    next(err);
  }
};

export const verifyAndActivate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.body;

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      sendError(res, 'Payment verification failed. Invalid signature.');
      return;
    }

    const payment = await Payment.findOne({ razorpayOrderId, subscriptionId });
    if (!payment) {
      sendNotFound(res, 'Payment record not found');
      return;
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'captured';
    await payment.save();

    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { status: 'active' },
      { new: true }
    ).populate('planId', 'name');

    if (!subscription) {
      sendNotFound(res, 'Subscription not found');
      return;
    }

    const [user, car] = await Promise.all([
      User.findById(req.user!.userId),
      Car.findById(subscription.carId),
    ]);

    const apartment = user?.apartmentId
      ? await Apartment.findById(user.apartmentId)
      : null;

    const invoiceUrl = await generateInvoicePDF({
      invoiceNumber: payment.invoiceNumber,
      customerName: user?.name || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || '',
      planName: (subscription.planId as unknown as { name: string }).name,
      carNickname: car?.nickname || '',
      carType: car?.type || '',
      licensePlate: car?.licensePlate || '',
      apartmentName: apartment?.name || '',
      amount: payment.amount,
      currency: payment.currency,
      paymentDate: new Date(),
      subscriptionStart: subscription.startDate,
      subscriptionEnd: subscription.expiryDate,
      razorpayPaymentId,
    });

    payment.invoiceUrl = invoiceUrl;
    await payment.save();

    if (user) {
      await sendSubscriptionConfirmation(
        user.email,
        user.name,
        (subscription.planId as unknown as { name: string }).name,
        subscription.expiryDate,
        payment.invoiceNumber
      );
    }

    sendSuccess(res, {
      subscriptionId: subscription._id,
      status: 'active',
      expiryDate: subscription.expiryDate,
      invoiceUrl,
      invoiceNumber: payment.invoiceNumber,
    }, 'Payment verified. Subscription activated!');
  } catch (err) {
    next(err);
  }
};

export const getMySubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user!.userId })
      .populate('planId', 'name durationDays attributes')
      .populate('carId', 'nickname type licensePlate')
      .sort({ createdAt: -1 });

    sendSuccess(res, subscriptions);
  } catch (err) {
    next(err);
  }
};

export const renewSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { planId: newPlanId } = req.body;

    const existing = await Subscription.findOne({ _id: id, userId });
    if (!existing) {
      sendNotFound(res, 'Subscription not found');
      return;
    }

    const planId = newPlanId || existing.planId;
    const [car, plan, user] = await Promise.all([
      Car.findById(existing.carId),
      Plan.findOne({ _id: planId, isActive: true }),
      User.findById(userId),
    ]);

    if (!car || !plan || !user?.apartmentId) {
      sendError(res, 'Missing required data for renewal');
      return;
    }

    const priceEntry = plan.priceMatrix.find(
      (p) => p.carType === car.type && p.apartmentId.toString() === user.apartmentId!.toString()
    );

    if (!priceEntry) {
      sendError(res, 'No pricing found for renewal');
      return;
    }

    const startDate = existing.status === 'active' && existing.expiryDate > new Date()
      ? existing.expiryDate
      : new Date();
    const expiryDate = dayjs(startDate).add(plan.durationDays, 'day').toDate();

    const subscription = await Subscription.create({
      carId: existing.carId,
      planId,
      userId,
      status: 'pending',
      startDate,
      expiryDate,
    });

    const invoiceNumber = generateInvoiceNumber();
    const receipt = `renew_${subscription._id.toString().slice(-8)}`;
    const order = await createOrder(priceEntry.price, 'INR', receipt);

    await Payment.create({
      userId,
      subscriptionId: subscription._id,
      amount: priceEntry.price,
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: order.id,
      invoiceNumber,
    });

    sendCreated(res, {
      subscriptionId: subscription._id,
      orderId: order.id,
      amount: priceEntry.price,
      currency: 'INR',
      invoiceNumber,
      keyId: process.env.RAZORPAY_ID,
      renewalStartDate: startDate,
      renewalEndDate: expiryDate,
    }, 'Renewal initiated. Complete payment to activate.');
  } catch (err) {
    next(err);
  }
};

export const listAllSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('userId', 'name email phone')
        .populate('planId', 'name durationDays')
        .populate('carId', 'nickname type licensePlate')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscription.countDocuments(filter),
    ]);

    sendSuccess(res, subscriptions, 'Subscriptions retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};
