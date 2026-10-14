import { errorEnvelope } from '@bookverse/shared';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { ZodError } from 'zod';
import type { ApiEnv } from '@bookverse/shared';
import { toNodeHandler } from 'better-auth/node';
import { createAuth } from './auth/createAuth.js';
import { AppError } from './lib/appError.js';
import type { Logger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { createEmailProvider } from './providers/email/index.js';
import { createProviderRegistry } from './providers/index.js';
import { createSmsProvider } from './providers/sms/index.js';
import { createAuthRateLimitMiddleware, createFollowRouter } from './routes/follow.js';
import { createHealthRouter } from './routes/health.js';
import { createMeRouter } from './routes/me.js';
import { createPhoneOtpRouter } from './routes/phoneOtp.js';
import { createBooksRouter } from './routes/books.js';
import { createPostsRouter } from './routes/posts.js';
import { createRoleApplicationRouter } from './routes/roleApplications.js';
import { createSearchRouter } from './routes/search.js';
import { createSellerRouter } from './routes/seller.js';
import { createUploadsRouter } from './routes/uploads.js';
import { createUsersRouter } from './routes/users.js';
import { createWishlistRouter } from './routes/wishlist.js';
import { createCheckoutRouter } from './routes/checkout.js';
import { createOrdersRouter } from './routes/orders.js';
import { createAddressesRouter } from './routes/addresses.js';
import { createPaymentsRouter } from './routes/payments.js';
import { createPaymentWebhooksRouter } from './routes/webhooksPayment.js';
import { createCourierWebhooksRouter } from './routes/webhooksCourier.js';
import { createAdminMoneyRouter } from './routes/adminMoney.js';
import { createSellerDashboardRouter } from './routes/sellerDashboard.js';
import { createAdminDashboardRouter } from './routes/adminDashboard.js';
import { createPaymentProvider } from './providers/payment/index.js';
import { createStorageProvider } from './providers/storage/index.js';
import { createSearchService } from './services/search/pgSearchService.js';

export function createApp(env: ApiEnv, logger: Logger) {
  const app = express();
  const providers = createProviderRegistry(env);
  const email = createEmailProvider(env);
  const sms = createSmsProvider(env, logger);
  const storage = createStorageProvider(env);
  const search = createSearchService(env);
  const auth = createAuth(env, email);

  app.disable('x-powered-by');
  app.set('providers', providers);
  app.set('auth', auth);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => String(res.locals.requestId ?? 'unknown'),
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));

  app.use('/api/auth', createAuthRateLimitMiddleware(env));
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(
    '/webhooks/payment',
    express.urlencoded({ extended: false, limit: '256kb' }),
    createPaymentWebhooksRouter(env, logger),
  );

  app.use(
    '/webhooks/courier',
    express.json({ limit: '256kb' }),
    createCourierWebhooksRouter(env, logger),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use('/health', createHealthRouter(env));
  app.use('/me', createMeRouter(auth));
  app.use('/users', createFollowRouter(auth, env));
  app.use('/users', createUsersRouter(auth));
  app.use('/role-applications', createRoleApplicationRouter(auth));
  app.use('/phone', createPhoneOtpRouter(auth, env, sms));
  app.use('/posts', createPostsRouter(auth, env));
  app.use('/books', createBooksRouter(env, storage));
  app.use('/search', createSearchRouter(env, search));
  app.use('/seller', createSellerRouter(auth, env, storage));
  app.use('/seller/dashboard', createSellerDashboardRouter(auth, env));
  app.use('/admin/dashboard', createAdminDashboardRouter(auth));
  app.use('/wishlist', createWishlistRouter(auth));
  app.use('/checkout', createCheckoutRouter(auth, env));
  app.use('/orders', createOrdersRouter(auth, env));
  app.use('/addresses', createAddressesRouter(auth));
  app.use('/payments', createPaymentsRouter(auth, env));
  app.use('/admin/money', createAdminMoneyRouter(auth, env));
  app.set('payment', createPaymentProvider(env));
  app.use('/uploads', createUploadsRouter(storage));

  app.use((_req, res) => {
    res.status(404).json(errorEnvelope('NOT_FOUND', 'Not found'));
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json(errorEnvelope(err.code, err.message, err.errors));
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'Invalid request', err.issues));
      return;
    }
    logger.error({ err }, 'Unhandled error');
    res.status(500).json(errorEnvelope('INTERNAL_ERROR', 'Internal server error'));
  };
  app.use(onError);

  return app;
}
