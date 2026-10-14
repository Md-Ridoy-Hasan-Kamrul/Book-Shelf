import type { UserRole } from '@bookverse/shared';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/appError.js';
import type { AuthedRequest } from './requireAuth.js';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new AppError('FORBIDDEN', 'Insufficient role', 403));
      return;
    }
    next();
  };
}
