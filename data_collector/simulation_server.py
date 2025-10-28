#!/usr/bin/env python3
"""
Tekthib Simulation Server

FastAPI server that runs automated bot matches in the background using all
available strategies from bot_strategies.py and logs their performance.

Usage:
    python simulation_server.py

Endpoints:
    POST /start -> Start automated simulations
    GET /status -> Get current simulation status
    GET /results -> Get all game results
    POST /stop -> Stop simulations
    GET /analyze -> Get performance analytics
    GET /download -> Download data as CSV
    GET / -> Web UI with analytics dashboard
"""

import asyncio
import csv
import inspect
import io
import json
import logging
import os
import signal
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import (
    Column,
    Float,
    Integer,
    String,
    create_engine,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# Import bot SDK and strategies
from bot_strategies import BotStrategy
from tekthib_bot_sdk import TekthibBotSDK

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)

# Database setup
Base = declarative_base()


class GameResult(Base):
    """Database model for game results."""
    __tablename__ = "game_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, nullable=False)
    room_code = Column(String, nullable=False)
    strategies = Column(String, nullable=False)  # JSON string
    winner = Column(String, nullable=False)
    rounds = Column(Integer, default=0)
    challenges = Column(Integer, default=0)
    duration = Column(Float, nullable=False)
    winner_strategy = Column(String, nullable=True)
    challenges_successful = Column(Integer, default=0)
    challenges_failed = Column(Integer, default=0)


# Global state
class SimulationState:
    """Global state for simulation management."""
    
    def __init__(self):
        self.running = False
        self.stop_requested = False
        self.active_games: List[Dict] = []
        self.completed_games = 0
        self.strategies: List[type] = []
        self.simulation_thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        
    def add_active_game(self, game_info: Dict):
        """Add a game to active games list."""
        with self.lock:
            self.active_games.append(game_info)
    
    def remove_active_game(self, room_code: str):
        """Remove a game from active games list."""
        with self.lock:
            self.active_games = [g for g in self.active_games if g["room_code"] != room_code]
    
    def increment_completed(self):
        """Increment completed games counter."""
        with self.lock:
            self.completed_games += 1


sim_state = SimulationState()

# Database engine and session
engine = None
async_session_maker = None


def discover_strategies() -> List[type]:
    """
    Dynamically discover all BotStrategy classes from bot_strategies module.
    
    Returns:
        List of strategy classes
    """
    import bot_strategies
    
    strategies = []
    for name, obj in inspect.getmembers(bot_strategies):
        if (inspect.isclass(obj) and 
            issubclass(obj, BotStrategy) and 
            obj != BotStrategy):
            strategies.append(obj)
            logger.info(f"Discovered strategy: {name}")
    
    return strategies


async def init_db():
    """Initialize the database."""
    global engine, async_session_maker
    
    db_path = "simulation_results.db"
    database_url = f"sqlite+aiosqlite:///{db_path}"
    
    engine = create_async_engine(database_url, echo=False)
    async_session_maker = async_sessionmaker(engine, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info(f"Database initialized: {db_path}")


async def close_db():
    """Close database connections."""
    global engine
    if engine:
        await engine.dispose()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("Starting Tekthib Simulation Server...")
    await init_db()
    
    # Discover strategies
    sim_state.strategies = discover_strategies()
    logger.info(f"Found {len(sim_state.strategies)} strategies")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    sim_state.stop_requested = True
    
    # Wait for simulation thread to finish
    if sim_state.simulation_thread and sim_state.simulation_thread.is_alive():
        logger.info("Waiting for simulation thread to finish...")
        sim_state.simulation_thread.join(timeout=10)
    
    await close_db()
    logger.info("Shutdown complete")


# FastAPI app
app = FastAPI(
    title="Tekthib Simulation Server",
    description="Automated bot simulation and performance tracking",
    version="1.0.0",
    lifespan=lifespan
)


def run_single_game(server_url: str, strategies: List[type]) -> Optional[Dict]:
    """
    Run a single game with random strategies.
    
    Args:
        server_url: WebSocket server URL
        strategies: List of available strategy classes
        
    Returns:
        Game result dictionary or None if failed
    """
    import random
    
    # Select random strategies for this game
    num_bots = random.randint(3, 6)
    selected_strategies = random.choices(strategies, k=num_bots)
    
    # Create strategy instances
    strategy_instances = [StrategyClass() for StrategyClass in selected_strategies]
    strategy_names = [s.__class__.__name__ for s in strategy_instances]
    
    logger.info(f"Starting game with {num_bots} bots: {strategy_names}")
    
    # Game state tracking
    game_data = {
        "room_code": None,
        "start_time": time.time(),
        "strategies": strategy_names,
        "winner": None,
        "winner_strategy": None,
        "rounds": 0,
        "challenges": 0,
        "challenges_successful": 0,
        "challenges_failed": 0,
    }
    
    # Create host bot (first strategy)
    host_strategy = strategy_instances[0]
    host_name = f"Bot-{strategy_names[0][:8]}-{str(uuid.uuid4())[:4]}"
    
    host_sdk = TekthibBotSDK(
        server_url=server_url,
        room_code="",
        player_name=host_name,
        is_host=True,
        bots_to_add=0,  # We'll add our own bots
        logger=logging.getLogger(f"SDK.Host.{host_name}")
    )
    host_sdk.set_strategy(host_strategy)
    
    # Track bot SDKs
    bot_sdks = [host_sdk]
    
    # Event handlers to track game data
    def on_room_created(payload):
        room = payload.get("room", {})
        game_data["room_code"] = room.get("code")
        logger.info(f"Game room created: {game_data['room_code']}")
        sim_state.add_active_game({
            "room_code": game_data["room_code"],
            "strategies": strategy_names,
            "start_time": datetime.fromtimestamp(game_data["start_time"]).isoformat()
        })
    
    def on_game_started(payload):
        logger.info(f"Game started in room {game_data['room_code']}")
    
    def on_cards_played(payload):
        game_data["rounds"] += 1
    
    def on_challenge_result(payload):
        game_data["challenges"] += 1
        was_lying = payload.get("wasLying", False)
        if was_lying:
            game_data["challenges_successful"] += 1
        else:
            game_data["challenges_failed"] += 1
    
    def on_game_ended(payload):
        winners = payload.get("winners", [])
        if winners:
            winner_id = winners[0]
            # Find winner's name and strategy
            for sdk in bot_sdks:
                if sdk.client_id == winner_id:
                    game_data["winner"] = sdk.player_name
                    game_data["winner_strategy"] = sdk.strategy.__class__.__name__
                    break
            
            if not game_data["winner"]:
                game_data["winner"] = "Unknown"
                game_data["winner_strategy"] = "Unknown"
        
        logger.info(f"Game ended. Winner: {game_data['winner']} ({game_data['winner_strategy']})")
    
    # Register events
    host_sdk.on_event("room_created", on_room_created)
    host_sdk.on_event("game_started", on_game_started)
    host_sdk.on_event("cards_played", on_cards_played)
    host_sdk.on_event("challenge_result", on_challenge_result)
    host_sdk.on_event("game_ended", on_game_ended)
    
    # Connect host
    if not host_sdk.connect():
        logger.error("Failed to connect host bot")
        return None
    
    # Wait for room creation
    timeout = 10
    start_wait = time.time()
    while not game_data["room_code"] and (time.time() - start_wait) < timeout:
        time.sleep(0.5)
    
    if not game_data["room_code"]:
        logger.error("Failed to create room")
        host_sdk.ws.close()
        return None
    
    # Add other bots
    room_code = game_data["room_code"]
    
    for i, strategy in enumerate(strategy_instances[1:], start=1):
        bot_name = f"Bot-{strategy_names[i][:8]}-{str(uuid.uuid4())[:4]}"
        
        bot_sdk = TekthibBotSDK(
            server_url=server_url,
            room_code=room_code,
            player_name=bot_name,
            is_host=False,
            bots_to_add=0,
            logger=logging.getLogger(f"SDK.Bot{i}.{bot_name}")
        )
        bot_sdk.set_strategy(strategy)
        
        # Register events for tracking
        bot_sdk.on_event("game_ended", on_game_ended)
        
        if not bot_sdk.connect():
            logger.error(f"Failed to connect bot {i}")
            continue
        
        bot_sdks.append(bot_sdk)
        time.sleep(0.5)  # Small delay between joins
    
    # Start the game (host)
    time.sleep(2)
    logger.info(f"Starting game with {len(bot_sdks)} bots")
    host_sdk._send_message({
        "type": "START_GAME",
        "payload": {
            "autoPlayTimeout": 0,
            "challengeSuspenseEnabled": False
        }
    })
    
    # Wait for game to complete (with timeout)
    max_game_duration = 300  # 5 minutes max
    start = time.time()
    
    while True:
        # Check if any bot is still in game
        any_in_game = any(sdk.in_game for sdk in bot_sdks)
        
        # Check timeout
        elapsed = time.time() - start
        if elapsed > max_game_duration:
            logger.warning(f"Game {room_code} timed out after {elapsed:.1f}s")
            break
        
        # Check if game ended
        if not any_in_game and elapsed > 5:  # Give 5s grace period
            break
        
        time.sleep(1)
    
    # Close all connections
    for sdk in bot_sdks:
        try:
            if sdk.ws:
                sdk.ws.close()
        except:
            pass
    
    # Calculate final stats
    game_data["duration"] = time.time() - game_data["start_time"]
    
    # Remove from active games
    if game_data["room_code"]:
        sim_state.remove_active_game(game_data["room_code"])
    
    logger.info(f"Game completed: {game_data['room_code']} - Winner: {game_data['winner']} "
                f"- Duration: {game_data['duration']:.1f}s - Rounds: {game_data['rounds']}")
    
    return game_data


async def save_game_result(game_data: Dict):
    """Save game result to database."""
    async with async_session_maker() as session:
        result = GameResult(
            timestamp=datetime.fromtimestamp(game_data["start_time"]).isoformat(),
            room_code=game_data["room_code"] or "UNKNOWN",
            strategies=json.dumps(game_data["strategies"]),
            winner=game_data["winner"] or "Unknown",
            rounds=game_data["rounds"],
            challenges=game_data["challenges"],
            duration=game_data["duration"],
            winner_strategy=game_data["winner_strategy"] or "Unknown",
            challenges_successful=game_data["challenges_successful"],
            challenges_failed=game_data["challenges_failed"],
        )
        session.add(result)
        await session.commit()
    
    logger.info(f"Saved game result: {game_data['room_code']}")


def simulation_worker(server_url: str):
    """
    Background worker that runs simulations continuously.
    
    Args:
        server_url: WebSocket server URL
    """
    logger.info("Simulation worker started")
    
    while sim_state.running and not sim_state.stop_requested:
        try:
            # Run a single game
            game_result = run_single_game(server_url, sim_state.strategies)
            
            if game_result:
                # Save result
                asyncio.run(save_game_result(game_result))
                sim_state.increment_completed()
            else:
                logger.warning("Game failed to complete")
            
            # Small delay between games
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"Error in simulation worker: {e}", exc_info=True)
            time.sleep(5)
    
    logger.info("Simulation worker stopped")
    sim_state.running = False


@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the analytics dashboard."""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tekthib Simulation Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1em; }
        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            padding: 25px;
            background: #f7f7f7;
            border-bottom: 2px solid #ddd;
        }
        button {
            padding: 12px 30px;
            font-size: 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
        }
        .btn-start {
            background: #4caf50;
            color: white;
        }
        .btn-start:hover { background: #45a049; }
        .btn-stop {
            background: #f44336;
            color: white;
        }
        .btn-stop:hover { background: #da190b; }
        .btn-refresh {
            background: #2196F3;
            color: white;
        }
        .btn-refresh:hover { background: #0b7dda; }
        .btn-download {
            background: #ff9800;
            color: white;
        }
        .btn-download:hover { background: #e68900; }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .section h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        .strategy-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }
        .strategy-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .strategy-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        .strategy-table tr:hover {
            background: #f5f5f5;
        }
        .active-games {
            list-style: none;
        }
        .active-game {
            padding: 10px;
            margin: 8px 0;
            background: white;
            border-radius: 6px;
            border-left: 3px solid #4caf50;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }
        .status-running { background: #4caf50; color: white; }
        .status-stopped { background: #f44336; color: white; }
        .loading { text-align: center; padding: 20px; color: #666; }
        footer {
            text-align: center;
            padding: 20px;
            color: #666;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎮 Tekthib Simulation Dashboard</h1>
            <p class="subtitle">Automated Bot Performance Tracking & Analysis</p>
        </header>
        
        <div class="controls">
            <button class="btn-start" onclick="startSimulation()">▶️ Start Simulation</button>
            <button class="btn-stop" onclick="stopSimulation()">⏹️ Stop Simulation</button>
            <button class="btn-refresh" onclick="loadData()">🔄 Refresh</button>
            <button class="btn-download" onclick="downloadData()">📥 Download Data</button>
        </div>
        
        <div class="content">
            <!-- Status Section -->
            <div class="section">
                <h2>📊 Simulation Status</h2>
                <div id="status-content" class="loading">Loading...</div>
            </div>
            
            <!-- Analytics Section -->
            <div class="section">
                <h2>📈 Performance Analytics</h2>
                <div id="analytics-content" class="loading">Loading...</div>
            </div>
            
            <!-- Active Games Section -->
            <div class="section">
                <h2>🎯 Active Games</h2>
                <div id="active-games-content" class="loading">Loading...</div>
            </div>
        </div>
        
        <footer>
            <p>Tekthib Simulation Server v1.0.0 | Built with FastAPI & Love 💜</p>
        </footer>
    </div>

    <script>
        async function startSimulation() {
            try {
                const response = await fetch('/start', { method: 'POST' });
                const data = await response.json();
                alert(data.message || 'Simulation started!');
                loadData();
            } catch (error) {
                alert('Error starting simulation: ' + error.message);
            }
        }

        async function stopSimulation() {
            try {
                const response = await fetch('/stop', { method: 'POST' });
                const data = await response.json();
                alert(data.message || 'Simulation stopped!');
                loadData();
            } catch (error) {
                alert('Error stopping simulation: ' + error.message);
            }
        }

        async function downloadData() {
            window.location.href = '/download';
        }

        async function loadData() {
            await Promise.all([loadStatus(), loadAnalytics()]);
        }

        async function loadStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();
                
                const statusHtml = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${data.running ? '🟢' : '🔴'}</div>
                            <div class="stat-label">Status</div>
                            <span class="status-badge ${data.running ? 'status-running' : 'status-stopped'}">
                                ${data.running ? 'Running' : 'Stopped'}
                            </span>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${data.completed_games}</div>
                            <div class="stat-label">Completed Games</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${data.active_games}</div>
                            <div class="stat-label">Active Games</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${data.strategies.length}</div>
                            <div class="stat-label">Strategies</div>
                        </div>
                    </div>
                `;
                document.getElementById('status-content').innerHTML = statusHtml;
                
                // Active games list
                let activeGamesHtml = '';
                if (data.active_games_list && data.active_games_list.length > 0) {
                    activeGamesHtml = '<ul class="active-games">';
                    data.active_games_list.forEach(game => {
                        activeGamesHtml += `
                            <li class="active-game">
                                <strong>Room:</strong> ${game.room_code} | 
                                <strong>Strategies:</strong> ${game.strategies.join(', ')} | 
                                <strong>Started:</strong> ${new Date(game.start_time).toLocaleTimeString()}
                            </li>
                        `;
                    });
                    activeGamesHtml += '</ul>';
                } else {
                    activeGamesHtml = '<p style="color: #666; text-align: center;">No active games</p>';
                }
                document.getElementById('active-games-content').innerHTML = activeGamesHtml;
                
            } catch (error) {
                document.getElementById('status-content').innerHTML = 
                    '<p style="color: red;">Error loading status</p>';
            }
        }

        async function loadAnalytics() {
            try {
                const response = await fetch('/analyze');
                const data = await response.json();
                
                if (data.total_games === 0) {
                    document.getElementById('analytics-content').innerHTML = 
                        '<p style="color: #666; text-align: center;">No data yet. Start some simulations!</p>';
                    return;
                }
                
                const analyticsHtml = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${data.total_games}</div>
                            <div class="stat-label">Total Games</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${data.avg_duration.toFixed(1)}s</div>
                            <div class="stat-label">Avg Duration</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${data.avg_rounds.toFixed(1)}</div>
                            <div class="stat-label">Avg Rounds</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${data.challenge_success_rate.toFixed(1)}%</div>
                            <div class="stat-label">Challenge Success Rate</div>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 25px; margin-bottom: 10px; color: #667eea;">Strategy Performance</h3>
                    <table class="strategy-table">
                        <thead>
                            <tr>
                                <th>Strategy</th>
                                <th>Wins</th>
                                <th>Games</th>
                                <th>Win Rate</th>
                                <th>Avg Duration</th>
                                <th>Avg Rounds</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(data.strategy_stats).map(([strategy, stats]) => `
                                <tr>
                                    <td><strong>${strategy}</strong></td>
                                    <td>${stats.wins}</td>
                                    <td>${stats.games}</td>
                                    <td><strong>${stats.win_rate.toFixed(1)}%</strong></td>
                                    <td>${stats.avg_duration.toFixed(1)}s</td>
                                    <td>${stats.avg_rounds.toFixed(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                document.getElementById('analytics-content').innerHTML = analyticsHtml;
                
            } catch (error) {
                document.getElementById('analytics-content').innerHTML = 
                    '<p style="color: red;">Error loading analytics</p>';
            }
        }

        // Auto-refresh every 5 seconds
        setInterval(loadData, 5000);
        
        // Initial load
        loadData();
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)


@app.post("/start")
async def start_simulation():
    """Start automated simulations."""
    if sim_state.running:
        raise HTTPException(status_code=400, detail="Simulation already running")
    
    if not sim_state.strategies:
        raise HTTPException(status_code=400, detail="No strategies available")
    
    # Get server URL from environment or use default
    server_url = os.getenv("SERVER_URL", "ws://localhost:3001")
    
    # Start simulation thread
    sim_state.running = True
    sim_state.stop_requested = False
    sim_state.simulation_thread = threading.Thread(
        target=simulation_worker,
        args=(server_url,),
        daemon=True
    )
    sim_state.simulation_thread.start()
    
    logger.info("Simulation started")
    
    return {
        "message": "Simulation started",
        "server_url": server_url,
        "strategies": [s.__name__ for s in sim_state.strategies]
    }


@app.post("/stop")
async def stop_simulation():
    """Stop simulations."""
    if not sim_state.running:
        raise HTTPException(status_code=400, detail="Simulation not running")
    
    sim_state.stop_requested = True
    logger.info("Stop requested - will finish current games")
    
    return {
        "message": "Stop requested - will finish current games and stop"
    }


@app.get("/status")
async def get_status():
    """Get current simulation status."""
    return {
        "running": sim_state.running,
        "stop_requested": sim_state.stop_requested,
        "completed_games": sim_state.completed_games,
        "active_games": len(sim_state.active_games),
        "active_games_list": sim_state.active_games,
        "strategies": [s.__name__ for s in sim_state.strategies]
    }


@app.get("/results")
async def get_results(limit: int = 100):
    """Get all game results."""
    async with async_session_maker() as session:
        stmt = select(GameResult).order_by(GameResult.id.desc()).limit(limit)
        result = await session.execute(stmt)
        games = result.scalars().all()
        
        return {
            "total": len(games),
            "games": [
                {
                    "id": game.id,
                    "timestamp": game.timestamp,
                    "room_code": game.room_code,
                    "strategies": json.loads(game.strategies),
                    "winner": game.winner,
                    "winner_strategy": game.winner_strategy,
                    "rounds": game.rounds,
                    "challenges": game.challenges,
                    "challenges_successful": game.challenges_successful,
                    "challenges_failed": game.challenges_failed,
                    "duration": game.duration,
                }
                for game in games
            ]
        }


@app.get("/analyze")
async def analyze_results():
    """Analyze performance statistics."""
    async with async_session_maker() as session:
        stmt = select(GameResult)
        result = await session.execute(stmt)
        games = result.scalars().all()
        
        if not games:
            return {
                "total_games": 0,
                "avg_duration": 0,
                "avg_rounds": 0,
                "challenge_success_rate": 0,
                "strategy_stats": {}
            }
        
        # Calculate overall stats
        total_games = len(games)
        avg_duration = sum(g.duration for g in games) / total_games
        avg_rounds = sum(g.rounds for g in games) / total_games
        
        total_challenges = sum(g.challenges for g in games)
        total_challenges_successful = sum(g.challenges_successful for g in games)
        challenge_success_rate = (
            (total_challenges_successful / total_challenges * 100) 
            if total_challenges > 0 else 0
        )
        
        # Calculate per-strategy stats
        strategy_stats = {}
        
        for game in games:
            winner_strategy = game.winner_strategy or "Unknown"
            
            # Count games for each strategy in this game
            strategies_list = json.loads(game.strategies)
            for strategy in strategies_list:
                if strategy not in strategy_stats:
                    strategy_stats[strategy] = {
                        "games": 0,
                        "wins": 0,
                        "total_duration": 0,
                        "total_rounds": 0,
                        "total_challenges": 0,
                        "challenges_successful": 0,
                    }
                
                strategy_stats[strategy]["games"] += 1
                strategy_stats[strategy]["total_duration"] += game.duration
                strategy_stats[strategy]["total_rounds"] += game.rounds
                strategy_stats[strategy]["total_challenges"] += game.challenges
                strategy_stats[strategy]["challenges_successful"] += game.challenges_successful
                
                if strategy == winner_strategy:
                    strategy_stats[strategy]["wins"] += 1
        
        # Calculate averages and percentages
        for strategy, stats in strategy_stats.items():
            games_played = stats["games"]
            strategy_stats[strategy]["win_rate"] = (stats["wins"] / games_played * 100) if games_played > 0 else 0
            strategy_stats[strategy]["avg_duration"] = stats["total_duration"] / games_played if games_played > 0 else 0
            strategy_stats[strategy]["avg_rounds"] = stats["total_rounds"] / games_played if games_played > 0 else 0
            strategy_stats[strategy]["challenge_success_rate"] = (
                (stats["challenges_successful"] / stats["total_challenges"] * 100)
                if stats["total_challenges"] > 0 else 0
            )
        
        return {
            "total_games": total_games,
            "avg_duration": avg_duration,
            "avg_rounds": avg_rounds,
            "challenge_success_rate": challenge_success_rate,
            "strategy_stats": strategy_stats
        }


@app.get("/download")
async def download_data():
    """Download analytics data as CSV."""
    # Get analytics data
    analysis = await analyze_results()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Strategy",
        "Games Played",
        "Wins",
        "Win Rate (%)",
        "Avg Duration (s)",
        "Avg Rounds",
        "Total Challenges",
        "Challenges Successful",
        "Challenge Success Rate (%)"
    ])
    
    # Write data
    for strategy, stats in analysis["strategy_stats"].items():
        writer.writerow([
            strategy,
            stats["games"],
            stats["wins"],
            f"{stats['win_rate']:.2f}",
            f"{stats['avg_duration']:.2f}",
            f"{stats['avg_rounds']:.2f}",
            stats["total_challenges"],
            stats["challenges_successful"],
            f"{stats['challenge_success_rate']:.2f}"
        ])
    
    # Return as streaming response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=tekthib_simulation_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


def handle_shutdown(signum, frame):
    """Handle graceful shutdown on SIGINT."""
    logger.info("Received shutdown signal")
    sim_state.stop_requested = True
    sys.exit(0)


if __name__ == "__main__":
    import uvicorn
    
    # Register signal handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("SIMULATION_PORT", "8000"))
    
    logger.info(f"Starting server on {host}:{port}")
    
    # Run server
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
