import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameRoom, RoomConfig } from '../GameRoom';

describe('GameRoom', () => {
  let roomConfig: RoomConfig;

  beforeEach(() => {
    roomConfig = {
      roomId: 'test-room-1',
      gameType: 'RUMMY_PRO',
      maxPlayers: 4,
      isPrivate: false,
      createdBy: 'user1',
      extraJokers: 0,
    };
  });

  describe('Room Creation', () => {
    it('should create a room with correct initial state', () => {
      const room = new GameRoom(roomConfig);
      const state = room.getState();

      expect(state.config).toEqual(roomConfig);
      expect(state.players).toEqual([]);
      expect(state.gameState).toBeNull();
      expect(state.status).toBe('WAITING');
      expect(state.createdAt).toBeInstanceOf(Date);
    });

    it('should return correct room ID', () => {
      const room = new GameRoom(roomConfig);
      expect(room.getRoomId()).toBe('test-room-1');
    });
  });

  describe('Player Management', () => {
    it('should add a player to the room', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');

      expect(room.getPlayerCount()).toBe(1);
      expect(room.hasPlayer('user1')).toBe(true);

      const player = room.getPlayer('user1');
      expect(player).toBeDefined();
      expect(player?.username).toBe('Alice');
      expect(player?.socketId).toBe('socket1');
      expect(player?.isReady).toBe(false);
      expect(player?.isConnected).toBe(true);
    });

    it('should add multiple players', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.addPlayer('user3', 'Charlie', 'socket3');

      expect(room.getPlayerCount()).toBe(3);
      expect(room.hasPlayer('user1')).toBe(true);
      expect(room.hasPlayer('user2')).toBe(true);
      expect(room.hasPlayer('user3')).toBe(true);
    });

    it('should not allow duplicate players', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');

      expect(() => {
        room.addPlayer('user1', 'Alice', 'socket2');
      }).toThrow('Player already in room');
    });

    it('should not allow more than max players', () => {
      const room = new GameRoom({ ...roomConfig, maxPlayers: 2 });
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      expect(() => {
        room.addPlayer('user3', 'Charlie', 'socket3');
      }).toThrow('Room is full');
    });

    it('should remove a player from the room', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      room.removePlayer('user1');

      expect(room.getPlayerCount()).toBe(1);
      expect(room.hasPlayer('user1')).toBe(false);
      expect(room.hasPlayer('user2')).toBe(true);
    });

    it('should throw error when removing non-existent player', () => {
      const room = new GameRoom(roomConfig);

      expect(() => {
        room.removePlayer('user1');
      }).toThrow('Player not in room');
    });

    it('should update player socket ID', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');

      room.updatePlayerSocket('user1', 'socket2');

      const player = room.getPlayer('user1');
      expect(player?.socketId).toBe('socket2');
    });
  });

  describe('Player Ready Status', () => {
    it('should set player ready status', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');

      room.setPlayerReady('user1', true);

      const player = room.getPlayer('user1');
      expect(player?.isReady).toBe(true);
    });

    it('should throw error when setting ready for non-existent player', () => {
      const room = new GameRoom(roomConfig);

      expect(() => {
        room.setPlayerReady('user1', true);
      }).toThrow('Player not in room');
    });

    it('should change room status to READY when all players ready', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      room.setPlayerReady('user1', true);
      expect(room.getState().status).toBe('WAITING');

      room.setPlayerReady('user2', true);
      expect(room.getState().status).toBe('READY');
    });

    it('should change room status back to WAITING when player unready', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);
      expect(room.getState().status).toBe('READY');

      room.setPlayerReady('user1', false);
      expect(room.getState().status).toBe('WAITING');
    });
  });

  describe('Room Status', () => {
    it('should report room as full when at capacity', () => {
      const room = new GameRoom({ ...roomConfig, maxPlayers: 2 });
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      expect(room.isFull()).toBe(true);
    });

    it('should report room as not full when below capacity', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');

      expect(room.isFull()).toBe(false);
    });

    it('should report correct waiting status', () => {
      const room = new GameRoom(roomConfig);
      expect(room.isWaiting()).toBe(true);
      expect(room.isInProgress()).toBe(false);
    });
  });

  describe('Game Start', () => {
    it('should start game when conditions met', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);

      const gameState = room.startGame();

      expect(gameState).toBeDefined();
      expect(gameState.id).toBeDefined();
      expect(gameState.players).toHaveLength(2);
      expect(room.getState().status).toBe('IN_PROGRESS');
      expect(room.getState().startedAt).toBeInstanceOf(Date);
    });

    it('should not start game without enough players', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.setPlayerReady('user1', true);

      expect(() => {
        room.startGame();
      }).toThrow('Room not ready');
    });

    it('should not start game when players not ready', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      expect(() => {
        room.startGame();
      }).toThrow('Room not ready');
    });

    it('should not allow joining after game started', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);
      room.startGame();

      expect(() => {
        room.addPlayer('user3', 'Charlie', 'socket3');
      }).toThrow('Game already in progress');
    });
  });

  describe('Disconnection Handling', () => {
    it('should mark player as disconnected during game', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);
      room.startGame();

      room.removePlayer('user1');

      const player = room.getPlayer('user1');
      expect(player).toBeDefined();
      expect(player?.isConnected).toBe(false);
      expect(player?.disconnectedAt).toBeInstanceOf(Date);
      expect(room.getPlayerCount()).toBe(2); // Still counted
    });

    it('should allow reconnection during game', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);
      room.startGame();

      room.removePlayer('user1');
      expect(room.canReconnect('user1')).toBe(true);

      room.reconnectPlayer('user1', 'socket3');

      const player = room.getPlayer('user1');
      expect(player?.isConnected).toBe(true);
      expect(player?.socketId).toBe('socket3');
      expect(player?.disconnectedAt).toBeUndefined();
    });

    it('should not allow reconnection to non-existent room', () => {
      const room = new GameRoom(roomConfig);

      expect(room.canReconnect('user1')).toBe(false);
    });
  });

  describe('Public Info', () => {
    it('should return public room information', () => {
      const room = new GameRoom(roomConfig);
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');

      const publicInfo = room.getPublicInfo();

      expect(publicInfo.roomId).toBe('test-room-1');
      expect(publicInfo.gameType).toBe('RUMMY_PRO');
      expect(publicInfo.playerCount).toBe(2);
      expect(publicInfo.maxPlayers).toBe(4);
      expect(publicInfo.status).toBe('WAITING');
      expect(publicInfo.isPrivate).toBe(false);
      expect(publicInfo.players).toHaveLength(2);
      expect(publicInfo.players[0].username).toBe('Alice');
      expect(publicInfo.players[1].username).toBe('Bob');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum players (2)', () => {
      const room = new GameRoom({ ...roomConfig, maxPlayers: 2 });
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);

      const gameState = room.startGame();
      expect(gameState.players).toHaveLength(2);
    });

    it('should handle maximum players (4)', () => {
      const room = new GameRoom({ ...roomConfig, maxPlayers: 4 });
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.addPlayer('user3', 'Charlie', 'socket3');
      room.addPlayer('user4', 'David', 'socket4');

      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);
      room.setPlayerReady('user3', true);
      room.setPlayerReady('user4', true);

      const gameState = room.startGame();
      expect(gameState.players).toHaveLength(4);
    });

    it('should handle extra jokers configuration', () => {
      const room = new GameRoom({ ...roomConfig, extraJokers: 4 });
      room.addPlayer('user1', 'Alice', 'socket1');
      room.addPlayer('user2', 'Bob', 'socket2');
      room.setPlayerReady('user1', true);
      room.setPlayerReady('user2', true);

      const gameState = room.startGame();
      // Game should have 110 tiles (106 + 4 extra jokers)
      const totalTiles =
        gameState.players.reduce((sum: number, p: any) => sum + p.tiles.length, 0) +
        gameState.stockPile.length +
        gameState.discardPile.length;
      expect(totalTiles).toBe(110);
    });
  });
});
