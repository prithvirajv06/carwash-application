import { Response, NextFunction } from 'express';
import { Payment } from '../models/Payment.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendNotFound, buildPaginationMeta } from '../utils/response';
import path from 'path';
import fs from 'fs';

export const getMyPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const [payments, total] = await Promise.all([
      Payment.find({ userId: req.user!.userId })
        .populate('subscriptionId', 'planId startDate expiryDate')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments({ userId: req.user!.userId }),
    ]);

    sendSuccess(res, payments, 'Payment history retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};

export const listAllPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, from, to } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from as string);
      if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to as string);
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'name email phone')
        .populate('subscriptionId', 'planId carId startDate expiryDate')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    sendSuccess(res, payments, 'Payments retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};

export const downloadInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const query: Record<string, unknown> = { _id: id };
    if (!['admin', 'superadmin'].includes(role)) {
      query.userId = userId;
    }

    const payment = await Payment.findOne(query);
    if (!payment || !payment.invoiceUrl) {
      sendNotFound(res, 'Invoice not found');
      return;
    }

    const filePath = path.join(process.cwd(), payment.invoiceUrl);
    if (!fs.existsSync(filePath)) {
      sendNotFound(res, 'Invoice file not found');
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${payment.invoiceNumber}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('subscriptionId');

    if (!payment) {
      sendNotFound(res, 'Payment not found');
      return;
    }

    sendSuccess(res, payment);
  } catch (err) {
    next(err);
  }
};
