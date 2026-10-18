import nodemailer from 'nodemailer';
import type { ApiEnv } from '@bookverse/shared';
import type { EmailProvider, SendEmailInput } from './types.js';

export function createSmtpEmailProvider(env: ApiEnv): EmailProvider {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  });

  return {
    kind: 'smtp',
    async send(input: SendEmailInput) {
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    },
  };
}
