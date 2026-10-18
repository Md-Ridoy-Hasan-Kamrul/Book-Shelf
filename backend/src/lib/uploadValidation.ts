import { AppError } from './appError.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function assertImageUpload(contentType: string, size: number, maxBytes: number) {
  if (!ALLOWED.has(contentType)) {
    throw new AppError('VALIDATION_ERROR', 'Only JPEG, PNG, or WebP images allowed', 400);
  }
  if (size > maxBytes) {
    throw new AppError('VALIDATION_ERROR', 'File too large', 400);
  }
}
