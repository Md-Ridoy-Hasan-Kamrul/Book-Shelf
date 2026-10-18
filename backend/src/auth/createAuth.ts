import type { ApiEnv } from '@bookverse/shared';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../lib/prisma.js';
import type { EmailProvider } from '../providers/email/types.js';

function isLocalAuthUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return true;
  }
}

export function createAuth(env: ApiEnv, email: EmailProvider) {
  const local = isLocalAuthUrl(env.BETTER_AUTH_URL);

  return betterAuth({
    appName: 'BookVerse',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    advanced: {
      useSecureCookies: !local && env.NODE_ENV === 'production',
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: !local && env.NODE_ENV === 'production',
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'USER',
          input: false,
        },
        phone: {
          type: 'string',
          required: false,
          input: false,
        },
        phoneVerified: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
        displayName: { type: 'string', required: false, input: true },
        bio: { type: 'string', required: false, input: true },
        pointsBalance: { type: 'number', required: false, defaultValue: 0, input: false },
        bannedAt: { type: 'date', required: false, input: false },
        deletedAt: { type: 'date', required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: env.NODE_ENV !== 'test',
      sendResetPassword: async ({ user, url }) => {
        void email.send({
          to: user.email,
          subject: 'BookVerse — reset your password',
          text: `Reset your password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: env.NODE_ENV !== 'test',
      sendVerificationEmail: async ({ user, url }) => {
        void email.send({
          to: user.email,
          subject: 'BookVerse — verify your email',
          text: `Verify your email: ${url}`,
        });
      },
      autoSignInAfterVerification: true,
    },
  });
}

export type BookVerseAuth = ReturnType<typeof createAuth>;
