import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { validateRun, validateSet } from '../CombinationValidator';
import { Tile } from '../../models/GameState';

// Feature: rummy-game-platform, Property 11: Run Validation
// Validates: Requirements 5.1

describe('Combination Validation Property Tests', () => {
  describe('Property 11: Run Validation', () => {
    it('should accept all valid runs with consecutive numbers in same color', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('RED', 'YELLOW', 'BLUE', 'BLACK'),
          fc.integer({ min: 1, max: 11 }),
          fc.integer({ min: 3, max: 6 }),
          (color, startNumber, length) => {
            const tiles: Tile[] = Array.from({ length }, (_, i) => ({
              id: `tile-${i}`,
              number: startNumber + i,
              color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
              isJoker: false,
            }));

            const result = validateRun(tiles);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject runs with mixed colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 11 }),
          fc.integer({ min: 3, max: 6 }),
          (startNumber, length) => {
            const colors: Array<'RED' | 'YELLOW' | 'BLUE' | 'BLACK'> = [
              'RED',
              'YELLOW',
              'BLUE',
              'BLACK',
            ];
            const tiles: Tile[] = Array.from({ length }, (_, i) => ({
              id: `tile-${i}`,
              number: startNumber + i,
              color: colors[i % colors.length], // Mixed colors
              isJoker: false,
            }));

            const result = validateRun(tiles);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept runs with Jokers filling gaps', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('RED', 'YELLOW', 'BLUE', 'BLACK'),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 2 }),
          (color, startNumber, gapSize) => {
            const tiles: Tile[] = [
              {
                id: 'tile-1',
                number: startNumber,
                color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
              ...Array.from({ length: gapSize }, (_, i) => ({
                id: `joker-${i}`,
                number: 0,
                color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: true,
              })),
              {
                id: 'tile-2',
                number: startNumber + gapSize + 1,
                color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
            ];

            const result = validateRun(tiles);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 12: Set Validation
  // Validates: Requirements 5.2

  describe('Property 12: Set Validation', () => {
    it('should accept all valid sets with same number in different colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 13 }),
          fc.integer({ min: 3, max: 4 }),
          (number, setSize) => {
            const colors: Array<'RED' | 'YELLOW' | 'BLUE' | 'BLACK'> = [
              'RED',
              'YELLOW',
              'BLUE',
              'BLACK',
            ];
            const selectedColors = colors.slice(0, setSize);

            const tiles: Tile[] = selectedColors.map((color, i) => ({
              id: `tile-${i}`,
              number,
              color,
              isJoker: false,
            }));

            const result = validateSet(tiles);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject sets with duplicate colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 13 }),
          fc.constantFrom('RED', 'YELLOW', 'BLUE', 'BLACK'),
          (number, duplicateColor) => {
            const tiles: Tile[] = [
              {
                id: 'tile-1',
                number,
                color: duplicateColor as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
              {
                id: 'tile-2',
                number,
                color: duplicateColor as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
              {
                id: 'tile-3',
                number,
                color: 'BLUE',
                isJoker: false,
              },
            ];

            const result = validateSet(tiles);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept sets with Jokers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 13 }),
          fc.integer({ min: 1, max: 2 }),
          (number, jokerCount) => {
            const colors: Array<'RED' | 'YELLOW' | 'BLUE' | 'BLACK'> = ['RED', 'YELLOW'];
            const regularTiles: Tile[] = colors.map((color, i) => ({
              id: `tile-${i}`,
              number,
              color,
              isJoker: false,
            }));

            const jokers: Tile[] = Array.from({ length: jokerCount }, (_, i) => ({
              id: `joker-${i}`,
              number: 0,
              color: 'RED' as const,
              isJoker: true,
            }));

            const tiles = [...regularTiles, ...jokers];

            if (tiles.length >= 3 && tiles.length <= 4) {
              const result = validateSet(tiles);
              expect(result).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject sets with different numbers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 12 }), (baseNumber) => {
          const tiles: Tile[] = [
            { id: 'tile-1', number: baseNumber, color: 'RED', isJoker: false },
            {
              id: 'tile-2',
              number: baseNumber + 1,
              color: 'BLUE',
              isJoker: false,
            },
            {
              id: 'tile-3',
              number: baseNumber,
              color: 'YELLOW',
              isJoker: false,
            },
          ];

          const result = validateSet(tiles);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: rummy-game-platform, Property 14: Invalid Combination Rejection
  // Validates: Requirements 5.5

  describe('Property 14: Invalid Combination Rejection', () => {
    it('should reject all combinations with less than 3 tiles', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              number: fc.integer({ min: 1, max: 13 }),
              color: fc.constantFrom('RED', 'YELLOW', 'BLUE', 'BLACK'),
              isJoker: fc.constant(false),
            }),
            { minLength: 1, maxLength: 2 }
          ),
          (tiles) => {
            const typedTiles = tiles as Tile[];
            expect(validateRun(typedTiles)).toBe(false);
            expect(validateSet(typedTiles)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject runs with non-consecutive numbers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('RED', 'YELLOW', 'BLUE', 'BLACK'),
          fc.integer({ min: 1, max: 9 }),
          fc.integer({ min: 2, max: 4 }),
          (color, startNumber, gap) => {
            const tiles: Tile[] = [
              {
                id: 'tile-1',
                number: startNumber,
                color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
              {
                id: 'tile-2',
                number: startNumber + 1,
                color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
              {
                id: 'tile-3',
                number: startNumber + 1 + gap,
                color: color as 'RED' | 'YELLOW' | 'BLUE' | 'BLACK',
                isJoker: false,
              },
            ];

            const result = validateRun(tiles);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject sets with more than 4 tiles', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 13 }), (number) => {
          const tiles: Tile[] = [
            { id: 'tile-1', number, color: 'RED', isJoker: false },
            { id: 'tile-2', number, color: 'YELLOW', isJoker: false },
            { id: 'tile-3', number, color: 'BLUE', isJoker: false },
            { id: 'tile-4', number, color: 'BLACK', isJoker: false },
            { id: 'tile-5', number, color: 'RED', isJoker: false },
          ];

          const result = validateSet(tiles);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject combinations with only Jokers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 3, max: 6 }), (jokerCount) => {
          const tiles: Tile[] = Array.from({ length: jokerCount }, (_, i) => ({
            id: `joker-${i}`,
            number: 0,
            color: 'RED' as const,
            isJoker: true,
          }));

          expect(validateRun(tiles)).toBe(false);
          if (jokerCount <= 4) {
            expect(validateSet(tiles)).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
