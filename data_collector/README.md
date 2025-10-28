# Tekthib Simulation Server

## Overview

The Tekthib Simulation Server is a FastAPI-based application that automatically runs multiple bot matches in the background using all available strategies from `bot_strategies.py` and logs their performance to a SQLite database.

## Features

- 🤖 **Automated Bot Simulations**: Runs continuous bot matches with 3-6 players using different strategies
- 📊 **Performance Analytics**: Tracks win rates, game duration, challenge success rates, and more
- 🌐 **Web Dashboard**: Beautiful HTML interface for monitoring and analysis
- 💾 **Data Export**: Download simulation data as CSV for further analysis
- 🔄 **Real-time Status**: Monitor active games and completed simulations
- 🛡️ **Graceful Shutdown**: Handles SIGINT/SIGTERM signals properly

## Installation

1. Install dependencies:
```bash
cd data_collector
pip install -r requirements.txt
```

## Usage

### Starting the Server

```bash
python simulation_server.py
```

Or with custom configuration:
```bash
SERVER_URL=ws://localhost:3001 SIMULATION_PORT=8000 python simulation_server.py
```

### Environment Variables

- `SERVER_URL`: WebSocket server URL for the game server (default: `ws://localhost:3001`)
- `SIMULATION_PORT`: Port for the simulation server (default: `8000`)
- `HOST`: Host to bind to (default: `0.0.0.0`)

### Accessing the Dashboard

Once started, open your browser to:
```
http://localhost:8000
```

## API Endpoints

### `GET /`
Web dashboard with analytics and controls

### `POST /start`
Start automated simulations
```bash
curl -X POST http://localhost:8000/start
```

### `POST /stop`
Stop simulations (finishes current games)
```bash
curl -X POST http://localhost:8000/stop
```

### `GET /status`
Get current simulation status
```bash
curl http://localhost:8000/status
```

### `GET /results?limit=100`
Get game results (default limit: 100)
```bash
curl http://localhost:8000/results?limit=50
```

### `GET /analyze`
Get performance analytics
```bash
curl http://localhost:8000/analyze
```

### `GET /download`
Download CSV data of strategy performance
```bash
curl http://localhost:8000/download -o simulation_data.csv
```

## How It Works

### Strategy Discovery
The server automatically discovers all `BotStrategy` classes from `bot_strategies.py` at startup.

### Game Simulation
1. A host bot creates a game room
2. 2-5 additional bots join the room (1 host + 2-5 bots = 3-6 total players)
3. Each bot uses a randomly selected strategy
4. The game runs to completion (max 5 minutes timeout)
5. Results are logged to SQLite database

### Data Tracking
For each game, the following is recorded:
- Timestamp
- Room code
- Strategies used by each player
- Winner and winning strategy
- Number of rounds
- Number of challenges (successful/failed)
- Game duration

### Analytics
The `/analyze` endpoint calculates:
- Overall win rates per strategy
- Average game duration per strategy
- Average rounds per game
- Challenge success rates
- Strategy performance comparison

## Database

Game results are stored in `simulation_results.db` (SQLite) with the following schema:

```sql
CREATE TABLE game_results (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    room_code TEXT,
    strategies TEXT,  -- JSON array
    winner TEXT,
    winner_strategy TEXT,
    rounds INTEGER,
    challenges INTEGER,
    challenges_successful INTEGER,
    challenges_failed INTEGER,
    duration REAL
);
```

## Heroku Deployment

To deploy on Heroku, you can add this to your `Procfile`:

```
web: cd server && node dist/server.js
simulation: cd data_collector && python simulation_server.py
```

Then scale the simulation worker:
```bash
heroku ps:scale simulation=1
```

Note: Make sure to set the `SERVER_URL` environment variable to point to your deployed game server.

## Development

### Adding New Strategies

1. Create a new strategy class in `bot_strategies.py` that extends `BotStrategy`
2. Implement required methods: `select_cards()`, `should_challenge()`, `choose_rank()`
3. Restart the simulation server - it will automatically discover the new strategy

### Testing

Start the game server first:
```bash
cd server
npm install
npm run dev
```

Then start the simulation server:
```bash
cd data_collector
python simulation_server.py
```

Visit `http://localhost:8000` to monitor simulations.

## Architecture

```
┌─────────────────────────┐
│  Simulation Server      │
│  (FastAPI)              │
│  - Background worker    │
│  - Database (SQLite)    │
│  - Web dashboard        │
└───────────┬─────────────┘
            │
            │ WebSocket
            │ Connections
            ▼
┌─────────────────────────┐
│  Game Server            │
│  (Node.js + WebSocket)  │
│  - Room management      │
│  - Game engine          │
│  - Player connections   │
└─────────────────────────┘
```

## Troubleshooting

### "No strategies available"
Make sure `bot_strategies.py` is in the same directory and contains valid `BotStrategy` classes.

### Connection refused
Ensure the game server is running on the specified `SERVER_URL`.

### Games not completing
Check the game server logs. Games have a 5-minute timeout by default.

## License

Part of the Tekthib project.
