# Tekthib Server

Node.js + TypeScript backend for the Tekthib online card game. Provides real-time game logic, WebSocket communication, AI bot players, and voice chat signaling.

## 🏗️ Architecture

The server is built as a server-authoritative game engine with real-time WebSocket communication:

- **Server-Authoritative**: All game rules and state changes are validated server-side
- **Real-time Communication**: WebSocket for game events, WebRTC signaling for P2P voice chat
- **In-Memory State**: Rooms and game states stored in memory (scalable to Redis if needed)
- **AI Bots**: Three personality types with learning capabilities
- **Admin API**: REST endpoints for monitoring and management

## 🚀 Features

### Core Systems
- ✅ **WebSocket Server** - Real-time bidirectional communication with clients
- ✅ **Game Engine** - Server-authoritative turn-based card game logic
- ✅ **Room Manager** - Create, join, and manage game rooms with unique codes
- ✅ **Bot AI System** - Three personalities (aggressive, truthful, unpredictable) with adaptive learning
- ✅ **Voice Chat Signaling** - WebRTC offer/answer/ICE candidate relay for P2P audio
- ✅ **Auto-Play Timer** - Configurable timeouts (10-120s) with automatic card play
- ✅ **Challenge Suspense** - Optional 3-second dramatic reveal for challenges
- ✅ **Admin Dashboard** - Real-time monitoring of rooms, players, and game states

### Game Features
- Full Tekthib game rules implementation (bluffing, challenging, four-of-a-kind removal)
- Player statistics tracking (bluffs caught/successful, false accusations, truths told)
- Multiple bot personalities that learn player behavior patterns
- 40+ contextual bot chat messages based on game events
- Configurable auto-play timeout for inactive players
- Host controls (kick players, mute microphones)

## 📁 Project Structure

```
server/
├── src/
│   ├── game/                    # Core game logic
│   │   ├── GameEngine.ts        # Server-authoritative game state and rules
│   │   ├── BotPlayer.ts         # Bot AI decision-making and learning
│   │   ├── BotMemory.ts         # Bot learning system (tracks player behavior)
│   │   ├── BotChatMessages.ts   # 40+ personality-specific chat messages
│   │   └── Deck.ts              # Card deck management (double deck + jokers)
│   │
│   ├── websocket/               # WebSocket handlers
│   │   ├── index.ts             # WebSocket server setup and client management
│   │   └── handlers/
│   │       ├── gameHandlers.ts  # PLAY_CARDS, CHALLENGE, GET_GAME_STATE
│   │       ├── roomHandlers.ts  # CREATE_ROOM, JOIN_ROOM, START_GAME, etc.
│   │       ├── chatHandlers.ts  # CHAT_MESSAGE handling
│   │       └── webrtcHandlers.ts # RTC_OFFER, RTC_ANSWER, RTC_ICE_CANDIDATE
│   │
│   ├── routes/                  # REST API endpoints
│   │   └── adminRoutes.ts       # Admin dashboard API
│   │
│   ├── utils/                   # Utilities
│   │   └── roomManager.ts       # Room lifecycle and state management
│   │
│   ├── types/                   # Server-specific types
│   │   └── index.ts             # Room, GameState interfaces
│   │
│   ├── config/                  # Configuration
│   │   └── config.ts            # Environment variables and settings
│   │
│   ├── app.ts                   # Express app setup (REST API)
│   └── server.ts                # HTTP server entry point
│
├── .env                         # Environment variables
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

## 🚦 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- Optional: Redis (for future scalability)

### Installation

```bash
# From project root
npm run install:all

# Or install server only
cd server
npm install
```

### Environment Variables

Create `server/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS (allow frontend origin)
CORS_ORIGIN=http://localhost:5173

# Admin Dashboard (set a strong password in production)
ADMIN_PASSWORD=your_secure_password_here
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Server runs on http://localhost:3001
# WebSocket available on ws://localhost:3001
```

### Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Or use Heroku's Procfile (already configured)
```

## 🎮 WebSocket Message Types

### Room Management
- `CREATE_ROOM` - Create new game room with settings
- `JOIN_ROOM` - Join existing room by code
- `LEAVE_ROOM` - Leave current room
- `START_GAME` - Host starts the game (distributes cards, initializes engine)
- `ADD_BOTS` - Add AI bot players to room
- `REMOVE_BOT` - Remove specific bot from room
- `KICK_PLAYER` - Host kicks a player
- `SWITCH_PLAYER_MIC` - Host mutes/unmutes player's microphone

### Game Actions
- `GET_GAME_STATE` - Request current game state (for reconnection)
- `PLAY_CARDS` - Player plays cards with claimed rank
- `CHALLENGE` - Challenge previous player's claim
- `READY` - Mark player as ready in lobby

### Real-time Events (Server → Client)
- `ROOM_CREATED` - Room successfully created
- `ROOM_JOINED` - Successfully joined room
- `PLAYER_JOINED` - Another player joined
- `PLAYER_LEFT` - Player disconnected or left
- `GAME_STARTED` - Game has begun
- `INITIAL_GAME_STATE` - Full game state (for joining/reconnecting)
- `GAME_STATE_UPDATE` - Incremental state update
- `CARDS_PLAYED` - Player played cards
- `CHALLENGE_SUBMITTED` - Challenge initiated (triggers suspense)
- `CHALLENGE_RESULT` - Challenge resolved (reveals cards)
- `GAME_ENDED` - Game finished (winners/loser)
- `CHAT_MESSAGE` - Chat message from player or bot
- `ERROR` - Error message

### Voice Chat (WebRTC Signaling)
- `RTC_OFFER` - WebRTC offer for peer connection
- `RTC_ANSWER` - WebRTC answer from peer
- `RTC_ICE_CANDIDATE` - ICE candidate for NAT traversal

## 🤖 Bot AI System

### Personalities
1. **Aggressive** (`aggressive`)
   - Bluffs frequently (60-80% of plays)
   - Challenges often, especially risky players
   - Bold, taunting chat messages

2. **Truthful** (`truthful`)
   - Rarely bluffs (10-20% of plays)
   - Only challenges when confident
   - Honest, justice-oriented messages

3. **Unpredictable** (`unpredictable`)
   - Random bluff rate (30-70%)
   - Inconsistent challenge behavior
   - Chaotic, unexpected messages

### Learning System
Bots track and adapt to player behavior:
- **Bluff Detection**: Monitors successful/failed bluffs per player
- **Challenge Success**: Records challenge outcomes
- **Risk Profiling**: Identifies frequent bluffers
- **Position Awareness**: Adjusts strategy based on game position
- **Memory Decay**: Recent behavior weighted more heavily

### Chat System
- 40+ unique messages per personality
- Context-aware (successful bluff, caught bluffing, big play, random)
- Probability-based triggering (5-25% chance per context)

## 🔧 Key Classes

### `GameEngine` (`src/game/GameEngine.ts`)
Central game logic class managing:
- Turn order and phase transitions
- Card validation and pile management
- Challenge resolution
- Four-of-a-kind detection
- Bot AI decision-making
- Auto-play timer system
- Player statistics tracking

**Key Methods:**
- `playCards()` - Validate and execute card play
- `challenge()` - Resolve challenge between players
- `startTurnTimer()` - Begin auto-play countdown
- `getPublicGameState()` - Export safe state for clients
- `getBotChallenger()` - Check if any bot wants to challenge
- `getBotPlay()` - Get bot's play decision

### `RoomManager` (`src/utils/roomManager.ts`)
Manages all active game rooms:
- Room creation with unique 6-character codes
- Player joins/leaves
- Game start validation
- Bot addition/removal
- QR code generation for room sharing

### `BotPlayer` (`src/game/BotPlayer.ts`)
Individual bot AI instance:
- Personality-based decision making
- Learning from game events
- Chat message triggering

### `BotMemory` (`src/game/BotMemory.ts`)
Tracks opponent behavior for learning:
- Per-player bluff statistics
- Challenge success rates
- Position-based adjustments

## 🔐 Admin API

**Endpoint:** `GET /api/admin/rooms`

**Auth:** Query parameter `password` must match `ADMIN_PASSWORD` env var

**Response:**
```json
{
  "rooms": [
    {
      "id": "room-uuid",
      "code": "ABC123",
      "hostName": "Player1",
      "playerCount": 4,
      "maxPlayers": 10,
      "gameStarted": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "players": ["Player1", "Player2", "Bot-Alice", "Bot-Bob"]
    }
  ]
}
```

## 📊 Performance Considerations

See [SYSTEM_OPTIMIZATION.md](../SYSTEM_OPTIMIZATION.md) for detailed optimization recommendations:
- Timer update optimization (99% bandwidth reduction possible)
- Game state delta updates
- WebSocket compression
- Scalability to 5,000+ concurrent users

## 🧪 Testing

```bash
# Lint code
npm run lint

# Build project (type checking)
npm run build
```

**Note:** No automated tests currently - manual testing required. Consider adding:
- Unit tests for `GameEngine` game rules
- Integration tests for WebSocket handlers
- Bot AI behavior tests

## 🚀 Deployment

### Heroku
Project includes `Procfile` for Heroku deployment:

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set PORT=3001
heroku config:set ADMIN_PASSWORD=your_password

# Deploy
git push heroku main
```

### Environment Variables (Production)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Set to `production`
- `CORS_ORIGIN` - Frontend URL (e.g., `https://yourdomain.com`)
- `ADMIN_PASSWORD` - Secure password for admin dashboard

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Run `npm run lint` before committing
3. Test game logic manually (multiple players + bots)
4. Document new WebSocket message types in `shared/src/types/`

## 📝 License

MIT License - See root LICENSE file
