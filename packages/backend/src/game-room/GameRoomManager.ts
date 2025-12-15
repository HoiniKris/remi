import { GameRoom, RoomConfig } from './GameRoom';
import { randomUUID } from 'crypto';
import { GameMove, GameRoom as GameEngineRoom } from '../game-engine/GameEngine';

export interface CreateRoomOptions {
  gameType: 'RUMMY_PRO' | 'RUMMY_45' | 'CANASTA';
  maxPlayers: number;
  isPrivate: boolean;
  createdBy: string;
  extraJokers?: number;
}

export class GameRoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  // Room creation
  createRoom(options: CreateRoomOptions): GameRoom {
    // Validate max players
    if (options.maxPlayers < 2 || options.maxPlayers > 4) {
      throw new Error('Max players must be between 2 and 4');
    }

    // Validate extra jokers
    if (options.extraJokers && (options.extraJokers < 0 || options.extraJokers > 4)) {
      throw new Error('Extra jokers must be between 0 and 4');
    }

    const roomId = randomUUID();
    const config: RoomConfig = {
      roomId,
      gameType: options.gameType,
      maxPlayers: options.maxPlayers,
      isPrivate: options.isPrivate,
      createdBy: options.createdBy,
      extraJokers: options.extraJokers || 0,
    };

    const room = new GameRoom(config);
    this.rooms.set(roomId, room);

    return room;
  }

  // Room retrieval
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomOrThrow(roomId: string): GameRoom {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    return room;
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  // Get all rooms (for lobby)
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  // Get available rooms (not full, not started)
  getAvailableRooms(): GameRoom[] {
    return Array.from(this.rooms.values()).filter(
      (room) => !room.isFull() && room.isWaiting() && !room.getState().config.isPrivate
    );
  }

  // Get rooms by player
  getRoomsByPlayer(userId: string): GameRoom[] {
    return Array.from(this.rooms.values()).filter((room) => room.hasPlayer(userId));
  }

  // Player operations
  joinRoom(roomId: string, userId: string, username: string, socketId: string): GameRoom {
    const room = this.getRoomOrThrow(roomId);
    room.addPlayer(userId, username, socketId);
    return room;
  }

  leaveRoom(roomId: string, userId: string): void {
    const room = this.getRoomOrThrow(roomId);
    room.removePlayer(userId);

    // Clean up empty rooms that are not in progress
    if (room.getPlayerCount() === 0 && !room.isInProgress()) {
      this.deleteRoom(roomId);
    }
  }

  setPlayerReady(roomId: string, userId: string, ready: boolean): GameRoom {
    const room = this.getRoomOrThrow(roomId);
    room.setPlayerReady(userId, ready);
    return room;
  }

  // Game operations
  startGame(roomId: string): { room: GameRoom; gameState: GameEngineRoom } {
    const room = this.getRoomOrThrow(roomId);
    const gameState = room.startGame();
    return { room, gameState };
  }

  applyMove(roomId: string, move: GameMove): { room: GameRoom; gameState: GameEngineRoom } {
    const room = this.getRoomOrThrow(roomId);
    const gameState = room.applyMove(move);
    return { room, gameState };
  }

  getGameState(roomId: string): GameEngineRoom | null {
    const room = this.getRoomOrThrow(roomId);
    return room.getGameState();
  }

  // Reconnection
  reconnectPlayer(roomId: string, userId: string, socketId: string): GameRoom {
    const room = this.getRoomOrThrow(roomId);
    room.reconnectPlayer(userId, socketId);
    return room;
  }

  canReconnect(roomId: string, userId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }
    return room.canReconnect(userId);
  }

  // Room cleanup
  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  // Clean up completed rooms older than specified time
  cleanupCompletedRooms(olderThanMs: number = 60 * 60 * 1000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      const state = room.getState();
      if (state.status === 'COMPLETED' && state.completedAt) {
        const age = now - state.completedAt.getTime();
        if (age > olderThanMs) {
          this.rooms.delete(roomId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  // Clean up abandoned rooms (no players, not started, older than specified time)
  cleanupAbandonedRooms(olderThanMs: number = 30 * 60 * 1000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      const state = room.getState();
      if (
        state.status === 'WAITING' &&
        state.players.length === 0 &&
        now - state.createdAt.getTime() > olderThanMs
      ) {
        this.rooms.delete(roomId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Statistics
  getRoomCount(): number {
    return this.rooms.size;
  }

  getActiveGameCount(): number {
    return Array.from(this.rooms.values()).filter((room) => room.isInProgress()).length;
  }

  getTotalPlayerCount(): number {
    return Array.from(this.rooms.values()).reduce((sum, room) => sum + room.getPlayerCount(), 0);
  }

  getStatistics() {
    return {
      totalRooms: this.getRoomCount(),
      activeGames: this.getActiveGameCount(),
      totalPlayers: this.getTotalPlayerCount(),
      availableRooms: this.getAvailableRooms().length,
    };
  }
}
