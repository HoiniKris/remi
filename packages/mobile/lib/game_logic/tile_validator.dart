import '../widgets/tile_widget.dart';

/// Advanced tile validation logic for Rummy game
class TileValidator {
  /// Validates if tiles form a valid RUN (sequence)
  /// Rules: 3+ consecutive numbers, same color
  static bool isValidRun(List<TileData> tiles) {
    if (tiles.length < 3) return false;
    
    // Check all tiles have same color
    final color = tiles.first.color;
    if (!tiles.every((tile) => tile.color == color || tile.isJoker)) {
      return false;
    }
    
    // Sort tiles by number (excluding jokers)
    final sortedTiles = List<TileData>.from(tiles);
    sortedTiles.sort((a, b) => a.number.compareTo(b.number));
    
    // Check consecutive numbers (allowing jokers as wildcards)
    int expectedNumber = sortedTiles.first.number;
    for (var tile in sortedTiles) {
      if (tile.isJoker) continue;
      
      if (tile.number != expectedNumber && tile.number != expectedNumber + 1) {
        return false;
      }
      expectedNumber = tile.number + 1;
    }
    
    return true;
  }
  
  /// Validates if tiles form a valid SET (group)
  /// Rules: 3-4 tiles, same number, different colors
  static bool isValidSet(List<TileData> tiles) {
    if (tiles.length < 3 || tiles.length > 4) return false;
    
    // Get the number (excluding jokers)
    final nonJokers = tiles.where((t) => !t.isJoker).toList();
    if (nonJokers.isEmpty) return false;
    
    final number = nonJokers.first.number;
    
    // Check all non-jokers have same number
    if (!nonJokers.every((tile) => tile.number == number)) {
      return false;
    }
    
    // Check all colors are different
    final colors = nonJokers.map((t) => t.color).toSet();
    if (colors.length != nonJokers.length) {
      return false; // Duplicate colors
    }
    
    return true;
  }
  
  /// Detects win pattern type
  static WinPattern? detectWinPattern(List<List<TileData>> combinations) {
    final allTiles = combinations.expand((c) => c).toList();
    final hasJoker = allTiles.any((t) => t.isJoker);
    
    // Clean finish (no joker)
    if (!hasJoker) return WinPattern.clean;
    
    // Free joker (joker not in any combination)
    final jokerInCombination = combinations.any((c) => c.any((t) => t.isJoker));
    if (!jokerInCombination) return WinPattern.freeJoker;
    
    // Monochrome (all same color)
    final colors = allTiles.where((t) => !t.isJoker).map((t) => t.color).toSet();
    if (colors.length == 1) return WinPattern.monochrome;
    
    // Bicolor (only 2 colors)
    if (colors.length == 2) return WinPattern.bicolor;
    
    // Minor (all tiles < 7)
    final allMinor = allTiles.where((t) => !t.isJoker).every((t) => t.number < 7);
    if (allMinor) return WinPattern.minor;
    
    // Major (all tiles > 7)
    final allMajor = allTiles.where((t) => !t.isJoker).every((t) => t.number > 7);
    if (allMajor) return WinPattern.major;
    
    return WinPattern.normal;
  }
  
  /// Calculate score based on win pattern
  static int calculateScore(WinPattern pattern, int playerCount) {
    final baseScores = {
      WinPattern.normal: 250,
      WinPattern.clean: 350,
      WinPattern.freeJoker: 500,
      WinPattern.monochrome: 1000,
      WinPattern.bicolor: 250,
      WinPattern.minor: 150,
      WinPattern.major: 150,
      WinPattern.grandSquare: 800,
      WinPattern.mozaic: 400,
    };
    
    return (baseScores[pattern] ?? 250) * playerCount;
  }
  
  /// Suggests valid moves for AI or hints
  static List<List<TileData>> suggestCombinations(List<TileData> hand) {
    final suggestions = <List<TileData>>[];
    
    // Try to find runs
    for (var color in TileColor.values) {
      final colorTiles = hand.where((t) => t.color == color || t.isJoker).toList();
      if (colorTiles.length >= 3) {
        // Check for consecutive sequences
        for (int i = 0; i < colorTiles.length - 2; i++) {
          final potential = colorTiles.sublist(i, i + 3);
          if (isValidRun(potential)) {
            suggestions.add(potential);
          }
        }
      }
    }
    
    // Try to find sets
    final byNumber = <int, List<TileData>>{};
    for (var tile in hand) {
      if (!tile.isJoker) {
        byNumber.putIfAbsent(tile.number, () => []).add(tile);
      }
    }
    
    for (var tiles in byNumber.values) {
      if (tiles.length >= 3 && isValidSet(tiles)) {
        suggestions.add(tiles);
      }
    }
    
    return suggestions;
  }
}

enum WinPattern {
  normal,
  clean,
  freeJoker,
  monochrome,
  bicolor,
  minor,
  major,
  grandSquare,
  mozaic,
}
