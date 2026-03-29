import { Response, NextFunction } from 'express';
import { Car } from '../models/Car.model';
import { Subscription } from '../models/Subscription.model';
import { ServiceTask } from '../models/ServiceTask.model';
import { Payment } from '../models/Payment.model';
import { Plan } from '../models/Plan.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendNotFound, buildPaginationMeta } from '../utils/response';
import { Types } from 'mongoose';

export const getCustomerDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const cars = await Car.find({ userId, isActive: true }).lean();
    const carIds = cars.map((c) => c._id);

    const [
      activeSubscriptions,
      totalSubscriptions,
      pendingTasks,
      completedTasksTotal,
      recentPayments,
    ] = await Promise.all([
      Subscription.find({ userId, status: 'active', expiryDate: { $gt: new Date() } })
        .populate('planId', 'name durationDays attributes')
        .populate('carId', 'nickname type licensePlate parkingLotInfo')
        .sort({ expiryDate: 1 })
        .lean(),

      Subscription.countDocuments({ userId }),

      ServiceTask.countDocuments({ carId: { $in: carIds }, status: 'Pending' }),

      ServiceTask.countDocuments({ carId: { $in: carIds }, status: 'Done' }),

      Payment.find({ userId, status: 'captured' })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('amount currency invoiceNumber createdAt status')
        .lean(),
    ]);

    const nextWash = await ServiceTask.findOne({
      carId: { $in: carIds },
      status: { $in: ['Pending', 'InProgress'] },
      scheduledDate: { $gte: new Date() },
    })
      .populate('carId', 'nickname type licensePlate')
      .sort({ scheduledDate: 1 })
      .lean();

    const subscriptionsWithDaysLeft = activeSubscriptions.map((sub) => {
      const msLeft = new Date(sub.expiryDate).getTime() - Date.now();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      const isExpiringSoon = daysLeft <= 7;
      return { ...sub, daysLeft, isExpiringSoon };
    });

    sendSuccess(res, {
      summary: {
        totalCars: cars.length,
        activeSubscriptions: activeSubscriptions.length,
        totalSubscriptions,
        pendingTasks,
        completedWashesTotal: completedTasksTotal,
      },
      activeSubscriptions: subscriptionsWithDaysLeft,
      nextScheduledWash: nextWash,
      recentPayments,
    }, 'Customer dashboard loaded');
  } catch (err) {
    next(err);
  }
};

export const getCustomerCars = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const cars = await Car.find({ userId, isActive: true }).lean();

    const carIds = cars.map((c) => c._id);

    const [activeSubs, taskStats] = await Promise.all([
      Subscription.find({ carId: { $in: carIds }, status: 'active', expiryDate: { $gt: new Date() } })
        .populate('planId', 'name durationDays attributes')
        .select('carId planId status startDate expiryDate')
        .lean(),

      ServiceTask.aggregate([
        { $match: { carId: { $in: carIds.map((id) => new Types.ObjectId(id.toString())) } } },
        {
          $group: {
            _id: '$carId',
            totalWashes: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
            pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            lastWashDate: {
              $max: {
                $cond: [{ $eq: ['$status', 'Done'] }, '$completionDate', null],
              },
            },
          },
        },
      ]),
    ]);

    const subMap = new Map<string, typeof activeSubs[0]>();
    activeSubs.forEach((s) => subMap.set(s.carId.toString(), s));

    const statsMap = new Map<string, (typeof taskStats)[0]>();
    taskStats.forEach((s) => statsMap.set(s._id.toString(), s));

    const enrichedCars = cars.map((car) => {
      const carIdStr = car._id.toString();
      const sub = subMap.get(carIdStr);
      const stats = statsMap.get(carIdStr);

      const daysLeft = sub
        ? Math.max(0, Math.ceil((new Date(sub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        ...car,
        subscription: sub
          ? { ...sub, daysLeft, isExpiringSoon: daysLeft !== null && daysLeft <= 7 }
          : null,
        stats: {
          totalWashes: stats?.totalWashes ?? 0,
          pendingTasks: stats?.pendingTasks ?? 0,
          lastWashDate: stats?.lastWashDate ?? null,
        },
      };
    });

    sendSuccess(res, enrichedCars, 'Cars retrieved with subscription and wash stats');
  } catch (err) {
    next(err);
  }
};

export const getActiveSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const subscriptions = await Subscription.find({
      userId,
      status: 'active',
      expiryDate: { $gt: new Date() },
    })
      .populate('planId', 'name description durationDays attributes priceMatrix')
      .populate('carId', 'nickname type licensePlate parkingLotInfo')
      .sort({ expiryDate: 1 })
      .lean();

    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const carId = (sub.carId as unknown as { _id: Types.ObjectId })._id;

        const [completedWashes, pendingWashes, nextTask] = await Promise.all([
          ServiceTask.countDocuments({ subscriptionId: sub._id, status: 'Done' }),
          ServiceTask.countDocuments({ subscriptionId: sub._id, status: { $in: ['Pending', 'InProgress'] } }),
          ServiceTask.findOne({
            subscriptionId: sub._id,
            status: { $in: ['Pending', 'InProgress'] },
            scheduledDate: { $gte: new Date() },
          })
            .sort({ scheduledDate: 1 })
            .select('scheduledDate status')
            .lean(),
        ]);

        const msLeft = new Date(sub.expiryDate).getTime() - Date.now();
        const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        const totalDays = sub.expiryDate && sub.startDate
          ? Math.ceil((new Date(sub.expiryDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : 30;
        const progressPercent = Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100));

        return {
          ...sub,
          daysLeft,
          isExpiringSoon: daysLeft <= 7,
          progressPercent,
          washStats: { completedWashes, pendingWashes },
          nextScheduledTask: nextTask,
        };
      })
    );

    sendSuccess(res, enriched, 'Active subscriptions retrieved');
  } catch (err) {
    next(err);
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;

    const cars = await Car.find({ userId, isActive: true }).select('_id').lean();
    const carIds = cars.map((c) => new Types.ObjectId(c._id.toString()));

    const taskFilter: Record<string, unknown> = { carId: { $in: carIds } };
    if (type === 'task') {
      return await _getTaskActivity(res, next, taskFilter, page, limit, carIds, userId);
    }
    if (type === 'payment') {
      return await _getPaymentActivity(res, next, userId, page, limit);
    }

    const [tasks, payments, taskTotal, paymentTotal] = await Promise.all([
      ServiceTask.find(taskFilter)
        .populate('carId', 'nickname type licensePlate')
        .populate('employeeId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * Math.ceil(limit / 2))
        .limit(Math.ceil(limit / 2))
        .lean(),

      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * Math.floor(limit / 2))
        .limit(Math.floor(limit / 2))
        .select('amount currency status invoiceNumber invoiceUrl createdAt subscriptionId')
        .populate('subscriptionId', 'planId')
        .lean(),

      ServiceTask.countDocuments(taskFilter),
      Payment.countDocuments({ userId }),
    ]);

    const taskEvents = tasks.map((t) => ({
      type: 'wash',
      id: t._id,
      status: t.status,
      title: _washTitle(t.status as string),
      description: `${(t.carId as unknown as { nickname: string })?.nickname ?? 'Car'} — ${(t.carId as unknown as { type: string })?.type ?? ''}`,
      employee: (t.employeeId as unknown as { name: string })?.name ?? null,
      car: t.carId,
      scheduledDate: t.scheduledDate,
      completionDate: t.completionDate ?? null,
      notes: t.notes ?? null,
      adminReview: t.adminReview ?? null,
      timestamp: t.completionDate ?? t.scheduledDate,
    }));

    const paymentEvents = payments.map((p) => ({
      type: 'payment',
      id: p._id,
      status: p.status,
      title: p.status === 'captured' ? 'Payment Successful' : 'Payment ' + p.status,
      description: `${p.currency} ${p.amount} — ${p.invoiceNumber}`,
      amount: p.amount,
      currency: p.currency,
      invoiceNumber: p.invoiceNumber,
      invoiceUrl: p.invoiceUrl ?? null,
      timestamp: p.createdAt,
    }));

    const combined = [...taskEvents, ...paymentEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sendSuccess(
      res,
      combined,
      'Recent activity retrieved',
      200,
      buildPaginationMeta(taskTotal + paymentTotal, page, limit)
    );
  } catch (err) {
    next(err);
  }
};

export const getCarActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { carId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;

    const car = await Car.findOne({ _id: carId, userId, isActive: true }).lean();
    if (!car) {
      sendNotFound(res, 'Car not found');
      return;
    }

    const filter: Record<string, unknown> = { carId: new Types.ObjectId(carId) };
    const statusFilter = req.query.status as string;
    if (statusFilter) filter.status = statusFilter;

    const [tasks, total] = await Promise.all([
      ServiceTask.find(filter)
        .populate('employeeId', 'name phone')
        .populate('subscriptionId', 'planId startDate expiryDate')
        .sort({ scheduledDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ServiceTask.countDocuments(filter),
    ]);

    const stats = await ServiceTask.aggregate([
      { $match: { carId: new Types.ObjectId(carId) } },
      {
        $group: {
          _id: null,
          totalWashes: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          lastWash: { $max: { $cond: [{ $eq: ['$status', 'Done'] }, '$completionDate', null] } },
        },
      },
    ]);

    sendSuccess(
      res,
      {
        car,
        stats: stats[0] ?? { totalWashes: 0, pending: 0, rejected: 0, lastWash: null },
        activity: tasks,
      },
      'Car activity retrieved',
      200,
      buildPaginationMeta(total, page, limit)
    );
  } catch (err) {
    next(err);
  }
};

async function _getTaskActivity(
  res: Response,
  next: NextFunction,
  filter: Record<string, unknown>,
  page: number,
  limit: number,
  carIds: Types.ObjectId[],
  userId: string
): Promise<void> {
  try {
    const [tasks, total] = await Promise.all([
      ServiceTask.find(filter)
        .populate('carId', 'nickname type licensePlate')
        .populate('employeeId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ServiceTask.countDocuments(filter),
    ]);

    const events = tasks.map((t) => ({
      type: 'wash',
      id: t._id,
      status: t.status,
      title: _washTitle(t.status as string),
      car: t.carId,
      employee: (t.employeeId as unknown as { name: string })?.name ?? null,
      scheduledDate: t.scheduledDate,
      completionDate: t.completionDate ?? null,
      notes: t.notes ?? null,
      adminReview: t.adminReview ?? null,
      timestamp: t.completionDate ?? t.scheduledDate,
    }));

    sendSuccess(res, events, 'Wash activity retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

async function _getPaymentActivity(
  res: Response,
  next: NextFunction,
  userId: string,
  page: number,
  limit: number
): Promise<void> {
  try {
    const [payments, total] = await Promise.all([
      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('amount currency status invoiceNumber invoiceUrl createdAt')
        .lean(),
      Payment.countDocuments({ userId }),
    ]);

    const events = payments.map((p) => ({
      type: 'payment',
      id: p._id,
      status: p.status,
      title: p.status === 'captured' ? 'Payment Successful' : `Payment ${p.status}`,
      amount: p.amount,
      currency: p.currency,
      invoiceNumber: p.invoiceNumber,
      invoiceUrl: p.invoiceUrl ?? null,
      timestamp: p.createdAt,
    }));

    sendSuccess(res, events, 'Payment activity retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

function _washTitle(status: string): string {
  switch (status) {
    case 'Done': return 'Wash Completed';
    case 'InProgress': return 'Wash In Progress';
    case 'Pending': return 'Wash Scheduled';
    case 'Rejected': return 'Wash Rejected';
    default: return 'Wash Update';
  }
}
