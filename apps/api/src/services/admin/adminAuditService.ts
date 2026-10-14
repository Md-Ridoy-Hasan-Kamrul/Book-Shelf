import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function writeAdminAudit(
  adminId: string,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.adminAuditLog.create({
    data: {
      adminId,
      action,
      entity,
      entityId: entityId ?? undefined,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue,
    },
  });
}
