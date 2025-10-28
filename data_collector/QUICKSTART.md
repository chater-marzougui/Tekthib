# Quick Start Guide - Tekthib Simulation Server

## 30-Second Setup

```bash
# 1. Install dependencies
cd data_collector
pip install -r requirements.txt

# 2. Start game server (in terminal 1)
cd ../server && npm run dev

# 3. Start simulation server (in terminal 2)
cd ../data_collector && python simulation_server.py

# 4. Open dashboard
# Visit: http://localhost:8000

# 5. Start simulations
curl -X POST http://localhost:8000/start
```

## Quick Test

```bash
# Check status
curl http://localhost:8000/status

# View analytics
curl http://localhost:8000/analyze

# Download data
curl http://localhost:8000/download -o data.csv

# Stop simulations
curl -X POST http://localhost:8000/stop
```

## Environment Variables

```bash
# Custom server URL
SERVER_URL=ws://your-server.com python simulation_server.py

# Custom port
SIMULATION_PORT=9000 python simulation_server.py
```

## Common Issues

**"No strategies available"**
→ Make sure bot_strategies.py exists and contains BotStrategy classes

**"Connection refused"**
→ Start the game server first (cd server && npm run dev)

**Port already in use**
→ Use SIMULATION_PORT env variable to change port

## What Gets Created

- `simulation_results.db` - SQLite database with game results
- Logs in console output
- Web dashboard at http://localhost:8000

## Adding New Strategies

1. Edit `bot_strategies.py`
2. Add new class extending `BotStrategy`
3. Implement: `select_cards()`, `should_challenge()`, `choose_rank()`
4. Restart server - it auto-discovers new strategies!

## API Cheat Sheet

| Endpoint | Method | Description |
|----------|--------|-------------|
| / | GET | Web dashboard |
| /start | POST | Start simulations |
| /stop | POST | Stop simulations |
| /status | GET | Current status |
| /results | GET | Game results |
| /analyze | GET | Analytics |
| /download | GET | CSV export |

For full documentation, see README.md
