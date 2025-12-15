import { Tile, Combination } from '../models/GameState.js';

/**
 * Game patterns for Remi pe Tablă scoring
 */
export type RemiPattern =
  | 'SIMPLE' // 250 points
  | 'SIMPLE_1_JOKER' // 200 points (1 Joker in formations)
  | 'SIMPLE_2_JOKER' // 150 points (2 Jokers in formations)
  | 'MOZAIC' // 250 points (1-2-3...13-1)
  | 'BICOLOR' // 500 points (max 2 colors in runs)
  | 'MINOR' // 500 points (tiles 1-7 only)
  | 'MAJOR' // 500 points (tiles 8-13 only)
  | 'SIMPLE_JOKER_LAUNCHED' // 500 points (Joker launched or closed with Joker)
  | 'MOZAIC_JOKER_LAUNCHED' // 500 points
  | 'LARGE_1_JOKER' // 400 points (Large game with 1 Joker in formation)
  | 'LARGE_2_JOKER' // 300 points (Large game with 2 Jokers in formation)
  | 'DOUBLES' // 1000 points (7 double tiles)
  | 'GRAND_SQUARE' // 1000 points (8 tiles same number)
  | 'MONOCOLOR' // 1000 points (all runs same color)
  | 'BICOLOR_JOKER_CLOSED' // 1000 points (Bicolor closed with Joker)
  | 'MINOR_JOKER_CLOSED' // 1000 points
  | 'MAJOR_JOKER_CLOSED' // 1000 points
  | 'JOKER_LAUNCHED_AND_CLOSED' // 1000 points (Joker launched AND closed with Joker)
  | 'TWO_JOKERS_LAUNCHED' // 1000 points
  | 'SPECIAL_1_JOKER' // 900 points (Special game with 1 Joker in formation)
  | 'SPECIAL_2_JOKER'; // 800 points (Special game with 2 Jokers in formation)

export interface PatternDetectionResult {
  pattern: RemiPattern;
  baseScore: number;
  description: string;
  isSpecialGame: boolean; // 1000+ points
  isLargeGame: boolean; // 500 points
}

/**
 * Detects the winning pattern and calculates score
 */
export class RemiPatternDetector {
  /**
   * Detect pattern from player's board and game state
   */
  static detectPattern(
    boardCombinations: Combination[],
    _finalTile: Tile | null, // The tile being discarded to close
    launchedJokers: Tile[], // Jokers that were launched (discarded) during game
    closedWithJoker: boolean // Is the final tile a Joker?
  ): PatternDetectionResult {
    const allTiles = boardCombinations.flatMap((c) => c.tiles);
    const jokersInFormations = allTiles.filter((t) => t.isJoker).length;
    const hasLaunchedJoker = launchedJokers.length > 0;

    // Check for special patterns first (1000 points)
    if (launchedJokers.length >= 2) {
      return {
        pattern: 'TWO_JOKERS_LAUNCHED',
        baseScore: 1000,
        description: 'Joc cu 2 Jokeri lansați',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    if (hasLaunchedJoker && closedWithJoker) {
      return {
        pattern: 'JOKER_LAUNCHED_AND_CLOSED',
        baseScore: 1000,
        description: 'Joc cu Joker lansat și închis în Joker',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    // Check Monocolor (all runs same color)
    if (this.isMonocolor(boardCombinations)) {
      if (jokersInFormations === 2) {
        return {
          pattern: 'SPECIAL_2_JOKER',
          baseScore: 800,
          description: 'Monocolor cu 2 Jokeri în formație',
          isSpecialGame: true,
          isLargeGame: false,
        };
      }
      if (jokersInFormations === 1) {
        return {
          pattern: 'SPECIAL_1_JOKER',
          baseScore: 900,
          description: 'Monocolor cu 1 Joker în formație',
          isSpecialGame: true,
          isLargeGame: false,
        };
      }
      return {
        pattern: 'MONOCOLOR',
        baseScore: 1000,
        description: 'Monocolor (suite de o singură culoare)',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    // Check Grand Square (8 tiles same number)
    if (this.isGrandSquare(boardCombinations)) {
      if (jokersInFormations === 2) {
        return {
          pattern: 'SPECIAL_2_JOKER',
          baseScore: 800,
          description: 'Grand Caré cu 2 Jokeri în formație',
          isSpecialGame: true,
          isLargeGame: false,
        };
      }
      if (jokersInFormations === 1) {
        return {
          pattern: 'SPECIAL_1_JOKER',
          baseScore: 900,
          description: 'Grand Caré cu 1 Joker în formație',
          isSpecialGame: true,
          isLargeGame: false,
        };
      }
      return {
        pattern: 'GRAND_SQUARE',
        baseScore: 1000,
        description: 'Grand Caré (8 piese cu același număr)',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    // Check Doubles (7 double tiles)
    if (this.isDoubles(boardCombinations)) {
      if (jokersInFormations === 2) {
        return {
          pattern: 'SPECIAL_2_JOKER',
          baseScore: 800,
          description: 'Duble cu 2 Jokeri în formație',
          isSpecialGame: true,
          isLargeGame: false,
        };
      }
      if (jokersInFormations === 1) {
        return {
          pattern: 'SPECIAL_1_JOKER',
          baseScore: 900,
          description: 'Duble cu 1 Joker în formație',
          isSpecialGame: true,
          isLargeGame: false,
        };
      }
      return {
        pattern: 'DOUBLES',
        baseScore: 1000,
        description: 'Duble (7 piese duble)',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    // Check large games (500 points)
    const isBicolor = this.isBicolor(boardCombinations);
    const isMinor = this.isMinor(allTiles);
    const isMajor = this.isMajor(allTiles);

    if (isBicolor && closedWithJoker) {
      return {
        pattern: 'BICOLOR_JOKER_CLOSED',
        baseScore: 1000,
        description: 'Bicolor închis în Joker',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    if (isMinor && closedWithJoker) {
      return {
        pattern: 'MINOR_JOKER_CLOSED',
        baseScore: 1000,
        description: 'Minore închis în Joker',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    if (isMajor && closedWithJoker) {
      return {
        pattern: 'MAJOR_JOKER_CLOSED',
        baseScore: 1000,
        description: 'Majore închis în Joker',
        isSpecialGame: true,
        isLargeGame: false,
      };
    }

    if (isBicolor) {
      if (jokersInFormations === 2) {
        return {
          pattern: 'LARGE_2_JOKER',
          baseScore: 300,
          description: 'Bicolor cu 2 Jokeri în formație',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      if (jokersInFormations === 1) {
        return {
          pattern: 'LARGE_1_JOKER',
          baseScore: 400,
          description: 'Bicolor cu 1 Joker în formație',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      return {
        pattern: 'BICOLOR',
        baseScore: 500,
        description: 'Bicolor (suite de maxim 2 culori)',
        isSpecialGame: false,
        isLargeGame: true,
      };
    }

    if (isMinor) {
      if (jokersInFormations === 2) {
        return {
          pattern: 'LARGE_2_JOKER',
          baseScore: 300,
          description: 'Minore cu 2 Jokeri în formație',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      if (jokersInFormations === 1) {
        return {
          pattern: 'LARGE_1_JOKER',
          baseScore: 400,
          description: 'Minore cu 1 Joker în formație',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      return {
        pattern: 'MINOR',
        baseScore: 500,
        description: 'Minore (piese până de la 1 la 7 inclusiv)',
        isSpecialGame: false,
        isLargeGame: true,
      };
    }

    if (isMajor) {
      if (jokersInFormations === 2) {
        return {
          pattern: 'LARGE_2_JOKER',
          baseScore: 300,
          description: 'Majore cu 2 Jokeri în formație',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      if (jokersInFormations === 1) {
        return {
          pattern: 'LARGE_1_JOKER',
          baseScore: 400,
          description: 'Majore cu 1 Joker în formație',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      return {
        pattern: 'MAJOR',
        baseScore: 500,
        description: 'Majore (piese de la 8 la 13 inclusiv)',
        isSpecialGame: false,
        isLargeGame: true,
      };
    }

    // Check Mozaic
    if (this.isMozaic(boardCombinations)) {
      if (hasLaunchedJoker || closedWithJoker) {
        return {
          pattern: 'MOZAIC_JOKER_LAUNCHED',
          baseScore: 500,
          description: 'Mozaic cu Joker lansat sau închis în Joker',
          isSpecialGame: false,
          isLargeGame: true,
        };
      }
      return {
        pattern: 'MOZAIC',
        baseScore: 250,
        description: 'Mozaic (piese de la 1 la 13-1)',
        isSpecialGame: false,
        isLargeGame: false,
      };
    }

    // Simple games
    if (hasLaunchedJoker || closedWithJoker) {
      return {
        pattern: 'SIMPLE_JOKER_LAUNCHED',
        baseScore: 500,
        description: 'Joc Simplu cu Joker lansat sau închis în Joker',
        isSpecialGame: false,
        isLargeGame: true,
      };
    }

    if (jokersInFormations === 2) {
      return {
        pattern: 'SIMPLE_2_JOKER',
        baseScore: 150,
        description: 'Joc Simplu cu 2 Jokeri în formații',
        isSpecialGame: false,
        isLargeGame: false,
      };
    }

    if (jokersInFormations === 1) {
      return {
        pattern: 'SIMPLE_1_JOKER',
        baseScore: 200,
        description: 'Joc Simplu cu 1 Joker în formații',
        isSpecialGame: false,
        isLargeGame: false,
      };
    }

    return {
      pattern: 'SIMPLE',
      baseScore: 250,
      description: 'Joc Simplu',
      isSpecialGame: false,
      isLargeGame: false,
    };
  }

  /**
   * Check if all runs are the same color (Monocolor)
   */
  private static isMonocolor(combinations: Combination[]): boolean {
    const runs = combinations.filter((c) => c.type === 'RUN');
    if (runs.length === 0) return false;

    const colors = new Set<string>();
    for (const run of runs) {
      for (const tile of run.tiles) {
        if (!tile.isJoker) {
          colors.add(tile.color);
        }
      }
    }

    return colors.size === 1;
  }

  /**
   * Check if board has 8 tiles with the same number (Grand Square)
   */
  private static isGrandSquare(combinations: Combination[]): boolean {
    const numberCounts = new Map<number, number>();

    for (const combo of combinations) {
      for (const tile of combo.tiles) {
        if (!tile.isJoker) {
          const count = numberCounts.get(tile.number) || 0;
          numberCounts.set(tile.number, count + 1);
        }
      }
    }

    return Array.from(numberCounts.values()).some((count) => count >= 8);
  }

  /**
   * Check if board has 7 double tiles (Doubles)
   */
  private static isDoubles(combinations: Combination[]): boolean {
    const numberCounts = new Map<number, number>();

    for (const combo of combinations) {
      for (const tile of combo.tiles) {
        if (!tile.isJoker) {
          const count = numberCounts.get(tile.number) || 0;
          numberCounts.set(tile.number, count + 1);
        }
      }
    }

    // Count how many numbers appear exactly 2 times
    const doubleCount = Array.from(numberCounts.values()).filter((count) => count === 2).length;
    return doubleCount >= 7;
  }

  /**
   * Check if only 2 colors used in runs (Bicolor)
   */
  private static isBicolor(combinations: Combination[]): boolean {
    const runs = combinations.filter((c) => c.type === 'RUN');
    if (runs.length === 0) return false;

    const colors = new Set<string>();
    for (const run of runs) {
      for (const tile of run.tiles) {
        if (!tile.isJoker) {
          colors.add(tile.color);
        }
      }
    }

    return colors.size <= 2 && colors.size > 0;
  }

  /**
   * Check if all tiles are 1-7 (Minor)
   */
  private static isMinor(tiles: Tile[]): boolean {
    return tiles.every((t) => t.isJoker || (t.number >= 1 && t.number <= 7));
  }

  /**
   * Check if all tiles are 8-13 (Major)
   */
  private static isMajor(tiles: Tile[]): boolean {
    return tiles.every((t) => t.isJoker || (t.number >= 8 && t.number <= 13));
  }

  /**
   * Check if board is Mozaic pattern (1-2-3...13-1)
   * First 4 tiles must be different colors, subsequent tiles different from neighbors
   */
  private static isMozaic(combinations: Combination[]): boolean {
    // Mozaic must be all runs
    if (combinations.some((c) => c.type !== 'RUN')) return false;

    // Get all tiles in order
    const allTiles = combinations.flatMap((c) => c.tiles);
    const nonJokerTiles = allTiles.filter((t) => !t.isJoker);

    // Must have most of the sequence (1-2-3...13-1)
    if (nonJokerTiles.length < 10) return false;

    // Check first 4 tiles have different colors
    if (nonJokerTiles.length >= 4) {
      const firstFourColors = new Set(nonJokerTiles.slice(0, 4).map((t) => t.color));
      if (firstFourColors.size < 4) return false;
    }

    // Check subsequent tiles are different from neighbors
    for (let i = 1; i < nonJokerTiles.length; i++) {
      if (nonJokerTiles[i].color === nonJokerTiles[i - 1].color) {
        return false;
      }
    }

    return true;
  }
}
