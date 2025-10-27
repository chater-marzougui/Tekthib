#!/usr/bin/env python3
"""
Tekthib Bot SDK - Plug-and-Play Framework for Custom Bot Development

This SDK provides a simple interface for developing custom Tekthib bots.
Import this module and extend the BotStrategy class to create your own AI.

Example:
    from tekthib_bot_sdk import TekthibBotSDK, BotStrategy
    
    class MyStrategy(BotStrategy):
        def select_cards(self, game_state, claimed_rank):
            # Your logic here
            return selected_cards
    
    sdk = TekthibBotSDK(server_url, room_code, player_name)
    sdk.set_strategy(MyStrategy())
    sdk.run()
"""

import websocket
import json
import time
import logging
import uuid
from typing import Dict, List, Optional, Callable
from threading import Thread, Event
from abc import ABC, abstractmethod


class GameState:
    """Represents the current game state."""
    
    def __init__(self):
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
        
    def update(self, data: Dict):
        """Update game state from server data."""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)


class BotStrategy(ABC):
    """
    Abstract base class for bot strategies.
    
    Extend this class and implement the required methods to create your custom bot.
    """
    
    @abstractmethod
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """
        Select which cards to play.
        
        Args:
            game_state: Current game state
            claimed_rank: The rank that must be claimed
            
        Returns:
            List of card dictionaries to play
        """
        pass
    
    def should_challenge(self, game_state: GameState) -> bool:
        """
        Decide whether to challenge the last play.
        
        Args:
            game_state: Current game state
            
        Returns:
            True to challenge, False to pass
        """
        return False
    
    def choose_rank(self, game_state: GameState) -> str:
        """
        Choose which rank to claim when starting a new pile.
        
        Args:
            game_state: Current game state
            
        Returns:
            Rank to claim (e.g., "2", "K", "A")
        """
        # Default: choose most common rank in hand
        if not game_state.hand:
            return "2"
        
        rank_counts = {}
        for card in game_state.hand:
            rank = card["rank"]
            if rank != "Joker":
                rank_counts[rank] = rank_counts.get(rank, 0) + 1
        
        if rank_counts:
            return max(rank_counts.items(), key=lambda x: x[1])[0]
        return "2"


class TekthibBotSDK:
    """
    Main SDK class for creating Tekthib bots.
    
    Handles WebSocket connection, message handling, and game flow.
    Delegates strategy decisions to the provided BotStrategy implementation.
    """
    
    def __init__(
        self,
        server_url: str,
        room_code: str,
        player_name: str,
        is_host: bool = False,
        bots_to_add: int = 0,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialize the bot SDK.
        
        Args:
            server_url: WebSocket server URL (e.g., ws://localhost:3001)
            room_code: Room code to join (ignored if is_host=True)
            player_name: Name for the bot player
            is_host: Whether to create a new room as host
            bots_to_add: Number of bots to add (only if is_host=True)
            logger: Optional custom logger
        """
        self.server_url = server_url
        self.room_code = room_code
        self.player_name = player_name
        self.client_id = str(uuid.uuid4())
        self.is_host = is_host
        self.bots_to_add = bots_to_add
        
        # Game state
        self.game_state = GameState()
        
        # WebSocket
        self.ws: Optional[websocket.WebSocketApp] = None
        self.connected_event = Event()
        self.connection_initialized = False
        self.currently_playing = False
        self.in_game = False
        
        # Strategy
        self.strategy: Optional[BotStrategy] = None
        
        # Logger
        self.logger = logger or logging.getLogger(__name__)
        
        # Event callbacks
        self._event_callbacks: Dict[str, List[Callable]] = {}
    
    def set_strategy(self, strategy: BotStrategy):
        """Set the bot's playing strategy."""
        self.strategy = strategy
        self.logger.info(f"Strategy set: {strategy.__class__.__name__}")
    
    def on_event(self, event_type: str, callback: Callable):
        """
        Register a callback for game events.
        
        Args:
            event_type: Event type (e.g., 'game_started', 'cards_played', 'game_ended')
            callback: Function to call when event occurs
        """
        if event_type not in self._event_callbacks:
            self._event_callbacks[event_type] = []
        self._event_callbacks[event_type].append(callback)
    
    def _trigger_event(self, event_type: str, *args, **kwargs):
        """Trigger all callbacks for an event."""
        if event_type in self._event_callbacks:
            for callback in self._event_callbacks[event_type]:
                try:
                    callback(*args, **kwargs)
                except Exception as e:
                    self.logger.error(f"Error in event callback: {e}")
    
    def connect(self) -> bool:
        """Connect to the WebSocket server."""
        self.logger.info(f"Connecting to {self.server_url}...")
        
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
            self.logger.error("Failed to connect to server")
            return False
        
        return True
    
    def _on_open(self, ws):
        """Handle WebSocket connection open."""
        self.logger.info("WebSocket connection established")
        
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
            
            self.logger.debug(f"Received: {msg_type}")
            
            # Route to appropriate handler
            handler_map = {
                "CONNECTED": self._handle_connected,
                "ROOM_JOINED": self._handle_room_joined,
                "ROOM_CREATED": self._handle_room_created,
                "GAME_STARTED": self._handle_game_started,
                "INITIAL_GAME_STATE": self._handle_initial_game_state,
                "GAME_STATE_UPDATE": self._handle_game_state_update,
                "CARDS_PLAYED": self._handle_cards_played,
                "CHALLENGE_RESULT": self._handle_challenge_result,
                "GAME_ENDED": self._handle_game_ended,
                "BOTS_ADDED": self._handle_bots_added,
                "ERROR": self._handle_error,
            }
            
            handler = handler_map.get(msg_type)
            if handler:
                handler(payload)
            else:
                self.logger.debug(f"Unhandled message: {msg_type}")
                
        except Exception as e:
            self.logger.error(f"Error handling message: {e}", exc_info=True)
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors."""
        self.logger.error(f"WebSocket error: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket connection close."""
        self.logger.info(f"Connection closed: {close_status_code} - {close_msg}")
        self.in_game = False
    
    def _send_message(self, message: Dict):
        """Send a message to the server."""
        try:
            if self.ws:
                self.ws.send(json.dumps(message))
                self.logger.debug(f"Sent: {message['type']}")
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")
    
    def _handle_connected(self, payload: Dict):
        """Handle CONNECTED message."""
        if self.connection_initialized:
            return
        
        self.connection_initialized = True
        self.logger.info(f"Connected with ID: {self.client_id}")
        self.connected_event.set()
        
        time.sleep(0.5)
        if self.is_host:
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
            self._send_message({
                "type": "JOIN_ROOM",
                "payload": {
                    "roomCode": self.room_code,
                    "playerName": self.player_name
                }
            })
    
    def _handle_room_joined(self, payload: Dict):
        """Handle ROOM_JOINED message."""
        self.logger.info(f"Joined room: {self.room_code}")
        self.in_game = True
        
        time.sleep(0.5)
        self._send_message({
            "type": "READY",
            "payload": {"ready": True}
        })
        self._trigger_event("room_joined", payload)
    
    def _handle_room_created(self, payload: Dict):
        """Handle ROOM_CREATED message."""
        room_code = payload.get("room", {}).get("code", "UNKNOWN")
        self.logger.info(f"Room created: {room_code}")
        self.room_code = room_code
        self.in_game = True
        
        time.sleep(0.5)
        self._send_message({
            "type": "READY",
            "payload": {"ready": True}
        })
        
        if self.bots_to_add > 0:
            time.sleep(0.3)
            self._send_message({
                "type": "ADD_BOTS",
                "payload": {"count": self.bots_to_add}
            })
        
        self._trigger_event("room_created", payload)
    
    def _handle_bots_added(self, payload: Dict):
        """Handle BOTS_ADDED message."""
        self.logger.info(f"Bots added. Starting game...")
        time.sleep(0.5)
        self._send_message({
            "type": "START_GAME",
            "payload": {
                "autoPlayTimeout": 0,
                "challengeSuspenseEnabled": False
            }
        })
    
    def _handle_game_started(self, payload: Dict):
        """Handle GAME_STARTED message."""
        self.logger.info("Game started!")
        self.game_state.game_phase = "playing"
        self._trigger_event("game_started", payload)
    
    def _handle_initial_game_state(self, payload: Dict):
        """Handle INITIAL_GAME_STATE message."""
        if "hand" in payload:
            self.game_state.hand = payload["hand"]
            self.logger.info(f"Hand received: {len(self.game_state.hand)} cards")
        
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
        
        self._trigger_event("initial_game_state", payload)
        
        if self.game_state.is_my_turn:
            self._handle_my_turn()
    
    def _handle_game_state_update(self, payload: Dict):
        """Handle GAME_STATE_UPDATE message."""
        if "hand" in payload:
            self.game_state.hand = payload["hand"]
        
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
        
        self._trigger_event("game_state_update", payload)
    
    def _handle_cards_played(self, payload: Dict):
        """Handle CARDS_PLAYED message."""
        player_name = payload.get("playerName", "Unknown")
        card_count = payload.get("cardCount", 0)
        claimed_rank = payload.get("claimedRank", "Unknown")
        
        self.currently_playing = False
        self.logger.info(f"{player_name} played {card_count} card(s) as {claimed_rank}")
        
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
        
        self._trigger_event("cards_played", payload)
        
        # Decide whether to challenge
        if self.game_state.can_challenge and not self.game_state.is_my_turn:
            self._maybe_challenge()
    
    def _handle_challenge_result(self, payload: Dict):
        """Handle CHALLENGE_RESULT message."""
        challenger = payload.get("challengerName", "Unknown")
        player = payload.get("playerName", "Unknown")
        was_lying = payload.get("wasLying", False)
        
        if was_lying:
            self.logger.info(f"Challenge success! {player} was bluffing")
        else:
            self.logger.info(f"Challenge failed! {player} was truthful")
        
        if "gameState" in payload:
            self._update_game_state(payload["gameState"])
        
        self._trigger_event("challenge_result", payload)
    
    def _handle_game_ended(self, payload: Dict):
        """Handle GAME_ENDED message."""
        winners = payload.get("winners", [])
        loser = payload.get("loser", "")
        
        self.logger.info("=" * 50)
        self.logger.info("GAME ENDED!")
        self.logger.info(f"Winners: {winners}")
        self.logger.info(f"Loser: {loser}")
        self.logger.info("=" * 50)
        
        self.game_state.game_phase = "ended"
        self.in_game = False
        
        self._trigger_event("game_ended", payload)
    
    def _handle_error(self, payload: Dict):
        """Handle ERROR message."""
        error_msg = payload.get("message", "Unknown error")
        self.logger.error(f"Server error: {error_msg}")
        self._trigger_event("error", payload)
    
    def _update_game_state(self, game_state_data: Dict):
        """Update game state from server data."""
        self.game_state.pile_count = game_state_data.get("pileCount", 0)
        self.game_state.current_rank = game_state_data.get("currentRank")
        self.game_state.current_player_id = game_state_data.get("currentPlayerId")
        self.game_state.last_player_id = game_state_data.get("lastPlayerId")
        self.game_state.last_played_count = game_state_data.get("lastPlayedCount", 0)
        self.game_state.players = game_state_data.get("players", [])
        self.game_state.winners = game_state_data.get("winners", [])
        self.game_state.game_phase = game_state_data.get("phase", "waiting")
        
        self.game_state.is_my_turn = (self.game_state.current_player_id == self.client_id)
        self.game_state.can_challenge = (
            self.game_state.last_player_id is not None and
            self.game_state.last_player_id != self.client_id and
            self.game_state.pile_count > 0 and
            self.client_id not in self.game_state.winners
        )
        
        if self.game_state.is_my_turn:
            time.sleep(1.5)  # Small delay for natural gameplay
            self._handle_my_turn()
    
    def _handle_my_turn(self):
        """Handle playing cards when it's our turn."""
        if not self.game_state.is_my_turn or not self.game_state.hand or self.currently_playing:
            return
        
        if not self.strategy:
            self.logger.error("No strategy set! Cannot play.")
            return
        
        self.currently_playing = True
        self.logger.info("It's my turn!")
        
        try:
            # Determine claimed rank
            if self.game_state.current_rank:
                claimed_rank = self.game_state.current_rank
            else:
                claimed_rank = self.strategy.choose_rank(self.game_state)
            
            # Select cards using strategy
            cards_to_play = self.strategy.select_cards(self.game_state, claimed_rank)
            
            if not cards_to_play:
                self.logger.error("Strategy returned no cards!")
                return
            
            card_ids = [card["id"] for card in cards_to_play]
            self.logger.info(f"Playing {len(card_ids)} card(s) as {claimed_rank}")
            
            self._send_message({
                "type": "PLAY_CARDS",
                "payload": {
                    "cardIds": card_ids,
                    "claimedRank": claimed_rank
                }
            })
            
        except Exception as e:
            self.logger.error(f"Error in strategy: {e}", exc_info=True)
            self.currently_playing = False
    
    def _maybe_challenge(self):
        """Decide whether to challenge using strategy."""
        if not self.game_state.can_challenge or not self.strategy:
            return
        
        try:
            should_challenge = self.strategy.should_challenge(self.game_state)
            
            if should_challenge:
                self.logger.info("Challenging!")
                self._send_message({
                    "type": "CHALLENGE",
                    "payload": {"challengerId": self.client_id}
                })
                self.game_state.can_challenge = False
                
        except Exception as e:
            self.logger.error(f"Error in challenge decision: {e}")
    
    def run(self):
        """Run the bot."""
        if not self.strategy:
            self.logger.error("No strategy set! Call set_strategy() first.")
            return
        
        if not self.connect():
            self.logger.error("Failed to connect to server")
            return
        
        self.logger.info("Bot is running. Press Ctrl+C to stop.")
        
        try:
            while self.in_game or self.game_state.game_phase == "waiting":
                time.sleep(1)
            
            self.logger.info("Bot finished")
            
        except KeyboardInterrupt:
            self.logger.info("Bot stopped by user")
        finally:
            if self.ws:
                self.ws.close()
