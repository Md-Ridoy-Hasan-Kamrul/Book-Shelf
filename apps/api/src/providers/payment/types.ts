export type PaymentInitRequest = {
  tranId: string;
  amount: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
};

export type PaymentInitResult = {
  gatewayUrl: string;
  sessionKey?: string;
};

export type IpnValidationInput = Record<string, string>;

export type ValidatedPayment = {
  ok: boolean;
  eventId: string;
  tranId: string;
  amount: string;
  currency: string;
  status: 'VALID' | 'FAILED' | 'CANCELLED' | 'PENDING' | 'UNKNOWN';
  raw?: unknown;
  reason?: string;
};

export interface PaymentProvider {
  readonly kind: 'mock' | 'sslcommerz';
  initiateSession(req: PaymentInitRequest): Promise<PaymentInitResult>;
  validateIpn(body: IpnValidationInput): Promise<ValidatedPayment>;
}
