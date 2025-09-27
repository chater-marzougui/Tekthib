# 🃏 Tunisian Online Card Game

🃏 Tunisian Online Card Game
🎯 Goal

Play smart, bluff well, and be the first to get rid of all your cards. The last player holding cards loses.

🏗️ Setup

Deck: 108 cards → standard 104-card double deck + 4 Jokers.

Players: 3–10 players (works best with 4–6).

Distribution: Cards are shuffled and spread out as evenly as possible to all players. Small differences (like +1 or +2 cards) are fine.

🎮 Game Flow

Starting the Game

A random player is chosen to start.

That player picks any number of cards from their hand (could be 1, 2, 3… etc.).

They place them face-down on the table.

They announce a rank (e.g., “These are three Aces”).

Whether they’re telling the truth or lying is up to them.

The Bluff Mechanic

After the announcement, any player can shout “Liar!” (or click the “Lie” button in the online version).

If challenged:

Cards are revealed.

If the announcer lied, they must take back the pile.

If the announcer told the truth, the challenger must take the pile, and the announcer plays again.

If no one challenges, play passes to the next player clockwise.

Following the Lead

Each new player places cards face-down, but they must claim the same rank as the previous announcement (even if they don’t have it).

Example: First player says “3 Aces.” Next players must also play “Aces,” whether lying or not.

Special Rule: Four of a Kind

If at any point a player collects all 4 cards of the same rank (e.g., all four Kings of different suits), those cards are permanently removed from the game.

This speeds up the game and reduces bluff opportunities.

Winning & Losing

First player to empty their hand → Winner.

Game continues until all but one player have emptied their hands.

Last player stuck with cards → Loser.

💬 Communication Rules (for Online Version)

Voice chat: Players can talk to bluff, banter, or call out lies.

Text chat: For quick reactions and messages.

Fun factor: The game thrives on psychology — convincing others you’re telling the truth, or daring them to challenge.

🧩 Example Round

Player A: puts 2 cards face-down → “These are 2 Queens.”

Player B: suspicious, calls “Liar!” → Cards revealed → They were actually 7s.

Player A takes the pile.

Player B plays next.

Next round, Player B: puts 1 card face-down → “This is a Queen.”

Player C: doesn’t call → accepts. Play continues.

🔥 Key Features That Make It Fun

Bluffing is central — you don’t need the announced cards, just courage.

Group psychology: who challenges whom, when to risk it.

Voice chat makes it feel like a real table game.

Quick, casual rounds that scale from 3 to 10 players.

## 📖 Project Overview

A real-time multiplayer card game platform that brings the classic Tunisian bluffing card game online. Players can create rooms, invite friends via room codes, and enjoy voice chat while playing this exciting game of deception and strategy.

### 🎯 The Game: Quick Rules
- **Goal**: Be the first to get rid of all your cards. Last player with cards loses.
- **Core Mechanic**: Players place cards face-down and announce a rank (truthfully or lying)
- **Bluffing**: Other players can challenge by calling "Liar!" 
- **Consequences**: Wrong challengers or caught liars take the pile
- **Special Rule**: Collect all 4 cards of same rank = permanently removed
- **Social Element**: Voice chat for bluffing, banter, and psychology

## 🏗️ Technical Architecture

### Frontend: React + TypeScript + Tailwind
- **Real-time Communication**: WebSocket for chat + signaling
- **Voice Chat**: WebRTC for peer-to-peer audio
- **UI Framework**: Shadcn UI components
- **State Management**: React hooks + Context API

### Backend: Node.js + Express
- **Deployment**: Heroku (scalable with dynos)
- **Data Storage**: In-memory (ephemeral rooms)
- **Communication**: WebSocket server
- **Signaling**: WebRTC connection coordination

### Architecture Flow
```
┌─────────────┐           ┌─────────────┐
│   Browser   │ <──WS──>  │   Backend   │
│ (React/TS)  │           │ (Node/WS)   │
└──────┬──────┘           └──────┬──────┘
       │                         │
 WebRTC │ Signaling via WS       │ In-memory
  Audio │────────────────────────│ Room State
 Stream │                        │
       ▼                         ▼
  Peers connect directly (P2P)
  for real-time voice
```

## 📁 Project Structure

```
tunisian-card-game/
├── README.md
├── package.json
├── .gitignore
├── .env.example
│
├── client/                          # Frontend React App
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── index.html
│   │
│   ├── src/
│   │   ├── main.tsx                 # App entry point
│   │   ├── App.tsx                  # Main app component
│   │   ├── index.css                # Global styles + Tailwind
│   │   │
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Shadcn UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── dialog.tsx
│   │   │   │
│   │   │   ├── layout/              # Layout components
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   ├── game/                # Game-specific components
│   │   │   │   ├── GameBoard.tsx    # Main game interface
│   │   │   │   ├── PlayerHand.tsx   # Player's cards
│   │   │   │   ├── GamePile.tsx     # Center pile of cards
│   │   │   │   ├── PlayerList.tsx   # Connected players
│   │   │   │   └── GameControls.tsx # Play/challenge buttons
│   │   │   │
│   │   │   ├── room/                # Room management
│   │   │   │   ├── RoomCreator.tsx  # Create new room
│   │   │   │   ├── RoomJoiner.tsx   # Join existing room
│   │   │   │   └── RoomLobby.tsx    # Pre-game lobby
│   │   │   │
│   │   │   └── chat/                # Communication components
│   │   │       ├── ChatBox.tsx      # Text chat interface
│   │   │       ├── VoiceControls.tsx # Mic controls
│   │   │       └── PlayerAudio.tsx  # Audio components
│   │   │
│   │   ├── pages/                   # Main page components
│   │   │   ├── HomePage.tsx         # Landing page
│   │   │   ├── GamePage.tsx         # Active game page
│   │   │   └── RoomPage.tsx         # Room lobby page
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useWebSocket.ts      # WebSocket connection
│   │   │   ├── useWebRTC.ts         # WebRTC audio handling
│   │   │   ├── useGameState.ts      # Game state management
│   │   │   └── useLocalStorage.ts   # Browser storage
│   │   │
│   │   ├── context/                 # React Context providers
│   │   │   ├── GameContext.tsx      # Game state context
│   │   │   ├── RoomContext.tsx      # Room state context
│   │   │   └── AudioContext.tsx     # Audio state context
│   │   │
│   │   ├── types/                   # TypeScript definitions
│   │   │   ├── game.ts              # Game-related types
│   │   │   ├── room.ts              # Room-related types
│   │   │   ├── websocket.ts         # WebSocket message types
│   │   │   └── player.ts            # Player-related types
│   │   │
│   │   ├── utils/                   # Utility functions
│   │   │   ├── cardUtils.ts         # Card manipulation logic
│   │   │   ├── gameLogic.ts         # Game rules implementation
│   │   │   ├── webrtcUtils.ts       # WebRTC helper functions
│   │   │   └── constants.ts         # App constants
│   │   │
│   │   └── lib/                     # External lib configurations
│   │       └── utils.ts             # Shadcn utils (cn function)
│   │
│   └── public/                      # Static assets
│       ├── favicon.ico
│       └── card-images/             # Card graphics (optional)
│
├── server/                          # Backend Node.js App
│   ├── package.json
│   ├── tsconfig.json
│   ├── Procfile                     # Heroku deployment
│   │
│   ├── src/
│   │   ├── index.ts                 # Server entry point
│   │   ├── app.ts                   # Express app setup
│   │   │
│   │   ├── routes/                  # HTTP API routes
│   │   │   ├── rooms.ts             # Room management endpoints
│   │   │   └── health.ts            # Health check endpoint
│   │   │
│   │   ├── websocket/               # WebSocket handling
│   │   │   ├── index.ts             # WebSocket server setup
│   │   │   ├── handlers/            # Message handlers
│   │   │   │   ├── roomHandlers.ts  # Room join/leave/create
│   │   │   │   ├── gameHandlers.ts  # Game action handlers
│   │   │   │   ├── chatHandlers.ts  # Chat message handlers
│   │   │   │   └── webrtcHandlers.ts # WebRTC signaling
│   │   │   └── middleware/          # WebSocket middleware
│   │   │       └── auth.ts          # Basic connection auth
│   │   │
│   │   ├── game/                    # Game logic (server-side)
│   │   │   ├── GameEngine.ts        # Core game logic
│   │   │   ├── Deck.ts              # Card deck management
│   │   │   ├── Player.ts            # Player state management
│   │   │   └── Room.ts              # Room state management
│   │   │
│   │   ├── types/                   # Shared TypeScript types
│   │   │   ├── game.ts              # Game state types
│   │   │   ├── websocket.ts         # WebSocket message types
│   │   │   ├── room.ts              # Room types
│   │   │   └── player.ts            # Player types
│   │   │
│   │   └── utils/                   # Server utilities
│   │       ├── roomManager.ts       # In-memory room storage
│   │       ├── idGenerator.ts       # Room/player ID generation
│   │       └── logger.ts            # Logging utility
│   │
│   └── dist/                        # Compiled JavaScript (gitignored)
│
└── docs/                            # Documentation
    ├── GAME_RULES.md                # Detailed game rules
    ├── API_DOCS.md                  # WebSocket API documentation
    ├── DEPLOYMENT.md                # Deployment instructions
    └── CONTRIBUTING.md              # Development guidelines
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Heroku CLI (for deployment)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd tunisian-card-game
```

### 2. Backend Setup
```bash
cd server
npm install
npm run dev          # Development mode
npm run build        # Production build
npm start           # Production mode
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev         # Development server
npm run build       # Production build
```

### 4. Environment Variables
Create `.env` files in both `client/` and `server/`:

**server/.env:**
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**client/.env:**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## 📋 Development Workflow

### Phase 1: Core Infrastructure (Week 1)
1. **Backend Foundation**
   - Express server setup with WebSocket support
   - In-memory room management system
   - Basic HTTP routes for room creation
   - WebSocket message routing system

2. **Frontend Foundation**
   - React + TypeScript + Vite setup
   - Tailwind CSS + Shadcn UI configuration
   - Basic routing with React Router
   - WebSocket connection hook

### Phase 2: Room System (Week 2)
1. **Room Management**
   - Create room functionality
   - Join room with codes
   - Room lobby with player list
   - Leave room / cleanup logic

2. **Real-time Communication**
   - Text chat implementation
   - WebSocket message broadcasting
   - Connection state management

### Phase 3: Game Engine (Week 3)
1. **Game Logic**
   - Card deck creation and shuffling
   - Hand distribution algorithm
   - Turn-based play system
   - Bluff challenge mechanics
   - Win/lose condition checking

2. **Game UI**
   - Game board layout
   - Player hand display
   - Card play interface
   - Challenge button system

### Phase 4: Voice Chat (Week 4)
1. **WebRTC Implementation**
   - Peer-to-peer connection setup
   - Audio stream management
   - Microphone controls
   - Connection stability handling

### Phase 5: Polish & Deploy (Week 5)
1. **UX Improvements**
   - Animations and transitions
   - Sound effects
   - Error handling
   - Loading states

2. **Deployment**
   - Heroku configuration
   - Environment setup
   - Performance optimization

## 📝 Key File Responsibilities

### Frontend Key Files

**`src/hooks/useWebSocket.ts`**
- WebSocket connection management
- Message sending/receiving
- Connection state tracking
- Automatic reconnection logic

**`src/hooks/useWebRTC.ts`**
- WebRTC peer connection setup
- Audio stream handling
- Signaling message processing
- Microphone permission management

**`src/context/GameContext.tsx`**
- Global game state management
- Player hand state
- Game phase tracking (lobby, playing, ended)
- Action dispatching

**`src/utils/gameLogic.ts`**
- Client-side game rule validation
- Hand sorting and filtering
- Card matching logic
- Challenge result calculation

**`src/components/game/GameBoard.tsx`**
- Main game interface layout
- Turn indicator display
- Current play information
- Action button coordination

### Backend Key Files

**`src/websocket/index.ts`**
- WebSocket server initialization
- Connection handling
- Message routing to handlers
- Error handling and cleanup

**`src/game/GameEngine.ts`**
- Server-authoritative game logic
- Turn validation
- Challenge resolution
- Win condition checking
- Game state synchronization

**`src/utils/roomManager.ts`**
- In-memory room storage
- Room lifecycle management
- Player join/leave handling
- Room cleanup when empty

**`src/websocket/handlers/gameHandlers.ts`**
- Play card action handling
- Challenge action processing
- Turn advancement logic
- Game state broadcasting

## 🔧 Best Practices

### Code Quality
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint + Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit linting and type checking
- **Testing**: Unit tests for game logic, integration tests for WebSocket handlers

### Performance
- **Debouncing**: User input and WebSocket messages
- **Memoization**: React components and expensive calculations
- **Lazy Loading**: Route-based code splitting
- **WebRTC**: Peer-to-peer for audio (reduces server load)

### Security
- **Input Validation**: All user inputs validated
- **Rate Limiting**: WebSocket message frequency limits
- **CORS**: Proper origin restrictions
- **Sanitization**: Text messages sanitized before broadcast

### UX Guidelines
- **Loading States**: Clear feedback for all async operations
- **Error Handling**: Graceful degradation and clear error messages
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive**: Mobile-first design approach

## 🌐 API Documentation

### WebSocket Message Types

```typescript
// Room Management
type JoinRoomMessage = {
  type: 'JOIN_ROOM';
  payload: { roomId: string; playerName: string };
}

// Game Actions
type PlayCardsMessage = {
  type: 'PLAY_CARDS';
  payload: { cardIds: string[]; claimedRank: string };
}

type ChallengeMessage = {
  type: 'CHALLENGE';
  payload: { challengerId: string };
}

// Chat
type ChatMessage = {
  type: 'CHAT_MESSAGE';
  payload: { message: string; playerId: string };
}

// WebRTC Signaling
type RTCOfferMessage = {
  type: 'RTC_OFFER';
  payload: { targetPlayerId: string; offer: RTCSessionDescription };
}
```

### HTTP Endpoints

```typescript
GET /api/health              // Health check
POST /api/rooms              // Create new room
GET /api/rooms/:id           // Get room info
DELETE /api/rooms/:id        // Delete room (admin)
```

## 🚀 Deployment Guide

### Heroku Deployment
1. **Prepare Heroku App**
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev  # If adding persistence later
```

2. **Configure Environment**
```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=443
```

3. **Deploy**
```bash
git push heroku main
heroku logs --tail  # Monitor deployment
```

### Environment Configuration
- **Development**: Local WebSocket on `:3001`
- **Production**: Heroku with WSS (secure WebSocket)
- **CORS**: Configure for your domain

## 🛠️ Next Steps After MVP

### Immediate Improvements
- [ ] Add player avatars and customization
- [ ] Implement spectator mode
- [ ] Add game replay functionality
- [ ] Create tournament bracket system

### Scaling Considerations
- [ ] Redis for multi-dyno room synchronization
- [ ] PostgreSQL for user accounts and statistics
- [ ] CDN for static assets
- [ ] Load balancing for WebSocket connections

### Monetization Options
- [ ] Premium room features (custom themes, longer games)
- [ ] Advertisement integration
- [ ] Tournament entry fees
- [ ] Cosmetic customizations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Standards
- Follow TypeScript strict mode
- Write tests for game logic
- Update documentation for new features
- Follow the established project structure

---

## 📞 Support

For questions or issues:
- Create GitHub issues for bugs
- Use discussions for feature requests
- Check docs/ folder for detailed guides

Happy coding! 🎮✨