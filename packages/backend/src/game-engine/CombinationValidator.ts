import { Tile, Combination } from '../models/GameState.js';
import { sortTiles } from './TileUtils.js';

/**
 * Validate if a combination of tiles forms a valid RUN
 * A RUN is 3+ consecutive numbers in the same color
 * Jokers can substitute for any tile
 */
export function validateRun(tiles: Tile[]): boolean {
  if (tiles.length < 3) {
    return false;
  }

  // Separate Jokers from regular tiles
  const jokers = tiles.filter((t) => t.isJoker);
  const regularTiles = tiles.filter((t) => !t.isJoker);

  // If all tiles are Jokers, it's not a valid run (need at least one regular tile)
  if (regularTiles.length === 0) {
    return false;
  }

  // All regular tiles must be the same color
  const firstColor = regularTiles[0].color;
  if (!regularTiles.every((t) => t.color === firstColor)) {
    return false;
  }

  // Sort regular tiles by number
  const sorted = [...regularTiles].sort((a, b) => a.number - b.number);

  // Check if tiles form a sequence with Jokers filling gaps
  let jokersUsed = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].number - sorted[i].number - 1;

    if (gap < 0) {
      // Duplicate number
      return false;
    }

    if (gap > 0) {
      // Need Jokers to fill the gap
      jokersUsed += gap;
      if (jokersUsed > jokers.length) {
        return false;
      }
    }
  }

  // Check if we have enough Jokers for the gaps
  if (jokersUsed > jokers.length) {
    return false;
  }

  // Check if remaining Jokers can extend the sequence
  const remainingJokers = jokers.length - jokersUsed;
  const minNumber = sorted[0].number;
  const maxNumber = sorted[sorted.length - 1].number;

  // Jokers can extend at the beginning or end
  // Make sure we don't go below 1 or above 13
  const canExtendStart = minNumber - remainingJokers >= 1;
  const canExtendEnd = maxNumber + remainingJokers <= 13;

  // At least one extension direction should be valid
  return canExtendStart || canExtendEnd || remainingJokers === 0;
}

/**
 * Validate if a combination of tiles forms a valid SET
 * A SET is 3-4 tiles with the same number in different colors
 * Jokers can substitute for any tile
 */
export function validateSet(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) {
    return false;
  }

  // Separate Jokers from regular tiles
  const jokers = tiles.filter((t) => t.isJoker);
  const regularTiles = tiles.filter((t) => !t.isJoker);

  // If all tiles are Jokers, it's not a valid set (need at least one regular tile)
  if (regularTiles.length === 0) {
    return false;
  }

  // All regular tiles must have the same number
  const firstNumber = regularTiles[0].number;
  if (!regularTiles.every((t) => t.number === firstNumber)) {
    return false;
  }

  // All regular tiles must have different colors
  const colors = regularTiles.map((t) => t.color);
  const uniqueColors = new Set(colors);
  if (colors.length !== uniqueColors.size) {
    // Duplicate colors
    return false;
  }

  // Total tiles (regular + Jokers) must be 3 or 4
  const totalTiles = regularTiles.length + jokers.length;
  if (totalTiles < 3 || totalTiles > 4) {
    return false;
  }

  // If we have 4 tiles, all 4 colors must be represented
  if (totalTiles === 4) {
    // With Jokers, we need to ensure we don't exceed 4 colors
    return uniqueColors.size + jokers.length <= 4;
  }

  return true;
}

/**
 * Validate a combination (either RUN or SET)
 */
export function validateCombination(combination: Combination): boolean {
  if (combination.type === 'RUN') {
    return validateRun(combination.tiles);
  } else if (combination.type === 'SET') {
    return validateSet(combination.tiles);
  }
  return false;
}

/**
 * Determine what type of combination tiles form (if any)
 */
export function detectCombinationType(tiles: Tile[]): 'RUN' | 'SET' | null {
  if (validateRun(tiles)) {
    return 'RUN';
  }
  if (validateSet(tiles)) {
    return 'SET';
  }
  return null;
}

/**
 * Find what a Joker represents in a combination
 * Returns the number and color the Joker is substituting for
 */
export function getJokerRepresentation(
  combination: Combination,
  jokerIndex: number
): { number: number; color: string } | null {
  const joker = combination.tiles[jokerIndex];
  if (!joker.isJoker) {
    return null;
  }

  const regularTiles = combination.tiles.filter((t) => !t.isJoker);

  if (combination.type === 'RUN') {
    // In a RUN, Joker represents a number in the sequence
    const color = regularTiles[0].color;
    const sorted = sortTiles(regularTiles);

    // Find the gap where this Joker fits
    const numbers = sorted.map((t) => t.number);
    const minNum = Math.min(...numbers);
    const maxNum = Math.max(...numbers);

    // Find missing numbers in the sequence
    const missingNumbers: number[] = [];
    for (let n = minNum; n <= maxNum; n++) {
      if (!numbers.includes(n)) {
        missingNumbers.push(n);
      }
    }

    // Joker fills one of the missing numbers
    if (missingNumbers.length > 0) {
      return { number: missingNumbers[0], color };
    }

    // Joker extends the sequence
    if (jokerIndex < regularTiles.findIndex((t) => !t.isJoker)) {
      // Joker is at the start
      return { number: minNum - 1, color };
    } else {
      // Joker is at the end
      return { number: maxNum + 1, color };
    }
  } else if (combination.type === 'SET') {
    // In a SET, Joker represents the same number in a missing color
    const number = regularTiles[0].number;
    const usedColors = new Set(regularTiles.map((t) => t.color));
    const allColors: Array<'RED' | 'YELLOW' | 'BLUE' | 'BLACK'> = [
      'RED',
      'YELLOW',
      'BLUE',
      'BLACK',
    ];
    const missingColor = allColors.find((c) => !usedColors.has(c));

    if (missingColor) {
      return { number, color: missingColor };
    }
  }

  return null;
}

/**
 * Check if a tile can be added to a combination
 */
export function canAddTileToCombination(combination: Combination, tile: Tile): boolean {
  const newTiles = [...combination.tiles, tile];
  const newCombination: Combination = {
    ...combination,
    tiles: newTiles,
  };

  return validateCombination(newCombination);
}

/**
 * Check if a tile can replace a Joker in a combination
 */
export function canReplaceTileWithJoker(
  combination: Combination,
  tileIndex: number,
  joker: Tile
): boolean {
  if (!joker.isJoker) {
    return false;
  }

  const newTiles = [...combination.tiles];
  newTiles[tileIndex] = joker;

  const newCombination: Combination = {
    ...combination,
    tiles: newTiles,
  };

  return validateCombination(newCombination);
}

/**
 * Get all valid combinations from a set of tiles
 * This is useful for auto-suggesting combinations to players
 */
export function findAllValidCombinations(tiles: Tile[]): Combination[] {
  const combinations: Combination[] = [];

  // Try all possible subsets of 3+ tiles
  for (let size = 3; size <= tiles.length; size++) {
    const subsets = getSubsets(tiles, size);

    for (const subset of subsets) {
      const type = detectCombinationType(subset);
      if (type) {
        combinations.push({
          type,
          tiles: subset,
          isValid: true,
        });
      }
    }
  }

  return combinations;
}

/**
 * Helper function to get all subsets of a given size
 */
function getSubsets<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}
