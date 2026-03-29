import { Response, NextFunction } from 'express';
import dayjs from 'dayjs';
import { User } from '../models/User.model';
import { Payment } from '../models/Payment.model';
import { ServiceTask } from '../models/ServiceTask.model';
import { Subscription } from '../models/Subscription.model';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = dayjs();
    const weekStart = now.startOf('week').toDate();
    const monthStart = now.startOf('month').toDate();
    const yearStart = now.startOf('year').toDate();

    const [
      newCustomersWeekly,
      newCustomersMonthly,
      activeCustomers,
      monthlyRevenue,
      yearlyRevenue,
      totalSubscriptions,
      activeSubscriptions,
      pendingTasks,
      completedTasksToday,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer', createdAt: { $gte: weekStart } }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: monthStart } }),
      User.countDocuments({ role: 'customer', isActive: true }),
      Payment.aggregate([
        { $match: { status: 'captured', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'captured', createdAt: { $gte: yearStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active', expiryDate: { $gt: new Date() } }),
      ServiceTask.countDocuments({ status: 'Pending' }),
      ServiceTask.countDocuments({
        status: 'Done',
        completionDate: { $gte: now.startOf('day').toDate() },
      }),
    ]);

    const employeePerformance = await ServiceTask.aggregate([
      {
        $match: {
          status: 'Done',
          completionDate: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: '$employeeId',
          washesPerMonth: { $sum: 1 },
          washesThisWeek: {
            $sum: {
              $cond: [{ $gte: ['$completionDate', weekStart] }, 1, 0],
            },
          },
          washesToday: {
            $sum: {
              $cond: [{ $gte: ['$completionDate', now.startOf('day').toDate()] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeId: '$_id',
          employeeName: '$employee.name',
          washesPerDay: '$washesToday',
          washesPerWeek: '$washesThisWeek',
          washesPerMonth: '$washesPerMonth',
        },
      },
      { $sort: { washesPerMonth: -1 } },
    ]);

    const revenueByMonth = await Payment.aggregate([
      {
        $match: {
          status: 'captured',
          createdAt: { $gte: yearStart },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    sendSuccess(res, {
      customers: {
        newWeekly: newCustomersWeekly,
        newMonthly: newCustomersMonthly,
        totalActive: activeCustomers,
      },
      revenue: {
        monthly: monthlyRevenue[0]?.total || 0,
        yearly: yearlyRevenue[0]?.total || 0,
        byMonth: revenueByMonth,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      tasks: {
        pending: pendingTasks,
        completedToday: completedTasksToday,
      },
      employeePerformance,
    }, 'Dashboard stats retrieved');
  } catch (err) {
    next(err);
  }
};

export const getRevenueReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year = dayjs().year(), month } = req.query;

    const matchStage: Record<string, unknown> = {
      status: 'captured',
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    };

    if (month) {
      const monthNum = parseInt(month as string);
      matchStage.createdAt = {
        $gte: new Date(parseInt(year as string), monthNum - 1, 1),
        $lte: new Date(parseInt(year as string), monthNum, 0),
      };
    }

    const report = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: month ? { $dayOfMonth: '$createdAt' } : { $month: '$createdAt' },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    sendSuccess(res, report, 'Revenue report generated');
  } catch (err) {
    next(err);
  }
};

export const getStaticContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type } = req.params;

    const content: Record<string, unknown> = {
      faq: [
        { q: 'How does mobile car wash work?', a: 'Our trained professionals come to your apartment parking lot and wash your car using eco-friendly products.' },
        { q: 'What are your working hours?', a: 'We operate Monday through Saturday, 7 AM to 7 PM.' },
        { q: 'How do I reschedule a wash?', a: 'Contact our support team at least 24 hours in advance via the app or email.' },
        { q: 'Is water used for washing?', a: 'We use minimal water with our advanced eco-wash system, using up to 90% less water than traditional methods.' },
      ],
      about: {
        name: 'CarWash Service',
        tagline: 'Professional Car Washing at Your Doorstep',
        description: 'We bring professional car washing services directly to your apartment parking lot. Our trained team uses eco-friendly products to keep your vehicle spotless.',
        founded: '2023',
        email: 'support@carwash.com',
        phone: '+91 98765 43210',
      },
      contact: {
        email: 'support@carwash.com',
        phone: '+91 98765 43210',
        whatsapp: '+91 98765 43210',
        address: 'Chennai, Tamil Nadu, India',
        supportHours: 'Mon-Sat: 8 AM - 6 PM',
      },
    };

    if (!content[type]) {
      sendSuccess(res, null, 'Content type not found');
      return;
    }

    sendSuccess(res, content[type], `${type} content retrieved`);
  } catch (err) {
    next(err);
  }
};
