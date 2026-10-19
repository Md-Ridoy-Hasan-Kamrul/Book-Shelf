import type { RoleApplicationType, UserRole } from '@bookverse/shared';
import { AppError } from '../lib/appError.js';
import { prisma } from '../lib/prisma.js';

const TYPE_TO_ROLE: Record<RoleApplicationType, UserRole> = {
  WRITER: 'WRITER',
  PUBLISHER: 'PUBLISHER',
  VENDOR: 'VENDOR',
};

export async function createRoleApplication(
  userId: string,
  input: { type: RoleApplicationType; note?: string; documents: string[] },
) {
  const pending = await prisma.roleApplication.findFirst({
    where: { userId, type: input.type, status: 'PENDING' },
  });
  if (pending) {
    throw new AppError('CONFLICT', 'Application already pending', 409);
  }

  return prisma.roleApplication.create({
    data: {
      userId,
      type: input.type,
      note: input.note,
      documents: input.documents,
    },
  });
}

export async function getRoleApplicationForUser(applicationId: string, requesterId: string) {
  const app = await prisma.roleApplication.findUnique({ where: { id: applicationId } });
  if (!app) {
    throw new AppError('NOT_FOUND', 'Application not found', 404);
  }
  if (app.userId !== requesterId) {
    throw new AppError('FORBIDDEN', 'You cannot access this application', 403);
  }
  return app;
}

export async function approveRoleApplication(adminId: string, applicationId: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.roleApplication.findUnique({ where: { id: applicationId } });
    if (!app || app.status !== 'PENDING') {
      throw new AppError('NOT_FOUND', 'Application not found', 404);
    }

    const role = TYPE_TO_ROLE[app.type as RoleApplicationType];

    await tx.user.update({
      where: { id: app.userId },
      data: { role },
    });

    if (app.type === 'WRITER') {
      const short = app.userId.slice(0, 8);
      await tx.writerProfile.upsert({
        where: { userId: app.userId },
        create: {
          userId: app.userId,
          penName: `Writer ${app.userId.slice(0, 6)}`,
          slug: `writer-${short}`,
        },
        update: {},
      });
    }
    if (app.type === 'PUBLISHER') {
      await tx.publisherProfile.upsert({
        where: { userId: app.userId },
        create: {
          userId: app.userId,
          businessName: `Publisher ${app.userId.slice(0, 6)}`,
          slug: `pub-${app.userId.slice(0, 8)}`,
        },
        update: {},
      });
    }
    if (app.type === 'VENDOR') {
      await tx.vendorProfile.upsert({
        where: { userId: app.userId },
        create: {
          userId: app.userId,
          shopName: `Shop ${app.userId.slice(0, 6)}`,
          slug: `vendor-${app.userId.slice(0, 8)}`,
        },
        update: {},
      });
    }

    const updated = await tx.roleApplication.update({
      where: { id: applicationId },
      data: { status: 'APPROVED' },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: 'ROLE_APPLICATION_APPROVED',
        entity: 'RoleApplication',
        entityId: applicationId,
        after: { userId: app.userId, role },
      },
    });

    return updated;
  });
}

export async function rejectRoleApplication(adminId: string, applicationId: string, note?: string) {
  const app = await prisma.roleApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.status !== 'PENDING') {
    throw new AppError('NOT_FOUND', 'Application not found', 404);
  }

  const updated = await prisma.roleApplication.update({
    where: { id: applicationId },
    data: { status: 'REJECTED', note: note ?? app.note },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'ROLE_APPLICATION_REJECTED',
      entity: 'RoleApplication',
      entityId: applicationId,
    },
  });

  return updated;
}

/** Guard: reject any attempt to set role via generic user update (IDOR / escalation). */
export function assertNoRoleSelfAssign(body: Record<string, unknown>) {
  if ('role' in body || 'Role' in body) {
    throw new AppError('FORBIDDEN', 'Cannot set your own role', 403);
  }
}
