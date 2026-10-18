export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailProvider {
  readonly kind: 'smtp';
  send(input: SendEmailInput): Promise<void>;
}
