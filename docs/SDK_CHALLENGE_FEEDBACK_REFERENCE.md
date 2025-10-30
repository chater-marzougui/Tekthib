# SDK Challenge Feedback Reference

Quick reference guide for using the enhanced challenge feedback system in the Tekthib Bot SDK.

---

## ChallengeResult Class

### Properties

```python
class ChallengeResult:
    # Player identifiers
    challenger_id: str              # ID of player who challenged
    challenger_name: str            # Name of challenger
    challenged_player_id: str       # ID of player who was challenged
    challenged_player_name: str     # Name of challenged player
    
    # Challenge outcome
    was_lying: bool                 # True = challenged player was bluffing
                                    # False = challenged player was truthful
    
    # Cards revealed
    revealed_cards: List[Dict]      # Full list of revealed card objects
    cards_revealed_count: int       # Number of cards in pile
    
    # Bot-specific flags (auto-populated by SDK)
    i_won: bool                     # Did bot win the challenge?
    i_lost: bool                    # Did bot lose the challenge?
    i_was_challenger: bool          # Was bot the challenger?
    i_was_challenged: bool          # Was bot challenged?
```

### Understanding i_won and i_lost

The SDK automatically determines win/loss based on the challenge logic:

**Bot wins if:**
- Bot challenged AND opponent was lying (was_lying = True)
- Bot was challenged AND bot was truthful (was_lying = False)

**Bot loses if:**
- Bot challenged AND opponent was truthful (was_lying = False)
- Bot was challenged AND bot was lying (was_lying = True)

---

## Using Challenge Feedback

### Basic Implementation

```python
from data_collector.tekthib_bot_sdk import BotStrategy, GameState, ChallengeResult

class MyBot(BotStrategy):
    def on_challenge_result(self, challenge_result: ChallengeResult, game_state: GameState):
        """Called whenever a challenge occurs in the game."""
        
        # Check if bot was involved
        if challenge_result.i_was_challenger:
            if challenge_result.i_won:
                print(f"✅ I successfully challenged {challenge_result.challenged_player_name}!")
                print(f"   They were lying. {challenge_result.cards_revealed_count} cards revealed.")
            else:
                print(f"❌ My challenge failed against {challenge_result.challenged_player_name}.")
                print(f"   They were truthful. I take {challenge_result.cards_revealed_count} cards.")
        
        elif challenge_result.i_was_challenged:
            if challenge_result.i_won:
                print(f"✅ I defended against {challenge_result.challenger_name}'s challenge!")
                print(f"   I was truthful. They take {challenge_result.cards_revealed_count} cards.")
            else:
                print(f"❌ I was caught bluffing by {challenge_result.challenger_name}!")
                print(f"   I take {challenge_result.cards_revealed_count} cards.")
        
        else:
            # Other players challenging each other
            if challenge_result.was_lying:
                print(f"📢 {challenge_result.challenger_name} caught {challenge_result.challenged_player_name} bluffing!")
            else:
                print(f"📢 {challenge_result.challenger_name} failed to challenge {challenge_result.challenged_player_name}.")
```

---

## Example Use Cases

### 1. Learning Bot - Track Success Rate

```python
class LearningBot(BotStrategy):
    def __init__(self):
        super().__init__()
        self.challenge_stats = {
            'total': 0,
            'won': 0,
            'challenged_others': 0,
            'successful_challenges': 0
        }
    
    def on_challenge_result(self, challenge_result, game_state):
        if challenge_result.i_was_challenger or challenge_result.i_was_challenged:
            self.challenge_stats['total'] += 1
            if challenge_result.i_won:
                self.challenge_stats['won'] += 1
            
            if challenge_result.i_was_challenger:
                self.challenge_stats['challenged_others'] += 1
                if challenge_result.i_won:
                    self.challenge_stats['successful_challenges'] += 1
    
    def should_challenge(self, game_state):
        # Use success rate to adjust challenge probability
        success_rate = self.challenge_stats['successful_challenges'] / max(1, self.challenge_stats['challenged_others'])
        
        if success_rate > 0.7:
            # Doing well, challenge more
            return game_state.pile_count > 5
        else:
            # Not doing well, be conservative
            return game_state.pile_count > 15
```

### 2. Adaptive Bot - Learn from Opponents

```python
class AdaptiveBot(BotStrategy):
    def __init__(self):
        super().__init__()
        self.opponent_bluff_rates = {}  # player_id -> (bluffs, total)
    
    def on_challenge_result(self, challenge_result, game_state):
        # Track opponent bluffing patterns
        player_id = challenge_result.challenged_player_id
        
        if player_id not in self.opponent_bluff_rates:
            self.opponent_bluff_rates[player_id] = {'bluffs': 0, 'total': 0}
        
        self.opponent_bluff_rates[player_id]['total'] += 1
        if challenge_result.was_lying:
            self.opponent_bluff_rates[player_id]['bluffs'] += 1
    
    def should_challenge(self, game_state):
        # Challenge aggressive bluffers more
        last_player = game_state.last_player_id
        if last_player in self.opponent_bluff_rates:
            stats = self.opponent_bluff_rates[last_player]
            bluff_rate = stats['bluffs'] / max(1, stats['total'])
            
            if bluff_rate > 0.6:
                # This player bluffs a lot - challenge more
                return game_state.pile_count > 5 or game_state.last_played_count >= 3
        
        # Default logic
        return game_state.pile_count > 10
```

### 3. Reinforcement Learning Bot

```python
class RLBot(BotStrategy):
    def __init__(self):
        super().__init__()
        self.replay_buffer = []
        self.last_challenge_state = None
    
    def should_challenge(self, game_state):
        # Store state before challenge decision
        self.last_challenge_state = self._get_state_features(game_state)
        
        # Make decision (your logic here)
        decision = self._predict_challenge(self.last_challenge_state)
        return decision
    
    def on_challenge_result(self, challenge_result, game_state):
        if self.last_challenge_state is None:
            return
        
        # Calculate reward
        if challenge_result.i_was_challenger or challenge_result.i_was_challenged:
            reward = 1.0 if challenge_result.i_won else -1.0
            
            # Store experience
            next_state = self._get_state_features(game_state)
            self.replay_buffer.append({
                'state': self.last_challenge_state,
                'action': 'challenge' if challenge_result.i_was_challenger else 'defend',
                'reward': reward,
                'next_state': next_state
            })
            
            # Train on this experience
            self._train_on_experience()
        
        self.last_challenge_state = None
```

---

## GameState Updates After Challenge

After a challenge, the `game_state` parameter reflects the updated state:

```python
def on_challenge_result(self, challenge_result, game_state):
    # Game state is updated:
    # - pile_count = 0 (pile cleared)
    # - current_rank = None (new round starting)
    # - hand updated for involved players
    # - player order may change
    
    print(f"Pile is now: {game_state.pile_count}")  # Will be 0
    print(f"Players remaining: {len([p for p in game_state.players if p['id'] not in game_state.winners])}")
```

---

## Logging Examples

### Basic Logging

```python
def on_challenge_result(self, challenge_result, game_state):
    msg = f"Challenge: {challenge_result.challenger_name} vs {challenge_result.challenged_player_name}"
    msg += f" | Lying: {challenge_result.was_lying}"
    msg += f" | Cards: {challenge_result.cards_revealed_count}"
    
    if challenge_result.i_was_challenger or challenge_result.i_was_challenged:
        msg += f" | I {'WON' if challenge_result.i_won else 'LOST'}"
    
    print(msg)
```

### Detailed Logging

```python
def on_challenge_result(self, challenge_result, game_state):
    print("=" * 50)
    print("CHALLENGE RESULT")
    print(f"Challenger: {challenge_result.challenger_name} ({challenge_result.challenger_id})")
    print(f"Challenged: {challenge_result.challenged_player_name} ({challenge_result.challenged_player_id})")
    print(f"Was lying: {challenge_result.was_lying}")
    print(f"Cards revealed: {challenge_result.cards_revealed_count}")
    
    if challenge_result.revealed_cards:
        print("Revealed cards:")
        for card in challenge_result.revealed_cards[:5]:  # Show first 5
            print(f"  - {card['rank']} of {card['suit']}")
        if len(challenge_result.revealed_cards) > 5:
            print(f"  ... and {len(challenge_result.revealed_cards) - 5} more")
    
    if challenge_result.i_was_challenger:
        print(f">>> I CHALLENGED and {'WON ✅' if challenge_result.i_won else 'LOST ❌'}")
    elif challenge_result.i_was_challenged:
        print(f">>> I WAS CHALLENGED and {'WON ✅' if challenge_result.i_won else 'LOST ❌'}")
    
    print("=" * 50)
```

---

## Common Patterns

### Pattern 1: Risk Assessment

```python
def assess_challenge_risk(self, challenge_result, game_state):
    """Calculate risk metrics for future decisions."""
    risk_score = 0.0
    
    # Large piles are riskier to challenge incorrectly
    if challenge_result.cards_revealed_count > 15:
        risk_score += 0.5
    
    # Losing challenges is costly
    if challenge_result.i_lost:
        risk_score += 0.3
    
    return risk_score
```

### Pattern 2: Reward Shaping

```python
def calculate_reward(self, challenge_result):
    """Calculate reward for RL training."""
    if not (challenge_result.i_was_challenger or challenge_result.i_was_challenged):
        return 0.0
    
    # Base reward
    reward = 1.0 if challenge_result.i_won else -1.0
    
    # Scale by pile size (bigger piles = bigger impact)
    pile_factor = min(2.0, challenge_result.cards_revealed_count / 10.0)
    reward *= pile_factor
    
    return reward
```

### Pattern 3: Feature Extraction

```python
def extract_challenge_features(self, challenge_result, game_state):
    """Extract features for ML model."""
    return {
        'pile_size': challenge_result.cards_revealed_count,
        'was_lying': challenge_result.was_lying,
        'last_played_count': game_state.last_played_count,
        'my_hand_size': len(game_state.hand),
        'outcome': 'won' if challenge_result.i_won else 'lost'
    }
```

---

## Testing Your Implementation

```python
def test_challenge_callback():
    """Test challenge result handling."""
    from data_collector.tekthib_bot_sdk import ChallengeResult, GameState
    
    # Create mock challenge result
    result = ChallengeResult({
        'challengerId': 'bot_123',
        'challengerName': 'MyBot',
        'playerId': 'player_456',
        'playerName': 'Opponent',
        'wasLying': True,
        'revealedCards': [{'rank': '5', 'suit': 'hearts'}] * 10
    })
    
    # Simulate bot was challenger
    result.i_was_challenger = True
    result.i_was_challenged = False
    result.i_won = result.was_lying  # Bot won because opponent lied
    result.i_lost = not result.i_won
    
    # Test your bot
    bot = MyBot()
    game_state = GameState()
    bot.on_challenge_result(result, game_state)
    
    print("Test passed!")

if __name__ == "__main__":
    test_challenge_callback()
```

---

## Best Practices

1. **Always Check Involvement**
   ```python
   if challenge_result.i_was_challenger or challenge_result.i_was_challenged:
       # Bot was directly involved
       pass
   ```

2. **Handle Edge Cases**
   ```python
   if challenge_result.revealed_cards:
       # Process cards
       pass
   else:
       # Handle missing data
       pass
   ```

3. **Don't Block**
   ```python
   # ❌ Don't do heavy computation
   def on_challenge_result(self, challenge_result, game_state):
       self.train_neural_network()  # Too slow!
   
   # ✅ Store for later processing
   def on_challenge_result(self, challenge_result, game_state):
       self.challenge_history.append(challenge_result)
   ```

4. **Use Logging Wisely**
   ```python
   # Add verbosity control
   def on_challenge_result(self, challenge_result, game_state):
       if self.verbose:
           print(f"Challenge result: ...")
   ```

---

## Debugging

### Enable SDK Debug Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)

sdk = TekthibBotSDK(...)
sdk.run()
```

### Check Callback is Called

```python
def on_challenge_result(self, challenge_result, game_state):
    print("✓ on_challenge_result called!")
    # Your logic here
```

### Verify Result Data

```python
def on_challenge_result(self, challenge_result, game_state):
    assert challenge_result.challenger_id is not None
    assert challenge_result.challenged_player_id is not None
    assert isinstance(challenge_result.was_lying, bool)
    print("✓ Data validation passed")
```

---

## See Also

- `ENHANCED_ML_RL_TRAINING.md` - Full guide to enhanced training
- `Training_guide.md` - Original training documentation
- `PYTHON_BOT_GUIDE.md` - Bot development guide
- `tekthib_bot_sdk.py` - SDK implementation

---

For questions or issues with challenge feedback, check the SDK logs or inspect the `ChallengeResult` object properties.
