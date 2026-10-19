import {
  meResponseSchema,
  meUserSchema,
  apiSuccessEnvelopeSchema,
  type MeUser,
} from '@bookverse/shared';
import { getWebEnv } from '../env';
import { useMockData } from './mockMode';
import { getMockMeUser } from './mockApi';

function cookieValue(header: string, name: string): string | null {
  const parts = header.split(';').map((p) => p.trim());
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i === -1) continue;
    if (p.slice(0, i) === name) return decodeURIComponent(p.slice(i + 1));
  }
  return null;
}

const MOCK_ROLES = ['USER', 'WRITER', 'PUBLISHER', 'VENDOR', 'ADMIN', 'MODERATOR'] as const;

export async function fetchMe(cookieHeader: string): Promise<MeUser | null> {
  if (useMockData()) {
    const raw = cookieValue(cookieHeader, 'bv_mock_role') ?? 'USER';
    const role = (MOCK_ROLES as readonly string[]).includes(raw) ? raw : 'USER';
    const base = getMockMeUser();
    const byRole: Record<string, { name: string; email: string; displayName: string }> = {
      USER: { name: 'Mock Reader', email: 'reader@bookverse.local', displayName: 'Mock Reader' },
      WRITER: { name: 'Mock Writer', email: 'writer1@bookverse.local', displayName: 'Writer 1' },
      PUBLISHER: {
        name: 'Mock Publisher',
        email: 'publisher1@bookverse.local',
        displayName: 'Publisher House 1',
      },
      VENDOR: { name: 'Mock Vendor', email: 'vendor1@bookverse.local', displayName: 'Vendor 1' },
      ADMIN: { name: 'BookVerse Admin', email: 'admin@bookverse.local', displayName: 'Admin' },
      MODERATOR: {
        name: 'Mock Moderator',
        email: 'mod@bookverse.local',
        displayName: 'Moderator',
      },
    };
    const meta = byRole[role] ?? byRole.USER!;
    return meUserSchema.parse({
      ...base,
      id: `mock-${role.toLowerCase()}`,
      role,
      name: meta.name,
      email: meta.email,
      displayName: meta.displayName,
    });
  }

  const apiBase = (import.meta.env.API_INTERNAL_URL ?? getWebEnv().PUBLIC_API_URL).replace(
    /\/$/,
    '',
  );
  const res = await fetch(`${apiBase}/me`, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(meResponseSchema).safeParse(json);
  if (!parsed.success) return null;
  return parsed.data.data.user;
}
