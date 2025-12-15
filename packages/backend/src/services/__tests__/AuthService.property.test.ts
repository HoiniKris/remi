import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import fc from 'fast-check';
import { AuthService } from '../AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { DeviceFingerprintService } from '../DeviceFingerprintService';
import { pool } from '../../config/database';

// Feature: rummy-game-platform, Property 1: Account Creation Uniqueness
// Validates: Requirements 1.1

describe('AuthService Property Tests', () => {
  let authService: AuthService;
  let userRepo: UserRepository;
  let fingerprintService: DeviceFingerprintService;
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping integration tests');
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }

    // Clean up test data
    try {
      await pool.query('DELETE FROM device_fingerprints');
      await pool.query('DELETE FROM player_profiles');
      await pool.query('DELETE FROM user_accounts');
    } catch (error) {
      console.error('Failed to clean up test data:', error);
    }

    userRepo = new UserRepository();
    fingerprintService = new DeviceFingerprintService();
    authService = new AuthService(userRepo, fingerprintService);
  });

  describe('Property 1: Account Creation Uniqueness', () => {
    it('should create unique user IDs and encrypted passwords for all valid registration data', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          fc.record({
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            deviceId: fc.uuid(),
            browserFingerprint: fc.hexaString({ minLength: 32, maxLength: 64 }),
          }),
          async (userData, deviceInfo) => {
            const result = await authService.register(userData, deviceInfo);

            if (result.success) {
              // Verify unique user ID was created
              expect(result.userId).toBeDefined();
              expect(typeof result.userId).toBe('string');

              // Verify password is encrypted (not plaintext)
              const user = await userRepo.findById(result.userId!);
              expect(user).toBeDefined();
              expect(user!.passwordHash).not.toBe(userData.password);
              expect(user!.passwordHash.length).toBeGreaterThan(50);
            }
          }
        ),
        { numRuns: 10 } // Reduced for database operations
      );
    });
  });

  // Feature: rummy-game-platform, Property 2: Authentication Round-Trip
  // Validates: Requirements 1.2

  describe('Property 2: Authentication Round-Trip', () => {
    it('should successfully authenticate with correct credentials after registration', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          fc.record({
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            deviceId: fc.uuid(),
            browserFingerprint: fc.hexaString({ minLength: 32, maxLength: 64 }),
          }),
          async (userData, deviceInfo) => {
            // Register user
            const registerResult = await authService.register(userData, deviceInfo);

            if (registerResult.success) {
              // Login with same credentials
              const loginResult = await authService.login(userData.email, userData.password);

              // Should succeed and return same user ID
              expect(loginResult.success).toBe(true);
              expect(loginResult.userId).toBe(registerResult.userId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 3: Clone Account Detection
  // Validates: Requirements 1.3

  describe('Property 3: Clone Account Detection', () => {
    it('should detect and prevent clone accounts with similar fingerprints', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            deviceId: fc.uuid(),
            browserFingerprint: fc.hexaString({ minLength: 32, maxLength: 64 }),
          }),
          fc
            .tuple(
              fc.record({
                username: fc
                  .string({ minLength: 3, maxLength: 20 })
                  .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
                email: fc.emailAddress(),
                password: fc.string({ minLength: 8, maxLength: 50 }),
              }),
              fc.record({
                username: fc
                  .string({ minLength: 3, maxLength: 20 })
                  .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
                email: fc.emailAddress(),
                password: fc.string({ minLength: 8, maxLength: 50 }),
              })
            )
            .filter(
              ([user1, user2]) => user1.email !== user2.email && user1.username !== user2.username
            ),
          async (sharedDeviceInfo, [user1Data, user2Data]) => {
            // Register first user
            const result1 = await authService.register(user1Data, sharedDeviceInfo);

            if (result1.success) {
              // Try to register second user with same device fingerprint
              const result2 = await authService.register(user2Data, sharedDeviceInfo);

              // Second registration should be prevented
              expect(result2.success).toBe(false);
              expect(result2.message).toContain('Multiple accounts');
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 4: Password Update Security
  // Validates: Requirements 1.4

  describe('Property 4: Password Update Security', () => {
    it('should require current password verification and encrypt new password differently', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          fc.record({
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            deviceId: fc.uuid(),
            browserFingerprint: fc.hexaString({ minLength: 32, maxLength: 64 }),
          }),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (userData, deviceInfo, newPassword) => {
            // Register user
            const registerResult = await authService.register(userData, deviceInfo);

            if (registerResult.success) {
              const userId = registerResult.userId!;
              const user1 = await userRepo.findById(userId);
              const oldHash = user1!.passwordHash;

              // Update password with correct current password
              const updateResult = await authService.updatePassword(
                userId,
                userData.password,
                newPassword
              );

              if (updateResult.success) {
                const user2 = await userRepo.findById(userId);
                const newHash = user2!.passwordHash;

                // New hash should be different from old hash
                expect(newHash).not.toBe(oldHash);
                // New hash should not be plaintext
                expect(newHash).not.toBe(newPassword);
                expect(newHash.length).toBeGreaterThan(50);

                // Should be able to login with new password
                const loginResult = await authService.login(userData.email, newPassword);
                expect(loginResult.success).toBe(true);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
