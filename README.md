# 🃏 Tunisian Online Card Game - Tekthib

<p align="center">
   <img src="./shared/public/logo_for_readme.png" alt="Tekthib Logo" width="70%">
</p>

## 📖 Project Overview

A real-time multiplayer card game platform that brings the classic Tunisian bluffing card game online. Players can create rooms, invite friends via room codes, and enjoy voice chat while playing this exciting game of deception and strategy.

> **🌐 Live Application**: Play now at https://chater-marzougui.me/Tekthib/
> 
> **📚 Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment documentation and troubleshooting.

### 🎯 The Game: Quick Rules
- **Goal**: Be the first to get rid of all your cards. Last player with cards loses.
- **Core Mechanic**: Players place cards face-down and announce a rank (truthfully or lying)
- **Bluffing**: Other players can challenge by calling "Liar!" 
- **Consequences**: Wrong challengers or caught liars take the pile
- **Special Rule**: Collect all 4 cards of same rank = permanently removed
- **Social Element**: Voice chat for bluffing, banter, and psychology

Play smart, bluff well, and be the first to get rid of all your cards. The last player holding cards loses.

## 🏗️ Setup

- **Deck**: 108 cards → standard 104-card double deck + 4 Jokers
- **Players**: 3–10 players (works best with 4–6)
- **Distribution**: Cards are shuffled and spread out as evenly as possible to all players. Small differences (like +1 or +2 cards) are fine.

## 🎮 Game Flow

### Starting the Game
- A random player is chosen to start
- That player picks any number of cards from their hand (could be 1, 2, 3... etc.)
- They place them face-down on the table
- They announce a rank (e.g., "These are three Aces")
- Whether they're telling the truth or lying is up to them

### The Bluff Mechanic
- After the announcement, any player can shout "Liar!" (or click the "Lie" button in the online version)
- If challenged:
  - Cards are revealed
  - If the announcer lied, they must take back the pile
  - If the announcer told the truth, the challenger must take the pile, and the announcer plays again
- If no one challenges, play passes to the next player clockwise

### Following the Lead
- Each new player places cards face-down, but they must claim the same rank as the previous announcement (even if they don't have it)
- **Example**: First player says "3 Aces." Next players must also play "Aces," whether lying or not

### Special Rule: Four of a Kind
- If at any point a player collects all 4 cards of the same rank (e.g., all four Kings of different suits), those cards are permanently removed from the game
- This speeds up the game and reduces bluff opportunities

## 🏆 Winning & Losing
- **First player to empty their hand** → Winner
- Game continues until all but one player have emptied their hands
- **Last player stuck with cards** → Loser

## 💬 Communication Rules (for Online Version)
- **Voice chat**: Players can talk to bluff, banter, or call out lies
- **Text chat**: For quick reactions and messages
- **Fun factor**: The game thrives on psychology — convincing others you're telling the truth, or daring them to challenge

## 🧩 Example Round
1. **Player A**: puts 2 cards face-down → "These are 2 Queens."
2. **Player B**: suspicious, calls "Liar!" → Cards revealed → They were actually 7s
3. **Player A** takes the pile
4. **Player B** plays next
5. Next round, **Player B**: puts 1 card face-down → "This is a Queen."
6. **Player C**: doesn't call → accepts. Play continues

## 🔥 Key Features That Make It Fun
- **Bluffing is central** — you don't need the announced cards, just courage
- **Group psychology**: who challenges whom, when to risk it
- **Voice chat** makes it feel like a real table game
- **Quick, casual rounds** that scale from 3 to 10 players

## 📊 Current Implementation Status

### ✅ Fully Implemented Features

#### Core Infrastructure
- ✅ React + TypeScript + Vite frontend with Tailwind CSS
- ✅ Node.js + Express backend with TypeScript
- ✅ WebSocket server for real-time communication
- ✅ Full routing system (HomePage, RoomPage, GamePage, AdminPage)
- ✅ WebSocket context provider for global state management
- ✅ SEO optimization with dynamic meta tags
- ✅ **i18n Support**: Full internationalization with Arabic, English, and French translations
- ✅ **Theme System**: Dark/light theme toggle with persistent local storage
- ✅ **Iconify Integration**: Modern, colorful icons across the entire application

#### Room Management
- ✅ Create room with unique 6-character code
- ✅ Join room by code
- ✅ Real-time player list updates
- ✅ Ready/Not Ready status tracking
- ✅ Host-based game start controls
- ✅ Player leave/disconnect handling
- ✅ Automatic host transfer when original host leaves
- ✅ QR code generation for easy room sharing
- ✅ Bot players support (add bots to fill room)

#### Game Engine
- ✅ Complete server-side game logic
- ✅ Card deck (108 cards: 2 standard decks + 4 Jokers)
- ✅ Card distribution to 3-10 players
- ✅ Turn-based gameplay
- ✅ Bluffing mechanic (claim any rank)
- ✅ Challenge system with verification
- ✅ Four-of-a-kind auto-removal
- ✅ Winner/loser detection
- ✅ Real-time game state synchronization
- ✅ AI bot players with strategic decision-making
- ✅ **Auto-play Timer**: Configurable server-side timer (10-120 seconds) that auto-plays for inactive players
- ✅ **Timer Synchronization**: Real-time timer updates broadcast to all clients every second
- ✅ **Bot Personalities**: Three distinct bot personalities (aggressive, truthful, unpredictable)
- ✅ **Bot Learning**: Bots track player behavior and adapt their strategies
- ✅ **Bot Chat**: 40+ contextual chat messages based on game events and bot personality

#### User Interface
- ✅ Responsive design with Tailwind CSS
- ✅ Shadcn UI components (button, card, input, label, dialog, etc.)
- ✅ Player hand visualization with card selection
- ✅ Game board showing last play
- ✅ Player list with turn indicators
- ✅ Challenge button with animations
- ✅ Error handling and loading states
- ✅ End game dialog with player statistics and titles
- ✅ Player badges with avatars (DiceBear integration)
- ✅ Enhanced footer with GitHub link and creator info
- ✅ **Visual Timer Display**: Countdown timer shown to all players during their turn
- ✅ **Auto-play Notifications**: Toast notifications when a player times out
- ✅ **Custom Scrollbars**: Styled scrollbars for improved UI consistency
- ✅ **Confirm Dialogs**: Confirmation dialogs for important actions (leaving game, etc.)
- ✅ **Header Context**: Dynamic header with customizable action buttons
- ✅ **Quick Rules Dialog**: In-game access to game rules without leaving
- ✅ **Player Name Dialog**: Prompt for players without a saved name

#### Communication
- ✅ Text chat in both lobby and game
- ✅ Real-time message broadcasting
- ✅ XSS protection for chat messages
- ✅ **WebRTC voice chat with peer-to-peer audio**
- ✅ **Cross-browser voice chat support (Chrome, Firefox, Brave, Edge)**
- ✅ **Voice chat persists seamlessly from lobby to game**
- ✅ **Host controls**: kick players and mute player microphones
- ✅ **Per-player mute**: mute specific players locally without affecting others
- ✅ **Audio Level Monitoring**: Visual indicators for voice activity
- ✅ **Bot Chat Messages**: Bots send contextual messages based on game events
- ✅ **System Messages**: Colored system notifications for important events

#### Admin & Monitoring
- ✅ Admin dashboard for system monitoring
- ✅ Real-time room and player statistics
- ✅ Room management and monitoring tools
- ✅ Auto-refresh system state
- ✅ **Delete Room**: Admin capability to remove specific rooms

#### Sound & Audio
- ✅ **Sound Management System**: Centralized sound player with volume control
- ✅ **Mute/Unmute Functionality**: Global sound muting capability
- ✅ **Volume Control**: Adjustable sound effects volume
- ✅ **Audio Context Handling**: Proper audio context management for cross-browser compatibility

### 🚧 Future Work

#### Planned Enhancements
- ⏳ **AI Integration**: Lightweight AI model for detecting keywords like "LIAR" or "BLUFF" in voice/text chat and triggering appropriate game actions or animations
- ⏳ **Avatar Customization**: Custom avatar selection and profile pictures
- ⏳ **Enhanced Voice Features**: 
  - Spatial audio positioning based on player order
  - Voice recording and playback for highlights
- ⏳ **Spectator Mode**: Allow users to watch ongoing games
- ⏳ **Persistent Statistics**: Database integration for long-term player statistics tracking
- ⏳ **Tournament System**: Organized tournaments with brackets and leaderboards
- ⏳ **Sound Effects & Animations**: More card flip sounds, challenge animations, celebration effects
- ⏳ **Mobile Optimization**: Native mobile app and improved touch controls
- ⏳ **Replay System**: Record and replay games for analysis or entertainment
- ⏳ **Custom Game Modes**: Variations on rules, speed rounds, team play
- ⏳ **Friend System**: Add friends, create private rooms, invite specific players

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/chater-marzougui/Tekthib.git
cd Tekthib
```

### 2. Backend Setup
```bash
cd server
npm install

# Create environment file
cp .env.example .env
# Edit .env if needed (default PORT=3001)

# Development mode
npm run dev

# Production build and start
npm run build
npm start
```

### 3. Frontend Setup
Open a new terminal:
```bash
cd client
npm install

# Create environment file
cp .env.example .env
# Edit .env if needed (default WS_URL=ws://localhost:3001)

# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- WebSocket: ws://localhost:3001
- Admin Dashboard: http://localhost:5173/admin (password required)

### 5. Admin Dashboard (Optional)
The admin dashboard allows you to monitor system state:
- View total rooms and players
- Monitor active games
- See real-time room statistics
- Access with admin password (set via environment variable)

## 📦 Required Shadcn Components

The project uses the following Shadcn UI components (already installed):
- `button` - Buttons throughout the app
- `card` - Card containers for UI sections
- `input` - Text input fields
- `label` - Form labels

If you need to add more Shadcn components, use:
```bash
cd client
npx shadcn@latest add [component-name]
```

## 🎮 How to Play

### Creating a Game
1. Open the app in your browser
2. Enter your name on the home page (supports multiple languages)
3. Click "Create New Room"
4. Configure game settings:
   - Set auto-play timer (optional, 10-120 seconds)
   - Adjust max players (3-10)
5. Share the room code or QR code with friends
6. Wait for at least 3 players to join
7. All players mark themselves as ready
8. Host clicks "Start Game"

### During the Game
1. **Your Turn**: Select cards from your hand and claim a rank
   - Watch the countdown timer if enabled (shows remaining time)
   - If time runs out, cards are automatically played for you
2. **Bluffing**: You can claim any rank, even if you don't have those cards
3. **Other Players' Turns**: Watch what they play, decide if you trust them
4. **Challenge**: Click "Challenge (Call Liar!)" if you think someone is bluffing
5. **Winning**: First player to empty their hand wins
6. **Special Rule**: If you collect all 4 cards of the same rank, they're removed
7. **Bot Interactions**: Bots will chat and react to game events
8. **Language**: Switch between English, French, and Arabic anytime

### Chat & Voice
- Use the chat box to communicate with other players
- Join voice chat to talk in real-time with other players
- **Browser Compatibility**: Voice chat works on Chrome, Firefox, Brave, Edge, and other modern browsers
- **Host Controls**: If you're the host, you can:
  - Kick players from the room
  - Mute players' microphones (they can't unmute until the game ends)
- **Personal Mute**: Mute any player's audio for yourself without affecting others
- Voice chat continues seamlessly when the game starts
- Banter, strategize, or bluff through messages and voice!

### Bot Players
- Add AI bot players to fill your room if you don't have enough human players
- Bots make strategic decisions based on game state
- **Three Bot Personalities**:
  - **Aggressive**: Bluffs frequently and challenges often
  - **Truthful**: Plays honestly most of the time, rarely bluffs
  - **Unpredictable**: Mixed strategy that keeps players guessing
- **Bot Learning**: Bots track player behavior and adapt their strategies over time
- **Bot Chat**: Bots send contextual messages during the game:
  - React to successful bluffs and caught lies
  - Comment on big plays and challenges
  - Send random banter during gameplay
- Perfect for testing or playing with fewer friends

### End Game Statistics
- View detailed statistics after each game
- Track bluffs, challenges, accusations, and more
- Earn fun titles based on your playstyle:
  - 🎭 Master Liar, 🔍 Detective, 😇 Saint, 🤔 False Accuser
- Share your achievements with other players

## 🏗️ Technical Architecture

### Frontend: React + TypeScript + Tailwind
- **Real-time Communication**: WebSocket for chat + signaling
- **Voice Chat**: WebRTC for peer-to-peer audio (cross-browser compatible)
- **UI Framework**: Shadcn UI components with Radix UI primitives
- **Icons**: Iconify for modern, colorful icons across the application
- **State Management**: React hooks + Context API
- **Internationalization**: i18next with support for Arabic, English, and French
- **Theme**: Dark/light theme toggle with local storage persistence
- **Styling**: Tailwind CSS with custom animations and scrollbars
- **Avatar Generation**: DiceBear library for player avatars
- **QR Code**: QRCode.react for easy room sharing
- **SEO**: Dynamic meta tags for better discoverability

### Backend: Node.js + Express
- **Deployment**: Heroku (scalable with dynos)
- **Data Storage**: In-memory (ephemeral rooms)
- **Communication**: WebSocket server (ws library)
- **Signaling**: WebRTC connection coordination
- **Game Logic**: Server-authoritative game engine
- **Bot AI**: Strategic bot player implementation with:
  - Three distinct personalities (aggressive, truthful, unpredictable)
  - Learning system that tracks and adapts to player behavior
  - Context-aware chat system with 40+ unique messages
- **Timer System**: Server-managed turn timer with auto-play functionality
- **Admin API**: Room management and monitoring endpoints

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
Tekthib/
├── README.md                     # Main project documentation
├── SETUP.md                      # Setup instructions
├── DEPLOYMENT.md                 # Deployment guide
├── BOT_AI_ENHANCEMENT_SUMMARY.md # Bot AI features documentation
├── BOT_AI_QUICK_START.md        # Quick start guide for bot AI
├── VOICE_CHAT_IMPLEMENTATION.md # Voice chat technical details
├── ENDGAME_TRANSLATIONS.md      # End game translations guide
├── EMOJI_TO_ICON_MIGRATION.md   # Icon migration documentation
├── package.json
├── .gitignore
├── .env.example
│
├── client/                      # Frontend React App (Vite)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── index.html
│   │
│   ├── public/                  # Static assets
│   │   ├── images/              # Image assets
│   │   └── favicon.ico
│   │
│   └── src/
│       ├── main.tsx             # App entry point
│       ├── App.tsx              # Main app component
│       ├── index.css            # Global styles + Tailwind
│       │
│       ├── components/          # Reusable UI components
│       │   ├── ui/              # Shadcn UI components
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   └── ... (other UI elements)
│       │   │
│       │   ├── game/            # Game-specific components
│       │   │   ├── GameBoard.tsx    # Main game interface
│       │   │   ├── PlayerHand.tsx   # Player's cards
│       │   │   ├── PlayerList.tsx   # Connected players
│       │   │   └── RenderCard.tsx   # Component for a single card
│       │   │
│       │   ├── chat/            # Communication components
│       │   │   ├── ChatBox.tsx      # Text chat interface
│       │   │   └── VoiceChat.tsx    # Voice chat UI and logic
│       │   │
│       │   └── SEO.tsx          # SEO meta tags component
│       │
│       ├── pages/               # Main page components
│       │   ├── HomePage.tsx       # Landing page
│       │   ├── GamePage.tsx       # Active game page
│       │   ├── RoomPage.tsx       # Room lobby page
│       │   └── AdminPage.tsx      # New admin dashboard page
│       │
│       ├── hooks/               # Custom React hooks
│       │   ├── useWebsocket.ts    # WebSocket connection management
│       │   └── useVoiceChat.ts    # WebRTC voice chat logic
│       │
│       ├── context/             # React Context providers
│       │   ├── WebSocketContext.tsx # WebSocket state context
│       │   └── VoiceChatContext.tsx # Voice chat state context
│       │
│       ├── types/               # Local client-side types
│       │   └── index.ts         # Type definitions (often re-exporting from shared)
│       │
│       └── lib/                 # External lib configurations
│           └── utils.ts         # Shadcn utils (cn function)
│
├── server/                      # Backend Node.js App
│   ├── package.json
│   ├── tsconfig.json
│   ├── Procfile                 # Heroku deployment
│   ├── .prettierrc              # Code formatter config
│   │
│   ├── src/
│   │   ├── server.ts            # Server entry point (starts server)
│   │   ├── app.ts               # Express app setup
│   │   │
│   │   ├── config/              # Configuration files
│   │   │   └── config.ts        # Environment variables, etc.
│   │   │
│   │   ├── game/                # Game logic (server-side)
│   │   │   ├── GameEngine.ts    # Core game logic
│   │   │   ├── Deck.ts          # Card deck management
│   │   │   └── BotPlayer.ts     # AI player logic
│   │   │
│   │   ├── routes/              # HTTP API routes
│   │   │   ├── adminRoutes.ts   # Routes for the admin dashboard
│   │   │   └── itemRoutes.ts    # Example/generic routes
│   │   │
│   │   ├── controllers/         # Route handlers (MVC pattern)
│   │   │   └── itemController.ts  # Logic for itemRoutes
│   │   │
│   │   ├── middlewares/         # Express middleware
│   │   │   └── errorHandler.ts  # Central error handling
│   │   │
│   │   ├── models/              # Database models/schemas
│   │   │   └── item.ts          # Example DB model
│   │   │
│   │   ├── websocket/           # WebSocket handling
│   │   │   ├── index.ts         # WebSocket server setup
│   │   │   └── handlers/        # Message handlers
│   │   │       ├── roomHandlers.ts    # Room join/leave/create
│   │   │       ├── gameHandlers.ts    # Game action handlers
│   │   │       ├── chatHandlers.ts    # Chat message handlers
│   │   │       └── webrtcHandlers.ts  # WebRTC signaling
│   │   │
│   │   └── utils/               # Server utilities
│   │       └── roomManager.ts   # In-memory room storage
│   │
│   └── dist/                    # Compiled JavaScript (gitignored)
│
├── shared/                      # Code shared between client and server
│   └── src/
│       └── types/               # Shared TypeScript definitions
│           └── index.ts         # Game, Player, Room, WebSocket types
│
└── docs/                        # Documentation
    ├── GAME_RULES.md            # Detailed game rules
    ├── API_DOCS.md              # WebSocket API documentation
    ├── DEPLOYMENT.md            # Deployment instructions
    └── CONTRIBUTING.md          # Development guidelines
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
- [ ] Add sound effects for game actions
- [x] Implement WebRTC voice chat for better communication

### Scaling Considerations
- [ ] Redis for multi-dyno room synchronization
- [ ] PostgreSQL for user accounts and statistics
- [ ] CDN for static assets
- [ ] Load balancing for WebSocket connections

### Monetization Options
- [ ] Advertisement integration
- [ ] Tournament entry fees
- [ ] Cosmetic customizations

## 🚀 Deployment to Heroku (Future)

The project is structured to support Heroku deployment. When ready to deploy:

1. **Prepare Heroku App**
```bash
heroku create your-app-name
```

2. **Configure Environment**
```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=443
```

3. **Deploy**
```bash
git push heroku main
heroku logs --tail
```

## 📝 Development Notes

### Project Structure
- `/client` - React frontend application
- `/server` - Node.js backend application
- Both use TypeScript for type safety
- WebSocket for real-time communication
- In-memory data storage (ephemeral rooms)

### Testing Locally
1. Start the backend server first
2. Start the frontend dev server
3. Open multiple browser tabs/windows to simulate multiple players
4. Test room creation, joining, and gameplay
5. Test chat functionality

### Known Limitations
- Rooms are ephemeral (lost on server restart)
- No persistent user accounts
- WebRTC voice chat not yet implemented
- Mobile responsiveness could be improved

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