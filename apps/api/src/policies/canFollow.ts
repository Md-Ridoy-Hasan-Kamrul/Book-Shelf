import type { UserRole } from '@bookverse/shared';

export type FollowUser = {
  id: string;
  role: UserRole;
  bannedAt?: Date | null;
  deletedAt?: Date | null;
};

export type FollowContext = {
  blocked: boolean;
};

export type CanFollowReason =
  'OK' | 'SELF' | 'BLOCKED' | 'ACTOR_INACTIVE' | 'TARGET_INACTIVE' | 'ROLE_POLICY';

const MATRIX: Record<UserRole, ReadonlySet<UserRole>> = {
  USER: new Set(['USER', 'WRITER', 'PUBLISHER', 'VENDOR']),
  WRITER: new Set(['USER', 'WRITER', 'PUBLISHER', 'VENDOR']),
  PUBLISHER: new Set(['WRITER', 'PUBLISHER', 'VENDOR']),
  VENDOR: new Set(['USER', 'WRITER', 'PUBLISHER', 'VENDOR']),
  ADMIN: new Set(['USER', 'WRITER', 'PUBLISHER', 'VENDOR', 'ADMIN', 'MODERATOR']),
  MODERATOR: new Set(['USER', 'WRITER', 'PUBLISHER', 'VENDOR', 'MODERATOR']),
};

export function canFollow(
  actor: FollowUser,
  target: FollowUser,
  ctx: FollowContext,
): { allowed: boolean; reason: CanFollowReason } {
  if (actor.id === target.id) {
    return { allowed: false, reason: 'SELF' };
  }
  if (ctx.blocked) {
    return { allowed: false, reason: 'BLOCKED' };
  }
  if (actor.bannedAt || actor.deletedAt) {
    return { allowed: false, reason: 'ACTOR_INACTIVE' };
  }
  if (target.bannedAt || target.deletedAt) {
    return { allowed: false, reason: 'TARGET_INACTIVE' };
  }
  if (!MATRIX[actor.role].has(target.role)) {
    return { allowed: false, reason: 'ROLE_POLICY' };
  }
  return { allowed: true, reason: 'OK' };
}

/** All actor × target role pairs for exhaustive tests (Appendix B). */
export const ALL_USER_ROLES = Object.keys(MATRIX) as UserRole[];
