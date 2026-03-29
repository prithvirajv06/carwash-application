import { Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound, buildPaginationMeta } from '../utils/response';
import { hashPassword, generateTempPassword } from '../utils/password';
import { sendWelcomeEmail } from '../services/mail.service';

export const createAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      sendError(res, 'User with this email already exists');
      return;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await User.create({
      name,
      email,
      phone,
      role,
      passwordHash,
      isFirstLogin: true,
    });

    await sendWelcomeEmail(email, name, tempPassword);

    sendCreated(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }, 'Staff account created. Credentials sent via email.');
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .populate('apartmentId', 'name city')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, users, 'Users retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('apartmentId', 'name address city');

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, phone, apartmentId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, phone, apartmentId },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    sendSuccess(res, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

export const listEmployees = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employees = await User.find({ role: 'employee', isActive: true })
      .select('-passwordHash')
      .sort({ name: 1 });

    sendSuccess(res, employees, 'Employees retrieved');
  } catch (err) {
    next(err);
  }
};
