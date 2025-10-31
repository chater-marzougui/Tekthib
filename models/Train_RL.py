#!/usr/bin/env python3
"""
RL Bot Training Script for Tekthib

This script trains the RL bot through self-play.
The bot will play many games and improve over time.

Training Strategy:
- Start with high exploration (epsilon=1.0)
- Gradually reduce exploration as bot learns
- Save checkpoints every 100 episodes
- Track performance metrics

Recommended: Train for 1000+ episodes for good performance
"""

import os
from random import randint
import sys
import logging
import time
import json
from datetime import datetime
from RL_based import RLBotStrategy

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import TekthibBotSDK

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)

# Training configuration
TRAINING_CONFIG = {
    'total_episodes': 300,
    'initial_epsilon': 1.0,
    'final_epsilon': 0.01,
    'epsilon_decay_episodes': 200,  # Decay over first 200 episodes
    'checkpoint_interval': 50,  # Save checkpoint every 50 episodes
    'target_update_interval': 25,  # Update target networks every 25 episodes
    'save_dir': 'rl_checkpoints',
    'stats_file': 'training_stats.json'  # Stats tracking file
}

# Create checkpoint directory
os.makedirs(TRAINING_CONFIG['save_dir'], exist_ok=True)

# Training statistics
class TrainingStats:
    def __init__(self):
        self.episode = 0
        self.wins = 0
        self.losses = 0
        self.placements = []  # Track finish positions
        self.episode_start_time = None
        self.total_training_time = 0
        self.stats_file = os.path.join(TRAINING_CONFIG['save_dir'], TRAINING_CONFIG['stats_file'])
        self.episodes_data = []  # Store all episode data
        self._load_existing_stats()
    
    def _load_existing_stats(self):
        """Load existing stats if file exists."""
        if os.path.exists(self.stats_file):
            try:
                with open(self.stats_file, 'r') as f:
                    data = json.load(f)
                    self.episodes_data = data.get('episodes', [])
                    # Restore state from loaded data
                    if self.episodes_data:
                        self.episode = len(self.episodes_data)
                        self.wins = sum(1 for ep in self.episodes_data if ep['placement'] == 1)
                        self.losses = self.episode - self.wins
                        self.placements = [ep['placement'] for ep in self.episodes_data]
                        self.total_training_time = data.get('total_training_time', 0)
                        logging.info(f"📂 Loaded {self.episode} episodes from {self.stats_file}")
            except Exception as e:
                logging.warning(f"Could not load existing stats: {e}")
        
    def start_episode(self):
        self.episode += 1
        self.episode_start_time = time.time()
        
    def end_episode(self, placement: int, reward: float, epsilon: float, total_players: int = 4):
        """
        Record episode results and save to JSON.
        
        Args:
            placement: Finish position (1 = winner, 2 = second, etc.)
            reward: Reward value for this episode
            epsilon: Current epsilon value
            total_players: Total number of players in game
        """
        episode_time = time.time() - self.episode_start_time
        self.total_training_time += episode_time
        self.placements.append(placement)
        
        if placement == 1:
            self.wins += 1
        else:
            self.losses += 1
        
        # Calculate statistics
        win_rate = self.wins / self.episode if self.episode > 0 else 0
        avg_placement = sum(self.placements[-100:]) / len(self.placements[-100:]) if self.placements else 0
        avg_placement_all = sum(self.placements) / len(self.placements) if self.placements else 0
        
        # Store episode data
        episode_data = {
            'episode': self.episode,
            'placement': placement,
            'total_players': total_players,
            'reward': reward,
            'epsilon': epsilon,
            'episode_time': episode_time,
            'win_rate': win_rate,
            'avg_placement_recent': avg_placement,
            'avg_placement_all': avg_placement_all,
            'timestamp': datetime.now().isoformat()
        }
        
        self.episodes_data.append(episode_data)
        
        # Save to JSON
        self._save_stats()
        
        return {
            'episode_time': episode_time,
            'win_rate': win_rate,
            'avg_placement': avg_placement
        }
    
    def _save_stats(self):
        """Save all statistics to JSON file."""
        try:
            stats_data = {
                'total_episodes': self.episode,
                'total_wins': self.wins,
                'total_losses': self.losses,
                'total_training_time': self.total_training_time,
                'overall_win_rate': self.wins / self.episode if self.episode > 0 else 0,
                'overall_avg_placement': sum(self.placements) / len(self.placements) if self.placements else 0,
                'last_updated': datetime.now().isoformat(),
                'episodes': self.episodes_data
            }
            
            with open(self.stats_file, 'w') as f:
                json.dump(stats_data, f, indent=2)
                
        except Exception as e:
            logging.error(f"Failed to save stats: {e}")
    
    def print_summary(self):
        """Print training summary."""
        print("\n" + "="*60)
        print("📊 TRAINING SUMMARY")
        print("="*60)
        print(f"Total Episodes:     {self.episode}")
        print(f"Wins:               {self.wins} ({self.wins/self.episode*100:.1f}%)")
        print(f"Losses:             {self.losses} ({self.losses/self.episode*100:.1f}%)")
        
        if self.placements:
            recent_placements = self.placements[-100:]
            print(f"Avg Placement (last 100): {sum(recent_placements)/len(recent_placements):.2f}")
        
        print(f"Total Training Time: {self.total_training_time/3600:.2f} hours")
        print("="*60 + "\n")


def calculate_epsilon(episode: int, config: dict) -> float:
    """
    Calculate epsilon for epsilon-greedy strategy.
    
    Linear decay from initial_epsilon to final_epsilon over decay_episodes.
    """
    if episode >= config['epsilon_decay_episodes']:
        return config['final_epsilon']
    
    decay_rate = (config['initial_epsilon'] - config['final_epsilon']) / config['epsilon_decay_episodes']
    return config['initial_epsilon'] - decay_rate * episode

def play_single_episode(bot: RLBotStrategy, episode_num: int):
    """Play a single game episode and return placement."""
    
    placement = None
    total_players = 1 + randint(2, 6)  # Will be updated on game start
    game_ended = False
    
    def on_game_started(payload):
        nonlocal total_players
        total_players = payload.get('playerCount', total_players)
        print(f"🎮 Episode {episode_num} started (ε={bot.epsilon:.3f})")
    
    def on_game_ended(payload):
        nonlocal placement, game_ended
        game_ended = True
        
        winners = payload.get("winners", [])
        if sdk.client_id in winners:
            placement = winners.index(sdk.client_id) + 1
        else:
            placement = total_players
    
    # Create new SDK for this game
    bots_to_add = total_players - 1
    print("Adding", bots_to_add, 'bots')
    sdk = TekthibBotSDK(
        server_url='ws://localhost:3001',
        player_name='RL_Training',
        room_code=None,
        is_host=True,
        bots_to_add=bots_to_add
    )
    
    sdk.set_strategy(bot)
    sdk.on_event("game_started", on_game_started)
    sdk.on_event("game_ended", on_game_ended)
    
    # Run the game
    try:
        sdk.run()
    except Exception as e:
        print(f"⚠️ Episode error: {e}")
    
    return placement, total_players

def train_rl_bot():
    """Main training loop - plays episodes sequentially."""
    
    print("🤖 Starting RL Bot Training (Manual Restart Mode)")
    print("="*60)
    print("Configuration:")
    print(f"  - Total Episodes: {TRAINING_CONFIG['total_episodes']}")
    print(f"  - Initial Epsilon: {TRAINING_CONFIG['initial_epsilon']}")
    print(f"  - Final Epsilon: {TRAINING_CONFIG['final_epsilon']}")
    print(f"  - Checkpoint Interval: {TRAINING_CONFIG['checkpoint_interval']} episodes")
    print("  - Mode: Manual game restart per episode")
    print("="*60 + "\n")
    
    # Initialize bot (persists across episodes)
    bot = RLBotStrategy(
        training_mode=True,
        epsilon=TRAINING_CONFIG['initial_epsilon']
    )
    
    stats = TrainingStats()
    
    try:
        while stats.episode < TRAINING_CONFIG['total_episodes']:
            stats.start_episode()
            
            # Play one game
            placement, total_players = play_single_episode(bot, stats.episode)
            
            # Calculate reward
            reward = 1 - 2 * (placement - 1) / (total_players - 1)
            
            # Update bot
            bot.update_with_reward(reward)
            
            # Record stats (now includes saving to JSON)
            episode_stats = stats.end_episode(placement, reward, bot.epsilon, total_players)
            
            # Print summary
            result_emoji = "🏆" if placement == 1 else "📊"
            print(f"{result_emoji} Episode {stats.episode} complete:")
            print(f"  - Placement: {placement}/{total_players}")
            print(f"  - Reward: {reward:+.1f}")
            print(f"  - Win Rate: {episode_stats['win_rate']:.1%}")
            print(f"  - Avg Placement: {episode_stats['avg_placement']:.2f}")
            print(f"  - Episode Time: {episode_stats['episode_time']:.1f}s")
            print(f"  - Epsilon: {bot.epsilon:.3f}")
            print(f"  - Stats saved to: {stats.stats_file}")
            
            # Update epsilon
            bot.epsilon = calculate_epsilon(stats.episode, TRAINING_CONFIG)
            
            # Save checkpoint
            if stats.episode % TRAINING_CONFIG['checkpoint_interval'] == 0:
                checkpoint_path = os.path.join(
                    TRAINING_CONFIG['save_dir'],
                    f"rl_bot_episode_{stats.episode}.pth"
                )
                bot.save_model(checkpoint_path)
                print(f"💾 Checkpoint saved: {checkpoint_path}")
            
            # Update target networks
            if stats.episode % TRAINING_CONFIG['target_update_interval'] == 0:
                bot.update_target_networks()
                print("🔄 Target networks updated")
            
            # Brief pause between games
            time.sleep(2)
        
        # Training complete
        print("\n🎉 Training complete!")
        stats.print_summary()
        
        final_path = os.path.join(TRAINING_CONFIG['save_dir'], "rl_bot_final.pth")
        bot.save_model(final_path)
        print(f"💾 Final model saved: {final_path}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Training interrupted by user")
        stats.print_summary()
        
        interrupt_path = os.path.join(TRAINING_CONFIG['save_dir'], "rl_bot_interrupted.pth")
        bot.save_model(interrupt_path)
        print(f"💾 Interrupted model saved: {interrupt_path}")


if __name__ == "__main__":
    train_rl_bot()