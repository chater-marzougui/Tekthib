# AI Bot Training Guide for Tekthib

## Overview

You now have **two different AI approaches** for playing Tekthib:

1. **ML Bot** (Supervised Learning) - Learns from your historical game data
2. **RL Bot** (Reinforcement Learning) - Learns through self-play

---

## 1. ML Bot (Supervised Learning)

### 🧠 How It Works

**Core Concept**: Learn from winners' strategies in past games.

**Training Logic**:
1. **Data Collection**: Uses your 5,000 games from the database
2. **Feature Extraction**: Converts game states into numerical features
   - Hand composition (how many of each rank)
   - Pile size, current rank, last play count
   - Player position, remaining cards
3. **Label Creation**: Extracts what successful players did
   - How many cards they played when
   - When they challenged
4. **Model Training**: XGBoost learns patterns
   - "When pile is large + opponent played 4 cards → challenge"
   - "When I have 3 matching cards → play 2-3 of them"
5. **Prediction**: Applies learned patterns in new games

**Key Insight**: This bot mimics successful human players from your dataset.

### 📊 Data Preparation

#### Step 1: Export Database to CSV

From your Supabase database, export these tables:

```sql
-- Export game_history
COPY (SELECT * FROM game_history ORDER BY timestamp) 
TO '/path/game_history.csv' CSV HEADER;

-- Export game_participants
COPY (SELECT * FROM game_participants) 
TO '/path/game_participants.csv' CSV HEADER;

-- Export games
COPY (SELECT * FROM games) 
TO '/path/games.csv' CSV HEADER;
```

Or use Supabase dashboard: Go to Table Editor → Export → CSV

#### Step 2: Verify CSV Files

Your CSV files should contain:
- **game_history.csv**: All game events (CARDS_PLAYED, CHALLENGE, etc.)
- **game_participants.csv**: Player stats per game (who won/lost)
- **games.csv**: Game metadata (room codes, winners, duration)

### 🚀 Training the ML Bot

```python
from ml_bot_strategy import MLBotStrategy

# Create bot
bot = MLBotStrategy()

# Train from your CSVs
bot.train_from_csv(
    game_history_csv="game_history.csv",
    game_participants_csv="game_participants.csv",
    games_csv="games.csv",
    save_path="ml_bot_model.pkl"
)
```

**What happens during training**:
1. ✓ Loads ~5,000 games from CSVs
2. ✓ Extracts ~50,000+ training examples
3. ✓ Trains XGBoost models (card count + challenge predictor)
4. ✓ Evaluates accuracy on test set
5. ✓ Saves trained model to `ml_bot_model.pkl`

Training time: ~2-5 minutes on a laptop

### 🎮 Using the Trained ML Bot

```python
from tekthib_bot_sdk import TekthibBotSDK
from ml_bot_strategy import MLBotStrategy

# Load trained model
bot = MLBotStrategy(model_path="ml_bot_model.pkl")

# Create SDK with bot
sdk = TekthibBotSDK(
    server_url="ws://localhost:3001",
    room_code="ABC123",
    player_name="MLBot"
)

sdk.set_strategy(bot)
sdk.run()
```

### ✅ Advantages
- **Fast training**: Only need to train once
- **Data-efficient**: Learns from existing games
- **Predictable**: Behaves like successful players
- **No ongoing training**: Just load and play

### ❌ Limitations
- **Static**: Can't adapt to new strategies
- **Data-dependent**: Only as good as training data
- **No creativity**: Won't discover novel tactics

---

## 2. RL Bot (Reinforcement Learning)

### 🧠 How It Works

**Core Concept**: Learn by playing games and receiving rewards.

**Training Logic**:
1. **Start Random**: Bot plays randomly at first
2. **Take Actions**: Play cards, make challenges
3. **Receive Rewards**:
   - Win game → +1.0 reward
   - Lose game → -1.0 reward
4. **Learn**: Update neural network to maximize rewards
5. **Improve**: Gradually learns better strategies
6. **Repeat**: Play thousands of games

**Key Insight**: This bot discovers strategies through trial and error, like a human learning to play.

### 🏗️ Architecture

**Deep Q-Network (DQN)**:
- **Input**: 20 game state features
- **Hidden Layers**: 128 → 128 → 64 neurons
- **Output**: Q-values (expected rewards) for each action

**Two Networks**:
1. **Card Count Network**: Decides how many cards to play (1-4)
2. **Challenge Network**: Decides whether to challenge (yes/no)

**Training Algorithm**: Q-Learning
```
Q(state, action) = reward + γ * max(Q(next_state, all_actions))
```

### 🚀 Training the RL Bot

#### Phase 1: Exploration (Episodes 1-500)

Bot explores randomly to discover strategies:

```python
from rl_bot_strategy import RLBotStrategy

# Create bot in training mode
bot = RLBotStrategy(
    training_mode=True,
    epsilon=1.0  # 100% exploration
)

# Use in game...
# After each game, call:
# bot.update_with_reward(1.0 if won else -1.0)

# Save periodically
if episode % 100 == 0:
    bot.save_model(f"rl_bot_checkpoint_{episode}.pth")
```

#### Phase 2: Exploitation (Episodes 500+)

Bot uses learned strategies more often:

```python
# Reduce exploration
bot.epsilon = 0.1  # 10% exploration, 90% exploitation

# Continue training...
```

#### Phase 3: Pure Exploitation

Use the trained bot:

```python
# Load best checkpoint
bot = RLBotStrategy(
    model_path="rl_bot_checkpoint_1000.pth",
    training_mode=False,  # No more training
    epsilon=0.01  # Minimal exploration
)
```

### 🎮 Using the RL Bot

```python
from tekthib_bot_sdk import TekthibBotSDK
from rl_bot_strategy import RLBotStrategy

# Load trained model
bot = RLBotStrategy(
    model_path="rl_bot_checkpoint_1000.pth",
    training_mode=False
)

# Create SDK
sdk = TekthibBotSDK(
    server_url="ws://localhost:3001",
    room_code="ABC123",
    player_name="RLBot"
)

sdk.set_strategy(bot)
sdk.run()
```

### 📈 Training Progress

Monitor training with episode rewards:

```python
# After loading model
print(f"Episodes trained: {bot.episode_count}")
print(f"Average reward (last 100): {np.mean(bot.episode_rewards[-100:])}")

# Expected progression:
# Episodes 0-100:   Avg reward ~-0.5 (losing most games)
# Episodes 100-300: Avg reward ~-0.2 (improving)
# Episodes 300-500: Avg reward ~0.0 (50/50 win rate)
# Episodes 500+:    Avg reward ~+0.2 to +0.4 (winning often)
```

### ✅ Advantages
- **Adaptive**: Continues learning from experience
- **Creative**: Can discover novel strategies
- **Self-improving**: Gets better over time
- **No human data needed**: Learns from scratch

### ❌ Limitations
- **Slow training**: Needs 1000+ games
- **Computationally expensive**: Neural network training
- **Unstable early**: Performs poorly at first
- **Requires GPU**: Much faster with GPU (optional)

---

## 🆚 Comparison

| Feature | ML Bot | RL Bot |
|---------|--------|--------|
| **Training Time** | 2-5 minutes | Hours/days |
| **Training Data** | Needs CSV files | Self-play only |
| **Games Needed** | 5,000 (historical) | 1,000+ (new) |
| **Performance** | Good immediately | Bad → Good |
| **Adaptability** | Static | Continuous |
| **Creativity** | Low | High |
| **Hardware** | CPU fine | GPU preferred |

---

## 📋 Quick Start Guide

### For ML Bot (Recommended First)

```bash
# 1. Export database to CSVs
# (use Supabase dashboard or psql)

# 2. Install dependencies
pip install xgboost pandas numpy scikit-learn joblib

# 3. Train model
python ml_bot_strategy.py

# 4. Use in game
python -c "
from tekthib_bot_sdk import TekthibBotSDK
from ml_bot_strategy import MLBotStrategy

bot = MLBotStrategy('ml_bot_model.pkl')
sdk = TekthibBotSDK('ws://localhost:3001', 'ABC123', 'MLBot')
sdk.set_strategy(bot)
sdk.run()
"
```

### For RL Bot (Longer Process)

```bash
# 1. Install dependencies
pip install torch numpy

# 2. Create training script
python -c "
from tekthib_bot_sdk import TekthibBotSDK
from rl_bot_strategy import RLBotStrategy

bot = RLBotStrategy(training_mode=True, epsilon=1.0)

# Run many games with bot
# Call bot.update_with_reward() after each game
# Save every 100 episodes
"

# 3. Train for 1000+ episodes

# 4. Use best model
python -c "
from tekthib_bot_sdk import TekthibBotSDK
from rl_bot_strategy import RLBotStrategy

bot = RLBotStrategy('rl_bot_checkpoint_1000.pth', training_mode=False)
sdk = TekthibBotSDK('ws://localhost:3001', 'ABC123', 'RLBot')
sdk.set_strategy(bot)
sdk.run()
"
```

---

## 🎯 Recommendations

### Start with ML Bot if:
- ✓ You have quality historical data
- ✓ You want quick results
- ✓ You need predictable behavior
- ✓ You have limited computing resources

### Use RL Bot if:
- ✓ You want cutting-edge AI
- ✓ You have time for training
- ✓ You want adaptive behavior
- ✓ You have GPU available
- ✓ You want the bot to discover new strategies

### Best Approach:
1. **Train ML bot first** - Get good baseline quickly
2. **Train RL bot** - Let it improve over time
3. **Compare both** - Use whichever performs better
4. **Ensemble** - Combine both (advanced)

---

## 🔧 Troubleshooting

### ML Bot Issues

**Problem**: Low accuracy (~50%)
- Check if CSV data is clean
- Ensure games have winner information
- Need more diverse training data

**Problem**: Bot plays too conservatively
- Winners in dataset might be conservative
- Try training on aggressive players only

### RL Bot Issues

**Problem**: Bot never improves
- Train longer (need 500+ episodes minimum)
- Check if rewards are being assigned
- Reduce epsilon more slowly

**Problem**: Bot gets worse over time
- Save checkpoints every 100 episodes
- Use best checkpoint, not latest
- Reduce learning rate

---

## 📚 Further Reading

**ML Concepts**:
- Supervised Learning
- XGBoost algorithm
- Feature engineering
- Train/test split

**RL Concepts**:
- Q-Learning
- Deep Q-Networks (DQN)
- Epsilon-greedy exploration
- Experience replay
- Reward shaping

**Next Steps**:
- Try ensemble methods (combine both bots)
- Add card counting features to ML bot
- Implement opponent modeling in RL bot
- Use curiosity-driven exploration in RL

---

## ✨ Summary

You now have two powerful AI approaches:

- **ML Bot**: Fast, reliable, learns from history
- **RL Bot**: Adaptive, creative, learns from experience

Both can be competitive Tekthib players! Choose based on your needs and resources.

Happy training! 🤖🎮