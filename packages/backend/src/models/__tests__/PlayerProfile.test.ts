import { describe, it, expect } from '@jest/globals';
import { PlayerProfileSchema, UpdatePlayerProfileSchema } from '../PlayerProfile';

describe('PlayerProfile Model', () => {
  describe('Schema Validation', () => {
    it('should validate a valid player profile', () => {
      const validProfile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: 'https://example.com/avatar.jpg',
        level: 15,
        experience: 5000,
        totalGames: 342,
        wins: 198,
        losses: 144,
        totalPoints: 25000,
        ranking: 42,
        isOnline: true,
        lastSeen: new Date(),
      };

      const result = PlayerProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should allow null avatarUrl', () => {
      const profileWithoutAvatar = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: null,
        level: 1,
        experience: 0,
        totalGames: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0,
        ranking: null,
        isOnline: false,
        lastSeen: null,
      };

      const result = PlayerProfileSchema.safeParse(profileWithoutAvatar);
      expect(result.success).toBe(true);
    });

    it('should reject level less than 1', () => {
      const invalidProfile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: null,
        level: 0, // Must be at least 1
        experience: 0,
        totalGames: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0,
        ranking: null,
        isOnline: false,
        lastSeen: null,
      };

      const result = PlayerProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('should reject negative experience', () => {
      const invalidProfile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: null,
        level: 1,
        experience: -100, // Cannot be negative
        totalGames: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0,
        ranking: null,
        isOnline: false,
        lastSeen: null,
      };

      const result = PlayerProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('should reject negative game counts', () => {
      const invalidProfile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: null,
        level: 1,
        experience: 0,
        totalGames: -5, // Cannot be negative
        wins: 0,
        losses: 0,
        totalPoints: 0,
        ranking: null,
        isOnline: false,
        lastSeen: null,
      };

      const result = PlayerProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('should reject invalid avatar URL format', () => {
      const invalidProfile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: 'not-a-valid-url',
        level: 1,
        experience: 0,
        totalGames: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0,
        ranking: null,
        isOnline: false,
        lastSeen: null,
      };

      const result = PlayerProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('Update Profile Schema', () => {
    it('should validate partial profile updates', () => {
      const validUpdate = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
        level: 16,
      };

      const result = UpdatePlayerProfileSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only avatar', () => {
      const validUpdate = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const result = UpdatePlayerProfileSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty update object', () => {
      const validUpdate = {};

      const result = UpdatePlayerProfileSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid level in update', () => {
      const invalidUpdate = {
        level: 0, // Must be at least 1
      };

      const result = UpdatePlayerProfileSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Logic Validation', () => {
    it('should ensure wins + losses <= totalGames', () => {
      // This is a business rule that should be enforced at the service level
      const profile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: null,
        level: 10,
        experience: 2000,
        totalGames: 100,
        wins: 60,
        losses: 40,
        totalPoints: 15000,
        ranking: 100,
        isOnline: true,
        lastSeen: new Date(),
      };

      const result = PlayerProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data;
        expect(data.wins + data.losses).toBeLessThanOrEqual(data.totalGames);
      }
    });

    it('should detect inconsistent game statistics', () => {
      // Wins + losses should not exceed total games
      const profile = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: null,
        level: 10,
        experience: 2000,
        totalGames: 50,
        wins: 40,
        losses: 30, // 40 + 30 = 70 > 50 (inconsistent)
        totalPoints: 15000,
        ranking: 100,
        isOnline: true,
        lastSeen: new Date(),
      };

      const result = PlayerProfileSchema.safeParse(profile);
      // Schema validation passes, but business logic should catch this
      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data;
        const isConsistent = data.wins + data.losses <= data.totalGames;
        expect(isConsistent).toBe(false); // This should be caught by business logic
      }
    });
  });
});
