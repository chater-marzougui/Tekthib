# 🎮 Tekthib - Quick Setup Guide

## 📋 What Was Implemented

This implementation completed **Phases 1-4** of the project plan:

### ✅ Phase 1: Core Infrastructure
- React + TypeScript + Vite frontend
- Node.js + Express + WebSocket backend
- Complete project structure
- Tailwind CSS + Shadcn UI setup

### ✅ Phase 2: Room System
- Create/join rooms with unique codes
- Real-time player list
- Ready/start game controls
- Player disconnect handling

### ✅ Phase 3: Game Engine
- Full game logic (deck, turns, bluffing, challenges)
- Real-time card playing
- Challenge verification
- Win/lose detection
- Four-of-a-kind auto-removal

### ✅ Phase 4: Chat System
- Text chat in lobby and game
- Real-time message broadcasting
- XSS protection

### ⏳ Phase 5: WebRTC Voice Chat
**NOT IMPLEMENTED** - This is optional and can be added later. The game is fully playable without it.

## 🚀 Running the Project Locally

### Option 1: Quick Start (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/chater-marzougui/Tekthib.git
cd Tekthib

# 2. Install all dependencies
npm run install:all

# 3. Setup environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Run the server (Terminal 1)
npm run dev:server

# 5. Run the client (Terminal 2)
npm run dev:client

# 6. Open your browser to http://localhost:5173
```

### Option 2: Manual Setup

**Backend:**
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

**Frontend (in a new terminal):**
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## 🎮 Testing the Game

1. **Open multiple browser tabs** (at least 3 for testing)
2. **Tab 1**: Create a room
   - Enter your name
   - Click "Create New Room"
   - Copy the room code
3. **Tabs 2-3**: Join the room
   - Enter different names
   - Paste the room code
   - Click "Join Room"
4. **All tabs**: Mark as "Ready"
5. **Tab 1 (Host)**: Click "Start Game"
6. **Play the game!**
   - Select cards from your hand
   - Choose a rank to claim
   - Click "Play X Cards"
   - Other players can challenge if they think you're lying
   - Use chat to communicate

## 📦 Shadcn Components Installation

The project currently uses these Shadcn components (already installed):
- `button`
- `card`
- `input`
- `label`

**To add more Shadcn components in the future:**
```bash
cd client
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add toast
```

## 🏗️ Project Structure

```
Tekthib/
├── client/                  # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   │   ├── ui/        # Shadcn components
│   │   │   ├── game/      # Game-specific components
│   │   │   └── chat/      # Chat component
│   │   ├── context/       # React Context (WebSocket)
│   │   ├── hooks/         # Custom hooks (useWebsocket)
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   └── .env               # Frontend config
│
├── server/                  # Node.js Backend
│   ├── src/
│   │   ├── websocket/     # WebSocket handlers
│   │   ├── game/          # Game engine
│   │   ├── utils/         # Room manager
│   │   └── types/         # TypeScript types
│   └── .env               # Backend config
│
└── README.md               # Full documentation
```

## 🔧 Environment Configuration

### Server (.env)
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Client (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## 🚨 Common Issues

### Issue: "Cannot connect to server"
**Solution:** Make sure the backend server is running on port 3001

### Issue: "WebSocket connection failed"
**Solution:** Check that VITE_WS_URL in client/.env matches the server port

### Issue: "Modules not found"
**Solution:** Run `npm run install:all` to install all dependencies

### Issue: "Port already in use"
**Solution:** Change PORT in server/.env to a different port (e.g., 3002)

## 📝 Development Workflow

### Making Changes

**Frontend changes:**
```bash
cd client
npm run dev
# Edit files in src/
# Changes hot-reload automatically
```

**Backend changes:**
```bash
cd server
npm run dev
# Edit files in src/
# Server restarts automatically
```

### Building for Production

```bash
# Build everything
npm run build:all

# Or separately:
npm run build:server
npm run build:client
```

## 🌐 Future Deployment (Heroku)

When ready to deploy to Heroku:

1. Create Heroku app
2. Set environment variables
3. Configure buildpacks for both client and server
4. Deploy via Git

Detailed instructions are in the main README.md

## 🎯 Next Steps

Now that the core game is working, you can:

1. **Test thoroughly** - Play multiple rounds with friends
2. **Add features** - Voice chat, avatars, animations
3. **Deploy** - Host on Heroku or another platform
4. **Customize** - Change styles, add your own branding
5. **Extend** - Add tournaments, statistics, replays

## 📚 Additional Resources

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [React Documentation](https://react.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Tailwind CSS](https://tailwindcss.com/)

## 🆘 Need Help?

- Check the full README.md for detailed information
- Review the code comments in the source files
- Create an issue on GitHub for bugs or questions

---

**Happy Gaming! 🃏**
