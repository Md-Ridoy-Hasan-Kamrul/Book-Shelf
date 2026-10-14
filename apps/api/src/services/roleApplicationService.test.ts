import { describe, expect, it } from 'vitest';
import { AppError } from '../lib/appError.js';
import { assertNoRoleSelfAssign } from './roleApplicationService.js';

describe('assertNoRoleSelfAssign', () => {
  it('throws FORBIDDEN when body contains role', () => {
    expect(() => assertNoRoleSelfAssign({ role: 'ADMIN' })).toThrow(AppError);
    try {
      assertNoRoleSelfAssign({ role: 'ADMIN' });
    } catch (e) {
      expect((e as AppError).statusCode).toBe(403);
    }
  });
});
