<!--
Guidance for AI coding agents working in the Tekthib repository.
Keep this file short, practical and directly actionable — reference real files and concrete examples.
-->

# Copilot / AI agent instructions — Tekthib

Summary: Tekthib is a two-process app: a Vite + React TypeScript frontend (client/) and a Node + Express + WebSocket backend (server/). Real-time game events, WebRTC signaling for voice, and the server-authoritative game engine live on the backend. Bots and game rules are implemented server-side.

What to change where (big picture):
- UI/UX and immediate DOM/visual changes: edit files under `client/src/` (pages, components, hooks, context).
- Game rules, bot behavior, and authoritative state changes: edit `server/src/game/*` (GameEngine.ts, BotPlayer.ts, BotMemory.ts, Deck.ts) and `server/src/utils/roomManager.ts`.
- WebSocket message handling / signaling: `server/src/websocket/*` and client `client/src/hooks/useWebsocket.ts`, `client/src/context/WebSocketContext.tsx`.
- Shared types used across client and server are in the `shared/` package (imported as `shared`). Update types there if you change message or payload shapes.

Developer workflows (commands you should use):
- Install deps for both sides: root package.json exposes helpful scripts. Common flow:
  - Install all: run `npm run install:all` from repo root (installs client & server deps).
  - Start backend dev server: `npm run dev:server` (runs `server` nodemon/tsx watch — default port 3001).
  - Start frontend dev server: `npm run dev:client` (Vite on 5173).
  - Build server: `cd server && npm run build` (runs `npx tsc`).
  - Build client: `cd client && npm run build` (also runs `tsc --noEmit` then `vite build`).

Key environment and runtime notes:
- Server default port: 3001 (see `server/src/server.ts` and `server/package.json`).
- Client expects VITE_WS_URL (set in `client/.env.example` or via `import.meta.env.VITE_WS_URL`).
- Admin password and other runtime flags come from env in `server/src/config/config.ts`.
- Deploy: Heroku build hooks are present (`heroku-postbuild` scripts, `Procfile`). Be careful with the `shared` file: local file dependency `shared` is referenced in both client and server package.json — CI or deploy must `npm install` in `shared` or use the root `heroku-postbuild` flow already included.

Important code patterns & conventions (use these when you modify behavior):
- WebSocket client pattern
  - Use the `useWebSocket()` hook (`client/src/hooks/useWebsocket.ts`) and the `WebSocketProvider` (`client/src/context/WebSocketContext.tsx`).
  - To send: call `sendMessage({ type: string, payload?: any })` (see GamePage usage: `sendMessage({ type: "GET_GAME_STATE", payload: { roomCode: roomId, playerId } })`).
  - To receive: register a handler: `const unregister = registerHandler(id, handler)`; handler receives parsed WS messages. Always call the returned unregister function on cleanup. Example in `client/src/pages/GamePage.tsx`.

- Message shapes & types
  - Message types are simple string enums: examples seen in code include `CONNECT`, `CONNECTED`, `GET_GAME_STATE`, `INITIAL_GAME_STATE`, `GAME_STATE_UPDATE`, `CARDS_PLAYED`, `CHALLENGE_RESULT`, `GAME_ENDED`, `ERROR`.
  - If you change a message payload, update `shared` types first so client and server stay in sync.

- Server authority rule
  - The server is authoritative for game state. All game-rule changes must be performed/validated server-side (server/src/game/* and websocket handlers). When in doubt, add checks on the server rather than trusting the client.

- Voice / WebRTC
  - Signaling happens over WebSocket; peer connections and audio stream logic are in `client/src/hooks/useVoiceChat.ts` and `client/src/context/VoiceChatContext.tsx`.
  - Voice chat state is persisted via `VoiceChatProvider` so navigation from lobby to game keeps connections alive.

- Bots & AI
  - Bot code and learning logic live under `server/src/game/` (BotPlayer.ts, BotMemory.ts, BotChatMessages.ts). Prefer changing personalities and decision heuristics here.
  - Bot chat messages and triggers are probability-driven — find tuning constants in `BotChatMessages.ts` and `BotMemory.ts`.

Testing & quality gates
- There are no automated tests in the repo. Use these quick checks after edits:
  1) Run `npm run dev:server` and `npm run dev:client` and confirm the app loads locally.
  2) Use the browser console and network tab to verify WebSocket messages and that `clientId` is set in localStorage.
  3) For server TS errors, run `cd server && npm run build` (tsc) to catch type problems.

Files to inspect first for most tasks
- Client entry & wiring: `client/src/main.tsx`, `client/src/App.tsx`, `client/src/pages/GamePage.tsx`.
- WebSocket: `client/src/hooks/useWebsocket.ts`, `client/src/context/WebSocketContext.tsx`.
- Voice: `client/src/hooks/useVoiceChat.ts`, `client/src/context/VoiceChatContext.tsx`, `client/src/components/chat/VoiceChat.tsx`.
- Server / app: `server/src/server.ts`, `server/src/app.ts`, `server/src/websocket/index.ts` (or handlers), `server/src/utils/roomManager.ts`.
- Game engine and bots: `server/src/game/GameEngine.ts`, `server/src/game/BotPlayer.ts`, `server/src/game/BotMemory.ts`, `server/src/game/BotChatMessages.ts`.
- Shared types: `shared/src/types/index.ts` (touch this before changing message/payload shapes).

Quick examples for common edits
- Add a new WebSocket message handler on the client:
  - registerHandler("my-handler", (msg) => { if (msg.type === "MY_TYPE") { /* ... */ } });
  - ensure you call the unregister function in the cleanup return of useEffect.

- Emit a server request for game state (used in GamePage):
  - sendMessage({ type: "GET_GAME_STATE", payload: { roomCode: roomId, playerId } });

- You are only allowed to create one .MD file only if needed, you're allowed to update readme files, they are not in the 1 md file rule.