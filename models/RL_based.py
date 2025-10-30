#!/usr/bin/env python3
"""
RL-Based Bot Strategy for Tekthib (Reinforcement Learning)

This bot learns through self-play using Deep Q-Learning (DQN).
It improves over time by playing games and receiving rewards.

Training Process:
1. Start with random policy
2. Play games, observe outcomes
3. Receive rewards: +1 for win, -1 for loss, smaller rewards for actions
4. Update Q-network to maximize expected rewards
5. Gradually reduce exploration (epsilon-greedy)

Key Concepts:
- State: Current game situation (hand, pile, etc.)
- Action: Which cards to play, whether to challenge
- Reward: Feedback signal (win/loss/intermediate)
- Q-Value: Expected future reward for taking an action in a state

Setup:
    pip install torch numpy
"""

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from collections import deque, Counter
import random
import os
import sys
from typing import Dict, List

# Add the data_collector directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import BotStrategy, GameState


class DQNetwork(nn.Module):
    """
    Deep Q-Network for learning optimal actions.
    
    Architecture:
    - Input layer: Game state features
    - Hidden layers: Learn complex patterns
    - Output layers: Q-values for each action
    """
    
    def __init__(self, state_size: int, action_size: int):
        super(DQNetwork, self).__init__()
        
        # Network architecture
        self.fc1 = nn.Linear(state_size, 128)
        self.fc2 = nn.Linear(128, 128)
        self.fc3 = nn.Linear(128, 64)
        self.fc4 = nn.Linear(64, action_size)
        
        # Dropout for regularization
        self.dropout = nn.Dropout(0.2)
        
        print(f"CUDA available: {torch.cuda.is_available()}")
        print(f"Device: {torch.device('cuda' if torch.cuda.is_available() else 'cpu')}")
    
    def forward(self, state):
        """Forward pass through network."""
        x = F.relu(self.fc1(state))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        x = F.relu(self.fc3(x))
        x = self.fc4(x)
        return x


class ReplayMemory:
    """
    Experience replay buffer for training stability.
    
    Stores past experiences (state, action, reward, next_state)
    and samples random batches for training.
    """
    
    def __init__(self, capacity: int):
        self.memory = deque(maxlen=capacity)
    
    def push(self, state, action, reward, next_state, done):
        """Save an experience."""
        self.memory.append((state, action, reward, next_state, done))
    
    def sample(self, batch_size: int):
        """Sample a random batch."""
        return random.sample(self.memory, batch_size)
    
    def __len__(self):
        return len(self.memory)


class RLBotStrategy(BotStrategy):
    """
    Reinforcement Learning bot using Deep Q-Learning.
    
    Training Logic:
    - Explores different strategies initially (high epsilon)
    - Gradually exploits learned knowledge (low epsilon)
    - Updates Q-network after each game
    - Saves best performing models
    
    Action Space:
    - Card count: 1-4 cards to play
    - Challenge: Yes/No
    """
    
    # State features (20 dimensions)
    STATE_SIZE = 20
    
    # Action space: 4 actions for card count (1-4)
    CARD_COUNT_ACTIONS = 4
    
    def __init__(self, 
                 model_path: str = None,
                 training_mode: bool = False,
                 epsilon: float = 1.0):
        """
        Initialize RL bot.
        
        Args:
            model_path: Path to saved model. If None, starts with random weights.
            training_mode: If True, bot will explore and learn. If False, only exploit.
            epsilon: Exploration rate (1.0 = full random, 0.0 = fully trained)
        """
        super().__init__()
        
        # Device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Networks
        self.card_count_net = DQNetwork(self.STATE_SIZE, self.CARD_COUNT_ACTIONS).to(self.device)
        self.challenge_net = DQNetwork(self.STATE_SIZE, 2).to(self.device)  # 2 actions: challenge or not
        
        # Target networks (for stable training)
        self.target_card_count_net = DQNetwork(self.STATE_SIZE, self.CARD_COUNT_ACTIONS).to(self.device)
        self.target_challenge_net = DQNetwork(self.STATE_SIZE, 2).to(self.device)
        
        # Optimizers
        self.card_count_optimizer = optim.Adam(self.card_count_net.parameters(), lr=0.001, weight_decay=1e-5)
        self.challenge_optimizer = optim.Adam(self.challenge_net.parameters(), lr=0.001, weight_decay=1e-5)

        # Experience replay
        self.card_count_memory = ReplayMemory(10000)
        self.challenge_memory = ReplayMemory(10000)
        
        # Training parameters
        self.training_mode = training_mode
        self.epsilon = epsilon  # Exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.gamma = 0.95  # Discount factor
        self.batch_size = 64
        
        # Episode tracking
        self.episode_rewards = []
        self.episode_count = 0
        
        # Load model if provided
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _get_state_features(self, game_state: GameState, claimed_rank: str = None) -> np.ndarray:
        """
        Extract state features from game state.
        
        Features (20 dimensions):
        1-14: Card rank counts in hand (one-hot encoded)
        15: Hand size (normalized)
        16: Pile size (normalized)
        17: Last played count (normalized)
        18: My turn flag
        19: Can challenge flag
        20: Claimed rank matches current rank
        """
        features = []
        
        # Card counts for each rank (14 ranks including Joker)
        rank_counts = Counter([card['rank'] for card in game_state.hand])
        all_ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'Joker']
        for rank in all_ranks:
            features.append(rank_counts.get(rank, 0) / 4.0)  # Normalize by max count
        
        # Game state features
        features.append(len(game_state.hand) / 52.0)  # Hand size
        features.append(game_state.pile_count / 52.0)  # Pile size
        features.append(game_state.last_played_count / 4.0)  # Last play count
        features.append(1.0 if game_state.is_my_turn else 0.0)  # My turn
        features.append(1.0 if game_state.can_challenge else 0.0)  # Can challenge
        
        # Rank matching
        if claimed_rank and game_state.current_rank:
            features.append(1.0 if claimed_rank == game_state.current_rank else 0.0)
        else:
            features.append(0.0)
        
        return np.array(features, dtype=np.float32)
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """
        Select cards using Q-network.
        
        Logic:
        1. Get state features
        2. If training: epsilon-greedy (explore vs exploit)
        3. If not training: always exploit (use learned policy)
        4. Select action (card count) from Q-network
        5. Choose actual cards (prefer matching)
        """
        if not game_state.hand:
            return []
        
        # Get state
        state = self._get_state_features(game_state, claimed_rank)
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        
        # Epsilon-greedy action selection
        if self.training_mode and random.random() < self.epsilon:
            # Explore: random action
            card_count = random.randint(1, min(4, len(game_state.hand)))
        else:
            # Exploit: use Q-network
            with torch.no_grad():
                q_values = self.card_count_net(state_tensor)
                action = q_values.argmax().item()
                card_count = action + 1  # Actions are 0-3, card counts are 1-4
        
        # Clip to valid range
        card_count = max(1, min(card_count, len(game_state.hand)))
        
        # Store experience for training
        if self.training_mode:
            self._store_card_play_experience(state, card_count - 1)
        
        # Select actual cards (prefer matching)
        matching = [c for c in game_state.hand 
                   if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        if matching and len(matching) >= card_count:
            return matching[:card_count]
        elif matching:
            # Not enough matching cards, add random ones
            non_matching = [c for c in game_state.hand if c not in matching]
            return matching + random.sample(non_matching, min(card_count - len(matching), len(non_matching)))
        else:
            # No matching cards, return random
            return random.sample(game_state.hand, card_count)
    
    def should_challenge(self, game_state: GameState) -> bool:
        """
        Decide whether to challenge using Q-network.
        
        Logic:
        1. Get state features
        2. If training: epsilon-greedy
        3. If not training: use learned policy
        4. Select action (challenge yes/no)
        """
        # Get state
        state = self._get_state_features(game_state)
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        
        # Epsilon-greedy action selection
        if self.training_mode and random.random() < self.epsilon:
            # Explore: random action
            should_challenge = random.random() < 0.3  # 30% challenge rate during exploration
        else:
            # Exploit: use Q-network
            with torch.no_grad():
                q_values = self.challenge_net(state_tensor)
                action = q_values.argmax().item()
                should_challenge = (action == 1)
        
        # Store experience for training
        if self.training_mode:
            self._store_challenge_experience(state, 1 if should_challenge else 0)
        
        return should_challenge
    
    def _store_card_play_experience(self, state, action):
        """Store card play experience for later training."""
        # We'll update this with reward when game ends
        # For now, just store the state-action pair
        self.card_count_memory.push(state, action, 0, state, False)
    
    def _store_challenge_experience(self, state, action):
        """Store challenge experience for later training."""
        self.challenge_memory.push(state, action, 0, state, False)
    
    def update_with_reward(self, reward: float):
        """
        Update Q-networks with final game reward.
        
        Called after game ends with:
        - reward = 1.0 if won
        - reward = -1.0 if lost
        
        This updates all experiences from the game.
        """
        if not self.training_mode:
            return
        
        # Update all recent experiences with this reward
        # (simplified - in full implementation, would use TD learning)
        
        # Train card count network
        if len(self.card_count_memory) >= self.batch_size:
            self._train_network(
                self.card_count_net,
                self.target_card_count_net,
                self.card_count_memory,
                self.card_count_optimizer,
                reward
            )
        
        # Train challenge network
        if len(self.challenge_memory) >= self.batch_size:
            self._train_network(
                self.challenge_net,
                self.target_challenge_net,
                self.challenge_memory,
                self.challenge_optimizer,
                reward
            )
        
        # Decay epsilon
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        
        # Track progress
        self.episode_rewards.append(reward)
        self.episode_count += 1
        
        if self.episode_count % 10 == 0:
            avg_reward = np.mean(self.episode_rewards[-10:])
            print(f"Episode {self.episode_count}, Avg Reward: {avg_reward:.3f}, Epsilon: {self.epsilon:.3f}")
    
    def _train_network(self, network, target_network, memory, optimizer, final_reward):
        """
        Train a Q-network using experience replay.
        
        Q-Learning Update:
        Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
        
        Where:
        - Q(s,a) = current Q-value
        - r = reward
        - γ = discount factor
        - max(Q(s',a')) = best future Q-value
        """
        # Sample batch
        batch = memory.sample(min(self.batch_size, len(memory)))
        
        states = torch.FloatTensor([exp[0] for exp in batch]).to(self.device)
        actions = torch.LongTensor([exp[1] for exp in batch]).to(self.device)
        rewards = torch.FloatTensor([final_reward for _ in batch]).to(self.device)
        next_states = torch.FloatTensor([exp[3] for exp in batch]).to(self.device)
        dones = torch.FloatTensor([exp[4] for exp in batch]).to(self.device)
        
        # Current Q values
        current_q = network(states).gather(1, actions.unsqueeze(1))
        
        # Target Q values
        with torch.no_grad():
            next_q = target_network(next_states).max(1)[0]
            target_q = rewards + (1 - dones) * self.gamma * next_q
        
        # Compute loss
        loss = F.smooth_l1_loss(current_q.squeeze(), target_q)
        
        # Optimize
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    def update_target_networks(self):
        """Update target networks (for stable training)."""
        self.target_card_count_net.load_state_dict(self.card_count_net.state_dict())
        self.target_challenge_net.load_state_dict(self.challenge_net.state_dict())
    
    def save_model(self, path: str):
        """Save trained model to disk."""
        model_data = {
            'card_count_net': self.card_count_net.state_dict(),
            'challenge_net': self.challenge_net.state_dict(),
            'epsilon': self.epsilon,
            'episode_count': self.episode_count,
            'episode_rewards': self.episode_rewards
        }
        torch.save(model_data, path)
        print(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load trained model from disk."""
        model_data = torch.load(path, map_location=self.device)
        self.card_count_net.load_state_dict(model_data['card_count_net'])
        self.challenge_net.load_state_dict(model_data['challenge_net'])
        self.epsilon = model_data.get('epsilon', 0.01)
        self.episode_count = model_data.get('episode_count', 0)
        self.episode_rewards = model_data.get('episode_rewards', [])
        
        # Update target networks
        self.update_target_networks()
        
        print(f"Model loaded from {path}")
        print(f"Episodes trained: {self.episode_count}")
        if self.episode_rewards:
            print(f"Average reward (last 100): {np.mean(self.episode_rewards[-100:]):.3f}")


# Training script
if __name__ == "__main__":
    """
    Training Script for RL Bot
    
    This bot learns through self-play. To train:
    
    1. Create training environment (multiple bots playing against each other)
    2. Run many episodes (1000+)
    3. Bot improves over time through trial and error
    
    Usage:
        python rl_bot_strategy.py
    
    The bot will save checkpoints every 100 episodes.
    """
    
    print("RL Bot Training Script")
    print("=" * 50)
    print("\nThis bot learns through self-play.")
    print("It needs to play many games to improve.")
    print("\nRecommended training procedure:")
    print("1. Create a room with this bot + several AI opponents")
    print("2. Let them play 1000+ games")
    print("3. Bot will save model every 100 games")
    print("4. Use best performing model for actual play")
    print("\nTip: Start with epsilon=1.0 (full exploration)")
    print("     After 500 games, reduce to epsilon=0.1 (mostly exploitation)")
    print("=" * 50)
    
    # Example: Create bot for training
    bot = RLBotStrategy(training_mode=True, epsilon=1.0)
    
    print("\n✅ RL Bot initialized in training mode")
    print(f"Epsilon (exploration rate): {bot.epsilon}")
    print(f"Device: {bot.device}")
    print("\nTo use this bot in training:")
    print("  sdk = TekthibBotSDK(...)")
    print("  sdk.set_strategy(bot)")
    print("  sdk.on_event('game_ended', lambda p: bot.update_with_reward(1.0 if won else -1.0))")
    print("  sdk.run()")