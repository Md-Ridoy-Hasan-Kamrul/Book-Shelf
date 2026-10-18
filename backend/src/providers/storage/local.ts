import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApiEnv } from '@bookverse/shared';
import type { StorageProvider, StoredObject } from './types.js';

export function createLocalStorageProvider(env: ApiEnv): StorageProvider {
  const root = path.resolve(process.cwd(), env.UPLOAD_DIR);

  return {
    kind: 'local',
    async put(key, data, contentType) {
      const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
      const fullPath = path.join(root, safeKey);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, data);
      return { key: safeKey, contentType, size: data.length };
    },
    resolvePublicUrl(key) {
      const encoded = key.split('/').map(encodeURIComponent).join('/');
      return `${env.API_ORIGIN.replace(/\/$/, '')}/uploads/${encoded}`;
    },
    async read(key) {
      const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
      try {
        const data = await readFile(path.join(root, safeKey));
        const ext = path.extname(safeKey).toLowerCase();
        const contentType =
          ext === '.png'
            ? 'image/png'
            : ext === '.webp'
              ? 'image/webp'
              : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : 'application/octet-stream';
        return { data, contentType };
      } catch {
        return null;
      }
    },
  };
}
