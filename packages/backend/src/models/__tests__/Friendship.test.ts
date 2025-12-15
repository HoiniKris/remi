import { describe, it, expect } from '@jest/globals';
import { FriendshipSchema, FriendRequestSchema, CreateFriendRequestSchema } from '../Friendship';

describe('Friendship Models', () => {
  describe('Friendship Schema', () => {
    it('should validate a valid friendship', () => {
      const validFriendship = {
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        user1Id: '123e4567-e89b-12d3-a456-426614174001',
        user2Id: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'ACTIVE' as const,
      };

      const result = FriendshipSchema.safeParse(validFriendship);
      expect(result.success).toBe(true);
    });

    it('should enforce status to be ACTIVE', () => {
      const invalidFriendship = {
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        user1Id: '123e4567-e89b-12d3-a456-426614174001',
        user2Id: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'INACTIVE', // Only ACTIVE is allowed
      };

      const result = FriendshipSchema.safeParse(invalidFriendship);
      expect(result.success).toBe(false);
    });

    it('should require valid UUIDs for user IDs', () => {
      const invalidFriendship = {
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        user1Id: 'invalid-uuid',
        user2Id: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'ACTIVE',
      };

      const result = FriendshipSchema.safeParse(invalidFriendship);
      expect(result.success).toBe(false);
    });

    it('should allow same user IDs (self-friendship check should be at service level)', () => {
      // Schema allows it, but business logic should prevent it
      const selfFriendship = {
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        user1Id: '123e4567-e89b-12d3-a456-426614174001',
        user2Id: '123e4567-e89b-12d3-a456-426614174001', // Same user
        createdAt: new Date(),
        status: 'ACTIVE' as const,
      };

      const result = FriendshipSchema.safeParse(selfFriendship);
      expect(result.success).toBe(true); // Schema passes, business logic should reject
    });
  });

  describe('FriendRequest Schema', () => {
    it('should validate a valid pending friend request', () => {
      const validRequest = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'PENDING' as const,
      };

      const result = FriendRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate an accepted friend request', () => {
      const acceptedRequest = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'ACCEPTED' as const,
      };

      const result = FriendRequestSchema.safeParse(acceptedRequest);
      expect(result.success).toBe(true);
    });

    it('should validate a rejected friend request', () => {
      const rejectedRequest = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'REJECTED' as const,
      };

      const result = FriendRequestSchema.safeParse(rejectedRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidRequest = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'CANCELLED', // Not a valid status
      };

      const result = FriendRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should require valid UUIDs', () => {
      const invalidRequest = {
        requestId: 'invalid-uuid',
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'PENDING',
      };

      const result = FriendRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateFriendRequest Schema', () => {
    it('should validate a valid create request', () => {
      const validCreate = {
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = CreateFriendRequestSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      const invalidCreate = {
        fromUserId: 'not-a-uuid',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = CreateFriendRequestSchema.safeParse(invalidCreate);
      expect(result.success).toBe(false);
    });

    it('should allow self-request (business logic should prevent)', () => {
      const selfRequest = {
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateFriendRequestSchema.safeParse(selfRequest);
      expect(result.success).toBe(true); // Schema passes, business logic should reject
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should represent bidirectional friendship correctly', () => {
      // When user A and user B are friends, the friendship should be symmetric
      const friendship = {
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        user1Id: '123e4567-e89b-12d3-a456-426614174001',
        user2Id: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        status: 'ACTIVE' as const,
      };

      const result = FriendshipSchema.safeParse(friendship);
      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data;
        // Both users should be able to see each other as friends
        expect(data.user1Id).not.toBe(data.user2Id);
        expect(data.status).toBe('ACTIVE');
      }
    });

    it('should track friend request lifecycle', () => {
      const baseRequest = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        fromUserId: '123e4567-e89b-12d3-a456-426614174001',
        toUserId: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
      };

      // Pending state
      const pending = { ...baseRequest, status: 'PENDING' as const };
      expect(FriendRequestSchema.safeParse(pending).success).toBe(true);

      // Accepted state
      const accepted = { ...baseRequest, status: 'ACCEPTED' as const };
      expect(FriendRequestSchema.safeParse(accepted).success).toBe(true);

      // Rejected state
      const rejected = { ...baseRequest, status: 'REJECTED' as const };
      expect(FriendRequestSchema.safeParse(rejected).success).toBe(true);
    });
  });
});
