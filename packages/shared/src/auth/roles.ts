import { z } from 'zod';

export const userRoleSchema = z.enum([
  'USER',
  'WRITER',
  'PUBLISHER',
  'VENDOR',
  'ADMIN',
  'MODERATOR',
  'RIDER', // FEATURE_RIDER=false — enum only until rider module ships
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const roleApplicationTypeSchema = z.enum(['WRITER', 'PUBLISHER', 'VENDOR']);

export type RoleApplicationType = z.infer<typeof roleApplicationTypeSchema>;
