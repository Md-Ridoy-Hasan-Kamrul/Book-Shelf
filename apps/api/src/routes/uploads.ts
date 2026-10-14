import { Router } from 'express';
import type { StorageProvider } from '../providers/storage/types.js';

export function createUploadsRouter(storage: StorageProvider) {
  const router = Router();

  router.get('/*splat', async (req, res, next) => {
    try {
      const raw = req.params.splat;
      const key = Array.isArray(raw) ? raw.join('/') : raw;
      if (!key || key.includes('..')) {
        res.status(400).end();
        return;
      }
      const file = await storage.read(key);
      if (!file) {
        res.status(404).end();
        return;
      }
      res.set('Cache-Control', 'public, max-age=86400, immutable');
      res.type(file.contentType);
      res.send(file.data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
