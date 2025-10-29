#!/usr/bin/env python3
"""
Tekthib Simulation Server - Fixed Version

FastAPI server that runs automated bot matches in parallel.
Each game has 1-2 custom strategy bots playing against 3-6 built-in game bots.

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

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import (
    Column,
    Float,
    Integer,
    String,
    select,
)
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from fastapi.templating import Jinja2Templates

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")

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
    num_game_bots = Column(Integer, nullable=False)  # Number of built-in bots
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
        self.simulation_threads: List[threading.Thread] = []
        self.lock = threading.Lock()
        self.max_parallel_games = 5  # Maximum number of parallel games
        
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
    
    def get_active_game_count(self) -> int:
        """Get number of active games."""
        with self.lock:
            return len(self.active_games)


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
    
    # Wait for simulation threads to finish
    logger.info("Waiting for simulation threads to finish...")
    for thread in sim_state.simulation_threads:
        if thread.is_alive():
            thread.join(timeout=10)
    
    await close_db()
    logger.info("Shutdown complete")


# FastAPI app
app = FastAPI(
    title="Tekthib Simulation Server",
    description="Automated bot simulation and performance tracking",
    version="1.0.0",
    lifespan=lifespan
)


def run_single_game(server_url: str, strategies: List[type], game_id: int) -> Optional[Dict]:
    """
    Run a single game with 1-2 custom strategy bots + 3-6 built-in game bots.
    
    Args:
        server_url: WebSocket server URL
        strategies: List of available strategy classes
        game_id: Unique game identifier for logging
        
    Returns:
        Game result dictionary or None if failed
    """
    import random
    
    # Select 1-2 custom bot strategies for this game
    num_custom_bots = random.randint(1, 2)
    selected_strategies = random.sample(strategies, min(num_custom_bots, len(strategies)))
    
    # Select 3-6 built-in game bots
    num_game_bots = random.randint(3, 6)
    
    # Total players = custom bots + game bots
    total_players = num_custom_bots + num_game_bots
    
    strategy_names = [s.__name__ for s in selected_strategies]
    
    logger.info(f"[Game {game_id}] Starting game with {num_custom_bots} custom bot(s) + {num_game_bots} game bots = {total_players} total")
    logger.info(f"[Game {game_id}] Custom strategies: {strategy_names}")
    
    # Game state tracking
    game_data = {
        "room_code": None,
        "start_time": time.time(),
        "strategies": strategy_names,
        "num_game_bots": num_game_bots,
        "winner": None,
        "winner_strategy": None,
        "rounds": 0,
        "challenges": 0,
        "challenges_successful": 0,
        "challenges_failed": 0,
    }
    
    # Create host bot (first custom strategy)
    host_strategy_class = selected_strategies[0]
    host_strategy = host_strategy_class()
    host_name = f"Bot-{strategy_names[0][:8]}-{str(uuid.uuid4())[:4]}"
    
    host_sdk = TekthibBotSDK(
        server_url=server_url,
        room_code="",
        player_name=host_name,
        is_host=True,
        bots_to_add=num_game_bots,  # Add the built-in game bots
        logger=logging.getLogger(f"SDK.Game{game_id}.Host")
    )
    host_sdk.set_strategy(host_strategy)
    
    # Track bot SDKs
    bot_sdks = [host_sdk]
    
    # Event handlers to track game data
    def on_room_created(payload):
        room = payload.get("room", {})
        game_data["room_code"] = room.get("code")
        logger.info(f"[Game {game_id}] Room created: {game_data['room_code']}")
        sim_state.add_active_game({
            "room_code": game_data["room_code"],
            "strategies": strategy_names,
            "num_game_bots": num_game_bots,
            "start_time": datetime.fromtimestamp(game_data["start_time"]).isoformat()
        })
    
    def on_game_started(payload):
        logger.info(f"[Game {game_id}] Game started in room {game_data['room_code']}")
    
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
                # Winner is a built-in game bot
                game_data["winner"] = "GameBot"
                game_data["winner_strategy"] = "GameBot"
        
        logger.info(f"[Game {game_id}] Game ended. Winner: {game_data['winner']} ({game_data['winner_strategy']})")
    
    # Register events
    host_sdk.on_event("room_created", on_room_created)
    host_sdk.on_event("game_started", on_game_started)
    host_sdk.on_event("cards_played", on_cards_played)
    host_sdk.on_event("challenge_result", on_challenge_result)
    host_sdk.on_event("game_ended", on_game_ended)
    
    # Connect host
    if not host_sdk.connect():
        logger.error(f"[Game {game_id}] Failed to connect host bot")
        return None
    
    # Wait for room creation
    timeout = 10
    start_wait = time.time()
    while not game_data["room_code"] and (time.time() - start_wait) < timeout:
        time.sleep(0.5)
    
    if not game_data["room_code"]:
        logger.error(f"[Game {game_id}] Failed to create room")
        host_sdk.ws.close()
        return None
    
    # Add other custom bots (if we have 2 custom bots)
    room_code = game_data["room_code"]
    
    for i, strategy_class in enumerate(selected_strategies[1:], start=1):
        strategy = strategy_class()
        bot_name = f"Bot-{strategy_names[i][:8]}-{str(uuid.uuid4())[:4]}"
        
        bot_sdk = TekthibBotSDK(
            server_url=server_url,
            room_code=room_code,
            player_name=bot_name,
            is_host=False,
            bots_to_add=0,
            logger=logging.getLogger(f"SDK.Game{game_id}.Bot{i}")
        )
        bot_sdk.set_strategy(strategy)
        
        # Register events for tracking
        bot_sdk.on_event("game_ended", on_game_ended)
        
        if not bot_sdk.connect():
            logger.error(f"[Game {game_id}] Failed to connect bot {i}")
            continue
        
        bot_sdks.append(bot_sdk)
        time.sleep(0.5)  # Small delay between joins
    
    # Wait for game to complete (with timeout)
    max_game_duration = 900  # 15 minutes max
    start = time.time()
    
    while True:
        # Check if any bot is still in game
        any_in_game = any(sdk.in_game for sdk in bot_sdks)
        
        # Check timeout
        elapsed = time.time() - start
        if elapsed > max_game_duration:
            logger.warning(f"[Game {game_id}] Game {room_code} timed out after {elapsed:.1f}s")
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
        except Exception as e:
            logger.error(f"[Game {game_id}] Error closing WebSocket: {e}")
    
    # Calculate final stats
    game_data["duration"] = time.time() - game_data["start_time"]
    
    # Remove from active games
    if game_data["room_code"]:
        sim_state.remove_active_game(game_data["room_code"])
    
    logger.info(f"[Game {game_id}] Completed: {game_data['room_code']} - Winner: {game_data['winner']} "
                f"- Duration: {game_data['duration']:.1f}s - Rounds: {game_data['rounds']}")
    
    return game_data


async def save_game_result(game_data: Dict):
    """Save game result to database."""
    async with async_session_maker() as session:
        result = GameResult(
            timestamp=datetime.fromtimestamp(game_data["start_time"]).isoformat(),
            room_code=game_data["room_code"] or "UNKNOWN",
            strategies=json.dumps(game_data["strategies"]),
            num_game_bots=game_data["num_game_bots"],
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


def simulation_worker(server_url: str, worker_id: int):
    """
    Background worker that runs simulations continuously.
    Each worker runs games sequentially.
    
    Args:
        server_url: WebSocket server URL
        worker_id: Worker identifier
    """
    logger.info(f"[Worker {worker_id}] Simulation worker started")
    
    game_counter = 0
    
    while sim_state.running and not sim_state.stop_requested:
        try:
            game_counter += 1
            game_id = worker_id * 10000 + game_counter
            
            # Run a single game
            game_result = run_single_game(server_url, sim_state.strategies, game_id)
            
            if game_result:
                # Save result
                asyncio.run(save_game_result(game_result))
                sim_state.increment_completed()
            else:
                logger.warning(f"[Worker {worker_id}] Game failed to complete")
            
            # Small delay between games
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"[Worker {worker_id}] Error in simulation worker: {e}", exc_info=True)
            time.sleep(5)
    
    logger.info(f"[Worker {worker_id}] Simulation worker stopped")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the analytics dashboard."""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.post("/start")
async def start_simulation(parallel_games: int = 20):
    """
    Start automated simulations.
    
    Args:
        parallel_games: Number of parallel games to run (default: 20, max: 100)
    """
    if sim_state.running:
        raise HTTPException(status_code=400, detail="Simulation already running")
    
    if not sim_state.strategies:
        raise HTTPException(status_code=400, detail="No strategies available")
    
    # Validate parallel_games
    parallel_games = max(1, min(parallel_games, 100))
    sim_state.max_parallel_games = parallel_games
    
    # Get server URL from environment or use default
    server_url = os.getenv("SERVER_URL", "ws://localhost:3001")
    
    # Start simulation threads
    sim_state.running = True
    sim_state.stop_requested = False
    sim_state.simulation_threads = []
    
    for i in range(parallel_games):
        thread = threading.Thread(
            target=simulation_worker,
            args=(server_url, i + 1),
            daemon=True
        )
        thread.start()
        sim_state.simulation_threads.append(thread)
        time.sleep(1)  # Stagger thread starts
    
    logger.info(f"Simulation started with {parallel_games} parallel games")
    
    return {
        "message": "Simulation started",
        "server_url": server_url,
        "parallel_games": parallel_games,
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
        "max_parallel_games": sim_state.max_parallel_games,
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
                    "num_game_bots": game.num_game_bots,
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
                "strategy_stats": {},
                "gamebot_wins": 0,
                "gamebot_win_rate": 0
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
        
        # Count GameBot wins
        gamebot_wins = sum(1 for g in games if g.winner_strategy == "GameBot")
        gamebot_win_rate = (gamebot_wins / total_games * 100) if total_games > 0 else 0
        
        # Calculate per-strategy stats
        strategy_stats = {}
        
        for game in games:
            winner_strategy = game.winner_strategy or "Unknown"
            
            # Count games for each custom strategy in this game
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
            "gamebot_wins": gamebot_wins,
            "gamebot_win_rate": gamebot_win_rate,
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
    
    # Add GameBot row
    writer.writerow([
        "GameBot (Built-in)",
        analysis["total_games"],
        analysis["gamebot_wins"],
        f"{analysis['gamebot_win_rate']:.2f}",
        "-",
        "-",
        "-",
        "-",
        "-"
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
    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("SIMULATION_PORT", "8000"))
    
    logger.info(f"Starting server on {host}:{port}")
    
    # Run server
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )