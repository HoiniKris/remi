# 🧪 Testing Guide - Rummy Game Platform

## 🎯 All Services Running!

Your complete Rummy Game Platform is now operational. Here's how to test the new features we just implemented.

## 📍 Service URLs

- **Backend API**: http://localhost:3000
- **Frontend Web**: http://localhost:5173
- **Flutter Mobile**: http://127.0.0.1:54378
- **Flutter DevTools**: http://127.0.0.1:54378/fj71hEw4SYk=/devtools/
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🆕 New Features to Test

### 1. Game Persistence (Task 13.1) ✅

**What it does**: Automatically saves game state every 30 seconds

**How to test**:

1. Open the Flutter app or Frontend
2. Create a new Remi pe Tablă game
3. Start playing (draw tiles, arrange them)
4. Wait 30 seconds - game auto-saves
5. Check backend logs for "Game state saved" messages

**Backend Test**:

```bash
cd packages/backend
npm test -- RemiPeTablaPersistenceService.test.ts
```

Expected: 13/13 tests passing ✅

### 2. Disconnection Handling (Task 13.2) ✅

**What it does**:

- Auto-arranges disconnected player's tiles into valid combinations
- Auto-discards for current player
- Applies progressive penalties (50/100 points)
- Gives 2-minute reconnection window

**How to test**:

1. Start a game with 2+ players
2. Simulate disconnection (close browser tab or disconnect WebSocket)
3. Watch the system auto-arrange the disconnected player's tiles
4. See auto-discard if it was their turn
5. Other players get notified of disconnection

**Backend Test**:

```bash
npm test -- DisconnectionHandler.test.ts
```

Expected: 13/13 tests passing ✅

### 3. Reconnection & Resume (Task 13.3) ✅

**What it does**:

- Shows list of unfinished games
- Allows resuming from exact game state
- Validates state integrity
- Notifies other players when someone reconnects

**How to test**:

1. Start a game and play a few turns
2. Disconnect (close tab)
3. Reconnect within 2 minutes
4. Request list of unfinished games via WebSocket event `game:getUnfinishedGames`
5. Resume the game via `game:resume` event
6. Game continues from exact state

**WebSocket Events**:

- `game:getUnfinishedGames` - Get list of resumable games
- `game:resume` - Resume a specific game
- `player:disconnected` - Notification when player disconnects
- `player:reconnected` - Notification when player reconnects
- `player:resumed` - Notification when player resumes game

## 🎮 Testing the Complete Game Flow

### Step 1: Create Account

1. Open http://localhost:5173 (Frontend) or http://127.0.0.1:54378 (Flutter)
2. Register a new account
3. Login with credentials

### Step 2: Create Game

1. Navigate to game lobby
2. Click "Create Game"
3. Select "Remi pe Tablă"
4. Set 2-4 players
5. Wait for other players to join (or open multiple browser tabs)

### Step 3: Play Game

1. Draw a tile from stock or discard pile
2. Arrange tiles on your private board
3. Form valid runs (3+ consecutive same color) or sets (3-4 same number different colors)
4. Discard a tile to end turn
5. Try to close the game (all tiles in valid combinations + 1 discard)

### Step 4: Test Disconnection

1. During gameplay, close one player's browser tab
2. Watch the system handle it:
   - Auto-arrange their tiles
   - Auto-discard if their turn
   - Notify other players
   - Start 2-minute reconnection timer

### Step 5: Test Reconnection

1. Reopen the browser tab within 2 minutes
2. Login again
3. See "Resume Game" option
4. Click to resume
5. Game continues from exact state

### Step 6: Test Persistence

1. Play a game for a few minutes
2. Check backend logs - should see auto-save messages every 30s
3. Restart the backend server
4. Games should be recoverable from database

## 🧪 Running All Tests

### Backend Tests

```bash
cd packages/backend
npm test
```

**Expected Results**:

- Total: 374/388 tests passing
- RemiPeTablaPersistenceService: 13/13 ✅
- DisconnectionHandler: 13/13 ✅
- RemiPeTablaEngine: 198+ tests ✅
- Game Engine: All core tests passing ✅

### Frontend Tests

```bash
cd packages/frontend
npm test
```

### Mobile Tests

```bash
cd packages/mobile
flutter test
```

## 🔍 Debugging Tools

### Backend Logs

Watch the terminal where backend is running for:

- WebSocket connections
- Game state changes
- Auto-save messages
- Disconnection events
- Reconnection events

### Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "WS" to see WebSocket messages
4. Watch real-time game events

### Flutter DevTools

Access at: http://127.0.0.1:54378/fj71hEw4SYk=/devtools/

- Inspector: View widget tree
- Performance: Monitor frame rates
- Network: See API calls
- Logging: View app logs

## 📊 Database Inspection

### Check Saved Games

```bash
# Connect to PostgreSQL
docker exec -it remi-postgres-1 psql -U postgres -d rummy_game

# View saved games
SELECT id, game_type, player_count, current_turn, created_at
FROM remi_pe_tabla_games
ORDER BY created_at DESC
LIMIT 10;

# View game state
SELECT id, game_type, state
FROM remi_pe_tabla_games
WHERE id = 'your-game-id';
```

### Check Redis Cache

```bash
# Connect to Redis
docker exec -it remi-redis-1 redis-cli

# List all keys
KEYS *

# Get specific game state
GET game:your-game-id
```

## 🎯 What to Look For

### ✅ Success Indicators

- Games save automatically every 30 seconds
- Disconnected players' tiles are auto-arranged
- Penalties applied correctly (50/100 points)
- Reconnection works within 2 minutes
- Game state perfectly restored on resume
- All players notified of disconnections/reconnections
- No tile loss or duplication

### ❌ Issues to Report

- Games not saving
- Tiles lost or duplicated
- Auto-arrange creates invalid combinations
- Reconnection fails
- State restoration incorrect
- Penalties not applied
- Notifications not received

## 🚀 Next Steps

After testing these features, we can move on to:

1. **Task 13.4**: Property test for state persistence round-trip
2. **Task 13.5**: Property test for periodic persistence
3. **Phase 4**: Social features (friends, chat, profiles)
4. **Phase 5**: Game variants (Rummy 45, Canasta)
5. **Phase 6**: Tournament system

## 💡 Tips

- Use multiple browser tabs to simulate multiple players
- Check backend logs for detailed event information
- Use browser DevTools to inspect WebSocket messages
- Test edge cases (disconnect during turn, multiple disconnects, etc.)
- Try reconnecting after 2 minutes to see forfeit behavior

---

**Happy Testing!** 🎮

If you encounter any issues or have questions, check the backend logs first, then inspect the WebSocket messages in browser DevTools.
