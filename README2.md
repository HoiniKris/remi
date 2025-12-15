# Rummy Game Platform

A modern, real-time multiplayer Rummy game platform with authentic Romanian "Remi pe Tablă" rules, social features, tournaments, and e-commerce capabilities.

## 🎮 Features

### ✅ Implemented

- **Remi pe Tablă**: Complete authentic Romanian variant with 15+ scoring patterns
- **Real-Time Multiplayer**: WebSocket-based gameplay with Socket.io
- **Advanced Pattern Detection**: Automatic recognition of Monocolor, Doubles, Grand Square, etc.
- **Privacy-First Architecture**: Each player sees only their own tiles and board
- **Joker Launching**: Authentic mechanic where discarded Jokers cannot be picked up
- **Table Multipliers**: Support for x1, x2, x3, etc. score multipliers
- **Counter-Clockwise Play**: Traditional Romanian turn order
- **JWT Authentication**: Secure token-based authentication
- **Comprehensive Testing**: 198+ tests covering all game logic

### 🚧 In Progress

- **Multiple Game Variants**: Rummy 45, Canasta (planned)
- **Social Features**: Friends, chat, player profiles (planned)
- **Tournament System**: Daily tournaments with rankings (planned)
- **In-Game Shop**: Purchase premium features and items (planned)
- **Flutter UI**: Cross-platform mobile app (in development)

## Tech Stack

### Frontend

- **Flutter** for cross-platform (iOS, Android, Web)
- BLoC pattern for state management
- Socket.io-client for real-time communication
- Google Fonts for typography
- Flutter Animate for smooth animations
- Secure storage for tokens

### Backend

- Node.js with Express
- TypeScript
- Socket.io for WebSocket server
- PostgreSQL for database
- Redis for caching and pub/sub
- JWT for authentication

## 🚀 Quick Start

### **Backend Server (Fully Functional)**

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Start backend server
cd packages/backend
npm install
npm run dev
```

**Access:** http://localhost:3000  
**WebSocket:** ws://localhost:3000

✅ Complete game engine with real-time multiplayer!

### **Flutter App (UI Only - In Development)**

```bash
cd packages/mobile
flutter pub get
flutter run -d chrome
```

**Access:** http://localhost:8080

⚠️ UI mockup only - WebSocket integration pending

---

## Getting Started

### Prerequisites

- **Flutter SDK** >= 3.38.3 (for mobile app)
- Node.js >= 18.0.0 (for backend)
- npm >= 9.0.0
- Docker Desktop (optional, for backend only)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the database services:

   ```bash
   docker-compose up -d
   ```

4. Set up environment variables:

   ```bash
   cp packages/backend/.env.example packages/backend/.env
   # Edit .env with your configuration
   ```

5. Start the backend server:

   ```bash
   cd packages/backend
   npm install
   npm run dev
   ```

6. Start the Flutter app:
   ```bash
   cd packages/mobile
   flutter pub get
   flutter run
   ```

This will start:

- Backend server on http://localhost:3000
- Flutter app on your selected device (web, iOS, or Android)

- Backend server on http://localhost:3000
- Frontend dev server on http://localhost:5173

### Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## 📁 Project Structure

```
rummy-game-platform/
├── packages/
│   ├── backend/                    # Node.js/Express backend ✅
│   │   ├── src/
│   │   │   ├── game-engine/       # Game logic & rules ✅
│   │   │   │   ├── RemiPeTablaEngine.ts      # Main game engine
│   │   │   │   ├── RemiPatternDetector.ts    # Pattern detection
│   │   │   │   ├── CombinationValidator.ts   # Tile validation
│   │   │   │   └── TileUtils.ts              # Tile generation
│   │   │   ├── websocket/         # Real-time communication ✅
│   │   │   │   ├── WebSocketServer.ts        # Socket.io server
│   │   │   │   └── RemiPeTablaHandler.ts     # Game event handlers
│   │   │   ├── services/          # Business logic ✅
│   │   │   ├── models/            # Data models ✅
│   │   │   ├── repositories/      # Database access ✅
│   │   │   └── utils/             # JWT, helpers ✅
│   │   ├── migrations/            # Database migrations ✅
│   │   └── __tests__/             # 198+ tests ✅
│   └── mobile/                     # Flutter app 🚧
│       ├── lib/
│       │   ├── screens/           # UI screens (mockup)
│       │   ├── widgets/           # Reusable widgets
│       │   ├── bloc/              # State management
│       │   └── main.dart
│       └── pubspec.yaml
├── docker-compose.yml              # PostgreSQL & Redis ✅
├── IMPLEMENTATION_COMPLETE.md      # Full implementation docs ✅
├── WEBSOCKET_REMI_IMPLEMENTATION.md # WebSocket API docs ✅
└── README.md
```

## 🧪 Testing

The project uses comprehensive testing:

- **Jest** for backend unit and integration tests
- **fast-check** for property-based testing
- **Socket.io-client** for WebSocket testing

### Test Coverage

- ✅ 198/198 tests passing
- ✅ Game engine: 190 tests
- ✅ WebSocket: 8 tests
- ✅ Property-based tests: 8 tests

Run tests:

```bash
# All tests
cd packages/backend
npm test

# Specific tests
npm test -- RemiPeTablaEngine
npm test -- RemiPeTablaHandler
npm test -- --testPathPattern="game-engine|websocket"
```

## 📚 Documentation

- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Full implementation summary
- **[WEBSOCKET_REMI_IMPLEMENTATION.md](./WEBSOCKET_REMI_IMPLEMENTATION.md)** - WebSocket API documentation
- **[REMI_PE_TABLA_COMPLETE.md](./REMI_PE_TABLA_COMPLETE.md)** - Game rules and features
- **[.kiro/specs/rummy-game-platform/](./kiro/specs/rummy-game-platform/)** - Detailed requirements and design

## 🎯 Current Status

### Backend (Complete ✅)

- [x] Game engine with authentic Romanian rules
- [x] Pattern detection (15+ patterns)
- [x] Real-time multiplayer via WebSocket
- [x] Privacy-first architecture
- [x] JWT authentication
- [x] Comprehensive test coverage

### Frontend (In Progress 🚧)

- [x] UI mockup screens
- [x] Tile widgets with colors
- [ ] WebSocket client integration
- [ ] Drag-and-drop tile arrangement
- [ ] Real-time game updates
- [ ] Pattern display on win

### Next Steps

1. Integrate WebSocket client in Flutter
2. Implement game lobby UI
3. Add drag-and-drop tile mechanics
4. Connect to backend game engine
5. Add game persistence
6. Implement disconnection handling

## 🎮 How to Play Remi pe Tablă

See [REMI_PE_TABLA_COMPLETE.md](./REMI_PE_TABLA_COMPLETE.md) for complete rules.

**Quick Overview:**

1. First player gets 15 tiles, others get 14
2. Draw a tile (from stock or last discard)
3. Arrange tiles privately on your board
4. Discard a tile to end turn
5. Close when all tiles except one are in valid combinations
6. Score based on pattern (Simple: 250, Monocolor: 1000, etc.)
7. Multiply by table multiplier (x1, x2, x3...)

**Special Rules:**

- Joker Launching: Discarded Jokers cannot be picked up
- Counter-clockwise turns
- No minimum meld requirement
- Private boards (opponents can't see your tiles)

## 🤝 Contributing

Please read the spec documents in `.kiro/specs/rummy-game-platform/` for detailed requirements and design.

## 📄 License

Private - All rights reserved

---

**Video Reference**: https://www.youtube.com/watch?v=h7vFLXEuc6Q  
**Implementation Date**: December 2025
