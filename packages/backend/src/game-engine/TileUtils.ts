import { Tile } from '../models/GameState.js';
import { randomInt } from 'crypto';

/**
 * Tile colors available in the game
 */
export const TILE_COLORS = ['RED', 'YELLOW', 'BLUE', 'BLACK'] as const;

/**
 * Number range for tiles (1-13)
 */
export const MIN_TILE_NUMBER = 1;
export const MAX_TILE_NUMBER = 13;

/**
 * Generate a complete set of tiles for Rummy PRO (106 tiles)
 * - 104 numbered tiles (2 of each number in each color)
 * - 2 Jokers
 */
export function generateTileSet(extraJokers: number = 0): Tile[] {
  const tiles: Tile[] = [];
  let tileId = 0;

  // Generate numbered tiles (2 of each)
  for (let copy = 0; copy < 2; copy++) {
    for (const color of TILE_COLORS) {
      for (let number = MIN_TILE_NUMBER; number <= MAX_TILE_NUMBER; number++) {
        tiles.push({
          id: `tile-${tileId++}`,
          number,
          color,
          isJoker: false,
        });
      }
    }
  }

  // Add base Jokers (2)
  for (let i = 0; i < 2; i++) {
    tiles.push({
      id: `joker-${i}`,
      number: 0,
      color: 'RED', // Jokers have a color but it doesn't matter
      isJoker: true,
    });
  }

  // Add extra purchased Jokers (up to 4 more, total 6)
  const maxExtraJokers = Math.min(extraJokers, 4);
  for (let i = 0; i < maxExtraJokers; i++) {
    tiles.push({
      id: `joker-extra-${i}`,
      number: 0,
      color: 'RED',
      isJoker: true,
    });
  }

  return tiles;
}

/**
 * Shuffle tiles using Fisher-Yates algorithm with crypto-secure randomness
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto.randomInt for cryptographically secure random numbers
    const j = randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Compare two tiles for equality
 */
export function tilesEqual(tile1: Tile, tile2: Tile): boolean {
  // Jokers are only equal if they have the same ID
  if (tile1.isJoker || tile2.isJoker) {
    return tile1.id === tile2.id;
  }

  // Regular tiles are equal if they have the same number and color
  return tile1.number === tile2.number && tile1.color === tile2.color;
}

/**
 * Compare tiles for sorting
 * Sort by color first, then by number
 */
export function compareTiles(tile1: Tile, tile2: Tile): number {
  // Jokers go to the end
  if (tile1.isJoker && !tile2.isJoker) return 1;
  if (!tile1.isJoker && tile2.isJoker) return -1;
  if (tile1.isJoker && tile2.isJoker) return 0;

  // Compare by color
  const colorOrder = { RED: 0, YELLOW: 1, BLUE: 2, BLACK: 3 };
  const colorDiff = colorOrder[tile1.color] - colorOrder[tile2.color];
  if (colorDiff !== 0) return colorDiff;

  // Compare by number
  return tile1.number - tile2.number;
}

/**
 * Sort tiles by color and number
 */
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort(compareTiles);
}

/**
 * Find a tile by ID in an array
 */
export function findTileById(tiles: Tile[], tileId: string): Tile | undefined {
  return tiles.find((tile) => tile.id === tileId);
}

/**
 * Remove a tile from an array by ID
 */
export function removeTileById(tiles: Tile[], tileId: string): Tile[] {
  return tiles.filter((tile) => tile.id !== tileId);
}

/**
 * Check if a tile can replace a Joker in a combination
 * (i.e., the tile matches what the Joker represents)
 */
export function canReplaceJoker(
  tile: Tile,
  jokerPosition: {
    number: number;
    color: string;
  }
): boolean {
  if (tile.isJoker) return false;
  return tile.number === jokerPosition.number && tile.color === jokerPosition.color;
}

/**
 * Get a string representation of a tile for debugging
 */
export function tileToString(tile: Tile): string {
  if (tile.isJoker) {
    return 'JOKER';
  }
  return `${tile.color[0]}${tile.number}`;
}

/**
 * Get string representation of multiple tiles
 */
export function tilesToString(tiles: Tile[]): string {
  return tiles.map(tileToString).join(' ');
}

/**
 * Count tiles by color
 */
export function countTilesByColor(tiles: Tile[]): Record<string, number> {
  const counts: Record<string, number> = {
    RED: 0,
    YELLOW: 0,
    BLUE: 0,
    BLACK: 0,
  };

  tiles.forEach((tile) => {
    if (!tile.isJoker) {
      counts[tile.color]++;
    }
  });

  return counts;
}

/**
 * Count Jokers in a tile array
 */
export function countJokers(tiles: Tile[]): number {
  return tiles.filter((tile) => tile.isJoker).length;
}

/**
 * Validate that a tile set has the correct composition
 */
export function validateTileSet(tiles: Tile[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Count tiles by number and color
  const tileCounts: Record<string, number> = {};
  let jokerCount = 0;

  tiles.forEach((tile) => {
    if (tile.isJoker) {
      jokerCount++;
    } else {
      const key = `${tile.color}-${tile.number}`;
      tileCounts[key] = (tileCounts[key] || 0) + 1;
    }
  });

  // Check that each numbered tile appears exactly twice
  for (const color of TILE_COLORS) {
    for (let number = MIN_TILE_NUMBER; number <= MAX_TILE_NUMBER; number++) {
      const key = `${color}-${number}`;
      const count = tileCounts[key] || 0;
      if (count !== 2) {
        errors.push(`Tile ${color} ${number} appears ${count} times (expected 2)`);
      }
    }
  }

  // Check Joker count (2-6)
  if (jokerCount < 2 || jokerCount > 6) {
    errors.push(`Invalid Joker count: ${jokerCount} (expected 2-6)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
