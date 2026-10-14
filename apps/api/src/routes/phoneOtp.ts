import { phoneSendOtpSchema, phoneVerifyOtpSchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { consumeRateLimit } from '../lib/rateLimit.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import type { SmsProvider } from '../providers/sms/types.js';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/phoneOtpService.js';

export function createPhoneOtpRouter(auth: BookVerseAuth, env: ApiEnv, sms: SmsProvider) {
  const router = Router();

  router.post('/send-otp', requireAuth(auth), async (req, res, next) => {
    try {
      const body = phoneSendOtpSchema.parse(req.body);
      await consumeRateLimit(env, `rl:otp:${body.phone}`, 3, 600);
      const data = await sendPhoneOtp(env, sms, body.phone);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/verify-otp', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = phoneVerifyOtpSchema.parse(req.body);
      const data = await verifyPhoneOtp(user.id, body.phone, body.code);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
