import { Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { verifyFirebaseToken } from '../config/firebase';
import { generateToken, generateTempToken } from '../utils/jwt';
import { hashPassword, comparePassword, generateTempPassword } from '../utils/password';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/mail.service';
import { sendSuccess, sendError, sendUnauthorized, sendNotFound } from '../utils/response';
import { AuthRequest } from '../types';
import { AppError } from '../middlewares/error.middleware';
const nodemailer = require('nodemailer');

export const firebaseLogin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken, name, phone, apartmentId } = req.body;

    const decoded = await verifyFirebaseToken(idToken);
    const { uid, email, phone_number } = decoded;

    if (!phone_number) {
      sendError(res, 'Phone number is required from Firebase token');
      return;
    }

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { phone: phone_number }] });

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email,
        name: name || decoded.name || email?.split('@')[0],
        phone: phone || phone_number || '',
        role: 'customer',
        apartmentId: apartmentId || undefined,
        isFirstLogin: true,
      });
    } else if (!user.firebaseUid) {
      user.firebaseUid = uid;
      user.lastActiveAt = new Date();
      await user.save();
    }

    if (!user.isActive) {
      sendError(res, 'Account is deactivated. Please contact support.', 403);
      return;
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        apartmentId: user.apartmentId,
        isFirstLogin: user.isFirstLogin,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const createAdmin = async (name: string, email: string, phone: string): Promise<void> => {
  const existingAdmin = await User.findOne({ email, role: 'admin' });
  if (existingAdmin) {
    throw new AppError('Admin with this email already exists', 400);
  }

  const password = generateTempPassword();
  const passwordHash = await hashPassword(password);

  const admin = new User({
    name,
    email,
    phone: `+91${phone}`,
    passwordHash,
    role: 'admin',
    isFirstLogin: true,
    isActive: true,
  });

  await admin.save();

  await sendWelcomeEmail(admin.email, admin.name, password);
};


export const adminLogin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: { $in: ['admin', 'employee', 'superadmin'] } });

    if (!user || !user.passwordHash) {
      sendUnauthorized(res, 'Invalid email or password');
      return;
    }

    if (!user.isActive) {
      sendError(res, 'Account is deactivated. Contact your administrator.', 403);
      return;
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      sendUnauthorized(res, 'Invalid email or password');
      return;
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user || !user.passwordHash) {
      sendNotFound(res, 'User not found');
      return;
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      sendError(res, 'Current password is incorrect');
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    user.isFirstLogin = false;
    await user.save();

    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, role: { $in: ['admin', 'employee', 'superadmin'] } });

    if (!user) {
      sendSuccess(res, null, 'If this email exists, a reset link has been sent');
      return;
    }

    const resetToken = generateTempToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    await sendPasswordResetEmail(user.email, user.name, resetToken);

    sendSuccess(res, null, 'Password reset link has been sent to your email');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    const { verifyToken } = await import('../utils/jwt');
    const payload = verifyToken(token);

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('Invalid reset token', 400);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.isFirstLogin = false;
    await user.save();

    sendSuccess(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId)
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
