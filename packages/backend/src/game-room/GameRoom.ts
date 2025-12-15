import { GameEngine, GameRoom as GameEngineRoom, GameMove } from '../game-engine/GameEngine';

export interface RoomPlayer {
  userId: string;
  username: string;
  socketId: string;
  isReady: boolean;
  isConnected: boolean;
  disconnectedAt?: Date;
}

export interface RoomConfig {
  roomId: string;
  gameType: 'RUMMY_PRO' | 'RUMMY_45' | 'CANASTA';
  maxPlayers: number; // 2-4
  isPrivate: boolean;
  createdBy: string;
  extraJokers?: number; // 0-4 additional jokers
}

export interface RoomState {
  config: RoomConfig;
  players: RoomPlayer[];
  gameState: GameEngineRoom | null;
  status: 'WAITING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class GameRoom {
  private state: RoomState;
  private gameEngine: GameEngine | null = null;

  constructor(config: RoomConfig) {
    this.state = {
      config,
      players: [],
      gameState: null,
      status: 'WAITING',
      createdAt: new Date(),
    };
  }

  // Get room state
  getState(): RoomState {
    return { ...this.state };
  }

  getRoomId(): string {
    return this.state.config.roomId;
  }

  getPlayers(): RoomPlayer[] {
    return [...this.state.players];
  }

  getPlayerCount(): number {
    return this.state.players.length;
  }

  getMaxPlayers(): number {
    return this.state.config.maxPlayers;
  }

  isFull(): boolean {
    return this.state.players.length >= this.state.config.maxPlayers;
  }

  isWaiting(): boolean {
    return this.state.status === 'WAITING';
  }

  isInProgress(): boolean {
    return this.state.status === 'IN_PROGRESS';
  }

  // Player management
  canJoin(userId: string): { allowed: boolean; reason?: string } {
    // Check if room is full
    if (this.isFull()) {
      return { allowed: false, reason: 'Room is full' };
    }

    // Check if player already in room
    if (this.hasPlayer(userId)) {
      return { allowed: false, reason: 'Player already in room' };
    }

    // Check if game already started
    if (this.state.status === 'IN_PROGRESS') {
      return { allowed: false, reason: 'Game already in progress' };
    }

    // Check if game completed
    if (this.state.status === 'COMPLETED') {
      return { allowed: false, reason: 'Game has ended' };
    }

    return { allowed: true };
  }

  addPlayer(userId: string, username: string, socketId: string): void {
    const canJoinResult = this.canJoin(userId);
    if (!canJoinResult.allowed) {
      throw new Error(canJoinResult.reason);
    }

    const player: RoomPlayer = {
      userId,
      username,
      socketId,
      isReady: false,
      isConnected: true,
    };

    this.state.players.push(player);

    // Update room status
    this.updateRoomStatus();
  }

  removePlayer(userId: string): void {
    const index = this.state.players.findIndex((p) => p.userId === userId);
    if (index === -1) {
      throw new Error('Player not in room');
    }

    // If game is in progress, mark as disconnected instead of removing
    if (this.state.status === 'IN_PROGRESS') {
      this.state.players[index].isConnected = false;
      this.state.players[index].disconnectedAt = new Date();
    } else {
      this.state.players.splice(index, 1);
      this.updateRoomStatus();
    }
  }

  hasPlayer(userId: string): boolean {
    return this.state.players.some((p) => p.userId === userId);
  }

  getPlayer(userId: string): RoomPlayer | undefined {
    return this.state.players.find((p) => p.userId === userId);
  }

  updatePlayerSocket(userId: string, socketId: string): void {
    const player = this.state.players.find((p) => p.userId === userId);
    if (player) {
      player.socketId = socketId;
      player.isConnected = true;
      player.disconnectedAt = undefined;
    }
  }

  setPlayerReady(userId: string, ready: boolean): void {
    const player = this.state.players.find((p) => p.userId === userId);
    if (!player) {
      throw new Error('Player not in room');
    }

    player.isReady = ready;
    this.updateRoomStatus();
  }

  // Room status management
  private updateRoomStatus(): void {
    const playerCount = this.state.players.length;
    const minPlayers = 2;

    // Check if we have enough players and all are ready
    if (playerCount >= minPlayers && playerCount <= this.state.config.maxPlayers) {
      const allReady = this.state.players.every((p) => p.isReady);
      if (allReady && this.state.status === 'WAITING') {
        this.state.status = 'READY';
      } else if (!allReady && this.state.status === 'READY') {
        this.state.status = 'WAITING';
      }
    } else if (this.state.status === 'READY') {
      this.state.status = 'WAITING';
    }
  }

  canStart(): { allowed: boolean; reason?: string } {
    if (this.state.status !== 'READY') {
      return { allowed: false, reason: 'Room not ready' };
    }

    if (this.state.players.length < 2) {
      return { allowed: false, reason: 'Not enough players' };
    }

    if (this.state.players.length > this.state.config.maxPlayers) {
      return { allowed: false, reason: 'Too many players' };
    }

    if (!this.state.players.every((p) => p.isReady)) {
      return { allowed: false, reason: 'Not all players ready' };
    }

    return { allowed: true };
  }

  // Game management
  startGame(): GameEngineRoom {
    const canStartResult = this.canStart();
    if (!canStartResult.allowed) {
      throw new Error(canStartResult.reason);
    }

    // Initialize game engine
    this.gameEngine = new GameEngine();

    // Create room with first player
    const firstPlayer = this.state.players[0];
    const result = this.gameEngine.createRoom(firstPlayer.userId, firstPlayer.username);

    if (!result.success || !result.gameState) {
      throw new Error(result.error || 'Failed to create game');
    }

    // Add remaining players
    for (let i = 1; i < this.state.players.length; i++) {
      const player = this.state.players[i];
      const joinResult = this.gameEngine.joinRoom(
        result.gameState.id,
        player.userId,
        player.username
      );
      if (!joinResult.success) {
        throw new Error(joinResult.error || 'Failed to add player');
      }
    }

    // Start the game
    const startResult = this.gameEngine.startGame(
      result.gameState.id,
      firstPlayer.userId,
      this.state.config.extraJokers || 0
    );

    if (!startResult.success || !startResult.gameState) {
      throw new Error(startResult.error || 'Failed to start game');
    }

    this.state.gameState = startResult.gameState;

    // Update room status
    this.state.status = 'IN_PROGRESS';
    this.state.startedAt = new Date();

    return this.state.gameState;
  }

  getGameState(): GameEngineRoom | null {
    return this.state.gameState;
  }

  applyMove(move: GameMove): GameEngineRoom {
    if (!this.gameEngine || !this.state.gameState) {
      throw new Error('Game not started');
    }

    if (this.state.status !== 'IN_PROGRESS') {
      throw new Error('Game not in progress');
    }

    // Apply move through game engine
    const result = this.gameEngine.executeMove(this.state.gameState.id, move);

    if (!result.success) {
      throw new Error(result.error || 'Invalid move');
    }

    if (result.gameState) {
      this.state.gameState = result.gameState;

      // Check if game is completed
      if (this.state.gameState.gamePhase === 'FINISHED') {
        this.state.status = 'COMPLETED';
        this.state.completedAt = new Date();
      }

      return this.state.gameState;
    }

    throw new Error('Move execution failed');
  }

  // Reconnection handling
  canReconnect(userId: string): boolean {
    const player = this.getPlayer(userId);
    if (!player) {
      return false;
    }

    // Allow reconnection if game is in progress and player was disconnected
    if (this.state.status === 'IN_PROGRESS' && !player.isConnected) {
      // Check if disconnection was recent (within 5 minutes)
      if (player.disconnectedAt) {
        const timeSinceDisconnect = Date.now() - player.disconnectedAt.getTime();
        const maxReconnectTime = 5 * 60 * 1000; // 5 minutes
        return timeSinceDisconnect < maxReconnectTime;
      }
    }

    return false;
  }

  reconnectPlayer(userId: string, socketId: string): void {
    if (!this.canReconnect(userId)) {
      throw new Error('Cannot reconnect to this room');
    }

    this.updatePlayerSocket(userId, socketId);
  }

  // Utility methods
  toJSON(): RoomState {
    return this.getState();
  }

  // Get public room info (for lobby display)
  getPublicInfo() {
    return {
      roomId: this.state.config.roomId,
      gameType: this.state.config.gameType,
      playerCount: this.state.players.length,
      maxPlayers: this.state.config.maxPlayers,
      status: this.state.status,
      isPrivate: this.state.config.isPrivate,
      createdAt: this.state.createdAt,
      players: this.state.players.map((p) => ({
        username: p.username,
        isReady: p.isReady,
        isConnected: p.isConnected,
      })),
    };
  }
}
