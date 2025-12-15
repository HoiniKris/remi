import { describe, it, expect } from '@jest/globals';
import {
  validateRun,
  validateSet,
  validateCombination,
  detectCombinationType,
  canAddTileToCombination,
  findAllValidCombinations,
} from '../CombinationValidator';
import { Tile, Combination } from '../../models/GameState';

describe('CombinationValidator', () => {
  describe('validateRun', () => {
    it('should validate a simple 3-tile run', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: '3', number: 6, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should validate a longer run', () => {
      const tiles: Tile[] = [
        { id: '1', number: 1, color: 'BLUE', isJoker: false },
        { id: '2', number: 2, color: 'BLUE', isJoker: false },
        { id: '3', number: 3, color: 'BLUE', isJoker: false },
        { id: '4', number: 4, color: 'BLUE', isJoker: false },
        { id: '5', number: 5, color: 'BLUE', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should validate run with Joker filling gap', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
        { id: '3', number: 6, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should validate run with Joker at start', () => {
      const tiles: Tile[] = [
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: '3', number: 6, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should validate run with Joker at end', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should reject run with less than 3 tiles', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(false);
    });

    it('should reject run with mixed colors', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'BLUE', isJoker: false },
        { id: '3', number: 6, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(false);
    });

    it('should reject run with non-consecutive numbers', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: '3', number: 7, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(false);
    });

    it('should reject run with duplicate numbers', () => {
      const tiles: Tile[] = [
        { id: '1', number: 5, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: '3', number: 6, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(false);
    });

    it('should reject run with only Jokers', () => {
      const tiles: Tile[] = [
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
        { id: 'j2', number: 0, color: 'RED', isJoker: true },
        { id: 'j3', number: 0, color: 'RED', isJoker: true },
      ];
      expect(validateRun(tiles)).toBe(false);
    });

    it('should validate run with multiple Jokers', () => {
      const tiles: Tile[] = [
        { id: '1', number: 3, color: 'YELLOW', isJoker: false },
        { id: 'j1', number: 0, color: 'YELLOW', isJoker: true },
        { id: 'j2', number: 0, color: 'YELLOW', isJoker: true },
        { id: '4', number: 6, color: 'YELLOW', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });
  });

  describe('validateSet', () => {
    it('should validate a 3-tile set', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(true);
    });

    it('should validate a 4-tile set', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
        { id: '4', number: 7, color: 'BLACK', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(true);
    });

    it('should validate set with Joker', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: 'j1', number: 0, color: 'YELLOW', isJoker: true },
      ];
      expect(validateSet(tiles)).toBe(true);
    });

    it('should reject set with less than 3 tiles', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(false);
    });

    it('should reject set with more than 4 tiles', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
        { id: '4', number: 7, color: 'BLACK', isJoker: false },
        { id: '5', number: 7, color: 'RED', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(false);
    });

    it('should reject set with different numbers', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 8, color: 'BLUE', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(false);
    });

    it('should reject set with duplicate colors', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'RED', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(false);
    });

    it('should reject set with only Jokers', () => {
      const tiles: Tile[] = [
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
        { id: 'j2', number: 0, color: 'BLUE', isJoker: true },
        { id: 'j3', number: 0, color: 'YELLOW', isJoker: true },
      ];
      expect(validateSet(tiles)).toBe(false);
    });

    it('should validate set with multiple Jokers', () => {
      const tiles: Tile[] = [
        { id: '1', number: 9, color: 'RED', isJoker: false },
        { id: 'j1', number: 0, color: 'BLUE', isJoker: true },
        { id: 'j2', number: 0, color: 'YELLOW', isJoker: true },
      ];
      expect(validateSet(tiles)).toBe(true);
    });
  });

  describe('validateCombination', () => {
    it('should validate a RUN combination', () => {
      const combination: Combination = {
        type: 'RUN',
        tiles: [
          { id: '1', number: 4, color: 'RED', isJoker: false },
          { id: '2', number: 5, color: 'RED', isJoker: false },
          { id: '3', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      };
      expect(validateCombination(combination)).toBe(true);
    });

    it('should validate a SET combination', () => {
      const combination: Combination = {
        type: 'SET',
        tiles: [
          { id: '1', number: 7, color: 'RED', isJoker: false },
          { id: '2', number: 7, color: 'BLUE', isJoker: false },
          { id: '3', number: 7, color: 'YELLOW', isJoker: false },
        ],
        isValid: true,
      };
      expect(validateCombination(combination)).toBe(true);
    });

    it('should reject invalid RUN', () => {
      const combination: Combination = {
        type: 'RUN',
        tiles: [
          { id: '1', number: 4, color: 'RED', isJoker: false },
          { id: '2', number: 5, color: 'BLUE', isJoker: false },
          { id: '3', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: false,
      };
      expect(validateCombination(combination)).toBe(false);
    });

    it('should reject invalid SET', () => {
      const combination: Combination = {
        type: 'SET',
        tiles: [
          { id: '1', number: 7, color: 'RED', isJoker: false },
          { id: '2', number: 8, color: 'BLUE', isJoker: false },
          { id: '3', number: 7, color: 'YELLOW', isJoker: false },
        ],
        isValid: false,
      };
      expect(validateCombination(combination)).toBe(false);
    });
  });

  describe('detectCombinationType', () => {
    it('should detect RUN', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: '3', number: 6, color: 'RED', isJoker: false },
      ];
      expect(detectCombinationType(tiles)).toBe('RUN');
    });

    it('should detect SET', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
      ];
      expect(detectCombinationType(tiles)).toBe('SET');
    });

    it('should return null for invalid combination', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: '3', number: 9, color: 'YELLOW', isJoker: false },
      ];
      expect(detectCombinationType(tiles)).toBeNull();
    });

    it('should return null for too few tiles', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
      ];
      expect(detectCombinationType(tiles)).toBeNull();
    });
  });

  describe('canAddTileToCombination', () => {
    it('should allow adding tile to extend RUN', () => {
      const combination: Combination = {
        type: 'RUN',
        tiles: [
          { id: '1', number: 4, color: 'RED', isJoker: false },
          { id: '2', number: 5, color: 'RED', isJoker: false },
          { id: '3', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      };
      const newTile: Tile = { id: '4', number: 7, color: 'RED', isJoker: false };
      expect(canAddTileToCombination(combination, newTile)).toBe(true);
    });

    it('should allow adding tile to complete SET', () => {
      const combination: Combination = {
        type: 'SET',
        tiles: [
          { id: '1', number: 7, color: 'RED', isJoker: false },
          { id: '2', number: 7, color: 'BLUE', isJoker: false },
          { id: '3', number: 7, color: 'YELLOW', isJoker: false },
        ],
        isValid: true,
      };
      const newTile: Tile = { id: '4', number: 7, color: 'BLACK', isJoker: false };
      expect(canAddTileToCombination(combination, newTile)).toBe(true);
    });

    it('should reject adding invalid tile', () => {
      const combination: Combination = {
        type: 'RUN',
        tiles: [
          { id: '1', number: 4, color: 'RED', isJoker: false },
          { id: '2', number: 5, color: 'RED', isJoker: false },
          { id: '3', number: 6, color: 'RED', isJoker: false },
        ],
        isValid: true,
      };
      const newTile: Tile = { id: '4', number: 9, color: 'RED', isJoker: false };
      expect(canAddTileToCombination(combination, newTile)).toBe(false);
    });
  });

  describe('findAllValidCombinations', () => {
    it('should find valid RUN in tiles', () => {
      const tiles: Tile[] = [
        { id: '1', number: 4, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'RED', isJoker: false },
        { id: '3', number: 6, color: 'RED', isJoker: false },
        { id: '4', number: 9, color: 'BLUE', isJoker: false },
      ];
      const combinations = findAllValidCombinations(tiles);
      expect(combinations.length).toBeGreaterThan(0);
      expect(combinations.some((c) => c.type === 'RUN')).toBe(true);
    });

    it('should find valid SET in tiles', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'BLUE', isJoker: false },
        { id: '3', number: 7, color: 'YELLOW', isJoker: false },
        { id: '4', number: 9, color: 'RED', isJoker: false },
      ];
      const combinations = findAllValidCombinations(tiles);
      expect(combinations.length).toBeGreaterThan(0);
      expect(combinations.some((c) => c.type === 'SET')).toBe(true);
    });

    it('should return empty array for no valid combinations', () => {
      const tiles: Tile[] = [
        { id: '1', number: 1, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'BLUE', isJoker: false },
        { id: '3', number: 9, color: 'YELLOW', isJoker: false },
      ];
      const combinations = findAllValidCombinations(tiles);
      expect(combinations.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle run at boundaries (1-2-3)', () => {
      const tiles: Tile[] = [
        { id: '1', number: 1, color: 'RED', isJoker: false },
        { id: '2', number: 2, color: 'RED', isJoker: false },
        { id: '3', number: 3, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should handle run at boundaries (11-12-13)', () => {
      const tiles: Tile[] = [
        { id: '1', number: 11, color: 'RED', isJoker: false },
        { id: '2', number: 12, color: 'RED', isJoker: false },
        { id: '3', number: 13, color: 'RED', isJoker: false },
      ];
      expect(validateRun(tiles)).toBe(true);
    });

    it('should handle set with all four colors', () => {
      const tiles: Tile[] = [
        { id: '1', number: 5, color: 'RED', isJoker: false },
        { id: '2', number: 5, color: 'YELLOW', isJoker: false },
        { id: '3', number: 5, color: 'BLUE', isJoker: false },
        { id: '4', number: 5, color: 'BLACK', isJoker: false },
      ];
      expect(validateSet(tiles)).toBe(true);
    });
  });
});
