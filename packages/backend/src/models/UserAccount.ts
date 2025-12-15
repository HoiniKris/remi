import { z } from 'zod';
import bcrypt from 'bcrypt';

// Zod schema for validation
export const UserAccountSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  passwordHash: z.string(),
  createdAt: z.date(),
  lastLogin: z.date().nullable(),
  isSuspended: z.boolean(),
  suspensionReason: z.string().nullable(),
});

export const CreateUserAccountSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

export type UserAccount = z.infer<typeof UserAccountSchema>;
export type CreateUserAccount = z.infer<typeof CreateUserAccountSchema>;

// Password hashing utilities
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
