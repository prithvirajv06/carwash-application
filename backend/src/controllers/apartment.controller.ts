import { Response, NextFunction } from 'express';
import { Apartment } from '../models/Apartment.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound, buildPaginationMeta } from '../utils/response';
import { z } from 'zod';

const createApartmentSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
});

export const createApartment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createApartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422);
      return;
    }

    const exists = await Apartment.findOne({ name: parsed.data.name, city: parsed.data.city });
    if (exists) {
      sendError(res, 'Apartment already exists in this city');
      return;
    }

    const apartment = await Apartment.create(parsed.data);
    sendCreated(res, apartment, 'Apartment created');
  } catch (err) {
    next(err);
  }
};

export const listApartments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const activeOnly = req.query.active !== 'false';

    const filter: Record<string, unknown> = {};
    if (activeOnly) filter.isActive = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const [apartments, total] = await Promise.all([
      Apartment.find(filter).sort({ city: 1, name: 1 }).skip((page - 1) * limit).limit(limit),
      Apartment.countDocuments(filter),
    ]);

    sendSuccess(res, apartments, 'Apartments retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};

export const getApartmentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apartment = await Apartment.findById(req.params.id);
    if (!apartment) {
      sendNotFound(res, 'Apartment not found');
      return;
    }
    sendSuccess(res, apartment);
  } catch (err) {
    next(err);
  }
};

export const updateApartment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apartment = await Apartment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!apartment) {
      sendNotFound(res, 'Apartment not found');
      return;
    }
    sendSuccess(res, apartment, 'Apartment updated');
  } catch (err) {
    next(err);
  }
};

export const deleteApartment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apartment = await Apartment.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!apartment) {
      sendNotFound(res, 'Apartment not found');
      return;
    }
    sendSuccess(res, null, 'Apartment deactivated');
  } catch (err) {
    next(err);
  }
};
