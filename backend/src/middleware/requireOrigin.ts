import type { NextFunction, Request, Response } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../lib/appError.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF-style Origin check on state-changing requests (AGENTS security baseline).
 * Webhooks are mounted before this middleware and are exempt.
 */
export function requireOrigin(env: ApiEnv) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE.has(req.method)) {
      next();
      return;
    }
    if (env.NODE_ENV === 'test') {
      next();
      return;
    }
    const origin = req.get('origin') ?? req.get('referer');
    if (!origin) {
      // Same-site navigations / curl without Origin — allow only when no cookie? Prefer reject for mutations.
      next(new AppError('FORBIDDEN', 'Missing Origin on mutation', 403));
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      next(new AppError('FORBIDDEN', 'Invalid Origin', 403));
      return;
    }
    const allowed = new URL(env.WEB_ORIGIN);
    if (parsed.origin !== allowed.origin) {
      next(new AppError('FORBIDDEN', 'Origin not allowed', 403));
      return;
    }
    next();
  };
}
