import { z } from 'zod';
import { userRoleSchema } from './roles.js';

export const meUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  role: userRoleSchema,
  phone: z.string().nullable().optional(),
  phoneVerified: z.boolean(),
  displayName: z.string().nullable().optional(),
});

export const meResponseSchema = z.object({
  user: meUserSchema,
});

export type MeUser = z.infer<typeof meUserSchema>;
