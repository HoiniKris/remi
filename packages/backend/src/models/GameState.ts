import { z } from 'zod';

// Tile schema
export const TileSchema = z.object({
  id: z.string(),
  number: z.number().int().min(0).max(13),
  color: z.enum(['RED', 'YELLOW', 'BLUE', 'BLACK']),
  isJoker: z.boolean(),
});

// Combination schema
export const CombinationSchema = z.object({
  type: z.enum(['RUN', 'SET']),
  tiles: z.array(TileSchema),
  isValid: z.boolean(),
});

// Player in game
export const PlayerSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  hand: z.array(TileSchema),
  score: z.number().int(),
  isConnected: z.boolean(),
});

// Game state schema
export const GameStateSchema = z.object({
  gameId: z.string().uuid(),
  gameType: z.enum(['RUMMY_PRO', 'RUMMY_45', 'CANASTA']),
  players: z.array(PlayerSchema).min(2).max(4),
  currentTurn: z.string().uuid(),
  tiles: z.array(TileSchema),
  stock: z.array(TileSchema),
  discardPile: z.array(TileSchema),
  table: z.array(CombinationSchema),
  status: z.enum(['WAITING', 'IN_PROGRESS', 'COMPLETED']),
  startTime: z.date().nullable(),
  endTime: z.date().nullable(),
});

// Win pattern types
export const WinPatternSchema = z.enum([
  'CLEAN',
  'FREE_JOKER',
  'MONOCHROME',
  'BICOLOR',
  'MINOR',
  'MAJOR',
  'GRAND_SQUARE',
  'MOZAIC',
  'DOUBLES',
]);

export type Tile = z.infer<typeof TileSchema>;
export type Combination = z.infer<typeof CombinationSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type WinPattern = z.infer<typeof WinPatternSchema>;
export type GameType = 'RUMMY_PRO' | 'RUMMY_45' | 'CANASTA';
export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
