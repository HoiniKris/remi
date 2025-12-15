import { z } from 'zod';

export const FriendshipSchema = z.object({
  friendshipId: z.string().uuid(),
  user1Id: z.string().uuid(),
  user2Id: z.string().uuid(),
  createdAt: z.date(),
  status: z.literal('ACTIVE'),
});

export const FriendRequestSchema = z.object({
  requestId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  createdAt: z.date(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
});

export const CreateFriendRequestSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
});

export type Friendship = z.infer<typeof FriendshipSchema>;
export type FriendRequest = z.infer<typeof FriendRequestSchema>;
export type CreateFriendRequest = z.infer<typeof CreateFriendRequestSchema>;
