import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/appError.js';
import type { AuthedRequest } from './requireAuth.js';

export function requireOwnership(resolveOwnerId: (req: Request) => string | Promise<string>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
      return;
    }
    const ownerId = await resolveOwnerId(req);
    if (ownerId !== user.id && user.role !== 'ADMIN') {
      next(new AppError('FORBIDDEN', 'You do not own this resource', 403));
      return;
    }
    next();
  };
}
