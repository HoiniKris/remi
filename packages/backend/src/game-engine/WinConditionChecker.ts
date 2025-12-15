import { Tile, Combination, WinPattern } from '../models/GameState.js';
import { validateCombination } from './CombinationValidator.js';

export interface WinValidation {
  canWin: boolean;
  reason?: string;
  pattern?: WinPattern;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

/**
 * Check if a player can win with their current hand and table state
 */
export function validateWinCondition(
  playerTiles: Tile[],
  tableCombinations: Combination[]
): WinValidation {
  // Player must have exactly 1 tile left (to discard)
  if (playerTiles.length !== 1) {
    return {
      canWin: false,
      reason: `Must have exactly 1 tile remaining (have ${playerTiles.length})`,
      baseScore: 0,
      bonusScore: 0,
      totalScore: 0,
    };
  }

  // All table combinations must be valid
  for (const combination of tableCombinations) {
    if (!validateCombination(combination)) {
      return {
        canWin: false,
        reason: 'Invalid combination on table',
        baseScore: 0,
        bonusScore: 0,
        totalScore: 0,
      };
    }
  }

  // Detect win pattern
  const allTiles = tableCombinations.flatMap((c) => c.tiles);
  const pattern = detectWinPattern(allTiles);

  // Calculate scores
  const { baseScore, bonusScore } = calculateWinScore(pattern, allTiles);

  return {
    canWin: true,
    pattern,
    baseScore,
    bonusScore,
    totalScore: baseScore + bonusScore,
  };
}

/**
 * Detect the win pattern from the tiles on the table
 */
export function detectWinPattern(tiles: Tile[]): WinPattern {
  const nonJokerTiles = tiles.filter((t) => !t.isJoker);
  const jokerCount = tiles.filter((t) => t.isJoker).length;

  // Check for FREE_JOKER (won with a joker in hand - checked elsewhere)
  // This is handled in the main game logic

  // Check for GRAND_SQUARE first (most specific pattern - 4 sets of 4)
  if (isGrandSquare(tiles)) {
    return 'GRAND_SQUARE';
  }

  // Check for MONOCHROME (all tiles same color)
  if (nonJokerTiles.length > 0) {
    const firstColor = nonJokerTiles[0].color;
    if (nonJokerTiles.every((t) => t.color === firstColor)) {
      return 'MONOCHROME';
    }
  }

  // Check for BICOLOR (only 2 colors used)
  const colors = new Set(nonJokerTiles.map((t) => t.color));
  if (colors.size === 2) {
    return 'BICOLOR';
  }

  // Check for MINOR (all tiles below 7)
  if (nonJokerTiles.length > 0 && nonJokerTiles.every((t) => t.number < 7)) {
    return 'MINOR';
  }

  // Check for MAJOR (all tiles above 7)
  if (nonJokerTiles.length > 0 && nonJokerTiles.every((t) => t.number > 7)) {
    return 'MAJOR';
  }

  // Check for MOZAIC (specific pattern - alternating colors)
  if (isMozaic(tiles)) {
    return 'MOZAIC';
  }

  // Check for DOUBLES (all tiles are pairs)
  if (isDoubles(tiles)) {
    return 'DOUBLES';
  }

  // Check for CLEAN (no jokers used) - this should be last
  if (jokerCount === 0) {
    return 'CLEAN';
  }

  // Default: no special pattern (has jokers but no special pattern)
  return 'CLEAN';
}

/**
 * Check if tiles form a Grand Square pattern
 * Grand Square: 4 sets of 4 tiles (same number, all 4 colors)
 */
function isGrandSquare(tiles: Tile[]): boolean {
  const nonJokerTiles = tiles.filter((t) => !t.isJoker);

  // Need at least 16 tiles for 4 complete sets
  if (nonJokerTiles.length < 16) return false;

  // Group by number
  const byNumber = new Map<number, Tile[]>();
  for (const tile of nonJokerTiles) {
    if (!byNumber.has(tile.number)) {
      byNumber.set(tile.number, []);
    }
    byNumber.get(tile.number)!.push(tile);
  }

  // Check if we have 4 complete sets (4 tiles each, all different colors)
  let completeSets = 0;
  for (const [, tilesOfNumber] of byNumber) {
    if (tilesOfNumber.length === 4) {
      const colors = new Set(tilesOfNumber.map((t) => t.color));
      if (colors.size === 4) {
        completeSets++;
      }
    }
  }

  return completeSets >= 4;
}

/**
 * Check if tiles form a Mozaic pattern
 * Mozaic: Alternating colors in runs
 */
function isMozaic(tiles: Tile[]): boolean {
  // This is a simplified check - in reality, mozaic has specific rules
  // For now, we'll check if there's a good mix of colors
  const nonJokerTiles = tiles.filter((t) => !t.isJoker);
  const colors = new Set(nonJokerTiles.map((t) => t.color));

  // Mozaic typically uses all 4 colors
  return colors.size === 4;
}

/**
 * Check if all tiles are in pairs (doubles pattern)
 */
function isDoubles(tiles: Tile[]): boolean {
  const nonJokerTiles = tiles.filter((t) => !t.isJoker);

  // Group by number and color
  const tileMap = new Map<string, number>();
  for (const tile of nonJokerTiles) {
    const key = `${tile.number}-${tile.color}`;
    tileMap.set(key, (tileMap.get(key) || 0) + 1);
  }

  // All tiles should appear exactly twice
  return Array.from(tileMap.values()).every((count) => count === 2);
}

/**
 * Calculate win score based on pattern
 */
export function calculateWinScore(
  pattern: WinPattern,
  _tiles: Tile[]
): { baseScore: number; bonusScore: number } {
  let baseScore = 250; // Normal win
  let bonusScore = 0;

  switch (pattern) {
    case 'CLEAN':
      // Clean finish (no jokers)
      baseScore = 350;
      bonusScore = 50; // Additional bonus
      break;

    case 'FREE_JOKER':
      // Won with free joker in hand
      baseScore = 500;
      break;

    case 'MONOCHROME':
      // All tiles same color
      bonusScore = 750; // 500-1000 range, using mid-high value
      break;

    case 'BICOLOR':
      // Only 2 colors
      bonusScore = 250;
      break;

    case 'MINOR':
    case 'MAJOR':
      // All tiles below 7 or above 7
      bonusScore = 150;
      break;

    case 'GRAND_SQUARE':
      // 4 complete sets
      bonusScore = 800;
      break;

    case 'MOZAIC':
      // Alternating colors
      bonusScore = 400;
      break;

    case 'DOUBLES':
      // All pairs
      bonusScore = 300;
      break;
  }

  return { baseScore, bonusScore };
}

/**
 * Calculate points lost for remaining tiles
 */
export function calculateRemainingTilesScore(tiles: Tile[], jokerPenalty: number = 25): number {
  return tiles.reduce((sum, tile) => {
    if (tile.isJoker) {
      return sum + jokerPenalty;
    }
    return sum + tile.number;
  }, 0);
}

/**
 * Check if player has completed first meld requirement (30 points minimum)
 */
export function validateFirstMeld(
  combinations: Combination[],
  minimumPoints: number = 30
): { valid: boolean; points: number; reason?: string } {
  const points = combinations.reduce((total, combination) => {
    return (
      total +
      combination.tiles.reduce((sum, tile) => {
        return sum + (tile.isJoker ? 0 : tile.number);
      }, 0)
    );
  }, 0);

  if (points < minimumPoints) {
    return {
      valid: false,
      points,
      reason: `First meld must be at least ${minimumPoints} points (have ${points})`,
    };
  }

  return { valid: true, points };
}
