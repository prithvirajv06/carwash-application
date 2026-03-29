import { Response, NextFunction } from 'express';
import { Plan } from '../models/Plan.model';
import { Car } from '../models/Car.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response';

export const createPlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, priceMatrix, attributes, durationDays } = req.body;

    const exists = await Plan.findOne({ name });
    if (exists) {
      sendError(res, 'Plan with this name already exists');
      return;
    }

    const plan = await Plan.create({ name, description, priceMatrix, attributes, durationDays });
    sendCreated(res, plan, 'Plan created');
  } catch (err) {
    next(err);
  }
};

export const listPlans = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.active !== 'false';
    const filter: Record<string, unknown> = activeOnly ? { isActive: true } : {};

    const plans = await Plan.find(filter)
      .populate('priceMatrix.apartmentId', 'name city')
      .sort({ name: 1 });

    sendSuccess(res, plans);
  } catch (err) {
    next(err);
  }
};

export const getPlanById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate('priceMatrix.apartmentId', 'name city address');

    if (!plan) {
      sendNotFound(res, 'Plan not found');
      return;
    }
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
};

export const updatePlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('priceMatrix.apartmentId', 'name city');

    if (!plan) {
      sendNotFound(res, 'Plan not found');
      return;
    }
    sendSuccess(res, plan, 'Plan updated');
  } catch (err) {
    next(err);
  }
};

export const deletePlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!plan) {
      sendNotFound(res, 'Plan not found');
      return;
    }
    sendSuccess(res, null, 'Plan deactivated');
  } catch (err) {
    next(err);
  }
};

export const getPlanPriceForCar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { planId, carId } = req.params;

    const [plan, car] = await Promise.all([
      Plan.findById(planId),
      Car.findById(carId).populate('userId', 'apartmentId'),
    ]);

    if (!plan) {
      sendNotFound(res, 'Plan not found');
      return;
    }
    if (!car) {
      sendNotFound(res, 'Car not found');
      return;
    }

    const user = car.userId as unknown as { apartmentId: string };
    const entry = plan.priceMatrix.find(
      (p) => p.carType === car.type && p.apartmentId.toString() === user?.apartmentId?.toString()
    );

    if (!entry) {
      sendError(res, 'No pricing available for this car type and apartment combination');
      return;
    }

    sendSuccess(res, {
      planId: plan._id,
      planName: plan.name,
      carType: car.type,
      price: entry.price,
      durationDays: plan.durationDays,
      attributes: plan.attributes,
    }, 'Price fetched');
  } catch (err) {
    next(err);
  }
};
