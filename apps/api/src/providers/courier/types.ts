export type CreateShipmentInput = {
  orderId: string;
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: string;
  note?: string;
};

export type CreateShipmentResult = {
  consignmentId: string;
  trackingCode: string;
  rawStatus: string;
};

export type TrackShipmentResult = {
  consignmentId: string;
  rawStatus: string;
  trackingMessage?: string;
};

export type ParsedCourierWebhook = {
  ok: boolean;
  eventId: string;
  consignmentId: string;
  rawStatus: string;
  codAmount?: string;
  trackingMessage?: string;
  raw: Record<string, unknown>;
  reason?: string;
};

export interface CourierProvider {
  readonly kind: 'mock' | 'steadfast' | 'pathao' | 'redx';
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(consignmentId: string): Promise<TrackShipmentResult>;
  cancelShipment(consignmentId: string): Promise<void>;
  parseWebhook(
    headers: Record<string, string | undefined>,
    body: Record<string, unknown>,
  ): ParsedCourierWebhook;
}
