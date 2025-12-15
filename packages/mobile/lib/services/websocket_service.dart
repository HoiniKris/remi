import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  bool _isConnected = false;

  Stream<Map<String, dynamic>> get messages => _messageController.stream;
  bool get isConnected => _isConnected;

  // Connect to Socket.IO server
  Future<void> connect(String url) async {
    try {
      _socket = IO.io(url, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': false,
      });

      _socket!.onConnect((_) {
        print('✅ Connected to Socket.IO: $url');
        _isConnected = true;
      });

      _socket!.onDisconnect((_) {
        print('🔌 Disconnected from Socket.IO');
        _isConnected = false;
      });

      _socket!.onError((error) {
        print('❌ Socket.IO error: $error');
        _isConnected = false;
      });

      // Listen to all events
      _socket!.onAny((event, data) {
        print('📨 Received event: $event');
        _messageController.add({
          'type': event,
          'data': data,
        });
      });

      _socket!.connect();
      
      // Wait a bit for connection
      await Future.delayed(const Duration(milliseconds: 500));
    } catch (e) {
      print('❌ Failed to connect to Socket.IO: $e');
      _isConnected = false;
    }
  }

  // Send message to server
  void send(String type, Map<String, dynamic> data) {
    if (_socket != null && _isConnected) {
      _socket!.emit(type, data);
      print('📤 Sent: $type');
    } else {
      print('❌ Cannot send message: Not connected');
    }
  }

  // Disconnect from server
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _isConnected = false;
    print('🔌 Disconnected from Socket.IO');
  }

  void dispose() {
    disconnect();
    _messageController.close();
  }
}

// Game-specific WebSocket methods
extension GameWebSocket on WebSocketService {
  // Create a new game room
  void createGame({
    Map<String, dynamic>? settings,
  }) {
    send('remi:createRoom', {
      'settings': settings ?? {},
    });
  }

  // Join an existing game room
  void joinGame(String roomId) {
    send('remi:joinRoom', {
      'roomId': roomId,
    });
  }

  // Start the game
  void startGame(String roomId) {
    send('remi:startGame', {
      'roomId': roomId,
    });
  }

  // Draw from stock pile
  void drawFromStock(String roomId) {
    send('remi:drawStock', {
      'roomId': roomId,
    });
  }

  // Draw from discard pile
  void drawFromDiscard(String roomId) {
    send('remi:drawDiscard', {
      'roomId': roomId,
    });
  }

  // Discard a tile
  void discardTile({
    required String roomId,
    required Map<String, dynamic> tile,
  }) {
    send('remi:discard', {
      'roomId': roomId,
      'tile': tile,
    });
  }

  // Arrange tiles on board
  void arrangeBoard({
    required String roomId,
    required List<List<Map<String, dynamic>>> combinations,
  }) {
    send('remi:arrangeBoard', {
      'roomId': roomId,
      'combinations': combinations,
    });
  }

  // Close the game (win)
  void closeGame(String roomId) {
    send('remi:closeGame', {
      'roomId': roomId,
    });
  }

  // Get room state
  void getRoomState(String roomId) {
    send('remi:getRoomState', {
      'roomId': roomId,
    });
  }

  // List available rooms
  void listRooms() {
    send('remi:listRooms', {});
  }

  // Get unfinished games
  void getUnfinishedGames() {
    send('game:getUnfinishedGames', {});
  }

  // Resume a game
  void resumeGame(String gameId) {
    send('game:resume', {
      'gameId': gameId,
    });
  }
}
