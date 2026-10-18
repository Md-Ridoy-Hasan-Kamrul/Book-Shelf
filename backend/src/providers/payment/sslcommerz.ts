import type { ApiEnv } from '@bookverse/shared';
import type {
  IpnValidationInput,
  PaymentInitRequest,
  PaymentInitResult,
  PaymentProvider,
  ValidatedPayment,
} from './types.js';

const SANDBOX_VALIDATE = 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';
const LIVE_VALIDATE = 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';
const SANDBOX_SESSION = 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
const LIVE_SESSION = 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

function baseUrls(env: ApiEnv) {
  const sandbox = !env.SSLCOMMERZ_STORE_ID || env.NODE_ENV !== 'production';
  return {
    validate: sandbox ? SANDBOX_VALIDATE : LIVE_VALIDATE,
    session: sandbox ? SANDBOX_SESSION : LIVE_SESSION,
  };
}

type ValidationJson = {
  status?: string;
  tran_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
};

export function createSslCommerzPaymentProvider(env: ApiEnv): PaymentProvider {
  const { validate, session } = baseUrls(env);

  return {
    kind: 'sslcommerz',
    async initiateSession(req: PaymentInitRequest): Promise<PaymentInitResult> {
      if (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD) {
        throw new Error('SSLCommerz credentials missing');
      }
      const params = new URLSearchParams({
        store_id: env.SSLCOMMERZ_STORE_ID,
        store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
        total_amount: req.amount,
        currency: req.currency,
        tran_id: req.tranId,
        success_url: req.successUrl,
        fail_url: req.failUrl,
        cancel_url: req.cancelUrl,
        ipn_url: req.ipnUrl,
        cus_name: req.customerName,
        cus_email: req.customerEmail,
        cus_phone: req.customerPhone,
        product_name: 'BookVerse order',
        product_category: 'book',
        shipping_method: 'NO',
        product_profile: 'general',
      });
      const res = await fetch(session, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const json = (await res.json()) as {
        status?: string;
        GatewayPageURL?: string;
        sessionkey?: string;
      };
      if (json.status !== 'SUCCESS' || !json.GatewayPageURL) {
        throw new Error('SSLCommerz session initiation failed');
      }
      return { gatewayUrl: json.GatewayPageURL, sessionKey: json.sessionkey };
    },
    async validateIpn(body: IpnValidationInput): Promise<ValidatedPayment> {
      const valId = body.val_id;
      if (!valId) {
        return {
          ok: false,
          eventId: body.tran_id ?? 'missing-val',
          tranId: body.tran_id ?? '',
          amount: body.amount ?? '',
          currency: body.currency ?? 'BDT',
          status: 'UNKNOWN',
          reason: 'Missing val_id — validate via Order Validation API per SSLCommerz docs',
        };
      }
      if (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD) {
        return {
          ok: false,
          eventId: valId,
          tranId: body.tran_id ?? '',
          amount: body.amount ?? '',
          currency: body.currency ?? 'BDT',
          status: 'UNKNOWN',
          reason: 'SSLCommerz credentials missing',
        };
      }
      const url = `${validate}?${new URLSearchParams({
        val_id: valId,
        store_id: env.SSLCOMMERZ_STORE_ID,
        store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
        format: 'json',
      })}`;
      const res = await fetch(url);
      const json = (await res.json()) as ValidationJson;
      const statusRaw = (json.status ?? '').toUpperCase();
      const status =
        statusRaw === 'VALID' || statusRaw === 'VALIDATED'
          ? 'VALID'
          : statusRaw === 'FAILED'
            ? 'FAILED'
            : statusRaw === 'CANCELLED'
              ? 'CANCELLED'
              : statusRaw === 'PENDING'
                ? 'PENDING'
                : 'UNKNOWN';
      return {
        ok: status === 'VALID',
        eventId: valId,
        tranId: json.tran_id ?? body.tran_id ?? '',
        amount: json.amount ?? body.amount ?? '',
        currency: json.currency ?? json.currency_type ?? body.currency ?? 'BDT',
        status,
        raw: json,
      };
    },
  };
}
