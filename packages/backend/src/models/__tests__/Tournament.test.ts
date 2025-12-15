import { describe, it, expect } from '@jest/globals';
import {
  TournamentSchema,
  CreateTournamentSchema,
  TournamentParticipantSchema,
  PrizeSchema,
} from '../Tournament';

describe('Tournament Models', () => {
  describe('Prize Schema', () => {
    it('should validate a valid prize', () => {
      const validPrize = {
        position: 1,
        amount: 10000,
        description: 'First place prize',
      };

      const result = PrizeSchema.safeParse(validPrize);
      expect(result.success).toBe(true);
    });

    it('should allow prize without description', () => {
      const prizeWithoutDesc = {
        position: 2,
        amount: 5000,
      };

      const result = PrizeSchema.safeParse(prizeWithoutDesc);
      expect(result.success).toBe(true);
    });

    it('should reject position less than 1', () => {
      const invalidPrize = {
        position: 0, // Must be at least 1
        amount: 10000,
      };

      const result = PrizeSchema.safeParse(invalidPrize);
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const invalidPrize = {
        position: 1,
        amount: -1000, // Cannot be negative
      };

      const result = PrizeSchema.safeParse(invalidPrize);
      expect(result.success).toBe(false);
    });
  });

  describe('Tournament Schema', () => {
    it('should validate a valid tournament', () => {
      const validTournament = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Daily Championship',
        gameType: 'RUMMY_PRO' as const,
        startTime: new Date(Date.now() + 3600000), // 1 hour from now
        maxPlayers: 128,
        entryFee: 0,
        prizePool: [
          { position: 1, amount: 10000, description: 'First place' },
          { position: 2, amount: 5000, description: 'Second place' },
          { position: 3, amount: 2500, description: 'Third place' },
        ],
        status: 'SCHEDULED' as const,
        createdAt: new Date(),
      };

      const result = TournamentSchema.safeParse(validTournament);
      expect(result.success).toBe(true);
    });

    it('should validate all game types', () => {
      const gameTypes = ['RUMMY_PRO', 'RUMMY_45', 'CANASTA'] as const;

      gameTypes.forEach((gameType) => {
        const tournament = {
          tournamentId: '123e4567-e89b-12d3-a456-426614174000',
          name: `${gameType} Tournament`,
          gameType,
          startTime: new Date(),
          maxPlayers: 64,
          entryFee: 500,
          prizePool: [],
          status: 'SCHEDULED' as const,
          createdAt: new Date(),
        };

        const result = TournamentSchema.safeParse(tournament);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all tournament statuses', () => {
      const statuses = ['SCHEDULED', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED'] as const;

      statuses.forEach((status) => {
        const tournament = {
          tournamentId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Tournament',
          gameType: 'RUMMY_PRO' as const,
          startTime: new Date(),
          maxPlayers: 64,
          entryFee: 0,
          prizePool: [],
          status,
          createdAt: new Date(),
        };

        const result = TournamentSchema.safeParse(tournament);
        expect(result.success).toBe(true);
      });
    });

    it('should reject maxPlayers less than 2', () => {
      const invalidTournament = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Tournament',
        gameType: 'RUMMY_PRO',
        startTime: new Date(),
        maxPlayers: 1, // Must be at least 2
        entryFee: 0,
        prizePool: [],
        status: 'SCHEDULED',
        createdAt: new Date(),
      };

      const result = TournamentSchema.safeParse(invalidTournament);
      expect(result.success).toBe(false);
    });

    it('should reject negative entry fee', () => {
      const invalidTournament = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Tournament',
        gameType: 'RUMMY_PRO',
        startTime: new Date(),
        maxPlayers: 64,
        entryFee: -100, // Cannot be negative
        prizePool: [],
        status: 'SCHEDULED',
        createdAt: new Date(),
      };

      const result = TournamentSchema.safeParse(invalidTournament);
      expect(result.success).toBe(false);
    });

    it('should reject invalid game type', () => {
      const invalidTournament = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Tournament',
        gameType: 'POKER', // Not a valid game type
        startTime: new Date(),
        maxPlayers: 64,
        entryFee: 0,
        prizePool: [],
        status: 'SCHEDULED',
        createdAt: new Date(),
      };

      const result = TournamentSchema.safeParse(invalidTournament);
      expect(result.success).toBe(false);
    });

    it('should allow empty prize pool', () => {
      const tournamentNoPrizes = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Free Tournament',
        gameType: 'RUMMY_PRO' as const,
        startTime: new Date(),
        maxPlayers: 32,
        entryFee: 0,
        prizePool: [], // Empty prize pool is valid
        status: 'SCHEDULED' as const,
        createdAt: new Date(),
      };

      const result = TournamentSchema.safeParse(tournamentNoPrizes);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateTournament Schema', () => {
    it('should validate a valid tournament creation', () => {
      const validCreate = {
        name: 'Weekend Masters',
        gameType: 'RUMMY_45' as const,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        maxPlayers: 256,
        entryFee: 1000,
        prizePool: [
          { position: 1, amount: 50000 },
          { position: 2, amount: 25000 },
          { position: 3, amount: 10000 },
        ],
      };

      const result = CreateTournamentSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid data', () => {
      const invalidCreate = {
        name: 'Invalid Tournament',
        gameType: 'INVALID_TYPE',
        startTime: new Date(),
        maxPlayers: 1, // Too few
        entryFee: -500, // Negative
        prizePool: [],
      };

      const result = CreateTournamentSchema.safeParse(invalidCreate);
      expect(result.success).toBe(false);
    });
  });

  describe('TournamentParticipant Schema', () => {
    it('should validate a valid participant', () => {
      const validParticipant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tournamentId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        registeredAt: new Date(),
        finalPosition: 5,
        totalScore: 15000,
      };

      const result = TournamentParticipantSchema.safeParse(validParticipant);
      expect(result.success).toBe(true);
    });

    it('should allow null finalPosition for ongoing tournament', () => {
      const ongoingParticipant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tournamentId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        registeredAt: new Date(),
        finalPosition: null, // Tournament not finished
        totalScore: 5000,
      };

      const result = TournamentParticipantSchema.safeParse(ongoingParticipant);
      expect(result.success).toBe(true);
    });

    it('should require valid UUIDs', () => {
      const invalidParticipant = {
        id: 'invalid-uuid',
        tournamentId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        registeredAt: new Date(),
        finalPosition: null,
        totalScore: 0,
      };

      const result = TournamentParticipantSchema.safeParse(invalidParticipant);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should validate tournament lifecycle', () => {
      const baseTournament = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Tournament',
        gameType: 'RUMMY_PRO' as const,
        startTime: new Date(),
        maxPlayers: 64,
        entryFee: 500,
        prizePool: [{ position: 1, amount: 10000 }],
        createdAt: new Date(),
      };

      // Scheduled
      const scheduled = { ...baseTournament, status: 'SCHEDULED' as const };
      expect(TournamentSchema.safeParse(scheduled).success).toBe(true);

      // Registration open
      const registration = { ...baseTournament, status: 'REGISTRATION' as const };
      expect(TournamentSchema.safeParse(registration).success).toBe(true);

      // In progress
      const inProgress = { ...baseTournament, status: 'IN_PROGRESS' as const };
      expect(TournamentSchema.safeParse(inProgress).success).toBe(true);

      // Completed
      const completed = { ...baseTournament, status: 'COMPLETED' as const };
      expect(TournamentSchema.safeParse(completed).success).toBe(true);
    });

    it('should validate prize distribution logic', () => {
      const tournament = {
        tournamentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Prize Tournament',
        gameType: 'RUMMY_PRO' as const,
        startTime: new Date(),
        maxPlayers: 100,
        entryFee: 1000,
        prizePool: [
          { position: 1, amount: 50000 },
          { position: 2, amount: 30000 },
          { position: 3, amount: 20000 },
        ],
        status: 'SCHEDULED' as const,
        createdAt: new Date(),
      };

      const result = TournamentSchema.safeParse(tournament);
      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data;
        // Verify prizes are in descending order (business logic)
        const prizes = data.prizePool;
        for (let i = 0; i < prizes.length - 1; i++) {
          expect(prizes[i].amount).toBeGreaterThanOrEqual(prizes[i + 1].amount);
        }
      }
    });

    it('should validate participant scoring', () => {
      const participants = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          tournamentId: '123e4567-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174002',
          registeredAt: new Date(),
          finalPosition: 1,
          totalScore: 25000,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          tournamentId: '123e4567-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174004',
          registeredAt: new Date(),
          finalPosition: 2,
          totalScore: 20000,
        },
      ];

      participants.forEach((participant) => {
        const result = TournamentParticipantSchema.safeParse(participant);
        expect(result.success).toBe(true);
      });

      // Verify ranking order matches score order (business logic)
      expect(participants[0].totalScore).toBeGreaterThan(participants[1].totalScore);
      expect(participants[0].finalPosition).toBeLessThan(participants[1].finalPosition!);
    });
  });
});
