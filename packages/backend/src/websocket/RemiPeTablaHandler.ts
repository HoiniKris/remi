import { Server } from 'socket.io';
import {
  RemiPeTablaEngine,
  RemiPeTablaMove,
  RemiPeTablaSettings,
} from '../game-engine/RemiPeTablaEngine.js';
import { AuthenticatedSocket } from './WebSocketServer.js';

/**
 * WebSocket event handlers for Remi pe Tablă game
 */
export class RemiPeTablaHandler {
  private engine: RemiPeTablaEngine;
  private io: Server;
  private trackUserGame?: (userId: string, gameId: string) => void;
  private untrackUserGame?: (userId: string) => void;

  constructor(
    io: Server,
    engine: RemiPeTablaEngine,
    trackUserGame?: (userId: string, gameId: string) => void,
    untrackUserGame?: (userId: string) => void
  ) {
    this.io = io;
    this.engine = engine;
    this.trackUserGame = trackUserGame;
    this.untrackUserGame = untrackUserGame;
  }

  /**
   * Register all event handlers for a socket
   */
  registerHandlers(socket: AuthenticatedSocket): void {
    // Room management
    socket.on('remi:createRoom', (data, callback) => this.handleCreateRoom(socket, data, callback));
    socket.on('remi:joinRoom', (data, callback) => this.handleJoinRoom(socket, data, callback));
    socket.on('remi:startGame', (data, callback) => this.handleStartGame(socket, data, callback));
    socket.on('remi:leaveRoom', (data, callback) => this.handleLeaveRoom(socket, data, callback));

    // Game actions
    socket.on('remi:drawStock', (data, callback) => this.handleDrawStock(socket, data, callback));
    socket.on('remi:drawDiscard', (data, callback) =>
      this.handleDrawDiscard(socket, data, callback)
    );
    socket.on('remi:arrangeBoard', (data, callback) =>
      this.handleArrangeBoard(socket, data, callback)
    );
    socket.on('remi:discard', (data, callback) => this.handleDiscard(socket, data, callback));
    socket.on('remi:closeGame', (data, callback) => this.handleCloseGame(socket, data, callback));

    // Room queries
    socket.on('remi:getRoomState', (data, callback) =>
      this.handleGetRoomState(socket, data, callback)
    );
    socket.on('remi:listRooms', (callback) => this.handleListRooms(socket, callback));
  }

  /**
   * Create a new game room
   */
  private handleCreateRoom(
    socket: AuthenticatedSocket,
    data: { settings?: Partial<RemiPeTablaSettings> },
    callback: (response: any) => void
  ): void {
    if (!socket.userId || !socket.username) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const result = this.engine.createRoom(socket.userId, socket.username, data.settings);

    if (result.success && result.gameState) {
      // Join the socket to the room
      socket.join(result.gameState.id);

      // Track user-game mapping for disconnection handling
      if (this.trackUserGame) {
        this.trackUserGame(socket.userId, result.gameState.id);
      }

      // Notify room creation
      this.io.to(result.gameState.id).emit('remi:roomCreated', {
        room: this.sanitizeRoomForPlayer(result.gameState, socket.userId),
      });
    }

    callback({
      success: result.success,
      error: result.error,
      room: result.gameState
        ? this.sanitizeRoomForPlayer(result.gameState, socket.userId)
        : undefined,
    });
  }

  /**
   * Join an existing room
   */
  private handleJoinRoom(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: any) => void
  ): void {
    if (!socket.userId || !socket.username) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const result = this.engine.joinRoom(data.roomId, socket.userId, socket.username);

    if (result.success && result.gameState) {
      // Join the socket to the room
      socket.join(result.gameState.id);

      // Track user-game mapping for disconnection handling
      if (this.trackUserGame) {
        this.trackUserGame(socket.userId, result.gameState.id);
      }

      // Notify all players in room
      this.io.to(result.gameState.id).emit('remi:playerJoined', {
        playerId: socket.userId,
        playerName: socket.username,
        room: this.sanitizeRoomForBroadcast(result.gameState),
      });
    }

    callback({
      success: result.success,
      error: result.error,
      room: result.gameState
        ? this.sanitizeRoomForPlayer(result.gameState, socket.userId)
        : undefined,
    });
  }

  /**
   * Start the game
   */
  private handleStartGame(
    socket: AuthenticatedSocket,
    data: { roomId: string; extraJokers?: number },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const result = this.engine.startGame(data.roomId, socket.userId, data.extraJokers || 0);

    if (result.success && result.gameState) {
      // Notify all players that game started
      const room = result.gameState;
      room.players.forEach((player) => {
        const socketId = this.getSocketIdForUser(player.id);
        if (socketId) {
          this.io.to(socketId).emit('remi:gameStarted', {
            room: this.sanitizeRoomForPlayer(room, player.id),
          });
        }
      });
    }

    callback({
      success: result.success,
      error: result.error,
    });
  }

  /**
   * Leave a room
   */
  private handleLeaveRoom(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    socket.leave(data.roomId);

    // Notify other players
    this.io.to(data.roomId).emit('remi:playerLeft', {
      playerId: socket.userId,
    });

    callback({ success: true });
  }

  /**
   * Draw from stock pile
   */
  private handleDrawStock(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const move: RemiPeTablaMove = {
      type: 'DRAW_STOCK',
      playerId: socket.userId,
    };

    const result = this.engine.executeMove(data.roomId, move);

    if (result.success && result.gameState) {
      // Send updated state to all players
      this.broadcastGameState(result.gameState);
    }

    callback({
      success: result.success,
      error: result.error,
      room: result.gameState
        ? this.sanitizeRoomForPlayer(result.gameState, socket.userId)
        : undefined,
    });
  }

  /**
   * Draw from discard pile
   */
  private handleDrawDiscard(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const move: RemiPeTablaMove = {
      type: 'DRAW_DISCARD',
      playerId: socket.userId,
    };

    const result = this.engine.executeMove(data.roomId, move);

    if (result.success && result.gameState) {
      this.broadcastGameState(result.gameState);
    }

    callback({
      success: result.success,
      error: result.error,
      room: result.gameState
        ? this.sanitizeRoomForPlayer(result.gameState, socket.userId)
        : undefined,
    });
  }

  /**
   * Arrange tiles on private board
   */
  private handleArrangeBoard(
    socket: AuthenticatedSocket,
    data: { roomId: string; boardCombinations: any[] },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const move: RemiPeTablaMove = {
      type: 'ARRANGE_BOARD',
      playerId: socket.userId,
      boardCombinations: data.boardCombinations,
    };

    const result = this.engine.executeMove(data.roomId, move);

    // Only send confirmation to the player (board is private)
    callback({
      success: result.success,
      error: result.error,
      room: result.gameState
        ? this.sanitizeRoomForPlayer(result.gameState, socket.userId)
        : undefined,
    });
  }

  /**
   * Discard a tile
   */
  private handleDiscard(
    socket: AuthenticatedSocket,
    data: { roomId: string; tile: any },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const move: RemiPeTablaMove = {
      type: 'DISCARD',
      playerId: socket.userId,
      tile: data.tile,
    };

    const result = this.engine.executeMove(data.roomId, move);

    if (result.success && result.gameState) {
      // Broadcast to all players (discard is public)
      this.broadcastGameState(result.gameState);
    }

    callback({
      success: result.success,
      error: result.error,
      room: result.gameState
        ? this.sanitizeRoomForPlayer(result.gameState, socket.userId)
        : undefined,
    });
  }

  /**
   * Close the game (declare win)
   */
  private handleCloseGame(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const move: RemiPeTablaMove = {
      type: 'CLOSE_GAME',
      playerId: socket.userId,
    };

    const result = this.engine.executeMove(data.roomId, move);

    if (result.success && result.gameState) {
      // Game ended - broadcast final state with pattern and scores
      this.io.to(result.gameState.id).emit('remi:gameEnded', {
        winnerId: result.gameState.winnerId,
        winPattern: result.winPattern,
        winScore: result.winScore,
        finalScore: result.finalScoreWithMultiplier,
        room: this.sanitizeRoomForBroadcast(result.gameState),
      });
    }

    callback({
      success: result.success,
      error: result.error,
      winPattern: result.winPattern,
      winScore: result.winScore,
      finalScore: result.finalScoreWithMultiplier,
    });
  }

  /**
   * Get current room state
   */
  private handleGetRoomState(
    socket: AuthenticatedSocket,
    data: { roomId: string },
    callback: (response: any) => void
  ): void {
    if (!socket.userId) {
      callback({ success: false, error: 'Not authenticated' });
      return;
    }

    const room = this.engine.getRoom(data.roomId);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    callback({
      success: true,
      room: this.sanitizeRoomForPlayer(room, socket.userId),
    });
  }

  /**
   * List all available rooms
   */
  private handleListRooms(_socket: AuthenticatedSocket, callback: (response: any) => void): void {
    const rooms = this.engine.getAllRooms();
    const sanitizedRooms = rooms
      .filter((room) => room.gamePhase === 'WAITING')
      .map((room) => this.sanitizeRoomForBroadcast(room));

    callback({
      success: true,
      rooms: sanitizedRooms,
    });
  }

  /**
   * Broadcast game state to all players in room
   * Each player receives their own view (with their private board)
   */
  private broadcastGameState(room: any): void {
    room.players.forEach((player: any) => {
      const socketId = this.getSocketIdForUser(player.id);
      if (socketId) {
        this.io.to(socketId).emit('remi:gameStateUpdate', {
          room: this.sanitizeRoomForPlayer(room, player.id),
        });
      }
    });
  }

  /**
   * Sanitize room data for a specific player
   * Shows their own tiles and board, but hides other players' private data
   */
  private sanitizeRoomForPlayer(room: any, playerId: string): any {
    return {
      ...room,
      players: room.players.map((player: any) => {
        if (player.id === playerId) {
          // Show full data for current player
          return player;
        } else {
          // Hide private data for other players
          return {
            id: player.id,
            name: player.name,
            tileCount: player.tiles.length,
            boardCombinationCount: player.boardCombinations.length,
            score: player.score,
            isOnline: player.isOnline,
          };
        }
      }),
      // Hide stock pile contents (only show count)
      stockPile: { count: room.stockPile.length },
    };
  }

  /**
   * Sanitize room data for broadcast (lobby view)
   * Hides all private game data
   */
  private sanitizeRoomForBroadcast(room: any): unknown {
    return {
      id: room.id,
      gameType: room.gameType,
      gamePhase: room.gamePhase,
      playerCount: room.players.length,
      maxPlayers: room.settings.maxPlayers,
      multiplier: room.multiplier,
      players: room.players.map((player: unknown) => ({
        id: player.id,
        name: player.name,
        isOnline: player.isOnline,
      })),
      createdAt: room.createdAt,
    };
  }

  /**
   * Get socket ID for a user
   */
  private getSocketIdForUser(userId: string): string | undefined {
    // Find socket by userId
    const sockets = Array.from(this.io.sockets.sockets.values()) as AuthenticatedSocket[];
    const socket = sockets.find((s) => s.userId === userId);
    return socket?.id;
  }
}
