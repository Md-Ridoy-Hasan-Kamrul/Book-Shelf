export type StoredObject = {
  key: string;
  contentType: string;
  size: number;
};

export interface StorageProvider {
  readonly kind: 'local' | string;
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  resolvePublicUrl(key: string): string;
  read(key: string): Promise<{ data: Buffer; contentType: string } | null>;
}
