import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import type { BookVerseAuth } from './createAuth.js';

export async function getSessionFromRequest(auth: BookVerseAuth, req: Request) {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
}
