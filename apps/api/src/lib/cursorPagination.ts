export function encodeCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

export function decodeCursor(cursor?: string): { createdAt: Date; id: string } | null {
  const parts = cursor?.split('|');
  if (!parts?.[0] || !parts[1]) return null;
  const createdAt = new Date(parts[0]);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id: parts[1] };
}

export function cursorWhere(cursor: string | undefined): Record<string, unknown> | undefined {
  const c = decodeCursor(cursor);
  if (!c) return undefined;
  return {
    OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }],
  };
}
