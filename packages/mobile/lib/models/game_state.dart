import 'package:equatable/equatable.dart';
import '../widgets/tile_widget.dart';

class GameState extends Equatable {
  final String? gameId;
  final String? roomId;
  final GameStatus status;
  final List<TileData> playerHand;
  final List<List<TileData>> privateBoard;
  final List<TileData> discardPile;
  final int stockCount;
  final String? currentTurn;
  final String? playerId;
  final List<Player> players;
  final String? error;
  final bool isMyTurn;

  const GameState({
    this.gameId,
    this.roomId,
    this.status = GameStatus.idle,
    this.playerHand = const [],
    this.privateBoard = const [],
    this.discardPile = const [],
    this.stockCount = 0,
    this.currentTurn,
    this.playerId,
    this.players = const [],
    this.error,
    this.isMyTurn = false,
  });

  GameState copyWith({
    String? gameId,
    String? roomId,
    GameStatus? status,
    List<TileData>? playerHand,
    List<List<TileData>>? privateBoard,
    List<TileData>? discardPile,
    int? stockCount,
    String? currentTurn,
    String? playerId,
    List<Player>? players,
    String? error,
    bool? isMyTurn,
  }) {
    return GameState(
      gameId: gameId ?? this.gameId,
      roomId: roomId ?? this.roomId,
      status: status ?? this.status,
      playerHand: playerHand ?? this.playerHand,
      privateBoard: privateBoard ?? this.privateBoard,
      discardPile: discardPile ?? this.discardPile,
      stockCount: stockCount ?? this.stockCount,
      currentTurn: currentTurn ?? this.currentTurn,
      playerId: playerId ?? this.playerId,
      players: players ?? this.players,
      error: error,
      isMyTurn: isMyTurn ?? this.isMyTurn,
    );
  }

  @override
  List<Object?> get props => [
        gameId,
        roomId,
        status,
        playerHand,
        privateBoard,
        discardPile,
        stockCount,
        currentTurn,
        playerId,
        players,
        error,
        isMyTurn,
      ];
}

enum GameStatus {
  idle,
  connecting,
  connected,
  inLobby,
  playing,
  finished,
  error,
}

class Player extends Equatable {
  final String id;
  final String name;
  final int tileCount;
  final bool isReady;

  const Player({
    required this.id,
    required this.name,
    required this.tileCount,
    this.isReady = false,
  });

  factory Player.fromJson(Map<String, dynamic> json) {
    return Player(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Player',
      tileCount: json['tileCount'] as int? ?? 0,
      isReady: json['isReady'] as bool? ?? false,
    );
  }

  @override
  List<Object?> get props => [id, name, tileCount, isReady];
}

// Helper to convert backend tile format to TileData
TileData tileFromJson(Map<String, dynamic> json) {
  return TileData(
    number: json['number'] as int,
    color: _colorFromString(json['color'] as String),
    isJoker: json['isJoker'] as bool? ?? false,
  );
}

TileColor _colorFromString(String color) {
  switch (color.toLowerCase()) {
    case 'red':
      return TileColor.red;
    case 'blue':
      return TileColor.blue;
    case 'yellow':
      return TileColor.yellow;
    case 'black':
      return TileColor.black;
    default:
      return TileColor.red;
  }
}

// Helper to convert TileData to backend format
Map<String, dynamic> tileToJson(TileData tile) {
  return {
    'number': tile.number,
    'color': tile.color.toString().split('.').last,
    'isJoker': tile.isJoker,
  };
}
