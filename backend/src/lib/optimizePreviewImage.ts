import sharp from 'sharp';

/** Look Inside previews: max width, WebP only (public after admin approval). */
export async function optimizePreviewImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
