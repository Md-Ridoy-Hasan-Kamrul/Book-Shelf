import type { NextFunction, Request, Response } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import { assertAdmin2fa } from '../services/admin/admin2faService.js';
import type { AuthedRequest } from './requireAuth.js';

/** After requireAuth + requireRole('ADMIN'). Skipped in test. */
export function requireAdmin2fa(env: ApiEnv) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthedRequest).user;
      if (!user) {
        next();
        return;
      }
      await assertAdmin2fa(user.id, user.role, env.NODE_ENV);
      next();
    } catch (err) {
      next(err);
    }
  };
}
