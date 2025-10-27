# Tekthib Bot SDK - Quick Start Guide

## 🎯 Overview

The Tekthib Bot SDK provides a **plug-and-play** framework for developing custom Tekthib game bots. Instead of understanding the entire WebSocket protocol and game flow, you can focus on **just the strategy** - how your bot plays cards and makes decisions.

## 📦 What's Included

- **`tekthib_bot_sdk.py`** - Main SDK module with connection handling
- **`bot_strategies.py`** - Pre-built strategy examples you can use or learn from
- **`example_custom_bot.py`** - Minimal working example
- **`python_bot_player.py`** - Reference implementation (do not modify)

## 🚀 Quick Start (3 Simple Steps)

### Step 1: Install Dependencies

```bash
cd playground
pip install -r requirements.txt
```

### Step 2: Choose or Create a Strategy

Use a pre-built strategy from `bot_strategies.py`:

```python
from bot_strategies import SmartStrategy, AggressiveStrategy, ConservativeStrategy

# Pick one:
strategy = SmartStrategy()        # Balanced, intelligent play
strategy = AggressiveStrategy()   # High risk, high reward
strategy = ConservativeStrategy() # Safe, defensive play
```

Or create your own (see "Creating Custom Strategies" below).

### Step 3: Run Your Bot

**Option A: Using the example script**

```bash
# Edit .env file
SERVER_URL=ws://localhost:3001
ROOM_CODE=ABC123
PLAYER_NAME=MyBot

# Run
python example_custom_bot.py
```

**Option B: Write your own script (just 10 lines!)**

```python
from tekthib_bot_sdk import TekthibBotSDK
from bot_strategies import SmartStrategy

sdk = TekthibBotSDK(
    server_url="ws://localhost:3001",
    room_code="ABC123",
    player_name="MyBot"
)
sdk.set_strategy(SmartStrategy())
sdk.run()
```

That's it! Your bot is now playing.

## 🎨 Creating Custom Strategies

To create your own bot AI, extend the `BotStrategy` class and implement 1-3 methods:

### Basic Template

```python
from tekthib_bot_sdk import BotStrategy, GameState

class MyStrategy(BotStrategy):
    def select_cards(self, game_state, claimed_rank):
        """
        Choose which cards to play (REQUIRED)
        
        Args:
            game_state: Current game state (see below for attributes)
            claimed_rank: The rank you must claim (e.g., "K", "7")
        
        Returns:
            List of card dictionaries to play
        """
        # Your logic here
        # Return a list of cards from game_state.hand
        pass
    
    def should_challenge(self, game_state):
        """
        Decide whether to challenge opponent (OPTIONAL)
        
        Returns:
            True to challenge, False to pass
        """
        return False  # Default: never challenge
    
    def choose_rank(self, game_state):
        """
        Choose rank when starting new pile (OPTIONAL)
        Has sensible default implementation
        
        Returns:
            Rank string (e.g., "2", "K", "A")
        """
        return super().choose_rank(game_state)  # Use default
```

### Game State Attributes

The `game_state` object gives you everything you need:

```python
# Your cards
game_state.hand                 # List[Dict]: Your cards
                                # Each card: {"id": str, "rank": str, "suit": str}

# Current game state
game_state.pile_count          # int: Cards in center pile
game_state.current_rank        # str: Current claimed rank
game_state.last_played_count   # int: Cards opponent just played
game_state.is_my_turn          # bool: Whether it's your turn
game_state.can_challenge       # bool: Whether you can challenge

# Other players
game_state.players             # List[Dict]: All players
                               # Each: {"id", "name", "cardCount", "isBot", ...}
game_state.current_player_id   # str: ID of current player
game_state.last_player_id      # str: ID of player who just played

# Game status
game_state.game_phase          # str: "waiting" | "playing" | "ended"
game_state.winners             # List[str]: Player IDs who have won
```

## 📚 Strategy Examples

### Example 1: Simple Truthful Bot

```python
class HonestBot(BotStrategy):
    def select_cards(self, game_state, claimed_rank):
        # Play matching cards only, never bluff
        matching = [c for c in game_state.hand 
                   if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        if matching:
            return matching[:1]  # Play one matching card
        else:
            return [game_state.hand[0]]  # Play minimum
```

### Example 2: Aggressive Bluffer

```python
import random

class BlufferBot(BotStrategy):
    def select_cards(self, game_state, claimed_rank):
        # Always play 2-3 cards regardless of what we have
        num = random.randint(2, min(3, len(game_state.hand)))
        return random.sample(game_state.hand, num)
    
    def should_challenge(self, game_state):
        # Challenge often
        return random.random() < 0.4
```

### Example 3: Card Counter

```python
class CounterBot(BotStrategy):
    def __init__(self):
        self.seen_ranks = {}  # Track what's been played
    
    def select_cards(self, game_state, claimed_rank):
        # Count how many of this rank have been seen
        seen = self.seen_ranks.get(claimed_rank, 0)
        total_possible = 8  # 4 per deck × 2 decks
        
        matching = [c for c in game_state.hand if c["rank"] == claimed_rank]
        
        if matching and seen < 6:
            # Safe to play truthfully
            return matching[:2]
        else:
            # Bluff carefully
            return [game_state.hand[0]]
```

## 🔧 Advanced Features

### Event Listeners

React to game events:

```python
sdk = TekthibBotSDK(...)

def on_cards_played(payload):
    print(f"Someone played {payload['cardCount']} cards")

def on_challenge_result(payload):
    if payload["wasLying"]:
        print("Challenge successful!")

sdk.on_event("cards_played", on_cards_played)
sdk.on_event("challenge_result", on_challenge_result)
sdk.run()
```

Available events:
- `room_joined` - Successfully joined a room
- `room_created` - Successfully created a room
- `game_started` - Game has begun
- `initial_game_state` - Received initial cards
- `game_state_update` - Game state changed
- `cards_played` - Someone played cards
- `challenge_result` - Challenge resolved
- `game_ended` - Game finished
- `error` - Server error occurred

### Custom Logging

```python
import logging

# Create custom logger
logger = logging.getLogger("MyBot")
logger.setLevel(logging.DEBUG)

sdk = TekthibBotSDK(..., logger=logger)
```

### Creating Rooms as Host

```python
sdk = TekthibBotSDK(
    server_url="ws://localhost:3001",
    room_code="",  # Ignored when is_host=True
    player_name="HostBot",
    is_host=True,          # Create new room
    bots_to_add=3          # Add 3 AI bots
)
```

## 🧪 Testing Your Bot

### Local Testing

1. Start the Tekthib server:
   ```bash
   cd server
   npm run dev
   ```

2. Run your bot:
   ```bash
   python example_custom_bot.py
   ```

3. Or create a room via web UI and have your bot join it.

### Bot vs Bot Games

Test multiple strategies against each other:

```bash
# Terminal 1
IS_HOST=true BOTS_TO_ADD=3 PLAYER_NAME=Bot1 python example_custom_bot.py

# Terminals 2-4 (use the room code from Bot1)
ROOM_CODE=ABC123 PLAYER_NAME=Bot2 python example_custom_bot.py
```

## 💡 Tips for Building Better Bots

1. **Start Simple**: Begin with `TruthfulStrategy` or `RandomStrategy` to understand the flow
2. **Track History**: Keep track of played cards to make smarter decisions
3. **Adapt**: Change strategy based on game phase (early/mid/late game)
4. **Learn**: Track opponent behavior and adapt to their patterns
5. **Test**: Run bot vs bot games to see how strategies perform

## 🤖 Using Machine Learning Models

### Example: Using a Pre-trained Model

```python
import torch
from your_model import TekthibAI

class MLStrategy(BotStrategy):
    def __init__(self, model_path):
        self.model = TekthibAI.load(model_path)
    
    def select_cards(self, game_state, claimed_rank):
        # Convert game state to model input
        state_tensor = self._state_to_tensor(game_state)
        
        # Get model prediction
        with torch.no_grad():
            action = self.model(state_tensor)
        
        # Convert action to cards
        return self._action_to_cards(action, game_state)
```

### Example: Using OpenAI API

```python
import openai
import os

class LLMStrategy(BotStrategy):
    def __init__(self):
        openai.api_key = os.getenv("OPENAI_API_KEY")
    
    def select_cards(self, game_state, claimed_rank):
        # Create prompt with game state
        prompt = f"""
        You are playing Tekthib. You must play cards claiming {claimed_rank}.
        Your hand: {[c['rank'] for c in game_state.hand]}
        Pile size: {game_state.pile_count}
        
        Which cards should you play? Answer with indices (e.g., "0,2").
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse response and return cards
        indices = self._parse_llm_response(response)
        return [game_state.hand[i] for i in indices]
```

## 🆚 Difference from `python_bot_player.py`

| Feature | python_bot_player.py | Bot SDK |
|---------|---------------------|---------|
| Purpose | Reference implementation | Easy customization |
| Code to write | Modify 500+ lines | Implement 1-3 methods |
| Learning curve | Understand WebSocket, game flow | Just strategy logic |
| Best for | Understanding internals | Building custom AI |
| Modify? | ❌ Keep as reference | ✅ Your custom code |

## 📖 Next Steps

1. **Experiment**: Try the pre-built strategies in `bot_strategies.py`
2. **Customize**: Modify an existing strategy to suit your style
3. **Create**: Build your own strategy from scratch
4. **Learn**: Study `python_bot_player.py` to understand internals
5. **Compete**: Test your bot against others!

## 🐛 Troubleshooting

**Bot won't connect**
- Check server is running (`npm run dev:server`)
- Verify SERVER_URL is correct
- Ensure room code exists (or use `is_host=True`)

**Bot doesn't play**
- Make sure you called `sdk.set_strategy()` before `sdk.run()`
- Check that `select_cards()` returns valid cards from `game_state.hand`
- Enable DEBUG logging to see detailed messages

**Strategy errors**
- Add try/except in your strategy methods
- Check that you're returning proper card dictionaries
- Ensure you're not trying to play more than 4 cards

## 📞 Support

- Check `PYTHON_BOT_GUIDE.md` for detailed reference implementation info
- Review `python_bot_player.py` to understand the full protocol
- See `bot_strategies.py` for more complex examples

Happy bot building! 🤖🎮
