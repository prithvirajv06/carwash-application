import { Response, NextFunction } from 'express';
import { Car } from '../models/Car.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound, buildPaginationMeta } from '../utils/response';

export const addCar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { nickname, type, licensePlate, parkingLotInfo } = req.body;

    const plateExists = await Car.findOne({ licensePlate: licensePlate.toUpperCase() });
    if (plateExists) {
      sendError(res, 'A car with this license plate already exists');
      return;
    }

    const car = await Car.create({ userId, nickname, type, licensePlate, parkingLotInfo });
    sendCreated(res, car, 'Car added successfully');
  } catch (err) {
    next(err);
  }
};

export const getMyCars = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cars = await Car.find({ userId: req.user!.userId, isActive: true }).sort({ createdAt: -1 });
    sendSuccess(res, cars);
  } catch (err) {
    next(err);
  }
};

export const getCarById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const car = await Car.findById(req.params.id).populate('userId', 'name email phone');
    if (!car) {
      sendNotFound(res, 'Car not found');
      return;
    }

    const isOwner = car.userId.toString() === req.user!.userId;
    const isAdmin = ['admin', 'superadmin', 'employee'].includes(req.user!.role);

    if (!isOwner && !isAdmin) {
      sendError(res, 'Access denied', 403);
      return;
    }

    sendSuccess(res, car);
  } catch (err) {
    next(err);
  }
};

export const updateCar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const car = await Car.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!car) {
      sendNotFound(res, 'Car not found');
      return;
    }

    const { nickname, type, parkingLotInfo } = req.body;
    if (nickname) car.nickname = nickname;
    if (type) car.type = type;
    if (parkingLotInfo) car.parkingLotInfo = parkingLotInfo;

    await car.save();
    sendSuccess(res, car, 'Car updated');
  } catch (err) {
    next(err);
  }
};

export const deleteCar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const car = await Car.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { isActive: false },
      { new: true }
    );
    if (!car) {
      sendNotFound(res, 'Car not found');
      return;
    }
    sendSuccess(res, null, 'Car removed');
  } catch (err) {
    next(err);
  }
};

export const listAllCars = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const filter: Record<string, unknown> = { isActive: true };
    if (search) {
      filter.$or = [
        { nickname: { $regex: search, $options: 'i' } },
        { licensePlate: { $regex: search, $options: 'i' } },
      ];
    }

    const [cars, total] = await Promise.all([
      Car.find(filter)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Car.countDocuments(filter),
    ]);

    sendSuccess(res, cars, 'Cars retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};
