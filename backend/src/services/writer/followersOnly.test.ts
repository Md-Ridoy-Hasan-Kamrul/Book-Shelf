import { describe, expect, test } from 'vitest';

function canSeeFollowersOnly(opts: {
  followersOnly: boolean;
  authorId: string;
  viewerId: string | null;
  followingIds: string[];
}) {
  if (!opts.followersOnly) return true;
  if (!opts.viewerId) return false;
  if (opts.viewerId === opts.authorId) return true;
  return opts.followingIds.includes(opts.authorId);
}

describe('followersOnly visibility', () => {
  test('public posts visible to everyone', () => {
    expect(
      canSeeFollowersOnly({
        followersOnly: false,
        authorId: 'w1',
        viewerId: null,
        followingIds: [],
      }),
    ).toBe(true);
  });

  test('followers-only hidden from anon and non-followers', () => {
    expect(
      canSeeFollowersOnly({
        followersOnly: true,
        authorId: 'w1',
        viewerId: null,
        followingIds: [],
      }),
    ).toBe(false);
    expect(
      canSeeFollowersOnly({
        followersOnly: true,
        authorId: 'w1',
        viewerId: 'u2',
        followingIds: [],
      }),
    ).toBe(false);
  });

  test('followers and author can see', () => {
    expect(
      canSeeFollowersOnly({
        followersOnly: true,
        authorId: 'w1',
        viewerId: 'u2',
        followingIds: ['w1'],
      }),
    ).toBe(true);
    expect(
      canSeeFollowersOnly({
        followersOnly: true,
        authorId: 'w1',
        viewerId: 'w1',
        followingIds: [],
      }),
    ).toBe(true);
  });
});
