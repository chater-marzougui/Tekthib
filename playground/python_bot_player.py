#!/usr/bin/env python3
"""
Python Bot Player for Tekthib Card Game

This bot connects to a Tekthib game room via WebSocket and plays the game
with basic random strategy. It can be used as a foundation for developing
more sophisticated AI players using LLMs or machine learning models.

Usage:
    python python_bot_player.py --room-code ABCD12 --player-name MyBot --server-url ws://localhost:3001

Requirements:
    - websocket-client
    - python 3.7+
"""

import webbrowser
import websocket
import json
import time
import logging
import sys
import random
import uuid
from typing import Dict, List, Optional
from threading import Thread, Event
import os


# Delete existing log file
log_file_path = 'bot_player.log'
if os.path.exists(log_file_path):
    os.remove(log_file_path)
    
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file_path)
    ]
)

logger = logging.getLogger(__name__)


class TekthibBot:
    """A bot player for the Tekthib card game."""

    def __init__(self, server_url: str, spectator_url: str, room_code: str, player_name: str, is_host: bool, bots_to_add: int):
        """
        Initialize the bot player.
        
        Args:
            server_url: WebSocket server URL (e.g., ws://localhost:3001)
            room_code: Room code to join
            player_name: Name for the bot player
        """
        self.server_url = server_url
        self.spectator_url = spectator_url
        self.room_code = room_code
        self.player_name = player_name
        self.client_id = str(uuid.uuid4())
        
        # Game state
        self.hand: List[Dict] = []
        self.pile_count: int = 0
        self.current_rank: Optional[str] = None
        self.current_player_id: Optional[str] = None
        self.last_player_id: Optional[str] = None
        self.last_played_count: int = 0
        self.is_my_turn: bool = False
        self.can_challenge: bool = False
        self.game_phase: str = "waiting"
        self.players: List[Dict] = []
        self.winners: List[str] = []
        
        # WebSocket
        self.connection_initialized = False
        self.currently_playing = False
        self.ws: Optional[websocket.WebSocketApp] = None
        self.connected_event = Event()
        self.in_game = False
        
        """Bot configuration"""
        self.is_host = is_host
        self.bots_to_add = bots_to_add
        
        logger.info(f"Bot initialized: {player_name} (ID: {self.client_id})")
    
    def connect(self):
        """Connect to the WebSocket server."""
        logger.info(f"Connecting to {self.server_url}...")
        
        self.ws = websocket.WebSocketApp(
            self.server_url,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close
        )
        
        # Run WebSocket in a separate thread
        ws_thread = Thread(target=self.ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Wait for connection
        if not self.connected_event.wait(timeout=10):
            logger.error("Failed to connect to server")
            return False
        
        return True
    
    def _on_open(self, ws):
        """Handle WebSocket connection open."""
        logger.info("WebSocket connection established")
        
        # Send CONNECT message
        self._send_message({
            "type": "CONNECT",
            "payload": {
                "clientId": self.client_id,
                "playerName": self.player_name
            }
        })
    
    def _on_message(self, ws, message: str):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            payload = data.get("payload", {})
            
            logger.debug(f"Received message: {msg_type}")
            
            # Handle different message types
            if msg_type == "CONNECTED":
                self._handle_connected(payload)
            elif msg_type == "ROOM_JOINED":
                self._handle_room_joined(payload)
            elif msg_type == "ROOM_CREATED":
                self._handle_room_created(payload)
            elif msg_type == "GAME_STARTED":
                self._handle_game_started()
            elif msg_type == "INITIAL_GAME_STATE":
                self._handle_initial_game_state(payload)
            elif msg_type == "GAME_STATE_UPDATE":
                self._handle_game_state_update(payload)
            elif msg_type == "CARDS_PLAYED":
                self._handle_cards_played(payload)
            elif msg_type == "CHALLENGE_RESULT":
                self._handle_challenge_result(payload)
            elif msg_type == "GAME_ENDED":
                self._handle_game_ended(payload)
            elif msg_type == "BOTS_ADDED":
                self._start_game(payload)
            elif msg_type == "ERROR":
                self._handle_error(payload)
            elif msg_type == "CHAT_MESSAGE":
                pass  # Ignore chat messages
            else:
                logger.debug(f"Unhandled message type: {msg_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors."""
        logger.error(f"WebSocket error: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket connection close."""
        logger.info(f"WebSocket connection closed: {close_status_code} - {close_msg}")
        self.in_game = False
    
    def _send_message(self, message: Dict):
        """Send a message to the server."""
        try:
            if self.ws:
                self.ws.send(json.dumps(message))
                logger.debug(f"Sent message: {message['type']}")
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    def _handle_connected(self, payload: Dict):
        """Handle CONNECTED message."""
        if self.connection_initialized:
            logger.warning("Already connected, ignoring duplicate CONNECTED message")
            return
        
        self.connection_initialized = True
        logger.info(f"Connected to server with client ID: {self.client_id}")
        self.connected_event.set()
        
        # Join the room
        time.sleep(0.5)
        if self.is_host:
            logger.info("Creating new room as host")
            self._send_message({
                "type": "CREATE_ROOM",
                "payload": {
                    "playerName": self.player_name,
                    "botsToAdd": self.bots_to_add,
                    "isPublic": False,
                    "challengeSuspenseEnabled": False
                }
            })
            
        else:
            logger.info(f"Joining room: {self.room_code}")
            self._send_message({
                "type": "JOIN_ROOM",
                "payload": {
                    "roomCode": self.room_code,
                    "playerName": self.player_name
                }
            })
    
    def _handle_room_joined(self, payload: Dict):
        """Handle ROOM_JOINED message."""
        logger.info(f"Successfully joined room: {self.room_code}")
        self.in_game = True
        
        # Mark as ready
        time.sleep(0.5)
        self._send_message({
            "type": "READY",
            "payload": { "ready": True }
        })
        logger.info("Marked as ready")
        
    def _handle_room_created(self, payload: Dict):
        """Handle ROOM_CREATED message."""
        room_code = payload.get("room", {}).get("code", "UNKNOWN")
        logger.info(f"Room created with code: {room_code}")
        self.room_code = room_code
        self.in_game = True
        
        # Mark as ready
        time.sleep(0.5)
        self._send_message({
            "type": "READY",
            "payload": { "ready": True }
        })
        logger.info("Marked as ready")
        
        time.sleep(0.3)
        self._send_message({
            "type": "ADD_BOTS",
            "payload": {
                "count": self.bots_to_add
            }
        })
    
    def _start_game(self, payload: Dict):
        """Start the game after bots are added."""
        logger.info(f"Added {self.bots_to_add} bot(s) to the room. Starting game...")
        time.sleep(0.5)
        self._send_message({
            "type": "START_GAME",
            "payload": {
                "autoPlayTimeout": 0,
                "challengeSuspenseEnabled": False
            }
        })
        
    def _handle_game_started(self):
        """Handle GAME_STARTED message, Open a webpage to spectate."""
        logger.info("Game started!")
        self.game_phase = "playing"
        webbrowser.open(self.spectator_url)

    def _handle_initial_game_state(self, payload: Dict):
        """Handle INITIAL_GAME_STATE message."""
        logger.info("Received initial game state")
        
        # Update hand
        if "hand" in payload:
            self.hand = payload["hand"]
            logger.info(f"Hand received: {len(self.hand)} cards")
        
        # Update game state
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
        
        # Check if it's our turn
        if self.is_my_turn:
            self._handle_my_turn()
    
    def _handle_game_state_update(self, payload: Dict):
        """Handle GAME_STATE_UPDATE message."""
        logger.debug("Game state updated")
        
        # Update hand
        if "hand" in payload:
            self.hand = payload["hand"]
            logger.info(f"Hand updated: {len(self.hand)} cards")
        
        # Update game state
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
    
    def _handle_cards_played(self, payload: Dict):
        """Handle CARDS_PLAYED message."""
        player_name = payload.get("playerName", "Unknown")
        card_count = payload.get("cardCount", 0)
        claimed_rank = payload.get("claimedRank", "Unknown")
        was_auto_played = payload.get("wasAutoPlayed", False)

        self.currently_playing = False

        if was_auto_played:
            logger.info(f"{player_name} timed out - {card_count} cards auto-played as {claimed_rank}")
        else:
            logger.info(f"{player_name} played {card_count} card(s) claiming {claimed_rank}")
        
        # Update game state
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
        
        # Decide whether to challenge
        if self.can_challenge and not self.is_my_turn:
            self._maybe_challenge()
    
    def _handle_challenge_result(self, payload: Dict):
        """Handle CHALLENGE_RESULT message."""
        challenger_name = payload.get("challengerName", "Unknown")
        player_name = payload.get("playerName", "Unknown")
        was_lying = payload.get("wasLying", False)
        revealed_cards = payload.get("revealedCards", [])
        
        if was_lying:
            logger.info(f"Challenge success! {player_name} was caught bluffing by {challenger_name}")
        else:
            logger.info(f"Challenge failed! {player_name} was telling the truth. {challenger_name} takes the pile")
        
        logger.info(f"Revealed cards: {len(revealed_cards)} cards")
        
        # Update game state
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
    
    def _handle_game_ended(self, payload: Dict):
        """Handle GAME_ENDED message."""
        winners = payload.get("winners", [])
        loser = payload.get("loser", "")
        
        logger.info("="*50)
        logger.info("GAME ENDED!")
        logger.info(f"Winners: {', '.join([self._get_player_name(w) for w in winners])}")
        logger.info(f"Loser: {self._get_player_name(loser)}")
        logger.info("="*50)
        
        self.game_phase = "ended"
        self.in_game = False
    
    def _handle_error(self, payload: Dict):
        """Handle ERROR message."""
        error_msg = payload.get("message", "Unknown error")
        logger.error(f"Server error: {error_msg}")
    
    def _update_game_state(self, game_state: Dict):
        """Update the bot's game state from server data."""
        self.pile_count = game_state.get("pileCount", 0)
        self.current_rank = game_state.get("currentRank")
        self.current_player_id = game_state.get("currentPlayerId")
        self.last_player_id = game_state.get("lastPlayerId")
        self.last_played_count = game_state.get("lastPlayedCount", 0)
        self.players = game_state.get("players", [])
        self.winners = game_state.get("winners", [])
        self.game_phase = game_state.get("phase", "waiting")
        
        # Determine if it's our turn
        self.is_my_turn = (self.current_player_id == self.client_id)
        
        # Determine if we can challenge
        self.can_challenge = (
            self.last_player_id is not None and
            self.last_player_id != self.client_id and
            self.pile_count > 0 and
            self.client_id not in self.winners
        )
        
        logger.debug(f"Game state: pile={self.pile_count}, rank={self.current_rank}, "
                    f"my_turn={self.is_my_turn}, can_challenge={self.can_challenge}")
        
        # If it's our turn, play
        if self.is_my_turn:
            time.sleep(random.uniform(1.5, 3.5))  # Human-like delay
            self._handle_my_turn()
    
    def _handle_my_turn(self):
        """Handle playing cards when it's our turn."""
        if not self.is_my_turn or len(self.hand) == 0 or self.currently_playing:
            return
        
        self.currently_playing = True  # Lock to prevent re-entry
        logger.info("It's my turn!")
        
        # Determine what rank to claim
        if self.current_rank:
            # Must continue with current rank
            claimed_rank = self.current_rank
        else:
            # First play - choose a random rank from hand
            claimed_rank = self._choose_random_rank()
        
        # Select cards to play
        cards_to_play = self._select_cards_to_play(claimed_rank)
        
        if not cards_to_play:
            logger.warning("No cards to play!")
            return
        
        card_ids = [card["id"] for card in cards_to_play]
        
        logger.info(f"Playing {len(card_ids)} card(s) claiming {claimed_rank}")
        
        # Send PLAY_CARDS message
        self._send_message({
            "type": "PLAY_CARDS",
            "payload": {
                "cardIds": card_ids,
                "claimedRank": claimed_rank
            }
        })
    
    def _select_cards_to_play(self, claimed_rank: str) -> List[Dict]:
        """
        Select which cards to play.
        
        This is a simple random strategy:
        - 70% of the time, play matching cards (if available)
        - 30% of the time, bluff with random cards
        
        Args:
            claimed_rank: The rank to claim
            
        Returns:
            List of cards to play
        """
        # Count matching cards
        matching_cards = [card for card in self.hand if card["rank"] == claimed_rank or card["rank"] == "Joker"]
        
        # Decide: tell truth or bluff
        should_tell_truth = random.random() < 0.7 or len(matching_cards) == 0
        
        if should_tell_truth and len(matching_cards) > 0:
            # Play matching cards
            num_to_play = min(len(matching_cards), random.randint(1, min(4, len(matching_cards))))
            cards = matching_cards[:num_to_play]
            logger.info(f"Playing truthfully: {num_to_play} {claimed_rank}(s)")
        else:
            # Bluff with random cards
            num_to_play = random.randint(1, min(4, len(self.hand)))
            cards = random.sample(self.hand, num_to_play)
            actual_ranks = [card["rank"] for card in cards]
            logger.info(f"Bluffing: playing {actual_ranks} as {claimed_rank}")
        
        return cards
    
    def _choose_random_rank(self) -> str:
        """Choose a random rank to claim from cards in hand."""
        if not self.hand:
            return "2"
        
        # Prefer ranks we actually have
        rank_counts = {}
        for card in self.hand:
            rank = card["rank"]
            if rank != "Joker":
                rank_counts[rank] = rank_counts.get(rank, 0) + 1
        
        if rank_counts:
            # Choose the rank we have most of
            best_rank = max(rank_counts.items(), key=lambda x: x[1])[0]
            return best_rank
        else:
            # All jokers or empty - return a random rank
            return random.choice(["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"])
    
    def _maybe_challenge(self):
        """Decide whether to challenge the last play."""
        if not self.can_challenge:
            return
        
        # Simple random strategy: 30% chance to challenge
        should_challenge = random.random() < 0.3
        
        if should_challenge:
            logger.info(f"Challenging {self._get_player_name(self.last_player_id)}'s play!")
            
            self._send_message({
                "type": "CHALLENGE",
                "payload": {
                    "challengerId": self.client_id
                }
            })
            
            # Prevent multiple challenges
            self.can_challenge = False
    
    def _get_player_name(self, player_id: str) -> str:
        """Get player name by ID."""
        for player in self.players:
            if player.get("id") == player_id:
                return player.get("name", "Unknown")
        return "Unknown"
    
    def run(self):
        """Run the bot."""
        if not self.connect():
            logger.error("Failed to connect to server")
            return
        
        logger.info("Bot is running. Press Ctrl+C to stop.")
        
        try:
            # Keep the bot running
            while self.in_game or self.game_phase == "waiting":
                time.sleep(1)
            
            logger.info("Bot finished playing")
            
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
        finally:
            if self.ws:
                self.ws.close()


def main():
    """Main entry point."""
    logger.setLevel(logging.DEBUG)
    
    # Create and run the bot
    SERVER_URL="ws://localhost:3001"
    PLAYER_NAME="PythonBot-1"
    SPECTATOR_URL="http://localhost:5173/spectate/"
    
    # Set Room code to join a room, or leave empty to create a new room
    ROOM_CODE=""
    
    # Set to True to create a new room, False to join existing
    IS_HOST=True
    # Set the number of bots to add to the game, if hosting
    BOTS_TO_ADD=3
    if not ROOM_CODE and not IS_HOST:
        logger.error("ROOM_CODE environment variable is not set. Either be a host to create a room or provide a ROOM_CODE to join.")
        return
    
    bot = TekthibBot(SERVER_URL, SPECTATOR_URL, ROOM_CODE, PLAYER_NAME, IS_HOST, BOTS_TO_ADD)
    bot.run()


if __name__ == "__main__":
    main()
