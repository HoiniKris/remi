import { EventEmitter } from 'events';

export interface TurnState {
  currentPlayerIndex: number;
  currentPlayerId: string;
  turnStartTime: Date;
  turnTimeLimit: number; // seconds
  timeRemaining: number; // seconds
  turnNumber: number;
}

export interface TurnManagerConfig {
  playerIds: string[];
  turnTimeLimit: number; // seconds
  onTurnTimeout?: (playerId: string) => void;
  onTurnChange?: (newPlayerId: string, previousPlayerId: string) => void;
}

export class TurnManager extends EventEmitter {
  private state: TurnState;
  private playerIds: string[];
  private timer: NodeJS.Timeout | null = null;
  private config: TurnManagerConfig;

  constructor(config: TurnManagerConfig) {
    super();
    this.config = config;
    this.playerIds = [...config.playerIds];

    if (this.playerIds.length < 2) {
      throw new Error('Need at least 2 players for turn management');
    }

    this.state = {
      currentPlayerIndex: 0,
      currentPlayerId: this.playerIds[0],
      turnStartTime: new Date(),
      turnTimeLimit: config.turnTimeLimit,
      timeRemaining: config.turnTimeLimit,
      turnNumber: 1,
    };
  }

  // Get current turn state
  getTurnState(): TurnState {
    return { ...this.state };
  }

  getCurrentPlayerId(): string {
    return this.state.currentPlayerId;
  }

  getCurrentPlayerIndex(): number {
    return this.state.currentPlayerIndex;
  }

  getTurnNumber(): number {
    return this.state.turnNumber;
  }

  getTimeRemaining(): number {
    if (!this.timer) {
      return this.state.timeRemaining;
    }

    const elapsed = (Date.now() - this.state.turnStartTime.getTime()) / 1000;
    return Math.max(0, this.state.turnTimeLimit - elapsed);
  }

  isCurrentPlayer(playerId: string): boolean {
    return this.state.currentPlayerId === playerId;
  }

  // Start the turn timer
  startTimer(): void {
    if (this.timer) {
      this.stopTimer();
    }

    this.state.turnStartTime = new Date();
    this.state.timeRemaining = this.state.turnTimeLimit;

    // Emit timer tick every second
    this.timer = setInterval(() => {
      this.state.timeRemaining = this.getTimeRemaining();

      this.emit('tick', {
        playerId: this.state.currentPlayerId,
        timeRemaining: this.state.timeRemaining,
      });

      // Check for timeout
      if (this.state.timeRemaining <= 0) {
        this.handleTimeout();
      }
    }, 1000);
  }

  // Stop the turn timer
  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Handle turn timeout
  private handleTimeout(): void {
    this.stopTimer();

    const timedOutPlayerId = this.state.currentPlayerId;

    this.emit('timeout', {
      playerId: timedOutPlayerId,
      turnNumber: this.state.turnNumber,
    });

    // Call callback if provided
    if (this.config.onTurnTimeout) {
      this.config.onTurnTimeout(timedOutPlayerId);
    }

    // Auto-advance to next player
    this.nextTurn();
  }

  // Move to next player's turn
  nextTurn(): void {
    const previousPlayerId = this.state.currentPlayerId;
    const previousIndex = this.state.currentPlayerIndex;

    // Move to next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.playerIds.length;
    this.state.currentPlayerId = this.playerIds[this.state.currentPlayerIndex];
    this.state.turnNumber++;

    // Restart timer
    this.startTimer();

    this.emit('turnChange', {
      previousPlayerId,
      previousIndex,
      currentPlayerId: this.state.currentPlayerId,
      currentIndex: this.state.currentPlayerIndex,
      turnNumber: this.state.turnNumber,
    });

    // Call callback if provided
    if (this.config.onTurnChange) {
      this.config.onTurnChange(this.state.currentPlayerId, previousPlayerId);
    }
  }

  // Skip current player's turn (for disconnected players)
  skipTurn(): void {
    this.emit('skip', {
      playerId: this.state.currentPlayerId,
      turnNumber: this.state.turnNumber,
    });

    this.nextTurn();
  }

  // Reset timer for current turn (e.g., after a valid action)
  resetTimer(): void {
    this.startTimer();
  }

  // Pause the timer
  pauseTimer(): void {
    this.stopTimer();
    this.state.timeRemaining = this.getTimeRemaining();
  }

  // Resume the timer
  resumeTimer(): void {
    if (this.timer) {
      return; // Already running
    }

    this.state.turnStartTime = new Date();
    this.state.turnTimeLimit = this.state.timeRemaining;
    this.startTimer();
  }

  // Update turn time limit
  setTurnTimeLimit(seconds: number): void {
    if (seconds < 10) {
      throw new Error('Turn time limit must be at least 10 seconds');
    }

    this.state.turnTimeLimit = seconds;
    this.config.turnTimeLimit = seconds;

    // Restart timer with new limit
    if (this.timer) {
      this.startTimer();
    }
  }

  // Remove a player from turn rotation (e.g., when they leave)
  removePlayer(playerId: string): void {
    const index = this.playerIds.indexOf(playerId);
    if (index === -1) {
      throw new Error('Player not in turn rotation');
    }

    const wasCurrentPlayer = this.state.currentPlayerId === playerId;

    // Remove player
    this.playerIds.splice(index, 1);

    // Adjust current index if needed
    if (index < this.state.currentPlayerIndex) {
      // Player was before current, shift index down
      this.state.currentPlayerIndex--;
    } else if (index === this.state.currentPlayerIndex) {
      // Removed current player, keep same index (which now points to next player)
      // But wrap around if we're at the end
      if (this.state.currentPlayerIndex >= this.playerIds.length) {
        this.state.currentPlayerIndex = 0;
      }
    }

    // Update current player ID
    this.state.currentPlayerId = this.playerIds[this.state.currentPlayerIndex];

    if (this.playerIds.length < 2) {
      this.stopTimer();
      this.emit('gameEnd', { reason: 'Not enough players' });
    } else if (wasCurrentPlayer) {
      // Restart timer for the new current player
      this.startTimer();
    }
  }

  // Add a player to turn rotation (e.g., when they reconnect)
  addPlayer(playerId: string, position?: number): void {
    if (this.playerIds.includes(playerId)) {
      throw new Error('Player already in turn rotation');
    }

    if (position !== undefined) {
      this.playerIds.splice(position, 0, playerId);
      // Adjust current index if needed
      if (position <= this.state.currentPlayerIndex) {
        this.state.currentPlayerIndex++;
      }
    } else {
      this.playerIds.push(playerId);
    }
  }

  // Get player order
  getPlayerOrder(): string[] {
    return [...this.playerIds];
  }

  // Get next player ID
  getNextPlayerId(): string {
    const nextIndex = (this.state.currentPlayerIndex + 1) % this.playerIds.length;
    return this.playerIds[nextIndex];
  }

  // Cleanup
  destroy(): void {
    this.stopTimer();
    this.removeAllListeners();
  }
}
