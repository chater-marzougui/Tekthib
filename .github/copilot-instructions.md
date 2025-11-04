<!--
Guidance for AI coding agents working in the Tekthib repository.
Keep this file short, practical and directly actionable — reference real files and concrete examples.
-->

# Copilot / AI agent instructions — Tekthib

## 🎯 Architecture Overview

**Tekthib** is a real-time multiplayer bluffing card game with multiple subsystems:

- **Frontend** (React 18 + TypeScript + Vite): Runs on port 5173. Handles UI, WebSocket communication, and P2P WebRTC voice.
- **Backend** (Node.js + Express + ws): Runs on port 3001. Authoritative game engine, room management, bot logic, and Supabase integration.
- **Python Ecosystem**: ML/RL bot training (`models/`), simulation server (`data_collector/`), and SDK for custom bots (`playground/`).
- **Shared Types** (`shared/`): Common TypeScript types imported by both frontend and backend; always update first when changing message shapes.

## 📁 Where to Make Changes

| Task | Location | Key Files |
|------|----------|-----------|
| UI/UX, visual logic, immediate DOM changes | `client/src/` | pages (GamePage, RoomPage, HomePage), components, hooks |
| Game rules, card logic, turn flow | `server/src/game/` | GameEngine.ts, Deck.ts |
| Bot personalities, AI decisions, chat behavior | `server/src/game/` | BotPlayer.ts, BotMemory.ts, BotChatMessages.ts |
| Room logic, player management | `server/src/utils/` | roomManager.ts |
| WebSocket routes and handlers | `server/src/websocket/` | index.ts, handlers/ |
| Client WebSocket interaction | `client/src/hooks/` `client/src/context/` | useWebsocket.ts, WebSocketContext.tsx |
| Voice chat (WebRTC signaling) | `client/src/hooks/` `client/src/context/` | useVoiceChat.ts, VoiceChatContext.tsx, WebRTCContext.tsx |
| Shared message types and interfaces | `shared/src/types/` | index.ts |

## 🚀 Developer Workflows

### Setup & Dependencies
```bash
npm run install:all          # Install all deps (root, client, server, shared)
```

### Development
```bash
npm run dev:server          # Start backend (port 3001, nodemon watch with tsx)
npm run dev:client          # Start frontend (port 5173, Vite dev server)
```

### Build & Deploy
```bash
npm run build:all           # Build server and client
cd server && npm run build  # TypeScript compile to dist/
npm run lint:all            # ESLint check
npm run format              # Prettier format both sides
npm run deploy:server       # Heroku: git push heroku main
```

## 🔑 Critical Patterns & Conventions

### WebSocket Communication (Client Side)
```typescript
// Send a message
sendMessage({ type: "GET_GAME_STATE", payload: { roomCode, playerId } });

// Receive messages (always cleanup in useEffect)
const unregister = registerHandler("my-id", (msg) => {
  if (msg.type === "INITIAL_GAME_STATE") { /* ... */ }
});
return () => unregister(); // Cleanup function
```
All client WebSocket logic uses `useWebSocket()` hook and `WebSocketProvider` context.

### Server Authority Rule
**Critical**: Server is authoritative for all game state and rules. All game-rule changes must be:
1. Implemented server-side (in GameEngine.ts or websocket handlers)
2. Validated server-side before accepting client actions
3. Never trust client input for game state decisions

### Bot Personality & Learning System
Bot decisions are **personality-driven and probability-based**:
- **Personalities**: `aggressive`, `truthful`, `unpredictable`, `strategic` (defined in `shared/src/types/index.ts`)
- **BotMemory.ts**: Tracks opponent bluff rates, challenge success rates, position-based behavior
- **BotChatMessages.ts**: 40+ personality-specific messages with context types (successfulBluff, caughtBluff, bigPlay, random)
- **Tuning**: Adjust challenge/bluff probabilities via constants in BotMemory and BotChatMessages

### Message Types & Types Synchronization
Message types defined in `shared/src/types/index.ts`: CONNECT, CONNECTED, GET_GAME_STATE, PLAY_CARDS, CHALLENGE, etc.
**Always update `shared/src/types/index.ts` FIRST** before changing any message payload shape.

### Voice Chat (WebRTC P2P)
**Signaling Flow** (over WebSocket):
1. **Offer/Answer Exchange**: Client A sends `RTC_OFFER` via WebSocket → server relays to Client B
2. **Server Routes**: `server/src/websocket/handlers/webrtcHandlers.ts` forwards `RTC_OFFER`, `RTC_ANSWER`, `RTC_ICE_CANDIDATE` payloads
3. **ICE Candidates**: Both peers send ICE candidates for NAT traversal (STUN servers: Google, OpenRelay TURN fallback)
4. **Direct Connection**: Once negotiated, audio flows P2P (not through server)

**Client Implementation** (`client/src/hooks/useWebRTC.ts`):
- **Politeness algorithm**: Deterministic tie-breaking using lexicographic player ID comparison (`isPolite()`)
- **Audio setup**: `getUserMedia()` with echo cancellation, noise suppression, auto-gain control
- **Audio analysis**: Real-time volume levels via `AnalyserNode` and `AudioContext`
- **Data channels**: Optional for future low-latency game data (separate from voice)
- **Context persistence**: `WebRTCProvider` wraps game pages so connections survive navigation

**Host Controls**:
- `mutePlayerMic(playerId, true/false)` - Server-side mute (client ignores local audio, host hears silence)
- `kickPlayer(playerId)` - Close connection and remove from room
- Players can self-mute without server involvement

**Key Files**: 
- Client: `useWebRTC.ts`, `WebRTCContext.tsx`, `VoiceChat.tsx` component
- Server: `webrtcHandlers.ts` (payload relay only; no media processing)

## 🔧 Environment & Configuration

| Variable | Location | Purpose |
|----------|----------|---------|
| `PORT` / `3001` | `server/src/server.ts` | Backend port |
| `VITE_WS_URL` | `client/.env` (or defaults to localhost:3001) | WebSocket URL |
| Admin credentials | `server/src/config/config.ts` | Admin dashboard auth |
| `SUPABASE_URL`, `SUPABASE_KEY` | `.env` / env vars | Database & auth |

Deploy note: Heroku `heroku-postbuild` ensures `shared` is installed before building (see root `package.json`).

## 🗄️ Supabase Integration Patterns

### Architecture Overview
Supabase is **optional but recommended** for persistent player profiles, game history, and stats. If disabled, the server gracefully degrades (games still run, just not saved).

**Key Check**: All Supabase operations check `if (!supabase) { /* graceful degradation */ }` before executing.

### Authentication Flow
1. **Client signup/login** (`client/src/context/AuthContext.tsx`):
   - POSTs to `POST /api/auth/signup` or `POST /api/auth/login`
   - Server returns `token` + `refreshToken` (1-week and 30-day JWT expiry)
   - Client stores token in `localStorage` under `auth_token` and user in `user`
   - All subsequent API calls include `Authorization: Bearer ${token}` header

2. **Server auth** (`server/src/services/authService.ts`):
   - **Signup**: Hash password with bcrypt (10 salt rounds), generate custom `userId` if not provided
   - **Login**: Verify password, mint JWT with 7-day expiry
   - **Refresh**: Check `refreshToken` validity to issue new access token
   - **Password reset**: Hash new password before update

3. **User Profile Tables**:
   - `users`: id, username, email, password_hash, display_name, avatar_url, created_at
   - `user_preferences`: theme, locale, sound_effects_enabled, bot/system/challenge message toggles
   - `user_stats`: aggregated wins/losses, bluff rates, challenge success rates

### Game History & Events
**Event Flow** (triggered when game ends):
1. `GameEngine` collects events during play (cards_played, challenge, etc.)
2. On game end, `server/src/services/gameHistoryService.ts` saves:
   - **games** table: room_code, started_at, ended_at, winner/loser, total_players, total_rounds, total_challenges
   - **game_participants** table: per-player stats (position, cards_played, bluffs, successful_bluffs, challenges, results)
   - **game_history** table: timeline of events (event_type, player, event_data, round_number, timestamp)
3. Player stats auto-update: `updatePlayerStats()` increments user_stats for all non-bot players

**Bot Games**: Bot players have `user_id = null`; only human players update stats.

### Database Access Patterns
```typescript
// Standard pattern in services
const { data, error } = await supabase!
  .from('table_name')
  .select('columns, here')
  .eq('filter_column', value)
  .single(); // For single row; omit for multiple

if (error) {
  console.error('Query failed:', error.message);
  // Gracefully degrade or rethrow
}
```

**Insert with upsert** (for stats updates):
```typescript
const { error } = await supabase!
  .from('user_stats')
  .upsert({ user_id, ...statsUpdate }, { onConflict: 'user_id' });
```

### Services Using Supabase
| Service | File | Purpose |
|---------|------|---------|
| **Auth** | `authService.ts` | signup, login, refresh, profile updates, password reset |
| **Game History** | `gameHistoryService.ts` | Save game records, participant data, event timeline |
| **Backup (optional)** | `googleDriveBackupService.ts` | Automated daily backups to Google Drive |

### Important Gotchas
- **No credentials in browser**: Supabase client keys should NOT be exposed; server uses service key only
- **Graceful degradation**: Features must work without Supabase (e.g., room creation, gameplay)
- **Event timestamps**: All events stored with ISO string format; convert to Date on client if needed
- **Null user_id**: Bot players intentionally have `null` user_id to distinguish from humans

## 🤖 Python Bot Ecosystem

### Training & Models (`models/` directory)
- **ML Bot**: `ML_Based.py` — supervised learning on historical game data (XGBoost)
- **RL Bot**: `RL_based.py` — reinforcement learning through self-play with 25D state features
- Scripts: `Train_RL.py`, `Play_With_ML.py`, `Play_WIth_RL.py`
- Data: CSV in `data/` (game_history, game_participants, games)

### Simulation Server (`data_collector/`)
- FastAPI-based automated bot tournament runner
- Runs continuous matches with all strategies from `bot_strategies.py`
- Dashboard at `http://localhost:8000` when running
- Environment variables: `SERVER_URL` (default ws://localhost:3001), `SIMULATION_PORT` (default 8000)

### Bot SDK & Playground (`playground/`)
- **tekthib_bot_sdk.py**: Connect and play without WebSocket protocol knowledge
- **bot_strategies.py**: SmartStrategy, AggressiveStrategy, ConservativeStrategy examples
- **example_custom_bot.py**: Minimal working bot starter
- Create custom bots by inheriting from `Strategy` and implementing `decide_play()`, `should_challenge()`

## ✅ Quality Checks & Testing

No automated test suite. After edits, verify:
1. **Dev environment**: `npm run dev:server` + `npm run dev:client` → app loads and plays locally
2. **Browser console & Network tab**: Check WebSocket messages flow and `clientId` in localStorage
3. **TypeScript**: `cd server && npm run build` (tsc check) and `cd client && npm run typecheck`
4. **Code style**: `npm run lint` and `npm run format`

## 📚 Files to Inspect First (by task type)

- **Game loop & rules**: GameEngine.ts (turn order, challenge resolution, card drawing logic)
- **Bot decisions**: BotPlayer.ts (play/challenge decisions), BotMemory.ts (opponent profiling)
- **Room & player state**: roomManager.ts (room CRUD, player tracking)
- **Client game interaction**: GamePage.tsx (UI + WebSocket handlers)
- **Type definitions**: shared/src/types/index.ts (message shapes, card types, player interfaces)

## 📝 Rule Reference (Brief)

- **Goal**: First to discard all cards wins; last player with cards loses
- **Core**: Play face-down cards, announce rank (true or bluff), others challenge "Liar!"
- **Scoring**: Four-of-a-kind permanently removed; caught bluffers/false accusers take pile
- **Setup**: 108 cards (2 decks + 4 Jokers), 3-10 players
- **Special**: Joker acts as wildcard (can claim any rank)

---

**Note**: You are only allowed to create one .MD file if needed; you're allowed to update readme files (not in the 1 file rule).