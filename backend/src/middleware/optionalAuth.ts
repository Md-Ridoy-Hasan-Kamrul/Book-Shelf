import type { NextFunction, Request, Response } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { getSessionFromRequest } from '../auth/session.js';
import { type AuthedRequest, toMeUser } from './requireAuth.js';

export function optionalAuth(auth: BookVerseAuth) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const session = await getSessionFromRequest(auth, req);
    if (session?.user) {
      (req as AuthedRequest).user = toMeUser(session.user as Record<string, unknown>);
    }
    next();
  };
}
