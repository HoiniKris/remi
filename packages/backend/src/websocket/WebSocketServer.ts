import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Pool } from 'pg';
import { verifyToken } from '../utils/jwt.js';
import { RedisService } from '../services/RedisService.js';
import { RemiPeTablaEngine } from '../game-engine/RemiPeTablaEngine.js';
import { RemiPeTablaHandler } from './RemiPeTablaHandler.js';
import { RemiPeTablaPersistenceService } from '../services/RemiPeTablaPersistenceService.js';
import { DisconnectionHandler } from '../services/DisconnectionHandler.js';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export interface WebSocketConfig {
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  pingTimeout?: number;
  pingInterval?: number;
}

/**
 * WebSocket server for real-time game communication
 */
export class WebSocketServer {
  private io: Server;
  private redis?: RedisService;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private remiPeTablaEngine: RemiPeTablaEngine;
  private remiPeTablaHandler: RemiPeTablaHandler;
  private persistenceService?: RemiPeTablaPersistenceService;
  private disconnectionHandler: DisconnectionHandler;
  private userGameMap: Map<string, string> = new Map(); // userId -> gameId

  constructor(
    httpServer: HTTPServer,
    config?: WebSocketConfig,
    redis?: RedisService,
    dbPool?: Pool
  ) {
    this.redis = redis;

    // Initialize Socket.io
    this.io = new Server(httpServer, {
      cors: config?.cors || {
        origin: '*',
        credentials: true,
      },
      pingTimeout: config?.pingTimeout || 60000,
      pingInterval: config?.pingInterval || 25000,
    });

    // Initialize persistence service if database pool provided
    if (dbPool) {
      this.persistenceService = new RemiPeTablaPersistenceService(dbPool);
      this.initializePersistence();
    }

    // Initialize game engines
    this.remiPeTablaEngine = new RemiPeTablaEngine();

    // Initialize disconnection handler
    this.disconnectionHandler = new DisconnectionHandler(this.io, this.remiPeTablaEngine);

    // Initialize handler with callback to track user-game mapping
    this.remiPeTablaHandler = new RemiPeTablaHandler(
      this.io,
      this.remiPeTablaEngine,
      (userId: string, gameId: string) => this.trackUserGame(userId, gameId),
      (userId: string) => this.untrackUserGame(userId)
    );

    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  /**
   * Initialize persistence callbacks
   */
  private initializePersistence(): void {
    if (!this.persistenceService) return;

    // Set persistence callback for immediate saves
    this.remiPeTablaEngine.setPersistenceCallback(async (gameState) => {
      await this.persistenceService!.saveGameState(gameState);
    });

    // Set auto-save callback for periodic saves
    this.remiPeTablaEngine.setAutoSaveCallback((gameId, getGameState) => {
      this.persistenceService!.startAutoSave(gameId, getGameState);
    });

    // Initialize database tables
    this.persistenceService.initializeDatabase().catch((error) => {
      console.error('Failed to initialize persistence database:', error);
    });
  }

  /**
   * Set up authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        // TODO: Re-enable authentication in production
        // For development, allow connections without token
        if (!token) {
          // Generate temporary user ID for development
          socket.userId = `dev-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          socket.username = `Player-${socket.userId.substr(-4)}`;
          console.log(`🔓 Dev mode: Created temporary user ${socket.username}`);
          return next();
        }

        // Verify JWT token if provided
        const decoded = await verifyToken(token);

        if (!decoded || !decoded.userId) {
          return next(new Error('Invalid token'));
        }

        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.username = decoded.username;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Register resume/reconnection handlers for a socket
   */
  private registerResumeHandlers(socket: AuthenticatedSocket): void {
    // Get list of unfinished games for player
    socket.on('game:getUnfinishedGames', async (callback) => {
      if (!socket.userId) {
        callback({ success: false, error: 'Not authenticated' });
        return;
      }

      const games = await this.getUnfinishedGames(socket.userId);
      callback({ success: true, games });
    });

    // Resume a saved game
    socket.on('game:resume', async (data: { gameId: string }, callback) => {
      if (!socket.userId) {
        callback({ success: false, error: 'Not authenticated' });
        return;
      }

      const result = await this.resumeGame(socket.userId, data.gameId, socket.id);
      callback(result);
    });
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userId} (${socket.id})`);

      // Track connected user
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        this.startHeartbeat(socket);

        // Update online status in Redis
        if (this.redis) {
          this.redis.set(`user:${socket.userId}:online`, '1', 300); // 5 min TTL
        }
      }

      // Register game handlers
      this.remiPeTablaHandler.registerHandlers(socket);

      // Register resume handlers
      this.registerResumeHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        console.log(`User disconnected: ${socket.userId} (${reason})`);

        if (socket.userId) {
          // Handle game disconnection if user is in a game
          const gameId = this.userGameMap.get(socket.userId);
          if (gameId) {
            await this.disconnectionHandler.handleDisconnection(socket, socket.userId, gameId);
          }

          this.connectedUsers.delete(socket.userId);
          this.stopHeartbeat(socket.id);

          // Update online status
          if (this.redis) {
            this.redis.delete(`user:${socket.userId}:online`);
          }
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
      });

      // Heartbeat/ping response
      socket.on('pong', () => {
        if (socket.userId && this.redis) {
          // Refresh online status TTL
          this.redis.expire(`user:${socket.userId}:online`, 300);
        }
      });
    });
  }

  /**
   * Start heartbeat for a socket
   */
  private startHeartbeat(socket: AuthenticatedSocket): void {
    const interval = setInterval(() => {
      socket.emit('ping');
    }, 25000); // Every 25 seconds

    this.heartbeatIntervals.set(socket.id, interval);
  }

  /**
   * Stop heartbeat for a socket
   */
  private stopHeartbeat(socketId: string): void {
    const interval = this.heartbeatIntervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(socketId);
    }
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Get Remi pe Tablă engine instance
   */
  getRemiPeTablaEngine(): RemiPeTablaEngine {
    return this.remiPeTablaEngine;
  }

  /**
   * Join a room
   */
  joinRoom(socketId: string, roomId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomId);
      console.log(`Socket ${socketId} joined room ${roomId}`);
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(socketId: string, roomId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
      console.log(`Socket ${socketId} left room ${roomId}`);
    }
  }

  /**
   * Emit to a specific room
   */
  emitToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Emit to a specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Emit to all connected clients
   */
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get socket ID for a user
   */
  getSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Get room members
   */
  async getRoomMembers(roomId: string): Promise<string[]> {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (!room) return [];

    const socketIds = Array.from(room);
    const userIds: string[] = [];

    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket?.userId) {
        userIds.push(socket.userId);
      }
    }

    return userIds;
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.io.sockets.adapter.rooms.size;
  }

  /**
   * Disconnect a user
   */
  disconnectUser(userId: string, reason?: string): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        console.log(`Forcefully disconnected user ${userId}: ${reason || 'No reason provided'}`);
      }
    }
  }

  /**
   * Broadcast to room except sender
   */
  broadcastToRoom(roomId: string, senderId: string, event: string, data: any): void {
    const senderSocketId = this.connectedUsers.get(senderId);
    if (senderSocketId) {
      const socket = this.io.sockets.sockets.get(senderSocketId);
      if (socket) {
        socket.to(roomId).emit(event, data);
      }
    }
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connectedUsers: number;
    rooms: number;
    totalSockets: number;
  } {
    return {
      connectedUsers: this.connectedUsers.size,
      rooms: this.getRoomCount(),
      totalSockets: this.io.sockets.sockets.size,
    };
  }

  /**
   * Get persistence service
   */
  getPersistenceService(): RemiPeTablaPersistenceService | undefined {
    return this.persistenceService;
  }

  /**
   * Get disconnection handler
   */
  getDisconnectionHandler(): DisconnectionHandler {
    return this.disconnectionHandler;
  }

  /**
   * Track user joining a game
   */
  trackUserGame(userId: string, gameId: string): void {
    this.userGameMap.set(userId, gameId);
  }

  /**
   * Untrack user leaving a game
   */
  untrackUserGame(userId: string): void {
    this.userGameMap.delete(userId);
  }

  /**
   * Get game ID for a user
   */
  getUserGame(userId: string): string | undefined {
    return this.userGameMap.get(userId);
  }

  /**
   * Handle user reconnection to a game
   */
  handleReconnection(userId: string, gameId: string): boolean {
    const success = this.disconnectionHandler.handleReconnection(userId, gameId);
    if (success) {
      this.trackUserGame(userId, gameId);
    }
    return success;
  }

  /**
   * Get unfinished games for a player
   * Returns list of games that can be resumed
   */
  async getUnfinishedGames(userId: string): Promise<unknown[]> {
    if (!this.persistenceService) {
      return [];
    }

    try {
      const games = await this.persistenceService.getGamesByPlayer(userId);

      // Filter for games that are still in progress
      return games
        .filter((game) => game.gamePhase === 'PLAYING' || game.gamePhase === 'WAITING')
        .map((game) => ({
          id: game.id,
          gameType: game.gameType,
          gamePhase: game.gamePhase,
          playerCount: game.players.length,
          maxPlayers: game.settings.maxPlayers,
          multiplier: game.multiplier,
          createdAt: game.createdAt,
          lastActivity: game.lastActivity,
          canResume: true,
        }));
    } catch (error) {
      console.error('Failed to get unfinished games:', error);
      return [];
    }
  }

  /**
   * Resume a saved game from persistence
   * Loads game state and restores player connection
   */
  async resumeGame(
    userId: string,
    gameId: string,
    socketId: string
  ): Promise<{
    success: boolean;
    error?: string;
    gameState?: unknown;
  }> {
    if (!this.persistenceService) {
      return { success: false, error: 'Persistence service not available' };
    }

    try {
      // Load game state from database
      const savedGame = await this.persistenceService.loadGameState(gameId);

      if (!savedGame) {
        return { success: false, error: 'Game not found' };
      }

      // Verify player is in this game
      const player = savedGame.players.find((p) => p.id === userId);
      if (!player) {
        return { success: false, error: 'Player not in this game' };
      }

      // Validate state integrity
      const validation = this.persistenceService.validateGameState(savedGame);
      if (!validation.valid) {
        console.error('Game state validation failed:', validation.errors);
        return {
          success: false,
          error: `Game state corrupted: ${validation.errors.join(', ')}`,
        };
      }

      // Restore game to engine
      const existingGame = this.remiPeTablaEngine.getRoom(gameId);
      if (!existingGame) {
        // Game not in memory, restore it
        this.remiPeTablaEngine.restoreRoom(savedGame);
      }

      // Mark player as online
      player.isOnline = true;

      // Join socket to room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(gameId);
      }

      // Track user-game mapping
      this.trackUserGame(userId, gameId);

      // Handle reconnection in disconnection handler
      this.disconnectionHandler.handleReconnection(userId, gameId);

      // Notify other players
      this.io.to(gameId).emit('player:resumed', {
        playerId: userId,
        playerName: player.name,
      });

      console.log(`[Resume] Player ${userId} resumed game ${gameId}`);

      return {
        success: true,
        gameState: savedGame,
      };
    } catch (error) {
      console.error('Failed to resume game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close the WebSocket server
   */
  async close(): Promise<void> {
    // Stop all auto-save intervals
    if (this.persistenceService) {
      this.persistenceService.stopAllAutoSaves();
    }

    // Clear all heartbeat intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();

    // Disconnect all clients
    this.io.disconnectSockets(true);

    // Close the server
    await new Promise<void>((resolve) => {
      this.io.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}

/**
 * Create and initialize WebSocket server
 */
export function createWebSocketServer(
  httpServer: HTTPServer,
  config?: WebSocketConfig,
  redis?: RedisService,
  dbPool?: Pool
): WebSocketServer {
  return new WebSocketServer(httpServer, config, redis, dbPool);
}
