import { z } from 'zod';

export const userRoleSchema = z.enum([
  'USER',
  'WRITER',
  'PUBLISHER',
  'VENDOR',
  'ADMIN',
  'MODERATOR',
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const roleApplicationTypeSchema = z.enum(['WRITER', 'PUBLISHER', 'VENDOR']);

export type RoleApplicationType = z.infer<typeof roleApplicationTypeSchema>;
