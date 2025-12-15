import { Server, Socket } from 'socket.io';
import { DisconnectionHandler } from '../DisconnectionHandler.js';
import { RemiPeTablaEngine } from '../../game-engine/RemiPeTablaEngine.js';

// Mock Socket.io
jest.mock('socket.io');

describe('DisconnectionHandler', () => {
  let handler: DisconnectionHandler;
  let engine: RemiPeTablaEngine;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(() => {
    // Create mock Socket.io server
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<Server>;

    // Create engine
    engine = new RemiPeTablaEngine();

    // Create handler
    handler = new DisconnectionHandler(mockIo, engine);

    // Create mock socket
    mockSocket = {
      id: 'socket-123',
      userId: 'player1',
    } as unknown as jest.Mocked<Socket>;
  });

  describe('handleDisconnection', () => {
    it('should mark player as offline when disconnected', async () => {
      // Create a game
      const createResult = engine.createRoom('player1', 'Player 1');
      expect(createResult.success).toBe(true);
      const roomId = createResult.gameState?.id || '';

      // Join another player
      engine.joinRoom(roomId, 'player2', 'Player 2');

      // Start game
      engine.startGame(roomId, 'player1');

      // Handle disconnection
      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Check player is marked offline
      const gameState = engine.getRoom(roomId);
      const player = gameState?.players.find((p) => p.id === 'player1');
      expect(player?.isOnline).toBe(false);
    });

    it('should notify other players of disconnection', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      // Handle disconnection
      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Check notification was sent
      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'player:disconnected',
        expect.objectContaining({
          playerId: 'player1',
          playerName: 'Player 1',
        })
      );
    });

    it('should track disconnection count', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      // First disconnection
      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionCount('player1')).toBe(1);

      // Reconnect
      handler.handleReconnection('player1', roomId);

      // Second disconnection
      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionCount('player1')).toBe(2);
    });

    it('should apply penalty after max disconnections', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      const gameState = engine.getRoom(roomId);
      const initialScore = gameState?.players.find((p) => p.id === 'player1')?.score || 0;

      // Disconnect 3 times (penalty starts at 3rd)
      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      handler.handleReconnection('player1', roomId);

      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      handler.handleReconnection('player1', roomId);

      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Check penalty was applied
      const finalScore = gameState?.players.find((p) => p.id === 'player1')?.score || 0;
      expect(finalScore).toBeLessThan(initialScore);
    });

    it('should auto-arrange tiles if disconnected player is current player', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      const gameState = engine.getRoom(roomId);
      const player = gameState?.players.find((p) => p.id === 'player1');
      const initialTileCount = player?.tiles.length || 0;

      // Handle disconnection (player1 is current player)
      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Check tiles were auto-arranged (some might be in combinations now)
      const finalTileCount = player?.tiles.length || 0;
      const combinationTileCount =
        player?.boardCombinations.reduce((sum, c) => sum + c.tiles.length, 0) || 0;

      // Total tiles should be conserved (minus one discarded)
      expect(finalTileCount + combinationTileCount).toBeLessThanOrEqual(initialTileCount);
    });
  });

  describe('handleReconnection', () => {
    it('should mark player as online when reconnected', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      // Disconnect
      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Reconnect
      const success = handler.handleReconnection('player1', roomId);

      expect(success).toBe(true);

      const gameState = engine.getRoom(roomId);
      const player = gameState?.players.find((p) => p.id === 'player1');
      expect(player?.isOnline).toBe(true);
    });

    it('should notify other players of reconnection', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      // Disconnect
      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Clear previous calls
      jest.clearAllMocks();

      // Reconnect
      handler.handleReconnection('player1', roomId);

      // Check notification was sent
      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'player:reconnected',
        expect.objectContaining({
          playerId: 'player1',
          playerName: 'Player 1',
        })
      );
    });

    it('should fail if reconnection is too late', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      // Disconnect
      await handler.handleDisconnection(mockSocket, 'player1', roomId);

      // Manually set deadline to past
      const record = handler.getDisconnectionRecord('player1');
      if (record) {
        record.reconnectionDeadline = new Date(Date.now() - 1000);
      }

      // Try to reconnect (should fail)
      const success = handler.handleReconnection('player1', roomId);
      expect(success).toBe(false);
    });

    it('should remove disconnection record after successful reconnection', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      // Disconnect
      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionRecord('player1')).toBeDefined();

      // Reconnect
      handler.handleReconnection('player1', roomId);
      expect(handler.getDisconnectionRecord('player1')).toBeUndefined();
    });
  });

  describe('getDisconnectionCount', () => {
    it('should return 0 for player with no disconnections', () => {
      expect(handler.getDisconnectionCount('player1')).toBe(0);
    });

    it('should return correct count after disconnections', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionCount('player1')).toBe(1);

      handler.handleReconnection('player1', roomId);
      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionCount('player1')).toBe(2);
    });
  });

  describe('resetDisconnectionCount', () => {
    it('should reset disconnection count to 0', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionCount('player1')).toBe(1);

      handler.resetDisconnectionCount('player1');
      expect(handler.getDisconnectionCount('player1')).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove disconnection records for finished game', async () => {
      // Create and start game
      const createResult = engine.createRoom('player1', 'Player 1');
      const roomId = createResult.gameState?.id || '';
      engine.joinRoom(roomId, 'player2', 'Player 2');
      engine.startGame(roomId, 'player1');

      await handler.handleDisconnection(mockSocket, 'player1', roomId);
      expect(handler.getDisconnectionRecord('player1')).toBeDefined();

      handler.cleanup(roomId);
      expect(handler.getDisconnectionRecord('player1')).toBeUndefined();
    });
  });
});
