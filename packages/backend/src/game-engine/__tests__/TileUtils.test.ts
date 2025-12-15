import { describe, it, expect } from '@jest/globals';
import {
  generateTileSet,
  shuffleTiles,
  tilesEqual,
  compareTiles,
  sortTiles,
  findTileById,
  removeTileById,
  canReplaceJoker,
  tileToString,
  countTilesByColor,
  countJokers,
  validateTileSet,
  TILE_COLORS,
  MIN_TILE_NUMBER,
  MAX_TILE_NUMBER,
} from '../TileUtils';
import { Tile } from '../../models/GameState';

describe('TileUtils', () => {
  describe('generateTileSet', () => {
    it('should generate 106 tiles for standard Rummy PRO', () => {
      const tiles = generateTileSet();
      expect(tiles.length).toBe(106);
    });

    it('should generate 110 tiles with 4 extra Jokers', () => {
      const tiles = generateTileSet(4);
      expect(tiles.length).toBe(110);
    });

    it('should cap extra Jokers at 4', () => {
      const tiles = generateTileSet(10); // Request 10, should only add 4
      expect(tiles.length).toBe(110);
    });

    it('should have exactly 2 of each numbered tile', () => {
      const tiles = generateTileSet();
      const numberedTiles = tiles.filter((t) => !t.isJoker);

      for (const color of TILE_COLORS) {
        for (let number = MIN_TILE_NUMBER; number <= MAX_TILE_NUMBER; number++) {
          const count = numberedTiles.filter(
            (t) => t.number === number && t.color === color
          ).length;
          expect(count).toBe(2);
        }
      }
    });

    it('should have at least 2 Jokers', () => {
      const tiles = generateTileSet();
      const jokers = tiles.filter((t) => t.isJoker);
      expect(jokers.length).toBeGreaterThanOrEqual(2);
    });

    it('should have unique IDs for all tiles', () => {
      const tiles = generateTileSet(4);
      const ids = tiles.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(tiles.length);
    });
  });

  describe('shuffleTiles', () => {
    it('should return same number of tiles', () => {
      const tiles = generateTileSet();
      const shuffled = shuffleTiles(tiles);
      expect(shuffled.length).toBe(tiles.length);
    });

    it('should contain all the same tiles', () => {
      const tiles = generateTileSet();
      const shuffled = shuffleTiles(tiles);

      // Check that all original tiles are in shuffled array
      tiles.forEach((tile) => {
        expect(shuffled.find((t) => t.id === tile.id)).toBeDefined();
      });
    });

    it('should not modify original array', () => {
      const tiles = generateTileSet();
      const original = [...tiles];
      shuffleTiles(tiles);
      expect(tiles).toEqual(original);
    });

    it('should produce different order (probabilistic)', () => {
      const tiles = generateTileSet();
      const shuffled = shuffleTiles(tiles);

      // Check if at least some tiles are in different positions
      let differentPositions = 0;
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i].id !== shuffled[i].id) {
          differentPositions++;
        }
      }

      // With 106 tiles, we expect most to be in different positions
      expect(differentPositions).toBeGreaterThan(50);
    });
  });

  describe('tilesEqual', () => {
    it('should return true for identical regular tiles', () => {
      const tile1: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const tile2: Tile = { id: '2', number: 5, color: 'RED', isJoker: false };
      expect(tilesEqual(tile1, tile2)).toBe(true);
    });

    it('should return false for different numbers', () => {
      const tile1: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const tile2: Tile = { id: '2', number: 6, color: 'RED', isJoker: false };
      expect(tilesEqual(tile1, tile2)).toBe(false);
    });

    it('should return false for different colors', () => {
      const tile1: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const tile2: Tile = { id: '2', number: 5, color: 'BLUE', isJoker: false };
      expect(tilesEqual(tile1, tile2)).toBe(false);
    });

    it('should only match Jokers by ID', () => {
      const joker1: Tile = { id: 'j1', number: 0, color: 'RED', isJoker: true };
      const joker2: Tile = { id: 'j2', number: 0, color: 'RED', isJoker: true };
      expect(tilesEqual(joker1, joker2)).toBe(false);
      expect(tilesEqual(joker1, joker1)).toBe(true);
    });
  });

  describe('compareTiles', () => {
    it('should sort Jokers to the end', () => {
      const regular: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const joker: Tile = { id: 'j1', number: 0, color: 'RED', isJoker: true };
      expect(compareTiles(regular, joker)).toBeLessThan(0);
      expect(compareTiles(joker, regular)).toBeGreaterThan(0);
    });

    it('should sort by color first', () => {
      const red: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const blue: Tile = { id: '2', number: 5, color: 'BLUE', isJoker: false };
      expect(compareTiles(red, blue)).toBeLessThan(0);
    });

    it('should sort by number within same color', () => {
      const tile5: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const tile7: Tile = { id: '2', number: 7, color: 'RED', isJoker: false };
      expect(compareTiles(tile5, tile7)).toBeLessThan(0);
    });
  });

  describe('sortTiles', () => {
    it('should sort tiles by color and number', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'BLUE', isJoker: false },
        { id: '2', number: 3, color: 'RED', isJoker: false },
        { id: '3', number: 5, color: 'RED', isJoker: false },
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
      ];

      const sorted = sortTiles(tiles);

      expect(sorted[0].number).toBe(3);
      expect(sorted[0].color).toBe('RED');
      expect(sorted[1].number).toBe(5);
      expect(sorted[1].color).toBe('RED');
      expect(sorted[2].number).toBe(7);
      expect(sorted[2].color).toBe('BLUE');
      expect(sorted[3].isJoker).toBe(true);
    });

    it('should not modify original array', () => {
      const tiles: Tile[] = [
        { id: '1', number: 7, color: 'BLUE', isJoker: false },
        { id: '2', number: 3, color: 'RED', isJoker: false },
      ];
      const original = [...tiles];
      sortTiles(tiles);
      expect(tiles).toEqual(original);
    });
  });

  describe('findTileById', () => {
    it('should find tile by ID', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 7, color: 'BLUE', isJoker: false },
      ];

      const found = findTileById(tiles, 'tile-2');
      expect(found).toBeDefined();
      expect(found?.number).toBe(7);
    });

    it('should return undefined for non-existent ID', () => {
      const tiles: Tile[] = [{ id: 'tile-1', number: 5, color: 'RED', isJoker: false }];

      const found = findTileById(tiles, 'tile-999');
      expect(found).toBeUndefined();
    });
  });

  describe('removeTileById', () => {
    it('should remove tile by ID', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 7, color: 'BLUE', isJoker: false },
        { id: 'tile-3', number: 9, color: 'YELLOW', isJoker: false },
      ];

      const result = removeTileById(tiles, 'tile-2');
      expect(result.length).toBe(2);
      expect(result.find((t) => t.id === 'tile-2')).toBeUndefined();
    });

    it('should not modify original array', () => {
      const tiles: Tile[] = [
        { id: 'tile-1', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 7, color: 'BLUE', isJoker: false },
      ];
      const original = [...tiles];
      removeTileById(tiles, 'tile-1');
      expect(tiles).toEqual(original);
    });
  });

  describe('canReplaceJoker', () => {
    it('should return true for matching tile', () => {
      const tile: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      const jokerPosition = { number: 5, color: 'RED' };
      expect(canReplaceJoker(tile, jokerPosition)).toBe(true);
    });

    it('should return false for non-matching number', () => {
      const tile: Tile = { id: '1', number: 6, color: 'RED', isJoker: false };
      const jokerPosition = { number: 5, color: 'RED' };
      expect(canReplaceJoker(tile, jokerPosition)).toBe(false);
    });

    it('should return false for non-matching color', () => {
      const tile: Tile = { id: '1', number: 5, color: 'BLUE', isJoker: false };
      const jokerPosition = { number: 5, color: 'RED' };
      expect(canReplaceJoker(tile, jokerPosition)).toBe(false);
    });

    it('should return false for Joker tile', () => {
      const joker: Tile = { id: 'j1', number: 0, color: 'RED', isJoker: true };
      const jokerPosition = { number: 5, color: 'RED' };
      expect(canReplaceJoker(joker, jokerPosition)).toBe(false);
    });
  });

  describe('tileToString', () => {
    it('should format regular tiles', () => {
      const tile: Tile = { id: '1', number: 5, color: 'RED', isJoker: false };
      expect(tileToString(tile)).toBe('R5');
    });

    it('should format Jokers', () => {
      const joker: Tile = { id: 'j1', number: 0, color: 'RED', isJoker: true };
      expect(tileToString(joker)).toBe('JOKER');
    });
  });

  describe('countTilesByColor', () => {
    it('should count tiles by color', () => {
      const tiles: Tile[] = [
        { id: '1', number: 5, color: 'RED', isJoker: false },
        { id: '2', number: 7, color: 'RED', isJoker: false },
        { id: '3', number: 9, color: 'BLUE', isJoker: false },
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
      ];

      const counts = countTilesByColor(tiles);
      expect(counts.RED).toBe(2);
      expect(counts.BLUE).toBe(1);
      expect(counts.YELLOW).toBe(0);
      expect(counts.BLACK).toBe(0);
    });
  });

  describe('countJokers', () => {
    it('should count Jokers', () => {
      const tiles: Tile[] = [
        { id: '1', number: 5, color: 'RED', isJoker: false },
        { id: 'j1', number: 0, color: 'RED', isJoker: true },
        { id: 'j2', number: 0, color: 'RED', isJoker: true },
      ];

      expect(countJokers(tiles)).toBe(2);
    });
  });

  describe('validateTileSet', () => {
    it('should validate correct tile set', () => {
      const tiles = generateTileSet();
      const result = validateTileSet(tiles);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing tiles', () => {
      const tiles = generateTileSet();
      // Remove one tile
      tiles.pop();

      const result = validateTileSet(tiles);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect incorrect Joker count', () => {
      const tiles = generateTileSet();
      // Remove all Jokers
      const withoutJokers = tiles.filter((t) => !t.isJoker);

      const result = validateTileSet(withoutJokers);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Joker'))).toBe(true);
    });
  });
});
