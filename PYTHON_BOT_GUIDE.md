# Python Bot Player - Developer Guide

## Overview

The Python bot player (`python_bot_player.py`) is a WebSocket-based bot that connects to Tekthib game rooms and plays autonomously. It serves as a foundation for developing sophisticated AI players using machine learning or large language models.

## Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or manually
pip install websocket-client
```

### Basic Usage

```bash
# Join a room
python python_bot_player.py --room-code ABC123 --player-name MyBot

# Connect to custom server
python python_bot_player.py --room-code ABC123 --server-url ws://localhost:3001

# Enable verbose logging
python python_bot_player.py --room-code ABC123 --verbose
```

## Architecture

### Bot Lifecycle

1. **Connection**: Connects to WebSocket server and sends CONNECT message
2. **Room Join**: Automatically joins specified room
3. **Ready**: Marks itself as ready to play
4. **Game Loop**: Responds to game events and takes actions
5. **Disconnection**: Gracefully handles game end or manual termination

### Message Handling

The bot handles all WebSocket message types:

- `CONNECTED`: Confirms connection and triggers room join
- `ROOM_JOINED`: Marks bot as ready
- `GAME_STARTED`: Enters playing mode
- `INITIAL_GAME_STATE`: Receives hand and game state
- `GAME_STATE_UPDATE`: Updates hand and state
- `CARDS_PLAYED`: Processes plays and decides whether to challenge
- `CHALLENGE_RESULT`: Logs challenge outcomes
- `GAME_ENDED`: Logs final results and exits
- `ERROR`: Logs server errors

## Current AI Strategy

The bot uses a simple random strategy:

### Playing Cards

- **70% truthful plays**: Plays matching cards when available
- **30% bluffing**: Plays random cards claiming the required rank
- Plays 1-4 cards per turn
- Prefers playing cards of ranks it has more of

### Challenging

- **30% challenge rate**: Randomly challenges opponent plays
- Only challenges when eligible (not last player, pile exists)

### Timing

- Human-like delays: 1.5-3.5 seconds between actions
- Automatic play when it's the bot's turn

## Developing Custom AI

### Strategy Customization

Modify these methods to implement your AI:

#### 1. Card Selection (`_select_cards_to_play`)

```python
def _select_cards_to_play(self, claimed_rank: str) -> List[Dict]:
    # Your AI logic here
    # Return list of cards to play
    pass
```

#### 2. Challenge Decision (`_maybe_challenge`)

```python
def _maybe_challenge(self):
    # Your AI logic here
    # Call self._send_message with CHALLENGE if you want to challenge
    pass
```

#### 3. Rank Selection (`_choose_random_rank`)

```python
def _choose_random_rank(self) -> str:
    # Your AI logic here
    # Return rank to claim when starting new pile
    pass
```

### Adding Machine Learning

Example: Using a trained model for decision-making

```python
import torch
from your_model import TekthibAI

class TekthibBot:
    def __init__(self, server_url: str, room_code: str, player_name: str):
        super().__init__(server_url, room_code, player_name)
        self.ai_model = TekthibAI.load('model.pth')
    
    def _select_cards_to_play(self, claimed_rank: str) -> List[Dict]:
        # Prepare state for model
        state = self._prepare_state()
        
        # Get model prediction
        action = self.ai_model.predict(state, claimed_rank)
        
        # Convert to card selection
        return self._action_to_cards(action)
```

### Adding LLM Integration

Example: Using OpenAI GPT for strategic decisions

```python
import openai

class TekthibBot:
    def __init__(self, server_url: str, room_code: str, player_name: str):
        super().__init__(server_url, room_code, player_name)
        openai.api_key = os.getenv("OPENAI_API_KEY")
    
    def _select_cards_to_play(self, claimed_rank: str) -> List[Dict]:
        # Prepare game context
        context = f"""
        My hand: {self.hand}
        Current rank: {claimed_rank}
        Pile size: {self.pile_count}
        Players: {len(self.players)}
        """
        
        # Get LLM decision
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a Tekthib card game player."},
                {"role": "user", "content": f"What should I play? {context}"}
            ]
        )
        
        # Parse and execute decision
        return self._parse_llm_response(response)
```

## Available Game State

The bot maintains complete game state:

```python
self.hand                # List[Dict]: Cards in bot's hand
self.pile_count          # int: Number of cards in center pile
self.current_rank        # str: Current claimed rank
self.current_player_id   # str: ID of current player
self.last_player_id      # str: ID of player who played last
self.last_played_count   # int: Number of cards in last play
self.is_my_turn          # bool: Whether it's bot's turn
self.can_challenge       # bool: Whether bot can challenge
self.game_phase          # str: 'waiting' | 'playing' | 'ended'
self.players             # List[Dict]: All players with card counts
self.winners             # List[str]: Player IDs who won
```

## Logging

The bot logs all activity to:
- Console (INFO level by default)
- `bot_player.log` file

Enable verbose logging for debugging:
```bash
python python_bot_player.py --room-code ABC123 --verbose
```

## Testing

### Local Testing

1. Start the Tekthib server:
```bash
cd server
npm run dev
```

2. Create a room via web interface

3. Run the bot:
```bash
python python_bot_player.py --room-code YOUR_ROOM_CODE
```

### Multiple Bots

Run multiple bots to test bot vs bot games:

```bash
# Terminal 1
python python_bot_player.py --room-code ABC123 --player-name Bot1

# Terminal 2
python python_bot_player.py --room-code ABC123 --player-name Bot2

# Terminal 3
python python_bot_player.py --room-code ABC123 --player-name Bot3
```

## Advanced Features

### Custom Logging

```python
import logging

# Create custom logger
logger = logging.getLogger('my_bot')
handler = logging.FileHandler('my_bot.log')
handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(handler)
```

### State Persistence

Save bot's learning data:

```python
import json

class TekthibBot:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.game_history = []
    
    def save_history(self):
        with open('game_history.json', 'w') as f:
            json.dump(self.game_history, f)
    
    def _handle_game_ended(self, payload: Dict):
        super()._handle_game_ended(payload)
        self.save_history()
```

### Performance Monitoring

Track bot performance:

```python
class TekthibBot:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.stats = {
            'games_played': 0,
            'games_won': 0,
            'successful_bluffs': 0,
            'caught_bluffing': 0,
            'successful_challenges': 0,
            'failed_challenges': 0
        }
```

## Contributing

When developing new AI strategies:

1. Keep the existing message handling intact
2. Only modify decision-making methods
3. Add comprehensive logging for debugging
4. Test with multiple game scenarios
5. Document your strategy

## Troubleshooting

### Connection Issues

- Verify server is running
- Check WebSocket URL (ws:// vs wss://)
- Ensure room code is correct

### Bot Not Playing

- Check if bot marked itself as ready
- Verify `is_my_turn` is being set correctly
- Enable verbose logging to see state updates

### Unexpected Behavior

- Review logs in `bot_player.log`
- Add debug prints in decision methods
- Test with simplified strategy first

## Future Enhancements

Potential improvements:

- [ ] Memory of opponent behavior
- [ ] Probability calculations for challenges
- [ ] Card counting and tracking
- [ ] Risk assessment based on hand size
- [ ] Adaptive strategy based on game state
- [ ] Multi-game learning and improvement
- [ ] Tournament mode support

## License

This bot is part of the Tekthib project and follows the same license.
