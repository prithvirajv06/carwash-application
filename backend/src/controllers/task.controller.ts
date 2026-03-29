import { Response, NextFunction } from 'express';
import { ServiceTask } from '../models/ServiceTask.model';
import { Car } from '../models/Car.model';
import { User } from '../models/User.model';
import { Subscription } from '../models/Subscription.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound, buildPaginationMeta } from '../utils/response';

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { carId, employeeId, subscriptionId, scheduledDate, notes } = req.body;

    const [car, employee, subscription] = await Promise.all([
      Car.findById(carId),
      User.findOne({ _id: employeeId, role: 'employee', isActive: true }),
      Subscription.findOne({ _id: subscriptionId, status: 'active' }),
    ]);

    if (!car) { sendNotFound(res, 'Car not found'); return; }
    if (!employee) { sendNotFound(res, 'Employee not found or inactive'); return; }
    if (!subscription) { sendError(res, 'No active subscription found for this car'); return; }

    const task = await ServiceTask.create({
      carId,
      employeeId,
      subscriptionId,
      scheduledDate: new Date(scheduledDate),
      notes,
      status: 'Pending',
    });

    await task.populate([
      { path: 'carId', select: 'nickname type licensePlate parkingLotInfo' },
      { path: 'employeeId', select: 'name phone' },
    ]);

    sendCreated(res, task, 'Task assigned');
  } catch (err) {
    next(err);
  }
};

export const listTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, employeeId, date } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    if (date) {
      const start = new Date(date as string);
      const end = new Date(date as string);
      end.setDate(end.getDate() + 1);
      filter.scheduledDate = { $gte: start, $lt: end };
    }

    const [tasks, total] = await Promise.all([
      ServiceTask.find(filter)
        .populate('carId', 'nickname type licensePlate parkingLotInfo')
        .populate('employeeId', 'name phone')
        .populate('subscriptionId', 'planId expiryDate')
        .sort({ scheduledDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ServiceTask.countDocuments(filter),
    ]);

    sendSuccess(res, tasks, 'Tasks retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};

export const getMyTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employeeId = req.user!.userId;
    const { status, date } = req.query;

    const filter: Record<string, unknown> = { employeeId };
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date as string);
      const end = new Date(date as string);
      end.setDate(end.getDate() + 1);
      filter.scheduledDate = { $gte: start, $lt: end };
    }

    const tasks = await ServiceTask.find(filter)
      .populate('carId', 'nickname type licensePlate parkingLotInfo')
      .sort({ scheduledDate: 1 });

    sendSuccess(res, tasks, 'Your tasks retrieved');
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, adminReview, notes } = req.body;
    const taskId = req.params.id;
    const role = req.user!.role;

    const task = await ServiceTask.findById(taskId);
    if (!task) {
      sendNotFound(res, 'Task not found');
      return;
    }

    if (role === 'employee' && task.employeeId.toString() !== req.user!.userId) {
      sendError(res, 'You can only update your own tasks', 403);
      return;
    }

    if (status) task.status = status;
    if (notes) task.notes = notes;
    if (adminReview && ['admin', 'superadmin'].includes(role)) task.adminReview = adminReview;
    if (status === 'Done') task.completionDate = new Date();

    await task.save();
    await task.populate([
      { path: 'carId', select: 'nickname type licensePlate' },
      { path: 'employeeId', select: 'name' },
    ]);

    sendSuccess(res, task, 'Task updated');
  } catch (err) {
    next(err);
  }
};

export const assignTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId } = req.body;
    const task = await ServiceTask.findById(req.params.id);

    if (!task) {
      sendNotFound(res, 'Task not found');
      return;
    }

    const employee = await User.findOne({ _id: employeeId, role: 'employee', isActive: true });
    if (!employee) {
      sendNotFound(res, 'Employee not found or inactive');
      return;
    }

    task.employeeId = employee._id;
    await task.save();

    sendSuccess(res, task, `Task reassigned to ${employee.name}`);
  } catch (err) {
    next(err);
  }
};
