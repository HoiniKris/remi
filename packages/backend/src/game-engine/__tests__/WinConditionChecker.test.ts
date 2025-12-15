import { describe, it, expect } from '@jest/globals';
import {
  validateWinCondition,
  detectWinPattern,
  calculateWinScore,
  calculateRemainingTilesScore,
  validateFirstMeld,
} from '../WinConditionChecker';
import { Tile, Combination } from '../../models/GameState';

describe('WinConditionChecker', () => {
  describe('validateWinCondition', () => {
    it('should allow win with 1 tile remaining and valid combinations', () => {
      const playerTiles: Tile[] = [{ id: 'tile-1', number: 5, color: 'RED', isJoker: false }];

      const tableCombinations: Combination[] = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-2', number: 1, color: 'BLUE', isJoker: false },
            { id: 'tile-3', number: 2, color: 'BLUE', isJoker: false },
            { id: 'tile-4', number: 3, color: 'BLUE', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = validateWinCondition(playerTiles, tableCombinations);

      expect(result.canWin).toBe(true);
      expect(result.pattern).toBeDefined();
    });

    it('should reject win with more than 1 tile remaining', () => {
      const playerTiles: Tile[] = [
        { id: 'tile-1', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 6, color: 'RED', isJoker: false },
      ];

      const tableCombinations: Combination[] = [];

      const result = validateWinCondition(playerTiles, tableCombinations);

      expect(result.canWin).toBe(false);
      expect(result.reason).toContain('exactly 1 tile');
    });

    it('should reject win with 0 tiles remaining', () => {
      const playerTiles: Tile[] = [];
      const tableCombinations: Combination[] = [];

      const result = validateWinCondition(playerTiles, tableCombinations);

      expect(result.canWin).toBe(false);
    });
  });

  describe('detectWinPattern', () => {
    it('should detect CLEAN pattern (no jokers, no special pattern)', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 1, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 8, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 5, color: 'YELLOW', isJoker: false },
        { id: 'tile-4', number: 10, color: 'RED', isJoker: false },
      ];

      const pattern = detectWinPattern(tiles);
      expect(pattern).toBe('CLEAN');
    });

    it('should detect MONOCHROME pattern (all same color)', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 1, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 2, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 3, color: 'RED', isJoker: false },
        { id: 'tile-4', number: 4, color: 'RED', isJoker: false },
      ];

      const pattern = detectWinPattern(tiles);
      expect(pattern).toBe('MONOCHROME');
    });

    it('should detect BICOLOR pattern (only 2 colors)', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 1, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 2, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 3, color: 'RED', isJoker: false },
        { id: 'tile-4', number: 4, color: 'BLUE', isJoker: false },
      ];

      const pattern = detectWinPattern(tiles);
      expect(pattern).toBe('BICOLOR');
    });

    it('should detect MINOR pattern (all tiles below 7)', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 1, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 2, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 3, color: 'YELLOW', isJoker: false },
        { id: 'tile-4', number: 6, color: 'BLACK', isJoker: false },
      ];

      const pattern = detectWinPattern(tiles);
      expect(pattern).toBe('MINOR');
    });

    it('should detect MAJOR pattern (all tiles above 7)', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 8, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 9, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 10, color: 'YELLOW', isJoker: false },
        { id: 'tile-4', number: 11, color: 'BLACK', isJoker: false },
      ];

      const pattern = detectWinPattern(tiles);
      expect(pattern).toBe('MAJOR');
    });

    it('should detect GRAND_SQUARE pattern (4 complete sets)', () => {
      const tiles: Tile[] = [];

      // Create 4 complete sets (numbers 1, 2, 3, 4 with all 4 colors each)
      for (let num = 1; num <= 4; num++) {
        for (const color of ['RED', 'BLUE', 'YELLOW', 'BLACK'] as const) {
          tiles.push({ id: `tile-${num}-${color}`, number: num, color, isJoker: false });
        }
      }

      const pattern = detectWinPattern(tiles);
      expect(pattern).toBe('GRAND_SQUARE');
    });
  });

  describe('calculateWinScore', () => {
    it('should calculate CLEAN win score', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 1, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 2, color: 'BLUE', isJoker: false },
      ];

      const { baseScore, bonusScore } = calculateWinScore('CLEAN', tiles);

      expect(baseScore).toBe(350);
      expect(bonusScore).toBe(50);
    });

    it('should calculate FREE_JOKER win score', () => {
      const tiles: Tile[] = [{ id: 'joker-1', number: 0, color: 'RED', isJoker: true }];

      const { baseScore, bonusScore } = calculateWinScore('FREE_JOKER', tiles);

      expect(baseScore).toBe(500);
      expect(bonusScore).toBe(0);
    });

    it('should calculate MONOCHROME win score', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 1, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 2, color: 'RED', isJoker: false },
      ];

      const { baseScore, bonusScore } = calculateWinScore('MONOCHROME', tiles);

      expect(baseScore).toBe(250);
      expect(bonusScore).toBe(750);
    });

    it('should calculate BICOLOR win score', () => {
      const tiles: Tile[] = [];
      const { baseScore, bonusScore } = calculateWinScore('BICOLOR', tiles);

      expect(baseScore).toBe(250);
      expect(bonusScore).toBe(250);
    });

    it('should calculate MINOR win score', () => {
      const tiles: Tile[] = [];
      const { baseScore, bonusScore } = calculateWinScore('MINOR', tiles);

      expect(baseScore).toBe(250);
      expect(bonusScore).toBe(150);
    });

    it('should calculate MAJOR win score', () => {
      const tiles: Tile[] = [];
      const { baseScore, bonusScore } = calculateWinScore('MAJOR', tiles);

      expect(baseScore).toBe(250);
      expect(bonusScore).toBe(150);
    });

    it('should calculate GRAND_SQUARE win score', () => {
      const tiles: Tile[] = [];
      const { baseScore, bonusScore } = calculateWinScore('GRAND_SQUARE', tiles);

      expect(baseScore).toBe(250);
      expect(bonusScore).toBe(800);
    });
  });

  describe('calculateRemainingTilesScore', () => {
    it('should calculate score for regular tiles', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 7, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 3, color: 'YELLOW', isJoker: false },
      ];

      const score = calculateRemainingTilesScore(tiles);
      expect(score).toBe(15); // 5 + 7 + 3
    });

    it('should apply joker penalty', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 5, color: 'RED', isJoker: false },
        { id: 'joker-1', number: 0, color: 'RED', isJoker: true },
      ];

      const score = calculateRemainingTilesScore(tiles, 25);
      expect(score).toBe(30); // 5 + 25 (joker penalty)
    });

    it('should handle empty tiles', () => {
      const tiles: Tile[] = [];
      const score = calculateRemainingTilesScore(tiles);
      expect(score).toBe(0);
    });
  });

  describe('validateFirstMeld', () => {
    it('should validate first meld with sufficient points', () => {
      const combinations: Combination[] = [
        {
          type: 'SET',
          tiles: [
            { id: 'tile-1', number: 10, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 10, color: 'BLUE', isJoker: false },
            { id: 'tile-3', number: 10, color: 'YELLOW', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = validateFirstMeld(combinations, 30);

      expect(result.valid).toBe(true);
      expect(result.points).toBe(30);
    });

    it('should reject first meld with insufficient points', () => {
      const combinations: Combination[] = [
        {
          type: 'SET',
          tiles: [
            { id: 'tile-1', number: 2, color: 'RED', isJoker: false },
            { id: 'tile-2', number: 2, color: 'BLUE', isJoker: false },
            { id: 'tile-3', number: 2, color: 'YELLOW', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = validateFirstMeld(combinations, 30);

      expect(result.valid).toBe(false);
      expect(result.points).toBe(6);
      expect(result.reason).toContain('at least 30 points');
    });

    it('should not count jokers in first meld points', () => {
      const combinations: Combination[] = [
        {
          type: 'RUN',
          tiles: [
            { id: 'tile-1', number: 10, color: 'RED', isJoker: false },
            { id: 'joker-1', number: 0, color: 'RED', isJoker: true },
            { id: 'tile-2', number: 12, color: 'RED', isJoker: false },
          ],
          isValid: true,
        },
      ];

      const result = validateFirstMeld(combinations, 30);

      expect(result.points).toBe(22); // 10 + 12, joker not counted
    });
  });
});
