import { addressCreateSchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';

export function createAddressesRouter(auth: BookVerseAuth) {
  const router = Router();

  router.get('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const rows = await prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      res.json(
        successEnvelope(
          rows.map((a) => ({
            id: a.id,
            label: a.label,
            phone: a.phone,
            division: a.division,
            district: a.district,
            area: a.area,
            line1: a.line1,
            isDefault: a.isDefault,
          })),
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = addressCreateSchema.parse(req.body);
      if (body.isDefault) {
        await prisma.address.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }
      const created = await prisma.address.create({
        data: {
          userId: user.id,
          label: body.label,
          phone: body.phone,
          division: body.division,
          district: body.district,
          area: body.area,
          line1: body.line1,
          isDefault: body.isDefault ?? false,
        },
      });
      res.status(201).json(
        successEnvelope({
          id: created.id,
          label: created.label,
          phone: created.phone,
          division: created.division,
          district: created.district,
          area: created.area,
          line1: created.line1,
          isDefault: created.isDefault,
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
