import { z } from 'zod';

export const PlayerProfileSchema = z.object({
  userId: z.string().uuid(),
  avatarUrl: z.string().url().nullable(),
  level: z.number().int().min(1),
  experience: z.number().int().min(0),
  totalGames: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  totalPoints: z.number().int().min(0),
  ranking: z.number().int().nullable(),
  isOnline: z.boolean(),
  lastSeen: z.date().nullable(),
});

export const UpdatePlayerProfileSchema = z.object({
  avatarUrl: z.string().url().optional(),
  level: z.number().int().min(1).optional(),
  experience: z.number().int().min(0).optional(),
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type UpdatePlayerProfile = z.infer<typeof UpdatePlayerProfileSchema>;
