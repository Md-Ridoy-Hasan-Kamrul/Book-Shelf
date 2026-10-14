import { z } from 'zod';
import { roleApplicationTypeSchema } from './roles.js';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const phoneSendOtpSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Bangladesh mobile number required'),
});

export const phoneVerifyOtpSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/),
  code: z.string().length(6),
});

export const roleApplicationCreateSchema = z.object({
  type: roleApplicationTypeSchema,
  note: z.string().max(2000).optional(),
  documents: z.array(z.string().min(1).max(500)).min(1).max(10),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
