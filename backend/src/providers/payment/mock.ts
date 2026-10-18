import type { ApiEnv } from '@bookverse/shared';
import type {
  IpnValidationInput,
  PaymentInitRequest,
  PaymentInitResult,
  PaymentProvider,
  ValidatedPayment,
} from './types.js';

export function createMockPaymentProvider(env: ApiEnv): PaymentProvider {
  return {
    kind: 'mock',
    async initiateSession(req: PaymentInitRequest): Promise<PaymentInitResult> {
      const gatewayUrl = `${env.WEB_ORIGIN.replace(/\/$/, '')}/payments/mock-wait?tran_id=${encodeURIComponent(req.tranId)}`;
      return { gatewayUrl, sessionKey: `mock-${req.tranId}` };
    },
    async validateIpn(body: IpnValidationInput): Promise<ValidatedPayment> {
      const tranId = body.tran_id ?? body.tranId ?? '';
      const valId = body.val_id ?? body.valId ?? `mock-${tranId}`;
      const amount = body.amount ?? body.currency_amount ?? '';
      const currency = body.currency ?? body.currency_type ?? 'BDT';
      const statusRaw = (body.status ?? '').toUpperCase();
      const status =
        statusRaw === 'VALID' || statusRaw === 'VALIDATED'
          ? 'VALID'
          : statusRaw === 'FAILED'
            ? 'FAILED'
            : statusRaw === 'CANCELLED'
              ? 'CANCELLED'
              : 'UNKNOWN';
      return {
        ok: status === 'VALID',
        eventId: valId,
        tranId,
        amount,
        currency,
        status,
        raw: body,
      };
    },
  };
}
