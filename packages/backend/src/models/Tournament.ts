import { z } from 'zod';

export const PrizeSchema = z.object({
  position: z.number().int().min(1),
  amount: z.number().int().min(0),
  description: z.string().optional(),
});

export const TournamentSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string(),
  gameType: z.enum(['RUMMY_PRO', 'RUMMY_45', 'CANASTA']),
  startTime: z.date(),
  maxPlayers: z.number().int().min(2),
  entryFee: z.number().int().min(0),
  prizePool: z.array(PrizeSchema),
  status: z.enum(['SCHEDULED', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED']),
  createdAt: z.date(),
});

export const CreateTournamentSchema = z.object({
  name: z.string(),
  gameType: z.enum(['RUMMY_PRO', 'RUMMY_45', 'CANASTA']),
  startTime: z.date(),
  maxPlayers: z.number().int().min(2),
  entryFee: z.number().int().min(0),
  prizePool: z.array(PrizeSchema),
});

export const TournamentParticipantSchema = z.object({
  id: z.string().uuid(),
  tournamentId: z.string().uuid(),
  userId: z.string().uuid(),
  registeredAt: z.date(),
  finalPosition: z.number().int().nullable(),
  totalScore: z.number().int(),
});

export type Prize = z.infer<typeof PrizeSchema>;
export type Tournament = z.infer<typeof TournamentSchema>;
export type CreateTournament = z.infer<typeof CreateTournamentSchema>;
export type TournamentParticipant = z.infer<typeof TournamentParticipantSchema>;
