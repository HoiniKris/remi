import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../widgets/tile_widget.dart';
import '../game_logic/tile_validator.dart';

// Events
abstract class GameEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class InitializeGame extends GameEvent {
  final String gameMode;
  final int playerCount;
  
  InitializeGame(this.gameMode, this.playerCount);
  
  @override
  List<Object?> get props => [gameMode, playerCount];
}

class DrawTile extends GameEvent {
  final bool fromStock;
  
  DrawTile({this.fromStock = true});
  
  @override
  List<Object?> get props => [fromStock];
}

class DiscardTile extends GameEvent {
  final TileData tile;
  
  DiscardTile(this.tile);
  
  @override
  List<Object?> get props => [tile];
}

class MeldCombination extends GameEvent {
  final List<TileData> tiles;
  
  MeldCombination(this.tiles);
  
  @override
  List<Object?> get props => [tiles];
}

class ReplaceJoker extends GameEvent {
  final TileData joker;
  final TileData replacement;
  
  ReplaceJoker(this.joker, this.replacement);
  
  @override
  List<Object?> get props => [joker, replacement];
}

class AttemptClose extends GameEvent {}

class NextTurn extends GameEvent {}

// States
abstract class GameState extends Equatable {
  @override
  List<Object?> get props => [];
}

class GameInitial extends GameState {}

class GameLoading extends GameState {}

class GameInProgress extends GameState {
  final String gameId;
  final String gameMode;
  final List<PlayerState> players;
  final int currentPlayerIndex;
  final List<TileData> stock;
  final List<TileData> discardPile;
  final List<Combination> table;
  final GamePhase phase;
  final int turnTimeRemaining;
  
  GameInProgress({
    required this.gameId,
    required this.gameMode,
    required this.players,
    required this.currentPlayerIndex,
    required this.stock,
    required this.discardPile,
    required this.table,
    required this.phase,
    this.turnTimeRemaining = 30,
  });
  
  PlayerState get currentPlayer => players[currentPlayerIndex];
  
  @override
  List<Object?> get props => [
        gameId,
        gameMode,
        players,
        currentPlayerIndex,
        stock,
        discardPile,
        table,
        phase,
        turnTimeRemaining,
      ];
  
  GameInProgress copyWith({
    String? gameId,
    String? gameMode,
    List<PlayerState>? players,
    int? currentPlayerIndex,
    List<TileData>? stock,
    List<TileData>? discardPile,
    List<Combination>? table,
    GamePhase? phase,
    int? turnTimeRemaining,
  }) {
    return GameInProgress(
      gameId: gameId ?? this.gameId,
      gameMode: gameMode ?? this.gameMode,
      players: players ?? this.players,
      currentPlayerIndex: currentPlayerIndex ?? this.currentPlayerIndex,
      stock: stock ?? this.stock,
      discardPile: discardPile ?? this.discardPile,
      table: table ?? this.table,
      phase: phase ?? this.phase,
      turnTimeRemaining: turnTimeRemaining ?? this.turnTimeRemaining,
    );
  }
}

class GameCompleted extends GameState {
  final String winnerId;
  final WinPattern pattern;
  final int score;
  final Map<String, int> finalScores;
  
  GameCompleted({
    required this.winnerId,
    required this.pattern,
    required this.score,
    required this.finalScores,
  });
  
  @override
  List<Object?> get props => [winnerId, pattern, score, finalScores];
}

class GameError extends GameState {
  final String message;
  
  GameError(this.message);
  
  @override
  List<Object?> get props => [message];
}

// Supporting classes
class PlayerState extends Equatable {
  final String id;
  final String name;
  final List<TileData> hand;
  final int score;
  final bool isConnected;
  final int disconnections;
  
  const PlayerState({
    required this.id,
    required this.name,
    required this.hand,
    required this.score,
    this.isConnected = true,
    this.disconnections = 0,
  });
  
  @override
  List<Object?> get props => [id, name, hand, score, isConnected, disconnections];
  
  PlayerState copyWith({
    String? id,
    String? name,
    List<TileData>? hand,
    int? score,
    bool? isConnected,
    int? disconnections,
  }) {
    return PlayerState(
      id: id ?? this.id,
      name: name ?? this.name,
      hand: hand ?? this.hand,
      score: score ?? this.score,
      isConnected: isConnected ?? this.isConnected,
      disconnections: disconnections ?? this.disconnections,
    );
  }
}

class Combination extends Equatable {
  final String id;
  final CombinationType type;
  final List<TileData> tiles;
  final bool isValid;
  
  const Combination({
    required this.id,
    required this.type,
    required this.tiles,
    required this.isValid,
  });
  
  @override
  List<Object?> get props => [id, type, tiles, isValid];
}

enum CombinationType { run, set }
enum GamePhase { draw, discard, meld, close }

// BLoC
class GameBloc extends Bloc<GameEvent, GameState> {
  GameBloc() : super(GameInitial()) {
    on<InitializeGame>(_onInitializeGame);
    on<DrawTile>(_onDrawTile);
    on<DiscardTile>(_onDiscardTile);
    on<MeldCombination>(_onMeldCombination);
    on<ReplaceJoker>(_onReplaceJoker);
    on<AttemptClose>(_onAttemptClose);
    on<NextTurn>(_onNextTurn);
  }
  
  void _onInitializeGame(InitializeGame event, Emitter<GameState> emit) {
    emit(GameLoading());
    
    // Generate tile set (106 tiles)
    final tiles = _generateTileSet();
    
    // Shuffle tiles
    tiles.shuffle();
    
    // Create players
    final players = List.generate(
      event.playerCount,
      (i) => PlayerState(
        id: 'player-$i',
        name: 'Player ${i + 1}',
        hand: [],
        score: 0,
      ),
    );
    
    // Deal tiles (14 per player, 15 for first player)
    int tileIndex = 0;
    for (int i = 0; i < players.length; i++) {
      final handSize = i == 0 ? 15 : 14;
      final hand = tiles.sublist(tileIndex, tileIndex + handSize);
      players[i] = players[i].copyWith(hand: hand);
      tileIndex += handSize;
    }
    
    // Remaining tiles go to stock
    final stock = tiles.sublist(tileIndex);
    
    emit(GameInProgress(
      gameId: DateTime.now().millisecondsSinceEpoch.toString(),
      gameMode: event.gameMode,
      players: players,
      currentPlayerIndex: 0,
      stock: stock,
      discardPile: [],
      table: [],
      phase: GamePhase.draw,
    ));
  }
  
  void _onDrawTile(DrawTile event, Emitter<GameState> emit) {
    if (state is! GameInProgress) return;
    final current = state as GameInProgress;
    
    if (current.phase != GamePhase.draw) return;
    if (current.stock.isEmpty) return;
    
    final drawnTile = event.fromStock
        ? current.stock.first
        : current.discardPile.isNotEmpty
            ? current.discardPile.last
            : current.stock.first;
    
    final newStock = event.fromStock
        ? current.stock.sublist(1)
        : current.stock;
    
    final newDiscardPile = !event.fromStock && current.discardPile.isNotEmpty
        ? current.discardPile.sublist(0, current.discardPile.length - 1)
        : current.discardPile;
    
    final updatedPlayers = List<PlayerState>.from(current.players);
    final currentPlayer = updatedPlayers[current.currentPlayerIndex];
    updatedPlayers[current.currentPlayerIndex] = currentPlayer.copyWith(
      hand: [...currentPlayer.hand, drawnTile],
    );
    
    emit(current.copyWith(
      players: updatedPlayers,
      stock: newStock,
      discardPile: newDiscardPile,
      phase: GamePhase.discard,
    ));
  }
  
  void _onDiscardTile(DiscardTile event, Emitter<GameState> emit) {
    if (state is! GameInProgress) return;
    final current = state as GameInProgress;
    
    if (current.phase != GamePhase.discard) return;
    
    final updatedPlayers = List<PlayerState>.from(current.players);
    final currentPlayer = updatedPlayers[current.currentPlayerIndex];
    
    final newHand = List<TileData>.from(currentPlayer.hand);
    newHand.removeWhere((t) =>
        t.number == event.tile.number &&
        t.color == event.tile.color &&
        t.isJoker == event.tile.isJoker);
    
    updatedPlayers[current.currentPlayerIndex] = currentPlayer.copyWith(
      hand: newHand,
    );
    
    emit(current.copyWith(
      players: updatedPlayers,
      discardPile: [...current.discardPile, event.tile],
      phase: GamePhase.draw,
    ));
    
    // Auto-advance to next turn
    add(NextTurn());
  }
  
  void _onMeldCombination(MeldCombination event, Emitter<GameState> emit) {
    if (state is! GameInProgress) return;
    final current = state as GameInProgress;
    
    // Validate combination
    final isValidRun = TileValidator.isValidRun(event.tiles);
    final isValidSet = TileValidator.isValidSet(event.tiles);
    
    if (!isValidRun && !isValidSet) {
      emit(GameError('Invalid combination'));
      emit(current);
      return;
    }
    
    final combination = Combination(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: isValidRun ? CombinationType.run : CombinationType.set,
      tiles: event.tiles,
      isValid: true,
    );
    
    // Remove tiles from player's hand
    final updatedPlayers = List<PlayerState>.from(current.players);
    final currentPlayer = updatedPlayers[current.currentPlayerIndex];
    final newHand = List<TileData>.from(currentPlayer.hand);
    
    for (var tile in event.tiles) {
      newHand.removeWhere((t) =>
          t.number == tile.number &&
          t.color == tile.color &&
          t.isJoker == tile.isJoker);
    }
    
    updatedPlayers[current.currentPlayerIndex] = currentPlayer.copyWith(
      hand: newHand,
    );
    
    emit(current.copyWith(
      players: updatedPlayers,
      table: [...current.table, combination],
    ));
  }
  
  void _onReplaceJoker(ReplaceJoker event, Emitter<GameState> emit) {
    if (state is! GameInProgress) return;
    final current = state as GameInProgress;
    
    // Find combination with joker
    final updatedTable = List<Combination>.from(current.table);
    
    for (int i = 0; i < updatedTable.length; i++) {
      final combo = updatedTable[i];
      final jokerIndex = combo.tiles.indexWhere((t) => t.isJoker);
      
      if (jokerIndex != -1) {
        // Replace joker with real tile
        final newTiles = List<TileData>.from(combo.tiles);
        newTiles[jokerIndex] = event.replacement;
        
        updatedTable[i] = Combination(
          id: combo.id,
          type: combo.type,
          tiles: newTiles,
          isValid: true,
        );
        
        // Add joker to player's hand
        final updatedPlayers = List<PlayerState>.from(current.players);
        final currentPlayer = updatedPlayers[current.currentPlayerIndex];
        updatedPlayers[current.currentPlayerIndex] = currentPlayer.copyWith(
          hand: [...currentPlayer.hand, event.joker],
        );
        
        emit(current.copyWith(
          players: updatedPlayers,
          table: updatedTable,
        ));
        break;
      }
    }
  }
  
  void _onAttemptClose(AttemptClose event, Emitter<GameState> emit) {
    if (state is! GameInProgress) return;
    final current = state as GameInProgress;
    
    final currentPlayer = current.currentPlayer;
    
    // Check if player can close (1 tile left)
    if (currentPlayer.hand.length != 1) {
      emit(GameError('Cannot close: must have exactly 1 tile remaining'));
      emit(current);
      return;
    }
    
    // Detect win pattern
    final pattern = TileValidator.detectWinPattern(
      current.table.map((c) => c.tiles).toList(),
    );
    
    // Calculate score
    final score = TileValidator.calculateScore(
      pattern ?? WinPattern.normal,
      current.players.length,
    );
    
    // Create final scores map
    final finalScores = <String, int>{};
    for (var player in current.players) {
      if (player.id == currentPlayer.id) {
        finalScores[player.id] = player.score + score;
      } else {
        finalScores[player.id] = player.score - (score ~/ (current.players.length - 1));
      }
    }
    
    emit(GameCompleted(
      winnerId: currentPlayer.id,
      pattern: pattern ?? WinPattern.normal,
      score: score,
      finalScores: finalScores,
    ));
  }
  
  void _onNextTurn(NextTurn event, Emitter<GameState> emit) {
    if (state is! GameInProgress) return;
    final current = state as GameInProgress;
    
    final nextIndex = (current.currentPlayerIndex + 1) % current.players.length;
    
    emit(current.copyWith(
      currentPlayerIndex: nextIndex,
      phase: GamePhase.draw,
      turnTimeRemaining: 30,
    ));
  }
  
  List<TileData> _generateTileSet() {
    final tiles = <TileData>[];
    
    // Generate numbered tiles (1-13 in 4 colors, each appears twice)
    for (var color in TileColor.values) {
      for (int number = 1; number <= 13; number++) {
        tiles.add(TileData(number: number, color: color));
        tiles.add(TileData(number: number, color: color)); // Duplicate
      }
    }
    
    // Add 2 jokers
    tiles.add(TileData(number: 0, color: TileColor.red, isJoker: true));
    tiles.add(TileData(number: 0, color: TileColor.blue, isJoker: true));
    
    return tiles;
  }
}
