import type { MeUser, UserRole } from '@bookverse/shared';
import { userRoleSchema } from '@bookverse/shared';
import type { NextFunction, Request, Response } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { getSessionFromRequest } from '../auth/session.js';
import { AppError } from '../lib/appError.js';

export type AuthedRequest = Request & {
  user: MeUser;
};

export function toMeUser(raw: Record<string, unknown>): MeUser {
  const roleParsed = userRoleSchema.safeParse(raw.role ?? 'USER');
  return {
    id: String(raw.id),
    name: String(raw.name),
    email: String(raw.email),
    emailVerified: Boolean(raw.emailVerified),
    image: raw.image != null ? String(raw.image) : null,
    role: (roleParsed.success ? roleParsed.data : 'USER') as UserRole,
    phone: raw.phone != null ? String(raw.phone) : null,
    phoneVerified: Boolean(raw.phoneVerified),
    displayName: raw.displayName != null ? String(raw.displayName) : null,
  };
}

export function requireAuth(auth: BookVerseAuth) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const session = await getSessionFromRequest(auth, req);
    if (!session?.user) {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
      return;
    }
    (req as AuthedRequest).user = toMeUser(session.user as Record<string, unknown>);
    next();
  };
}
