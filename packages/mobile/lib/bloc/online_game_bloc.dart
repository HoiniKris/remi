import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../services/websocket_service.dart';
import '../models/game_state.dart';
import '../widgets/tile_widget.dart';

// Events
abstract class OnlineGameEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class ConnectToServer extends OnlineGameEvent {
  final String serverUrl;
  ConnectToServer(this.serverUrl);
  @override
  List<Object?> get props => [serverUrl];
}

class CreateOnlineGame extends OnlineGameEvent {
  final String gameType;
  final int maxPlayers;
  CreateOnlineGame(this.gameType, this.maxPlayers);
  @override
  List<Object?> get props => [gameType, maxPlayers];
}

class JoinOnlineGame extends OnlineGameEvent {
  final String gameId;
  JoinOnlineGame(this.gameId);
  @override
  List<Object?> get props => [gameId];
}

class StartOnlineGame extends OnlineGameEvent {}

class DrawOnlineTile extends OnlineGameEvent {
  final String source; // 'stock' or 'discard'
  DrawOnlineTile(this.source);
  @override
  List<Object?> get props => [source];
}

class DiscardOnlineTile extends OnlineGameEvent {
  final TileData tile;
  DiscardOnlineTile(this.tile);
  @override
  List<Object?> get props => [tile];
}

class PlaceOnlineTiles extends OnlineGameEvent {
  final List<TileData> tiles;
  PlaceOnlineTiles(this.tiles);
  @override
  List<Object?> get props => [tiles];
}

class CloseOnlineGame extends OnlineGameEvent {}

class WebSocketMessageReceived extends OnlineGameEvent {
  final Map<String, dynamic> message;
  WebSocketMessageReceived(this.message);
  @override
  List<Object?> get props => [message];
}

class DisconnectFromServer extends OnlineGameEvent {}

// BLoC
class OnlineGameBloc extends Bloc<OnlineGameEvent, GameState> {
  final WebSocketService _wsService = WebSocketService();
  StreamSubscription? _wsSubscription;

  OnlineGameBloc() : super(const GameState()) {
    on<ConnectToServer>(_onConnectToServer);
    on<CreateOnlineGame>(_onCreateOnlineGame);
    on<JoinOnlineGame>(_onJoinOnlineGame);
    on<StartOnlineGame>(_onStartOnlineGame);
    on<DrawOnlineTile>(_onDrawOnlineTile);
    on<DiscardOnlineTile>(_onDiscardOnlineTile);
    on<PlaceOnlineTiles>(_onPlaceOnlineTiles);
    on<CloseOnlineGame>(_onCloseOnlineGame);
    on<WebSocketMessageReceived>(_onWebSocketMessageReceived);
    on<DisconnectFromServer>(_onDisconnectFromServer);
  }

  Future<void> _onConnectToServer(
    ConnectToServer event,
    Emitter<GameState> emit,
  ) async {
    emit(state.copyWith(status: GameStatus.connecting));

    try {
      await _wsService.connect(event.serverUrl);

      // Listen to WebSocket messages
      _wsSubscription = _wsService.messages.listen((message) {
        add(WebSocketMessageReceived(message));
      });

      emit(state.copyWith(status: GameStatus.connected));
    } catch (e) {
      emit(state.copyWith(
        status: GameStatus.error,
        error: 'Failed to connect: $e',
      ));
    }
  }

  void _onCreateOnlineGame(
    CreateOnlineGame event,
    Emitter<GameState> emit,
  ) {
    _wsService.createGame(
      settings: {
        'maxPlayers': event.maxPlayers,
      },
    );
  }

  void _onJoinOnlineGame(
    JoinOnlineGame event,
    Emitter<GameState> emit,
  ) {
    _wsService.joinGame(event.gameId);
  }

  void _onStartOnlineGame(
    StartOnlineGame event,
    Emitter<GameState> emit,
  ) {
    if (state.roomId != null) {
      _wsService.startGame(state.roomId!);
    }
  }

  void _onDrawOnlineTile(
    DrawOnlineTile event,
    Emitter<GameState> emit,
  ) {
    if (state.roomId != null && state.isMyTurn) {
      if (event.source == 'stock') {
        _wsService.drawFromStock(state.roomId!);
      } else {
        _wsService.drawFromDiscard(state.roomId!);
      }
    }
  }

  void _onDiscardOnlineTile(
    DiscardOnlineTile event,
    Emitter<GameState> emit,
  ) {
    if (state.roomId != null && state.isMyTurn) {
      _wsService.discardTile(
        roomId: state.roomId!,
        tile: tileToJson(event.tile),
      );
    }
  }

  void _onPlaceOnlineTiles(
    PlaceOnlineTiles event,
    Emitter<GameState> emit,
  ) {
    if (state.roomId != null && state.isMyTurn) {
      // Group tiles into a single combination
      _wsService.arrangeBoard(
        roomId: state.roomId!,
        combinations: [event.tiles.map((t) => tileToJson(t)).toList()],
      );
    }
  }

  void _onCloseOnlineGame(
    CloseOnlineGame event,
    Emitter<GameState> emit,
  ) {
    if (state.roomId != null && state.isMyTurn) {
      _wsService.closeGame(state.roomId!);
    }
  }

  void _onWebSocketMessageReceived(
    WebSocketMessageReceived event,
    Emitter<GameState> emit,
  ) {
    final message = event.message;
    final type = message['type'] as String?;
    final data = message['data'] as Map<String, dynamic>?;

    if (type == null || data == null) return;

    print('📨 Received: $type');

    switch (type) {
      case 'remi:roomCreated':
        _handleGameCreated(data, emit);
        break;
      case 'remi:playerJoined':
        _handleGameJoined(data, emit);
        break;
      case 'remi:gameStarted':
        _handleGameStarted(data, emit);
        break;
      case 'remi:stateUpdate':
        _handleGameStateUpdate(data, emit);
        break;
      case 'remi:tileDrawn':
        _handleTileDrawn(data, emit);
        break;
      case 'remi:tileDiscarded':
        _handleTileDiscarded(data, emit);
        break;
      case 'remi:boardArranged':
        _handleTilesPlaced(data, emit);
        break;
      case 'remi:gameFinished':
        _handleGameFinished(data, emit);
        break;
      case 'remi:turnChanged':
        _handleTurnChanged(data, emit);
        break;
      case 'error':
        _handleError(data, emit);
        break;
    }
  }

  void _handleGameCreated(Map<String, dynamic> data, Emitter<GameState> emit) {
    final room = data['room'] as Map<String, dynamic>?;
    if (room == null) return;

    final roomId = room['id'] as String?;
    final players = (room['players'] as List?)
        ?.map((p) => Player.fromJson(p as Map<String, dynamic>))
        .toList();

    // Find current player to get their ID
    final currentPlayer = players?.firstWhere(
      (p) => (room['players'] as List).any((rp) => 
        rp['id'] == p.id && rp['tiles'] != null),
      orElse: () => players!.first,
    );

    emit(state.copyWith(
      roomId: roomId,
      gameId: roomId,
      playerId: currentPlayer?.id,
      players: players,
      status: GameStatus.inLobby,
    ));
  }

  void _handleGameJoined(Map<String, dynamic> data, Emitter<GameState> emit) {
    final room = data['room'] as Map<String, dynamic>?;
    if (room == null) return;

    final roomId = room['id'] as String?;
    final players = (room['players'] as List?)
        ?.map((p) => Player.fromJson(p as Map<String, dynamic>))
        .toList();

    emit(state.copyWith(
      roomId: roomId,
      gameId: roomId,
      players: players,
      status: GameStatus.inLobby,
    ));
  }

  void _handleGameStarted(Map<String, dynamic> data, Emitter<GameState> emit) {
    final room = data['room'] as Map<String, dynamic>?;
    if (room == null) return;

    final players = room['players'] as List?;
    final currentPlayer = players?.firstWhere(
      (p) => p['id'] == state.playerId,
      orElse: () => null,
    );

    final hand = (currentPlayer?['tiles'] as List?)
        ?.map((t) => tileFromJson(t as Map<String, dynamic>))
        .toList();
    
    final stockCount = (room['stockPile'] as Map<String, dynamic>?)?['count'] as int?;
    final currentTurn = room['currentTurn'] as String?;

    emit(state.copyWith(
      status: GameStatus.playing,
      playerHand: hand ?? [],
      stockCount: stockCount ?? 0,
      currentTurn: currentTurn,
      isMyTurn: currentTurn == state.playerId,
    ));
  }

  void _handleGameStateUpdate(
      Map<String, dynamic> data, Emitter<GameState> emit) {
    final room = data['room'] as Map<String, dynamic>?;
    if (room == null) return;

    final players = room['players'] as List?;
    final currentPlayer = players?.firstWhere(
      (p) => p['id'] == state.playerId,
      orElse: () => null,
    );

    final hand = (currentPlayer?['tiles'] as List?)
        ?.map((t) => tileFromJson(t as Map<String, dynamic>))
        .toList();
    
    final privateBoard = (currentPlayer?['boardCombinations'] as List?)
        ?.map((combo) => (combo as List)
            .map((t) => tileFromJson(t as Map<String, dynamic>))
            .toList())
        .toList();
    
    final discardPile = (room['discardPile'] as List?)
        ?.map((t) => tileFromJson(t as Map<String, dynamic>))
        .toList();
    
    final stockCount = (room['stockPile'] as Map<String, dynamic>?)?['count'] as int?;
    final currentTurn = room['currentTurn'] as String?;

    emit(state.copyWith(
      playerHand: hand ?? state.playerHand,
      privateBoard: privateBoard ?? state.privateBoard,
      discardPile: discardPile ?? state.discardPile,
      stockCount: stockCount ?? state.stockCount,
      currentTurn: currentTurn ?? state.currentTurn,
      isMyTurn: currentTurn == state.playerId,
    ));
  }

  void _handleTileDrawn(Map<String, dynamic> data, Emitter<GameState> emit) {
    final tile = data['tile'] != null
        ? tileFromJson(data['tile'] as Map<String, dynamic>)
        : null;

    if (tile != null) {
      emit(state.copyWith(
        playerHand: [...state.playerHand, tile],
      ));
    }
  }

  void _handleTileDiscarded(
      Map<String, dynamic> data, Emitter<GameState> emit) {
    final tile = data['tile'] != null
        ? tileFromJson(data['tile'] as Map<String, dynamic>)
        : null;

    if (tile != null) {
      // Remove from hand
      final newHand = List<TileData>.from(state.playerHand);
      newHand.removeWhere((t) =>
          t.number == tile.number &&
          t.color == tile.color &&
          t.isJoker == tile.isJoker);

      emit(state.copyWith(
        playerHand: newHand,
        discardPile: [...state.discardPile, tile],
      ));
    }
  }

  void _handleTilesPlaced(
      Map<String, dynamic> data, Emitter<GameState> emit) {
    final tiles = (data['tiles'] as List?)
        ?.map((t) => tileFromJson(t as Map<String, dynamic>))
        .toList();

    if (tiles != null) {
      // Add to private board
      final newBoard = List<List<TileData>>.from(state.privateBoard);
      newBoard.add(tiles);

      // Remove from hand
      final newHand = List<TileData>.from(state.playerHand);
      for (var tile in tiles) {
        newHand.removeWhere((t) =>
            t.number == tile.number &&
            t.color == tile.color &&
            t.isJoker == tile.isJoker);
      }

      emit(state.copyWith(
        playerHand: newHand,
        privateBoard: newBoard,
      ));
    }
  }

  void _handleGameFinished(
      Map<String, dynamic> data, Emitter<GameState> emit) {
    emit(state.copyWith(
      status: GameStatus.finished,
    ));
  }

  void _handleTurnChanged(
      Map<String, dynamic> data, Emitter<GameState> emit) {
    final currentTurn = data['currentTurn'] as String?;

    emit(state.copyWith(
      currentTurn: currentTurn,
      isMyTurn: currentTurn == state.playerId,
    ));
  }

  void _handleError(Map<String, dynamic> data, Emitter<GameState> emit) {
    final error = data['message'] as String? ?? 'Unknown error';

    emit(state.copyWith(
      error: error,
    ));
  }

  void _onDisconnectFromServer(
    DisconnectFromServer event,
    Emitter<GameState> emit,
  ) {
    _wsService.disconnect();
    _wsSubscription?.cancel();
    emit(const GameState());
  }

  @override
  Future<void> close() {
    _wsSubscription?.cancel();
    _wsService.dispose();
    return super.close();
  }
}
