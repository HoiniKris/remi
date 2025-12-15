import { describe, it, expect } from '@jest/globals';
import {
  UserAccountSchema,
  CreateUserAccountSchema,
  hashPassword,
  verifyPassword,
} from '../UserAccount';

describe('UserAccount Model', () => {
  describe('Schema Validation', () => {
    it('should validate a valid user account', () => {
      const validUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        createdAt: new Date(),
        lastLogin: null,
        isSuspended: false,
        suspensionReason: null,
      };

      const result = UserAccountSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject username shorter than 3 characters', () => {
      const invalidUser = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = CreateUserAccountSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidUser = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      };

      const result = CreateUserAccountSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'short',
      };

      const result = CreateUserAccountSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });
});
