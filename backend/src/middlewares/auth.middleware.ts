import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { AuthRequest, UserRole } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Authorization token required');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired token');
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

export const requirePasswordChange = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && (req as any).isFirstLogin) {
    sendForbidden(res, 'Password change required before proceeding');
    return;
  }
  next();
};
