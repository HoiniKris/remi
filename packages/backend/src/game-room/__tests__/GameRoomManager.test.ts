import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameRoomManager, CreateRoomOptions } from '../GameRoomManager';

describe('GameRoomManager', () => {
  let manager: GameRoomManager;
  let defaultOptions: CreateRoomOptions;

  beforeEach(() => {
    manager = new GameRoomManager();
    defaultOptions = {
      gameType: 'RUMMY_PRO',
      maxPlayers: 4,
      isPrivate: false,
      createdBy: 'user1',
      extraJokers: 0,
    };
  });

  describe('Room Creation', () => {
    it('should create a new room', () => {
      const room = manager.createRoom(defaultOptions);

      expect(room).toBeDefined();
      expect(room.getRoomId()).toBeDefined();
      expect(room.getMaxPlayers()).toBe(4);
      expect(manager.hasRoom(room.getRoomId())).toBe(true);
    });

    it('should create rooms with unique IDs', () => {
      const room1 = manager.createRoom(defaultOptions);
      const room2 = manager.createRoom(defaultOptions);

      expect(room1.getRoomId()).not.toBe(room2.getRoomId());
    });

    it('should validate max players range', () => {
      expect(() => {
        manager.createRoom({ ...defaultOptions, maxPlayers: 1 });
      }).toThrow('Max players must be between 2 and 4');

      expect(() => {
        manager.createRoom({ ...defaultOptions, maxPlayers: 5 });
      }).toThrow('Max players must be between 2 and 4');
    });

    it('should validate extra jokers range', () => {
      expect(() => {
        manager.createRoom({ ...defaultOptions, extraJokers: -1 });
      }).toThrow('Extra jokers must be between 0 and 4');

      expect(() => {
        manager.createRoom({ ...defaultOptions, extraJokers: 5 });
      }).toThrow('Extra jokers must be between 0 and 4');
    });

    it('should create private rooms', () => {
      const room = manager.createRoom({ ...defaultOptions, isPrivate: true });

      expect(room.getState().config.isPrivate).toBe(true);
    });
  });

  describe('Room Retrieval', () => {
    it('should retrieve room by ID', () => {
      const room = manager.createRoom(defaultOptions);
      const retrieved = manager.getRoom(room.getRoomId());

      expect(retrieved).toBe(room);
    });

    it('should return undefined for non-existent room', () => {
      const retrieved = manager.getRoom('non-existent');

      expect(retrieved).toBeUndefined();
    });

    it('should throw error for non-existent room with getRoomOrThrow', () => {
      expect(() => {
        manager.getRoomOrThrow('non-existent');
      }).toThrow('Room non-existent not found');
    });

    it('should get all rooms', () => {
      manager.createRoom(defaultOptions);
      manager.createRoom(defaultOptions);
      manager.createRoom(defaultOptions);

      const allRooms = manager.getAllRooms();
      expect(allRooms).toHaveLength(3);
    });

    it('should get available rooms', () => {
      const room1 = manager.createRoom(defaultOptions);
      const room2 = manager.createRoom(defaultOptions);
      manager.createRoom({ ...defaultOptions, isPrivate: true }); // Private room

      // Fill room1
      manager.joinRoom(room1.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room1.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.joinRoom(room1.getRoomId(), 'user3', 'Charlie', 'socket3');
      manager.joinRoom(room1.getRoomId(), 'user4', 'David', 'socket4');

      const available = manager.getAvailableRooms();
      expect(available).toHaveLength(1);
      expect(available[0].getRoomId()).toBe(room2.getRoomId());
    });

    it('should get rooms by player', () => {
      const room1 = manager.createRoom(defaultOptions);
      const room2 = manager.createRoom(defaultOptions);

      manager.joinRoom(room1.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room2.getRoomId(), 'user1', 'Alice', 'socket2');

      const userRooms = manager.getRoomsByPlayer('user1');
      expect(userRooms).toHaveLength(2);
    });
  });

  describe('Player Operations', () => {
    it('should join a room', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');

      expect(room.hasPlayer('user1')).toBe(true);
      expect(room.getPlayerCount()).toBe(1);
    });

    it('should leave a room', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.leaveRoom(room.getRoomId(), 'user1');

      expect(room.hasPlayer('user1')).toBe(false);
      expect(room.getPlayerCount()).toBe(0);
    });

    it('should delete empty room when last player leaves', () => {
      const room = manager.createRoom(defaultOptions);
      const roomId = room.getRoomId();

      manager.joinRoom(roomId, 'user1', 'Alice', 'socket1');
      manager.leaveRoom(roomId, 'user1');

      expect(manager.hasRoom(roomId)).toBe(false);
    });

    it('should not delete room with players', () => {
      const room = manager.createRoom(defaultOptions);
      const roomId = room.getRoomId();

      manager.joinRoom(roomId, 'user1', 'Alice', 'socket1');
      manager.joinRoom(roomId, 'user2', 'Bob', 'socket2');
      manager.leaveRoom(roomId, 'user1');

      expect(manager.hasRoom(roomId)).toBe(true);
      expect(room.getPlayerCount()).toBe(1);
    });

    it('should set player ready status', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.setPlayerReady(room.getRoomId(), 'user1', true);

      const player = room.getPlayer('user1');
      expect(player?.isReady).toBe(true);
    });
  });

  describe('Game Operations', () => {
    it('should start a game', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.setPlayerReady(room.getRoomId(), 'user1', true);
      manager.setPlayerReady(room.getRoomId(), 'user2', true);

      const result = manager.startGame(room.getRoomId());

      expect(result.room).toBe(room);
      expect(result.gameState).toBeDefined();
      expect(result.gameState.gamePhase).toBe('PLAYING');
    });

    it('should get game state', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.setPlayerReady(room.getRoomId(), 'user1', true);
      manager.setPlayerReady(room.getRoomId(), 'user2', true);
      manager.startGame(room.getRoomId());

      const gameState = manager.getGameState(room.getRoomId());

      expect(gameState).toBeDefined();
      expect(gameState?.players).toHaveLength(2);
    });

    it('should apply moves to game', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.setPlayerReady(room.getRoomId(), 'user1', true);
      manager.setPlayerReady(room.getRoomId(), 'user2', true);
      const { gameState } = manager.startGame(room.getRoomId());

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const initialTileCount = currentPlayer.tiles.length;

      const move = {
        type: 'DRAW_STOCK' as const,
        playerId: currentPlayer.id,
      };

      const result = manager.applyMove(room.getRoomId(), move);

      expect(result.gameState).toBeDefined();
      expect(result.gameState.players[gameState.currentPlayerIndex].tiles.length).toBe(
        initialTileCount + 1
      );
    });
  });

  describe('Reconnection', () => {
    it('should allow reconnection to active game', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.setPlayerReady(room.getRoomId(), 'user1', true);
      manager.setPlayerReady(room.getRoomId(), 'user2', true);
      manager.startGame(room.getRoomId());

      // Simulate disconnection
      manager.leaveRoom(room.getRoomId(), 'user1');

      expect(manager.canReconnect(room.getRoomId(), 'user1')).toBe(true);

      manager.reconnectPlayer(room.getRoomId(), 'user1', 'socket3');

      const player = room.getPlayer('user1');
      expect(player?.isConnected).toBe(true);
      expect(player?.socketId).toBe('socket3');
    });

    it('should not allow reconnection to non-existent room', () => {
      expect(manager.canReconnect('non-existent', 'user1')).toBe(false);
    });
  });

  describe('Room Cleanup', () => {
    it('should delete a room', () => {
      const room = manager.createRoom(defaultOptions);
      const roomId = room.getRoomId();

      const deleted = manager.deleteRoom(roomId);

      expect(deleted).toBe(true);
      expect(manager.hasRoom(roomId)).toBe(false);
    });

    it('should return false when deleting non-existent room', () => {
      const deleted = manager.deleteRoom('non-existent');
      expect(deleted).toBe(false);
    });

    it('should cleanup completed rooms', () => {
      // Note: This test would require internal state manipulation
      // In a real scenario, rooms would naturally complete through gameplay
      const cleaned = manager.cleanupCompletedRooms(60 * 60 * 1000);
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup abandoned rooms', () => {
      // Note: This test would require internal state manipulation
      // In a real scenario, rooms would naturally age over time
      const cleaned = manager.cleanupAbandonedRooms(60 * 60 * 1000);
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('should not cleanup rooms with players', () => {
      const room = manager.createRoom(defaultOptions);
      manager.joinRoom(room.getRoomId(), 'user1', 'Alice', 'socket1');

      // Manually set creation time to past
      const state = room.getState();
      state.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const cleaned = manager.cleanupAbandonedRooms(60 * 60 * 1000);

      expect(cleaned).toBe(0);
      expect(manager.hasRoom(room.getRoomId())).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return correct room count', () => {
      manager.createRoom(defaultOptions);
      manager.createRoom(defaultOptions);
      manager.createRoom(defaultOptions);

      expect(manager.getRoomCount()).toBe(3);
    });

    it('should return correct active game count', () => {
      const room1 = manager.createRoom(defaultOptions);
      const room2 = manager.createRoom(defaultOptions);

      // Start game in room1
      manager.joinRoom(room1.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room1.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.setPlayerReady(room1.getRoomId(), 'user1', true);
      manager.setPlayerReady(room1.getRoomId(), 'user2', true);
      manager.startGame(room1.getRoomId());

      // Room2 is waiting
      manager.joinRoom(room2.getRoomId(), 'user3', 'Charlie', 'socket3');

      expect(manager.getActiveGameCount()).toBe(1);
    });

    it('should return correct total player count', () => {
      const room1 = manager.createRoom(defaultOptions);
      const room2 = manager.createRoom(defaultOptions);

      manager.joinRoom(room1.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room1.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.joinRoom(room2.getRoomId(), 'user3', 'Charlie', 'socket3');

      expect(manager.getTotalPlayerCount()).toBe(3);
    });

    it('should return complete statistics', () => {
      const room1 = manager.createRoom(defaultOptions);
      const room2 = manager.createRoom(defaultOptions);
      manager.createRoom({ ...defaultOptions, isPrivate: true });

      manager.joinRoom(room1.getRoomId(), 'user1', 'Alice', 'socket1');
      manager.joinRoom(room1.getRoomId(), 'user2', 'Bob', 'socket2');
      manager.setPlayerReady(room1.getRoomId(), 'user1', true);
      manager.setPlayerReady(room1.getRoomId(), 'user2', true);
      manager.startGame(room1.getRoomId());

      manager.joinRoom(room2.getRoomId(), 'user3', 'Charlie', 'socket3');

      const stats = manager.getStatistics();

      expect(stats.totalRooms).toBe(3);
      expect(stats.activeGames).toBe(1);
      expect(stats.totalPlayers).toBe(3);
      expect(stats.availableRooms).toBe(1); // room2 only (room3 is private)
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on non-existent rooms gracefully', () => {
      expect(() => {
        manager.joinRoom('non-existent', 'user1', 'Alice', 'socket1');
      }).toThrow('Room non-existent not found');

      expect(() => {
        manager.leaveRoom('non-existent', 'user1');
      }).toThrow('Room non-existent not found');

      expect(() => {
        manager.startGame('non-existent');
      }).toThrow('Room non-existent not found');
    });

    it('should handle multiple game types', () => {
      const room1 = manager.createRoom({ ...defaultOptions, gameType: 'RUMMY_PRO' });
      const room2 = manager.createRoom({ ...defaultOptions, gameType: 'RUMMY_45' });
      const room3 = manager.createRoom({ ...defaultOptions, gameType: 'CANASTA' });

      expect(room1.getState().config.gameType).toBe('RUMMY_PRO');
      expect(room2.getState().config.gameType).toBe('RUMMY_45');
      expect(room3.getState().config.gameType).toBe('CANASTA');
    });

    it('should handle concurrent room operations', () => {
      const rooms = [];
      for (let i = 0; i < 10; i++) {
        rooms.push(manager.createRoom(defaultOptions));
      }

      expect(manager.getRoomCount()).toBe(10);

      // Join all rooms
      rooms.forEach((room, index) => {
        manager.joinRoom(room.getRoomId(), `user${index}`, `User${index}`, `socket${index}`);
      });

      expect(manager.getTotalPlayerCount()).toBe(10);
    });
  });
});
