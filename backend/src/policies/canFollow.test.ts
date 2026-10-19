import type { UserRole } from '@bookverse/shared';
import { describe, expect, it } from 'vitest';
import { ALL_USER_ROLES, canFollow, type FollowUser } from './canFollow.js';

const active = (id: string, role: UserRole): FollowUser => ({
  id,
  role,
  bannedAt: null,
  deletedAt: null,
});

const EXPECTED: Record<UserRole, Record<UserRole, boolean>> = {
  USER: {
    USER: true,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: true,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  WRITER: {
    USER: true,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: true,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  PUBLISHER: {
    USER: false,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: true,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  VENDOR: {
    USER: true,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: true,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  ADMIN: {
    USER: true,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: true,
    ADMIN: true,
    MODERATOR: true,
    RIDER: false,
  },
  MODERATOR: {
    USER: true,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: true,
    ADMIN: false,
    MODERATOR: true,
    RIDER: false,
  },
  RIDER: {
    USER: false,
    WRITER: false,
    PUBLISHER: false,
    VENDOR: false,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
};

describe('canFollow — Appendix B matrix', () => {
  for (const actorRole of ALL_USER_ROLES) {
    for (const targetRole of ALL_USER_ROLES) {
      it(`${actorRole} → ${targetRole}`, () => {
        const actor = active(`a-${actorRole}`, actorRole);
        const target = active(`t-${targetRole}`, targetRole);
        const result = canFollow(actor, target, { blocked: false });
        expect(result.allowed).toBe(EXPECTED[actorRole][targetRole]);
        if (!EXPECTED[actorRole][targetRole]) {
          expect(result.reason).toBe('ROLE_POLICY');
        }
      });
    }
  }

  it('denies self', () => {
    const u = active('same', 'USER');
    expect(canFollow(u, u, { blocked: false }).reason).toBe('SELF');
  });

  it('denies when blocked', () => {
    const a = active('a', 'USER');
    const b = active('b', 'WRITER');
    expect(canFollow(a, b, { blocked: true }).reason).toBe('BLOCKED');
  });

  it('PUBLISHER → USER is forbidden (acceptance curl case)', () => {
    const pub = active('pub', 'PUBLISHER');
    const user = active('user', 'USER');
    const result = canFollow(pub, user, { blocked: false });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ROLE_POLICY');
  });
});
