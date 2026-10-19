import type { UserRole } from '@bookverse/shared';

export type FollowUser = {
  id: string;
  role: UserRole;
  bannedAt?: Date | null;
  deletedAt?: Date | null;
};

export type FollowContext = {
  /** True when target already follows actor (required for WRITER → USER). */
  actorIsFollowedByTarget: boolean;
  /** Either-direction block. */
  blocked: boolean;
};

export type CanFollowResult =
  { allow: true } | { allow: false; code: 'NOT_ALLOWED' | 'FOLLOW_BACK_ONLY' };

function allow(): { allow: true } {
  return { allow: true };
}

function deny(code: 'NOT_ALLOWED' | 'FOLLOW_BACK_ONLY'): {
  allow: false;
  code: 'NOT_ALLOWED' | 'FOLLOW_BACK_ONLY';
} {
  return { allow: false, code };
}

function roleIn(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}

/**
 * Appendix B follow policy — enforced server-side.
 * UI hiding is never security.
 */
export function canFollow(
  actor: FollowUser,
  target: FollowUser,
  ctx: FollowContext,
): CanFollowResult {
  if (actor.id === target.id || ctx.blocked) {
    return deny('NOT_ALLOWED');
  }
  if (actor.bannedAt || actor.deletedAt || target.bannedAt || target.deletedAt) {
    return deny('NOT_ALLOWED');
  }
  if (target.role === 'ADMIN' || target.role === 'RIDER') {
    return deny('NOT_ALLOWED');
  }

  switch (actor.role) {
    case 'USER':
      return roleIn(target.role, ['USER', 'WRITER', 'PUBLISHER', 'VENDOR'])
        ? allow()
        : deny('NOT_ALLOWED');
    case 'WRITER':
      if (target.role === 'USER') {
        return ctx.actorIsFollowedByTarget ? allow() : deny('FOLLOW_BACK_ONLY');
      }
      return roleIn(target.role, ['WRITER', 'PUBLISHER']) ? allow() : deny('NOT_ALLOWED');
    case 'PUBLISHER':
      return roleIn(target.role, ['WRITER', 'PUBLISHER']) ? allow() : deny('NOT_ALLOWED');
    // VENDOR, ADMIN, MODERATOR, RIDER → nobody
    default:
      return deny('NOT_ALLOWED');
  }
}

/** All roles for exhaustive matrix tests. */
export const ALL_USER_ROLES: UserRole[] = [
  'USER',
  'WRITER',
  'PUBLISHER',
  'VENDOR',
  'ADMIN',
  'MODERATOR',
  'RIDER',
];
