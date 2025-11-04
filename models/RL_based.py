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
    
    Enhanced Architecture:
    - Input layer: Game state features (25 dimensions)
    - Hidden layers: Learn complex patterns with deeper network
    - Output layers: Q-values for each action
    - Batch normalization for stable training
    """
    
    def __init__(self, state_size: int, action_size: int):
        super(DQNetwork, self).__init__()
        
        # Enhanced network architecture with more capacity
        self.fc1 = nn.Linear(state_size, 256)
        self.bn1 = nn.BatchNorm1d(256)
        self.fc2 = nn.Linear(256, 256)
        self.bn2 = nn.BatchNorm1d(256)
        self.fc3 = nn.Linear(256, 128)
        self.bn3 = nn.BatchNorm1d(128)
        self.fc4 = nn.Linear(128, 64)
        self.fc5 = nn.Linear(64, action_size)
        
        # Dropout for regularization
        self.dropout = nn.Dropout(0.2)
    
    def forward(self, state):
        """Forward pass through network."""
        # Handle single sample case for batch norm
        if state.size(0) == 1:
            # Use eval mode for batch norm when batch size is 1
            self.bn1.eval()
            self.bn2.eval()
            self.bn3.eval()
        
        x = F.relu(self.bn1(self.fc1(state)))
        x = self.dropout(x)
        x = F.relu(self.bn2(self.fc2(x)))
        x = self.dropout(x)
        x = F.relu(self.bn3(self.fc3(x)))
        x = F.relu(self.fc4(x))
        x = self.fc5(x)
        
        # Restore training mode if needed
        if state.size(0) == 1 and self.training:
            self.bn1.train()
            self.bn2.train()
            self.bn3.train()
        
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
    - Card count: 1-56 cards to play (regression)
    - Challenge: Yes/No
    """
    
    # Enhanced state features (25 dimensions for better learning)
    STATE_SIZE = 25
    
    # Action space: 1 output for card count (regression)
    CARD_COUNT_ACTIONS = 1
    
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
        
        # Challenge tracking for better learning
        self.last_challenge_state = None
        self.last_challenge_action = None
        self.challenge_outcomes = {
            'won': 0,
            'lost': 0,
            'success_rate': 0.0
        }
        
        # Load model if provided
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _get_state_features(self, game_state: GameState, claimed_rank: str = None) -> np.ndarray:
        """
        Extract state features from game state.
        
        Enhanced features (25 dimensions):
        1-14: Card rank counts in hand (normalized)
        15: Hand size (normalized)
        16: Pile size (normalized)
        17: Last played count (normalized)
        18: My turn flag
        19: Can challenge flag
        20: Claimed rank matches current rank
        21: Number of players remaining
        22: Pile size is large (>15)
        23: Last play was suspicious (>=3 cards)
        24: Hand is small (<10 cards)
        25: Challenge success rate (learned)
        """
        features = []
        
        # Card counts for each rank (14 ranks including Joker)
        rank_counts = Counter([card['rank'] for card in game_state.hand])
        all_ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'Joker']
        for rank in all_ranks:
            features.append(rank_counts.get(rank, 0) / 8.0)  # Normalize by max count (2 decks)
        
        # Game state features
        hand_size = len(game_state.hand)
        pile_count = game_state.pile_count
        last_played = game_state.last_played_count
        
        features.append(hand_size / 108.0)  # Hand size (2 decks)
        features.append(pile_count / 108.0)  # Pile size (2 decks)
        features.append(last_played / 56.0)  # Last play count (max possible)
        features.append(1.0 if game_state.is_my_turn else 0.0)  # My turn
        features.append(1.0 if game_state.can_challenge else 0.0)  # Can challenge
        
        # Rank matching
        if claimed_rank and game_state.current_rank:
            features.append(1.0 if claimed_rank == game_state.current_rank else 0.0)
        else:
            features.append(0.0)
        
        # Enhanced contextual features
        num_players = len(game_state.players) if game_state.players else 4
        features.append(num_players / 10.0)  # Number of players
        features.append(1.0 if pile_count > 15 else 0.0)  # Large pile
        features.append(1.0 if last_played >= 5 else 0.0)  # Suspicious play
        features.append(1.0 if hand_size < 10 else 0.0)  # Small hand
        features.append(self.challenge_outcomes['success_rate'])  # Learned challenge success
        
        return np.array(features, dtype=np.float32)
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """
        Select cards using Q-network (regression).
        
        Logic:
        1. Get state features
        2. If training: epsilon-greedy (explore vs exploit)
        3. If not training: always exploit (use learned policy)
        4. Predict card count from Q-network (continuous value)
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
            card_count = random.randint(1, len(game_state.hand))
        else:
            # Exploit: use Q-network (regression output)
            was_training = self.card_count_net.training
            self.card_count_net.eval()  # Set to eval mode for inference
            with torch.no_grad():
                predicted_count = self.card_count_net(state_tensor).item()
                card_count = round(predicted_count)
            if was_training:
                self.card_count_net.train()  # Restore training mode
        
        # Clip to valid range
        card_count = max(1, min(card_count, len(game_state.hand)))
        
        # Store experience for training
        if self.training_mode:
            self._store_card_play_experience(state, card_count)
        
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
            was_training = self.challenge_net.training
            self.challenge_net.eval()  # Set to eval mode for inference
            with torch.no_grad():
                q_values = self.challenge_net(state_tensor)
                should_challenge = q_values.argmax().item() == 1
            if was_training:
                self.challenge_net.train()  # Restore training mode
        
        # Store experience for training
        if self.training_mode:
            self.last_challenge_state = state
            self.last_challenge_action = 1 if should_challenge else 0
            self._store_challenge_experience(state, self.last_challenge_action)
        
        return should_challenge
    
    def on_challenge_result(self, challenge_result, game_state: GameState):
        """
        Called when challenge result is received.
        Provides immediate reward signal for challenge decisions.
        
        Args:
            challenge_result: ChallengeResult object with detailed outcome
            game_state: Current game state after challenge
        """
        if not self.training_mode:
            return
        
        # Calculate immediate reward for challenge
        immediate_reward = 0.0
        
        if challenge_result.i_was_challenger or challenge_result.i_was_challenged:
            if challenge_result.i_won:
                # Successfully challenged or defended
                immediate_reward = 0.5
                self.challenge_outcomes['won'] += 1
            else:
                # Failed challenge or caught bluffing
                immediate_reward = -0.5
                self.challenge_outcomes['lost'] += 1
            
            # Update success rate
            total = self.challenge_outcomes['won'] + self.challenge_outcomes['lost']
            self.challenge_outcomes['success_rate'] = self.challenge_outcomes['won'] / total if total > 0 else 0.0
            
            # Store refined challenge experience with immediate reward
            if self.last_challenge_state is not None and self.last_challenge_action is not None:
                next_state = self._get_state_features(game_state)
                self.challenge_memory.push(
                    self.last_challenge_state,
                    self.last_challenge_action,
                    immediate_reward,
                    next_state,
                    False  # Not done yet
                )
                
                # Train on this experience immediately for faster learning
                if len(self.challenge_memory) >= self.batch_size:
                    self._train_challenge_network()
    
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
        
        self._perform_training_update(reward)
    
    def _perform_training_update(self, reward: float):
        """Internal method to perform training update (called within lock if parallel)."""
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
            challenge_rate = self.challenge_outcomes['success_rate']
            print(f"Episode {self.episode_count}, Avg Reward: {avg_reward:.3f}, Epsilon: {self.epsilon:.3f}, Challenge Success: {challenge_rate:.1%}")
    
    def _train_challenge_network(self):
        """Train challenge network immediately after challenge result."""
        if len(self.challenge_memory) < self.batch_size:
            return
        
        self._train_network(
            self.challenge_net,
            self.target_challenge_net,
            self.challenge_memory,
            self.challenge_optimizer,
            0  # No final reward for immediate training
        )
    
    def _train_network(self, network, target_network, memory, optimizer, final_reward):
        """
        Train a Q-network using experience replay.
        
        For regression (card count): Uses MSE loss directly on predicted value
        For classification (challenge): Uses Q-learning with max over actions
        
        Q-Learning Update (classification):
        Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
        
        Regression Update (card count):
        predicted_count = network(s), loss = MSE(predicted_count, target_count)
        """
        # Sample batch
        batch = memory.sample(min(self.batch_size, len(memory)))
        
        # Convert to numpy arrays first to avoid slow tensor creation warning
        states_np = np.array([exp[0] for exp in batch], dtype=np.float32)
        actions_np = np.array([exp[1] for exp in batch], dtype=np.float32)
        rewards_np = np.array([exp[2] if exp[2] != 0 else final_reward for exp in batch], dtype=np.float32)
        next_states_np = np.array([exp[3] for exp in batch], dtype=np.float32)
        dones_np = np.array([exp[4] for exp in batch], dtype=np.float32)
        
        # Now convert to tensors efficiently
        states = torch.from_numpy(states_np).to(self.device)
        actions = torch.from_numpy(actions_np).to(self.device)
        rewards = torch.from_numpy(rewards_np).to(self.device)
        next_states = torch.from_numpy(next_states_np).to(self.device)
        dones = torch.from_numpy(dones_np).to(self.device)
        
        # Check if this is regression (output size 1) or classification (output size > 1)
        output = network(states)
        is_regression = (output.shape[1] == 1)
        
        if is_regression:
            # Regression: direct MSE loss between predicted and target card count
            current_q = output.squeeze()
            # For regression, action IS the target card count
            target_q = actions
            loss = F.mse_loss(current_q, target_q)
        else:
            # Classification: Q-learning with action selection
            actions_int = actions.long()
            current_q = output.gather(1, actions_int.unsqueeze(1))
            
            # Target Q values
            with torch.no_grad():
                next_q = target_network(next_states).max(1)[0]
                target_q = rewards + (1 - dones) * self.gamma * next_q
            
            loss = F.smooth_l1_loss(current_q.squeeze(), target_q)
        
        # Optimize
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    def _train_from_batch(self, batch, network, target_network, optimizer):
        """
        Train network from a given batch (called by central trainer).
        
        This is separated from _train_network to allow external training.
        """
        # Convert to numpy arrays first
        states_np = np.array([exp[0] for exp in batch], dtype=np.float32)
        actions_np = np.array([exp[1] for exp in batch], dtype=np.float32)
        rewards_np = np.array([exp[2] for exp in batch], dtype=np.float32)
        next_states_np = np.array([exp[3] for exp in batch], dtype=np.float32)
        dones_np = np.array([exp[4] for exp in batch], dtype=np.float32)
        
        # Convert to tensors
        states = torch.from_numpy(states_np).to(self.device)
        actions = torch.from_numpy(actions_np).to(self.device)
        rewards = torch.from_numpy(rewards_np).to(self.device)
        next_states = torch.from_numpy(next_states_np).to(self.device)
        dones = torch.from_numpy(dones_np).to(self.device)
        
        # Check if regression or classification
        output = network(states)
        is_regression = (output.shape[1] == 1)
        
        if is_regression:
            current_q = output.squeeze()
            target_q = actions
            loss = F.mse_loss(current_q, target_q)
        else:
            actions_int = actions.long()
            current_q = output.gather(1, actions_int.unsqueeze(1))
            
            with torch.no_grad():
                next_q = target_network(next_states).max(1)[0]
                target_q = rewards + (1 - dones) * self.gamma * next_q
            
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