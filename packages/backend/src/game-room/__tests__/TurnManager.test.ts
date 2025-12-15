import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TurnManager, TurnManagerConfig } from '../TurnManager';

describe('TurnManager', () => {
  let turnManager: TurnManager;
  let config: TurnManagerConfig;

  beforeEach(() => {
    config = {
      playerIds: ['player1', 'player2', 'player3'],
      turnTimeLimit: 60,
    };
  });

  afterEach(() => {
    if (turnManager) {
      turnManager.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct state', () => {
      turnManager = new TurnManager(config);
      const state = turnManager.getTurnState();

      expect(state.currentPlayerIndex).toBe(0);
      expect(state.currentPlayerId).toBe('player1');
      expect(state.turnTimeLimit).toBe(60);
      expect(state.turnNumber).toBe(1);
    });

    it('should throw error with less than 2 players', () => {
      expect(() => {
        new TurnManager({ ...config, playerIds: ['player1'] });
      }).toThrow('Need at least 2 players');
    });

    it('should start with first player', () => {
      turnManager = new TurnManager(config);
      expect(turnManager.getCurrentPlayerId()).toBe('player1');
      expect(turnManager.getCurrentPlayerIndex()).toBe(0);
    });
  });

  describe('Turn State', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should return current turn state', () => {
      const state = turnManager.getTurnState();

      expect(state).toHaveProperty('currentPlayerIndex');
      expect(state).toHaveProperty('currentPlayerId');
      expect(state).toHaveProperty('turnStartTime');
      expect(state).toHaveProperty('turnTimeLimit');
      expect(state).toHaveProperty('timeRemaining');
      expect(state).toHaveProperty('turnNumber');
    });

    it('should check if player is current', () => {
      expect(turnManager.isCurrentPlayer('player1')).toBe(true);
      expect(turnManager.isCurrentPlayer('player2')).toBe(false);
      expect(turnManager.isCurrentPlayer('player3')).toBe(false);
    });

    it('should get turn number', () => {
      expect(turnManager.getTurnNumber()).toBe(1);
    });
  });

  describe('Turn Rotation', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should advance to next player', () => {
      turnManager.nextTurn();

      expect(turnManager.getCurrentPlayerId()).toBe('player2');
      expect(turnManager.getCurrentPlayerIndex()).toBe(1);
      expect(turnManager.getTurnNumber()).toBe(2);
    });

    it('should wrap around to first player', () => {
      turnManager.nextTurn(); // player2
      turnManager.nextTurn(); // player3
      turnManager.nextTurn(); // back to player1

      expect(turnManager.getCurrentPlayerId()).toBe('player1');
      expect(turnManager.getCurrentPlayerIndex()).toBe(0);
      expect(turnManager.getTurnNumber()).toBe(4);
    });

    it('should emit turnChange event', (done) => {
      turnManager.on('turnChange', (data) => {
        expect(data.previousPlayerId).toBe('player1');
        expect(data.currentPlayerId).toBe('player2');
        expect(data.turnNumber).toBe(2);
        done();
      });

      turnManager.nextTurn();
    });

    it('should call onTurnChange callback', (done) => {
      const callback = jest.fn((newId: string, prevId: string) => {
        expect(prevId).toBe('player1');
        expect(newId).toBe('player2');
        done();
      });

      turnManager = new TurnManager({ ...config, onTurnChange: callback });
      turnManager.nextTurn();
    });
  });

  describe('Timer Management', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should start timer', () => {
      turnManager.startTimer();
      const timeRemaining = turnManager.getTimeRemaining();

      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(60);
    });

    it('should stop timer', () => {
      turnManager.startTimer();
      turnManager.stopTimer();

      // Timer should be stopped
      expect(turnManager.getTimeRemaining()).toBeGreaterThan(0);
    });

    it('should emit tick events', (done) => {
      let tickCount = 0;

      turnManager.on('tick', (data) => {
        tickCount++;
        expect(data.playerId).toBe('player1');
        expect(data.timeRemaining).toBeGreaterThan(0);

        if (tickCount >= 2) {
          turnManager.stopTimer();
          done();
        }
      });

      turnManager.startTimer();
    }, 10000);

    it('should reset timer', async () => {
      turnManager.startTimer();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const timeBeforeReset = turnManager.getTimeRemaining();
      turnManager.resetTimer();
      const timeAfterReset = turnManager.getTimeRemaining();

      expect(timeAfterReset).toBeGreaterThan(timeBeforeReset);
    }, 10000);

    it('should pause and resume timer', async () => {
      turnManager.startTimer();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1100));

      turnManager.pauseTimer();
      const timePaused = turnManager.getTimeRemaining();

      // Wait more
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Time should not have changed while paused
      expect(turnManager.getTimeRemaining()).toBe(timePaused);

      turnManager.resumeTimer();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Time should have decreased after resume
      expect(turnManager.getTimeRemaining()).toBeLessThan(timePaused);
    }, 10000);
  });

  describe('Turn Timeout', () => {
    beforeEach(() => {
      config.turnTimeLimit = 2; // 2 seconds for faster tests
    });

    it('should handle timeout', (done) => {
      turnManager = new TurnManager(config);

      turnManager.on('timeout', (data) => {
        expect(data.playerId).toBe('player1');
        expect(data.turnNumber).toBe(1);
        done();
      });

      turnManager.startTimer();
    }, 5000);

    it('should auto-advance on timeout', (done) => {
      turnManager = new TurnManager(config);

      turnManager.on('turnChange', (data) => {
        if (data.turnNumber === 2) {
          expect(data.currentPlayerId).toBe('player2');
          done();
        }
      });

      turnManager.startTimer();
    }, 5000);

    it('should call onTurnTimeout callback', (done) => {
      const callback = jest.fn((playerId: string) => {
        expect(playerId).toBe('player1');
        done();
      });

      turnManager = new TurnManager({ ...config, onTurnTimeout: callback });
      turnManager.startTimer();
    }, 5000);
  });

  describe('Skip Turn', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should skip current turn', () => {
      turnManager.skipTurn();

      expect(turnManager.getCurrentPlayerId()).toBe('player2');
      expect(turnManager.getTurnNumber()).toBe(2);
    });

    it('should emit skip event', (done) => {
      turnManager.on('skip', (data) => {
        expect(data.playerId).toBe('player1');
        expect(data.turnNumber).toBe(1);
        done();
      });

      turnManager.skipTurn();
    });
  });

  describe('Player Management', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should remove player from rotation', () => {
      turnManager.removePlayer('player3');

      const order = turnManager.getPlayerOrder();
      expect(order).toHaveLength(2);
      expect(order).not.toContain('player3');
    });

    it('should advance turn when removing current player', () => {
      turnManager.removePlayer('player1');

      expect(turnManager.getCurrentPlayerId()).toBe('player2');
    });

    it('should emit gameEnd when too few players', (done) => {
      turnManager.on('gameEnd', (data) => {
        expect(data.reason).toBe('Not enough players');
        done();
      });

      turnManager.removePlayer('player2');
      turnManager.removePlayer('player3');
    });

    it('should add player to rotation', () => {
      turnManager.addPlayer('player4');

      const order = turnManager.getPlayerOrder();
      expect(order).toHaveLength(4);
      expect(order).toContain('player4');
    });

    it('should add player at specific position', () => {
      turnManager.addPlayer('player4', 1);

      const order = turnManager.getPlayerOrder();
      expect(order[1]).toBe('player4');
    });

    it('should throw error when adding duplicate player', () => {
      expect(() => {
        turnManager.addPlayer('player1');
      }).toThrow('Player already in turn rotation');
    });

    it('should throw error when removing non-existent player', () => {
      expect(() => {
        turnManager.removePlayer('player99');
      }).toThrow('Player not in turn rotation');
    });
  });

  describe('Player Order', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should get player order', () => {
      const order = turnManager.getPlayerOrder();

      expect(order).toEqual(['player1', 'player2', 'player3']);
    });

    it('should get next player ID', () => {
      expect(turnManager.getNextPlayerId()).toBe('player2');

      turnManager.nextTurn();
      expect(turnManager.getNextPlayerId()).toBe('player3');

      turnManager.nextTurn();
      expect(turnManager.getNextPlayerId()).toBe('player1');
    });
  });

  describe('Turn Time Limit', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should update turn time limit', () => {
      turnManager.setTurnTimeLimit(30);

      const state = turnManager.getTurnState();
      expect(state.turnTimeLimit).toBe(30);
    });

    it('should throw error for invalid time limit', () => {
      expect(() => {
        turnManager.setTurnTimeLimit(5);
      }).toThrow('Turn time limit must be at least 10 seconds');
    });

    it('should restart timer with new limit', () => {
      turnManager.startTimer();
      turnManager.setTurnTimeLimit(30);

      const timeRemaining = turnManager.getTimeRemaining();
      expect(timeRemaining).toBeLessThanOrEqual(30);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      turnManager = new TurnManager(config);
    });

    it('should cleanup resources', () => {
      turnManager.startTimer();
      turnManager.destroy();

      // Timer should be stopped
      expect(turnManager.getTimeRemaining()).toBeGreaterThan(0);
    });

    it('should remove all listeners', () => {
      turnManager.on('tick', () => {});
      turnManager.on('turnChange', () => {});

      turnManager.destroy();

      expect(turnManager.listenerCount('tick')).toBe(0);
      expect(turnManager.listenerCount('turnChange')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 2 players', () => {
      turnManager = new TurnManager({
        playerIds: ['player1', 'player2'],
        turnTimeLimit: 60,
      });

      turnManager.nextTurn();
      expect(turnManager.getCurrentPlayerId()).toBe('player2');

      turnManager.nextTurn();
      expect(turnManager.getCurrentPlayerId()).toBe('player1');
    });

    it('should handle many players', () => {
      const manyPlayers = Array.from({ length: 10 }, (_, i) => `player${i + 1}`);

      turnManager = new TurnManager({
        playerIds: manyPlayers,
        turnTimeLimit: 60,
      });

      // Advance through all players
      for (let i = 0; i < 10; i++) {
        expect(turnManager.getCurrentPlayerId()).toBe(`player${i + 1}`);
        turnManager.nextTurn();
      }

      // Should wrap back to first player
      expect(turnManager.getCurrentPlayerId()).toBe('player1');
    });

    it('should handle rapid turn changes', () => {
      turnManager = new TurnManager(config);

      for (let i = 0; i < 100; i++) {
        turnManager.nextTurn();
      }

      // Should still be in valid state
      expect(turnManager.getCurrentPlayerIndex()).toBeGreaterThanOrEqual(0);
      expect(turnManager.getCurrentPlayerIndex()).toBeLessThan(3);
      expect(turnManager.getTurnNumber()).toBe(101);
    });
  });
});
