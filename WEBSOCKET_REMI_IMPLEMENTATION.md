# WebSocket Implementation for Remi pe Tablă

## ✅ Completed Implementation

Real-time multiplayer functionality for Remi pe Tablă game using Socket.io.

## 🎮 Features Implemented

### Room Management

- **Create Room**: Players can create game rooms with custom settings
- **Join Room**: Players can join existing rooms
- **Leave Room**: Players can leave rooms
- **List Rooms**: Browse available rooms waiting for players
- **Room Broadcasting**: All players notified of room changes

### Game Flow

- **Start Game**: Host can start game when 2+ players joined
- **Draw Actions**: Draw from stock pile or last discarded tile
- **Discard Actions**: Discard tiles and advance turn
- **Private Board**: Each player arranges tiles privately
- **Close Game**: Declare win with pattern detection

### Privacy & Security

- **Private Boards**: Each player sees only their own tiles and combinations
- **Opponent View**: Other players see only tile counts, not actual tiles
- **Move Validation**: All moves validated server-side
- **Authentication**: JWT-based socket authentication

### Joker Mechanics

- **Joker Launching**: Discarded Jokers tracked separately
- **Cannot Pick Up**: Launched Jokers cannot be picked up by next player
- **Automatic Tracking**: System automatically manages launched Jokers

## 📁 Files Created

```
packages/backend/src/websocket/
├── RemiPeTablaHandler.ts              # WebSocket event handlers (400+ lines)
└── __tests__/
    └── RemiPeTablaHandler.test.ts     # 8 comprehensive tests
```

## 🔌 WebSocket Events

### Client → Server

#### Room Management

```typescript
// Create a new room
socket.emit(
  'remi:createRoom',
  {
    settings: {
      maxPlayers: 4,
      turnTimeLimit: 60,
      tableMultiplier: 2,
      counterClockwise: true,
    },
  },
  (response) => {
    // response.room contains room data
  }
);

// Join existing room
socket.emit(
  'remi:joinRoom',
  {
    roomId: 'room_id',
  },
  (response) => {
    // response.room contains room data
  }
);

// Start game (host only)
socket.emit(
  'remi:startGame',
  {
    roomId: 'room_id',
    extraJokers: 0,
  },
  (response) => {
    // Game started
  }
);

// Leave room
socket.emit(
  'remi:leaveRoom',
  {
    roomId: 'room_id',
  },
  (response) => {
    // Left room
  }
);
```

#### Game Actions

```typescript
// Draw from stock pile
socket.emit('remi:drawStock', {
  roomId: 'room_id'
}, (response) => {
  // response.room contains updated state
});

// Draw from discard pile
socket.emit('remi:drawDiscard', {
  roomId: 'room_id'
}, (response) => {
  // response.room contains updated state
});

// Arrange tiles on private board
socket.emit('remi:arrangeBoard', {
  roomId: 'room_id',
  boardCombinations: [
    {
      type: 'RUN',
      tiles: [...]
    }
  ]
}, (response) => {
  // Only you see this update
});

// Discard a tile
socket.emit('remi:discard', {
  roomId: 'room_id',
  tile: { id: '...', number: 5, color: 'RED' }
}, (response) => {
  // All players notified
});

// Close game (declare win)
socket.emit('remi:closeGame', {
  roomId: 'room_id'
}, (response) => {
  // response.winPattern, winScore, finalScore
});
```

#### Queries

```typescript
// Get current room state
socket.emit(
  'remi:getRoomState',
  {
    roomId: 'room_id',
  },
  (response) => {
    // response.room contains current state
  }
);

// List available rooms
socket.emit('remi:listRooms', (response) => {
  // response.rooms contains array of rooms
});
```

### Server → Client

#### Room Events

```typescript
// Room created
socket.on('remi:roomCreated', (data) => {
  // data.room contains room info
});

// Player joined
socket.on('remi:playerJoined', (data) => {
  // data.playerId, data.playerName, data.room
});

// Player left
socket.on('remi:playerLeft', (data) => {
  // data.playerId
});

// Game started
socket.on('remi:gameStarted', (data) => {
  // data.room contains initial game state
  // Each player receives their own tiles
});
```

#### Game Events

```typescript
// Game state updated
socket.on('remi:gameStateUpdate', (data) => {
  // data.room contains updated state
  // You see your tiles, others see counts
});

// Game ended
socket.on('remi:gameEnded', (data) => {
  // data.winnerId
  // data.winPattern (e.g., "MONOCOLOR")
  // data.winScore (base score)
  // data.finalScore (with multiplier)
  // data.room (final state)
});
```

## 🔒 Privacy Implementation

### Player View (Your Data)

```typescript
{
  id: 'player1',
  name: 'Player 1',
  tiles: [...],              // Full tile data
  boardCombinations: [...],  // Full combinations
  score: 0,
  isOnline: true
}
```

### Opponent View (Other Players)

```typescript
{
  id: 'player2',
  name: 'Player 2',
  tileCount: 14,                    // Only count
  boardCombinationCount: 2,         // Only count
  score: 0,
  isOnline: true
  // tiles and boardCombinations hidden
}
```

## 🧪 Testing

All 8 tests passing:

### Room Management Tests

- ✅ Create room with custom settings
- ✅ Join existing room
- ✅ Broadcast player joined event

### Game Flow Tests

- ✅ Start game and deal tiles correctly
- ✅ Draw from stock pile
- ✅ Discard and advance turn

### Privacy Tests

- ✅ Keep board combinations private from other players

### Joker Tests

- ✅ Launch Joker when discarded (goes to launchedJokers)

Run tests:

```bash
cd packages/backend
npm test -- RemiPeTablaHandler
```

## 🔗 Integration with Game Engine

The WebSocket handler integrates seamlessly with `RemiPeTablaEngine`:

```typescript
// In WebSocketServer.ts
this.remiPeTablaEngine = new RemiPeTablaEngine();
this.remiPeTablaHandler = new RemiPeTablaHandler(this.io, this.remiPeTablaEngine);

// Register handlers on connection
this.io.on('connection', (socket) => {
  this.remiPeTablaHandler.registerHandlers(socket);
});
```

## 📊 Data Flow

```
Client Action
    ↓
WebSocket Event (remi:*)
    ↓
RemiPeTablaHandler
    ↓
RemiPeTablaEngine (validation & state update)
    ↓
Broadcast to Players (sanitized per player)
    ↓
Client Updates UI
```

## 🎯 Key Design Decisions

### 1. Privacy-First Architecture

- Each player receives personalized game state
- Opponents' private data (tiles, board) never sent over network
- Only public information (discard pile, turn) shared

### 2. Server-Side Validation

- All moves validated by game engine before applying
- Prevents cheating and ensures game rules enforced
- Client receives success/error responses

### 3. Event-Driven Updates

- Real-time updates via Socket.io events
- Efficient broadcasting to room members
- Automatic state synchronization

### 4. Callback Pattern

- All client requests use callbacks for responses
- Immediate feedback on action success/failure
- Error messages for invalid moves

## 🚀 Next Steps

### Backend

- [x] WebSocket handlers complete
- [x] Game engine integration complete
- [x] Privacy system complete
- [ ] Game persistence (save/restore)
- [ ] Disconnection handling
- [ ] Reconnection logic
- [ ] REST API endpoints

### Frontend (Flutter)

- [ ] WebSocket client integration
- [ ] Room lobby UI
- [ ] Game table UI with drag-and-drop
- [ ] Private board display
- [ ] Real-time updates
- [ ] Pattern display on win
- [ ] Multiplier indicator

## 📝 Example Usage

### Creating and Playing a Game

```typescript
// Player 1: Create room
socket.emit('remi:createRoom', {
  settings: { tableMultiplier: 2 }
}, (response) => {
  const roomId = response.room.id;

  // Player 2: Join room
  socket2.emit('remi:joinRoom', { roomId }, () => {

    // Player 1: Start game
    socket.emit('remi:startGame', { roomId }, () => {

      // Listen for game start
      socket.on('remi:gameStarted', (data) => {
        console.log('Game started!');
        console.log('My tiles:', data.room.players[0].tiles);

        // Draw a tile
        socket.emit('remi:drawStock', { roomId }, () => {

          // Arrange board privately
          socket.emit('remi:arrangeBoard', {
            roomId,
            boardCombinations: [...]
          }, () => {

            // Discard a tile
            socket.emit('remi:discard', {
              roomId,
              tile: myTile
            }, () => {
              // Turn advanced
            });
          });
        });
      });
    });
  });
});
```

---

**Status**: ✅ Fully Implemented and Tested  
**Tests**: 8/8 Passing  
**Ready for**: Frontend Integration  
**Next**: Game Persistence & Disconnection Handling
