import type { UserRole } from '@bookverse/shared';
import { requireRole } from './requireRole.js';

export const SELLER_ROLES: UserRole[] = ['PUBLISHER', 'VENDOR', 'WRITER'];

export function requireSeller() {
  return requireRole(...SELLER_ROLES);
}
