import { describe, expect, test } from 'vitest';
import { canCancelBeforeShip } from './orderStateMachine.js';

describe('orderStateMachine helpers', () => {
  test('cancel allowed before shipped', () => {
    expect(canCancelBeforeShip('PENDING_PAYMENT')).toBe(true);
    expect(canCancelBeforeShip('PROCESSING')).toBe(true);
    expect(canCancelBeforeShip('SHIPPED')).toBe(false);
  });
});
