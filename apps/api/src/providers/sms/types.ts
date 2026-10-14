export interface SmsProvider {
  readonly kind: 'console' | string;
  sendOtp(phone: string, code: string): Promise<void>;
}
