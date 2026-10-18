import type { CourierProvider } from './types.js';

function notImplemented(kind: 'pathao' | 'redx'): CourierProvider {
  const err = () => {
    throw new Error(`${kind} courier adapter not implemented — VERIFY-BEFORE-LAUNCH`);
  };
  return {
    kind,
    createShipment: err,
    trackShipment: err,
    cancelShipment: err,
    parseWebhook: () => ({
      ok: false,
      eventId: 'stub',
      consignmentId: '',
      rawStatus: '',
      raw: {},
      reason: `${kind} stub`,
    }),
  };
}

export const pathaoCourierStub = notImplemented('pathao');
export const redxCourierStub = notImplemented('redx');
