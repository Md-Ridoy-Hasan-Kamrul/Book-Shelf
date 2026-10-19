import type { UserRole } from '@bookverse/shared';
import { describe, expect, it } from 'vitest';
import { ALL_USER_ROLES, canFollow, type FollowUser } from './canFollow.js';

const active = (id: string, role: UserRole): FollowUser => ({
  id,
  role,
  bannedAt: null,
  deletedAt: null,
});

/** Matrix without writer follow-back (actorIsFollowedByTarget=false). */
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
    USER: false, // FOLLOW_BACK_ONLY until target follows writer
    WRITER: true,
    PUBLISHER: true,
    VENDOR: false,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  PUBLISHER: {
    USER: false,
    WRITER: true,
    PUBLISHER: true,
    VENDOR: false,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  VENDOR: {
    USER: false,
    WRITER: false,
    PUBLISHER: false,
    VENDOR: false,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  ADMIN: {
    USER: false,
    WRITER: false,
    PUBLISHER: false,
    VENDOR: false,
    ADMIN: false,
    MODERATOR: false,
    RIDER: false,
  },
  MODERATOR: {
    USER: false,
    WRITER: false,
    PUBLISHER: false,
    VENDOR: false,
    ADMIN: false,
    MODERATOR: false,
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
        const result = canFollow(actor, target, {
          blocked: false,
          actorIsFollowedByTarget: false,
        });
        expect(result.allow).toBe(EXPECTED[actorRole][targetRole]);
        if (!EXPECTED[actorRole][targetRole]) {
          expect(result.allow).toBe(false);
          if (!result.allow) {
            expect(['NOT_ALLOWED', 'FOLLOW_BACK_ONLY']).toContain(result.code);
          }
        }
      });
    }
  }

  it('denies self with NOT_ALLOWED', () => {
    const u = active('same', 'USER');
    const result = canFollow(u, u, { blocked: false, actorIsFollowedByTarget: false });
    expect(result).toEqual({ allow: false, code: 'NOT_ALLOWED' });
  });

  it('denies when blocked', () => {
    const a = active('a', 'USER');
    const b = active('b', 'WRITER');
    const result = canFollow(a, b, { blocked: true, actorIsFollowedByTarget: false });
    expect(result).toEqual({ allow: false, code: 'NOT_ALLOWED' });
  });

  it('PUBLISHER → USER is forbidden', () => {
    const pub = active('pub', 'PUBLISHER');
    const user = active('user', 'USER');
    const result = canFollow(pub, user, { blocked: false, actorIsFollowedByTarget: false });
    expect(result).toEqual({ allow: false, code: 'NOT_ALLOWED' });
  });

  it('WRITER → USER requires follow-back', () => {
    const writer = active('w', 'WRITER');
    const user = active('u', 'USER');
    expect(canFollow(writer, user, { blocked: false, actorIsFollowedByTarget: false })).toEqual({
      allow: false,
      code: 'FOLLOW_BACK_ONLY',
    });
    expect(canFollow(writer, user, { blocked: false, actorIsFollowedByTarget: true })).toEqual({
      allow: true,
    });
  });

  it('nobody may follow ADMIN or RIDER', () => {
    const user = active('u', 'USER');
    expect(
      canFollow(user, active('a', 'ADMIN'), { blocked: false, actorIsFollowedByTarget: false }),
    ).toEqual({ allow: false, code: 'NOT_ALLOWED' });
    expect(
      canFollow(user, active('r', 'RIDER'), { blocked: false, actorIsFollowedByTarget: false }),
    ).toEqual({ allow: false, code: 'NOT_ALLOWED' });
  });
});
