# Remi pe Tablă Implementation

## Overview

"Remi pe Tablă" (Rummy on the Board) is now fully implemented as a separate game variant. This is the authentic Romanian rummy game where players keep their combinations private on their own racks/boards until they win.

## Key Features Implemented

### ✅ Private Board System

- Each player has their own `boardCombinations` array
- Combinations are kept private and not visible to other players
- Players can arrange and rearrange tiles on their board at any time

### ✅ Simplified Rules

- **No first meld requirement** - Unlike Rummy 45, there's no minimum 45-point meld
- **No shared table** - Players don't place tiles on a central table
- **Private strategy** - Opponents can't see your combinations until you win

### ✅ Authentic Game Flow

1. **Setup**: First player gets 15 tiles, others get 14
2. **Trump tile**: One tile is revealed as trump (optional for scoring)
3. **Turns**: Counter-clockwise by default
4. **Draw**: From stock pile OR last discarded tile only
5. **Arrange**: Organize tiles on your private board
6. **Discard**: End turn by discarding one tile
7. **Win**: Close game when all tiles except one are in valid combinations

### ✅ Win Conditions

- All tiles must be in valid combinations (runs or sets)
- Exactly 1 tile left to discard
- All combinations validated before declaring win
- **Clean Finish Bonus**: 350 points (no Jokers used)
- **Normal Win**: 250 points

### ✅ Scoring System

- Winner collects points from all losers
- Losers lose points based on remaining tiles:
  - **Joker penalty**: 50 points (configurable, typically high)
  - **Numbered tiles**: Face value (1-13 points)
- Tiles in valid combinations don't count against you

### ✅ Valid Combinations

**Runs (Suita)**:

- 3+ consecutive numbers, same color
- Examples: Red 4-5-6, Blue 10-11-12-13
- 1 can be at start (1-2-3) or end (12-13-1) but NOT middle

**Sets (Terta/Group)**:

- 3-4 tiles, same number, different colors
- Examples: Red 7 + Yellow 7 + Blue 7

**Jokers**:

- Can substitute any tile
- High penalty (50 points) if kept in hand when opponent wins

## File Structure

```
packages/backend/src/game-engine/
├── RemiPeTablaEngine.ts          # Main game engine
└── __tests__/
    └── RemiPeTablaEngine.test.ts # 17 comprehensive tests
```

## API Usage

### Create a Game Room

```typescript
import { RemiPeTablaEngine } from './game-engine/RemiPeTablaEngine';

const engine = new RemiPeTablaEngine();

const result = engine.createRoom('player1', 'Player 1', {
  maxPlayers: 4,
  turnTimeLimit: 60,
  jokerPenalty: 50,
  counterClockwise: true,
  allowWrapAroundRuns: true,
});

const roomId = result.gameState!.id;
```

### Join and Start Game

```typescript
// Players join
engine.joinRoom(roomId, 'player2', 'Player 2');
engine.joinRoom(roomId, 'player3', 'Player 3');

// Host starts game
engine.startGame(roomId, 'player1');
```

### Make Moves

```typescript
// Draw from stock
engine.executeMove(roomId, {
  type: 'DRAW_STOCK',
  playerId: 'player1',
});

// Arrange tiles on private board
engine.executeMove(roomId, {
  type: 'ARRANGE_BOARD',
  playerId: 'player1',
  boardCombinations: [
    {
      type: 'RUN',
      tiles: [
        { id: 'tile-1', number: 4, color: 'RED', isJoker: false },
        { id: 'tile-2', number: 5, color: 'RED', isJoker: false },
        { id: 'tile-3', number: 6, color: 'RED', isJoker: false },
      ],
      isValid: true,
    },
  ],
});

// Discard and end turn
engine.executeMove(roomId, {
  type: 'DISCARD',
  playerId: 'player1',
  tile: { id: 'tile-10', number: 10, color: 'RED', isJoker: false },
});

// Close game (win)
engine.executeMove(roomId, {
  type: 'CLOSE_GAME',
  playerId: 'player1',
});
```

## Game State Structure

```typescript
interface RemiPeTablaRoom {
  id: string;
  gameType: 'REMI_PE_TABLA';
  players: RemiPeTablaPlayer[];
  currentPlayerIndex: number;
  stockPile: Tile[];
  discardPile: Tile[];
  trumpTile?: Tile;
  gamePhase: 'WAITING' | 'PLAYING' | 'FINISHED';
  settings: RemiPeTablaSettings;
  winnerId?: string;
}

interface RemiPeTablaPlayer {
  id: string;
  name: string;
  tiles: Tile[]; // Tiles in hand
  boardCombinations: Combination[]; // Private combinations
  score: number;
  isOnline: boolean;
}
```

## Differences from Original GameEngine

| Feature            | Original (Rummy 45)        | Remi pe Tablă     |
| ------------------ | -------------------------- | ----------------- |
| Combinations       | Shared table               | Private boards    |
| First Meld         | 45 points minimum          | No requirement    |
| Turn Order         | Clockwise                  | Counter-clockwise |
| Discard Pickup     | Any from pile              | Last tile only    |
| Joker Penalty      | 25 points                  | 50 points         |
| Table Manipulation | Can rearrange shared tiles | Only own board    |

## Testing

All 17 tests pass, covering:

- ✅ Room creation and joining
- ✅ Game initialization with proper tile distribution
- ✅ Drawing from stock and discard piles
- ✅ Private board arrangement
- ✅ Counter-clockwise turn advancement
- ✅ Win condition validation
- ✅ Clean finish bonus calculation
- ✅ Joker penalty scoring

Run tests:

```bash
cd packages/backend
npm test -- RemiPeTablaEngine
```

## Next Steps

### Backend Integration

1. Add WebSocket handlers for Remi pe Tablă moves
2. Create REST API endpoints for room management
3. Add game state persistence
4. Implement reconnection handling

### Frontend Integration

1. Create Remi pe Tablă game screen
2. Implement private board UI (player's rack)
3. Add drag-and-drop for tile arrangement
4. Show opponent tile counts (but not their combinations)
5. Add "Close Game" button when ready to win

### Future Enhancements

- Pattern detection (Monochrome, Bicolor, etc.) for bonus scoring
- Tournament support for Remi pe Tablă
- Replay system
- Statistics tracking

## Configuration Options

```typescript
interface RemiPeTablaSettings {
  maxPlayers: number; // 2-4 players
  turnTimeLimit: number; // Seconds per turn
  jokerPenalty: number; // Points for Joker in hand (default: 50)
  allowWrapAroundRuns: boolean; // 1 at start/end of runs (default: true)
  counterClockwise: boolean; // Turn direction (default: true)
}
```

## Notes

- The engine is completely separate from the original GameEngine
- Both engines can coexist in the same application
- Tile generation and validation logic is shared between engines
- All game rules match the authentic Romanian "Remi pe tablă" variant

---

**Status**: ✅ Fully Implemented and Tested  
**Tests**: 17/17 Passing  
**Ready for**: WebSocket Integration & Frontend Development
