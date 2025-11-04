#!/usr/bin/env python3
"""
Parallel RL Bot Training Script for Tekthib

This script trains the RL bot using parallel self-play games.
Multiple games run simultaneously for faster training.

Key Architecture Changes:
- Each worker has its OWN bot instance (no sharing)
- Workers only COLLECT experiences (no training)
- Central trainer thread does ALL neural network updates
- Workers periodically SYNC their models from master
- No lock contention during gameplay

Usage:
    python Train_RL.py --workers 10 --episodes 1000 --train-interval 30
"""

import os
import sys
import logging
import time
import json
import argparse
from datetime import datetime
from random import randint
from threading import Thread, Lock, Event
from typing import List

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import TekthibBotSDK
from RL_based import RLBotStrategy

created_episodes = 0


def setup_logging(save_dir: str):
    """
    Setup logging to both console and file.
    
    Creates a timestamped log file in the save directory.
    """
    os.makedirs(save_dir, exist_ok=True)
    
    # Create log file with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = os.path.join(save_dir, f'training_{timestamp}.log')
    
    # Create formatters (only time, no date)
    file_formatter = logging.Formatter(
        '%(asctime)s [%(threadName)-12s] %(levelname)-8s - %(message)s',
        datefmt='%H:%M:%S'
    )
    console_formatter = logging.Formatter(
        '%(asctime)s [%(threadName)-12s] %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Setup file handler (INFO level, not DEBUG)
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(file_formatter)
    
    # Setup console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers.clear()
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    logging.info(f"📝 Logging to file: {log_file}")
    return log_file

logger = logging.getLogger(__name__)


class SharedExperienceBuffer:
    """
    Thread-safe experience buffer shared across all parallel workers.
    Workers add experiences, central trainer consumes them.
    """
    
    def __init__(self, max_size: int = 100000):
        self.card_experiences = []
        self.challenge_experiences = []
        self.max_size = max_size
        self.lock = Lock()
        
    def add_card_experience(self, state, action, reward, next_state, done):
        """Thread-safe add card experience."""
        with self.lock:
            self.card_experiences.append((state, action, reward, next_state, done))
            if len(self.card_experiences) > self.max_size:
                self.card_experiences.pop(0)
    
    def add_challenge_experience(self, state, action, reward, next_state, done):
        """Thread-safe add challenge experience."""
        with self.lock:
            self.challenge_experiences.append((state, action, reward, next_state, done))
            if len(self.challenge_experiences) > self.max_size:
                self.challenge_experiences.pop(0)
    
    def get_batch(self, batch_size: int, experience_type: str = 'card'):
        """Get a random batch of experiences."""
        with self.lock:
            experiences = self.card_experiences if experience_type == 'card' else self.challenge_experiences
            if len(experiences) < batch_size:
                return None
            
            import random
            return random.sample(experiences, batch_size)
    
    def get_all_and_clear(self, experience_type: str = 'card'):
        """Get all experiences and clear the buffer (for batch training)."""
        with self.lock:
            if experience_type == 'card':
                experiences = self.card_experiences.copy()
                self.card_experiences.clear()
            else:
                experiences = self.challenge_experiences.copy()
                self.challenge_experiences.clear()
            return experiences
    
    def size(self, experience_type: str = 'card'):
        """Get current buffer size."""
        with self.lock:
            return len(self.card_experiences if experience_type == 'card' else self.challenge_experiences)


class ParallelTrainingStats:
    """
    Thread-safe statistics tracker for parallel training.
    """
    
    def __init__(self, save_dir: str):
        self.lock = Lock()
        self.episodes_completed = 0
        self.wins = 0
        self.losses = 0
        self.placements = []
        self.episode_data = []
        self.total_training_time = 0
        self.start_time = time.time()
        self.save_dir = save_dir
        self.stats_file = os.path.join(save_dir, 'parallel_training_stats.json')
        
        # Training metrics
        self.training_count = 0
        self.last_training_time = 0
        
        # Load existing stats if available
        self._load_existing_stats()
    
    def _load_existing_stats(self):
        """Load existing statistics."""
        if os.path.exists(self.stats_file):
            try:
                with open(self.stats_file, 'r') as f:
                    data = json.load(f)
                    self.episode_data = data.get('episodes', [])
                    self.episodes_completed = len(self.episode_data)
                    self.wins = sum(1 for ep in self.episode_data if ep['placement'] == 1)
                    self.losses = self.episodes_completed - self.wins
                    self.placements = [ep['placement'] for ep in self.episode_data]
                    self.total_training_time = data.get('total_training_time', 0)
                    logger.info(f"📂 Loaded {self.episodes_completed} episodes from checkpoint")
            except Exception as e:
                logger.warning(f"Could not load existing stats: {e}")
    
    def record_episode(self, placement: int, total_players: int, reward: float, 
                      epsilon: float, worker_id: int, episode_time: float):
        """Record a completed episode (thread-safe)."""
        with self.lock:
            self.episodes_completed += 1
            if placement == 1:
                self.wins += 1
            else:
                self.losses += 1
            
            self.placements.append(placement)
            
            # Calculate statistics
            win_rate = self.wins / self.episodes_completed if self.episodes_completed > 0 else 0
            recent_placements = self.placements[-100:]
            avg_placement_recent = sum(recent_placements) / len(recent_placements) if recent_placements else 0
            avg_placement_all = sum(self.placements) / len(self.placements) if self.placements else 0
            
            # Store episode data
            episode_info = {
                'episode': self.episodes_completed,
                'worker_id': worker_id,
                'placement': placement,
                'total_players': total_players,
                'reward': reward,
                'epsilon': epsilon,
                'episode_time': episode_time,
                'win_rate': win_rate,
                'avg_placement_recent': avg_placement_recent,
                'avg_placement_all': avg_placement_all,
                'timestamp': datetime.now().isoformat()
            }
            
            self.episode_data.append(episode_info)
            
            # Save periodically
            if self.episodes_completed % 10 == 0:
                self._save_stats()
            
            return episode_info
    
    def record_training(self):
        """Record that a training update occurred."""
        with self.lock:
            self.training_count += 1
            self.last_training_time = time.time()
    
    def _save_stats(self):
        """Save statistics to file."""
        try:
            elapsed_time = time.time() - self.start_time
            stats_data = {
                'total_episodes': self.episodes_completed,
                'total_wins': self.wins,
                'total_losses': self.losses,
                'total_training_updates': self.training_count,
                'total_training_time': self.total_training_time + elapsed_time,
                'overall_win_rate': self.wins / self.episodes_completed if self.episodes_completed > 0 else 0,
                'overall_avg_placement': sum(self.placements) / len(self.placements) if self.placements else 0,
                'start_time': datetime.fromtimestamp(self.start_time).isoformat(),
                'last_updated': datetime.now().isoformat(),
                'episodes': self.episode_data
            }
            
            with open(self.stats_file, 'w') as f:
                json.dump(stats_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save stats: {e}")
    
    def get_current_stats(self):
        """Get current statistics (thread-safe)."""
        with self.lock:
            if self.episodes_completed == 0:
                return {
                    'episodes': 0,
                    'win_rate': 0,
                    'avg_placement': 0,
                    'training_count': self.training_count
                }
            
            recent = self.placements[-100:]
            return {
                'episodes': self.episodes_completed,
                'win_rate': self.wins / self.episodes_completed,
                'avg_placement': sum(recent) / len(recent) if recent else 0,
                'training_count': self.training_count
            }
    
    def print_summary(self):
        """Print training summary."""
        with self.lock:
            elapsed_time = time.time() - self.start_time
            total_time = self.total_training_time + elapsed_time
            
            print("\n" + "="*60)
            print("📊 PARALLEL TRAINING SUMMARY")
            print("="*60)
            print(f"Total Episodes:     {self.episodes_completed}")
            print(f"Training Updates:   {self.training_count}")
            print(f"Wins:               {self.wins} ({self.wins/self.episodes_completed*100:.1f}%)")
            print(f"Losses:             {self.losses}")
            
            if self.placements:
                recent = self.placements[-100:]
                print(f"Avg Placement (last 100): {sum(recent)/len(recent):.2f}")
                print(f"Avg Placement (all):      {sum(self.placements)/len(self.placements):.2f}")
            
            print(f"Training Time:      {total_time/3600:.2f} hours")
            print(f"Episodes/Hour:      {self.episodes_completed/(total_time/3600):.1f}")
            print("="*60 + "\n")


class GameWorker(Thread):
    """
    Worker thread that plays games continuously.
    Each worker has its OWN bot instance - no sharing!
    """
    
    def __init__(self, worker_id: int, master_bot: RLBotStrategy, stats: ParallelTrainingStats,
                 experience_buffer: SharedExperienceBuffer, stop_event: Event,
                 max_episodes: int, model_sync_event: Event):
        super().__init__(name=f'Worker-{worker_id}')
        self.worker_id = worker_id
        self.master_bot = master_bot  # Reference to master for syncing
        self.stats = stats
        self.experience_buffer = experience_buffer
        self.stop_event = stop_event
        self.max_episodes = max_episodes
        self.model_sync_event = model_sync_event
        self.daemon = True
        
        # Create PRIVATE bot instance for this worker (no sharing!)
        self.worker_bot = RLBotStrategy(
            training_mode=True,
            epsilon=master_bot.epsilon
        )
        self._sync_from_master()
        
        logger.info(f"Worker {self.worker_id} created with private bot instance")
    
    def _sync_from_master(self):
        """Sync this worker's bot from the master bot."""
        # Copy model weights from master (thread-safe)
        self.worker_bot.card_count_net.load_state_dict(
            self.master_bot.card_count_net.state_dict()
        )
        self.worker_bot.challenge_net.load_state_dict(
            self.master_bot.challenge_net.state_dict()
        )
        self.worker_bot.epsilon = self.master_bot.epsilon
        logger.debug(f"Worker {self.worker_id} synced from master (ε={self.worker_bot.epsilon:.3f})")
    
    def run(self):
        """Run worker loop."""
        global created_episodes
        logger.info(f"Worker {self.worker_id} started")
        
        while not self.stop_event.is_set():
            # Check if we've reached max episodes BEFORE starting new game
            if created_episodes >= self.max_episodes:
                logger.info(f"Worker {self.worker_id} reached episode limit ({created_episodes}/{self.max_episodes})")
                break
            
            # Check if we need to sync model
            if self.model_sync_event.is_set():
                self._sync_from_master()
                # Don't clear event - trainer will clear it
            
            try:
                self._play_episode()
            except Exception as e:
                logger.error(f"Worker {self.worker_id} error: {e}", exc_info=True)
                time.sleep(5)  # Wait before retrying
        
        logger.info(f"Worker {self.worker_id} stopped (total episodes: {self.stats.get_current_stats()['episodes']})")
    
    def _play_episode(self):
        """Play a single game episode."""
        global created_episodes

        if created_episodes > self.max_episodes:
            logger.debug(f"Worker {self.worker_id} stopping - episode limit reached")
            return
        
        episode_start = time.time()
        placement = 10  # Default fallback value
        total_players = 1 + randint(2, 6)
        game_ended = False
        sdk = None
        
        def on_game_started(payload):
            nonlocal total_players
            total_players = payload.get('playerCount', total_players)
            logger.debug(f"Worker {self.worker_id} game started with {total_players} players")
        
        def on_game_ended(payload):
            nonlocal placement, game_ended
            game_ended = True
            winners = payload.get("winners", [])
            if sdk.client_id in winners:
                placement = winners.index(sdk.client_id) + 1
            else:
                placement = total_players
            logger.debug(f"Worker {self.worker_id} game ended, placement: {placement}")
        
        # Create SDK for this game
        bots_to_add = total_players - 1
        logger.debug(f"Worker {self.worker_id} creating SDK with {bots_to_add} bots")
        
        sdk = TekthibBotSDK(
            server_url='ws://localhost:3001',
            player_name=f'RL_W{self.worker_id}',
            room_code=None,
            is_host=True,
            bots_to_add=bots_to_add,
            worker_id=self.worker_id
        )
        
        # Use worker's PRIVATE bot (no lock needed!)
        logger.debug(f"Worker {self.worker_id} setting strategy")
        sdk.set_strategy(self.worker_bot)
        
        sdk.on_event("game_started", on_game_started)
        sdk.on_event("game_ended", on_game_ended)
        
        # Run game (no locks, no contention!)
        logger.debug(f"Worker {self.worker_id} starting game run")
        try:
            sdk.run()
            logger.debug(f"Worker {self.worker_id} game run completed")
        except Exception as e:
            logger.error(f"Worker {self.worker_id} game error: {e}", exc_info=True)
            return
        finally:
            if sdk and sdk.ws:
                sdk.ws.close()
            time.sleep(0.1)
        
        # Check if game actually ended
        if not game_ended:
            logger.warning(f"Worker {self.worker_id} game did not end properly")
            return
        
        # Increment global episode count
        created_episodes += 1
        
        # Calculate reward based on placement
        reward = 1 - 2 * (placement - 1) / (total_players - 1)
        
        # Collect experiences from worker bot's memory
        # The bot collected experiences during play, now we add them to shared buffer
        logger.debug(f"Worker {self.worker_id} collecting experiences")
        
        # Get experiences from worker bot's memory and add final reward
        card_exp_count = len(self.worker_bot.card_count_memory.memory)
        challenge_exp_count = len(self.worker_bot.challenge_memory.memory)
        
        # Transfer experiences to shared buffer with final reward
        for exp in self.worker_bot.card_count_memory.memory:
            state, action, _, next_state, _ = exp
            self.experience_buffer.add_card_experience(
                state, action, reward, next_state, True  # Mark as done
            )
        
        for exp in self.worker_bot.challenge_memory.memory:
            state, action, _, next_state, _ = exp
            self.experience_buffer.add_challenge_experience(
                state, action, reward, next_state, True  # Mark as done
            )
        
        # Clear worker bot's local memory for next game
        self.worker_bot.card_count_memory.memory.clear()
        self.worker_bot.challenge_memory.memory.clear()
        
        logger.debug(f"Worker {self.worker_id} added {card_exp_count} card + {challenge_exp_count} challenge experiences")
        
        # Record statistics
        episode_time = time.time() - episode_start
        episode_info = self.stats.record_episode(
            placement, total_players, reward,
            self.worker_bot.epsilon, self.worker_id, episode_time
        )
        
        # Log progress
        result = "🏆" if placement == 1 else "📊"
        stats = self.stats.get_current_stats()
        logger.info(
            f"{result} W{self.worker_id} E{episode_info['episode']}: "
            f"{placement}/{total_players} | R:{reward:+.1f} | "
            f"WR:{stats['win_rate']:.1%} | AP:{stats['avg_placement']:.2f} | "
            f"Time: {episode_time:.1f}s | Exp: {card_exp_count}+{challenge_exp_count}"
        )


class CentralTrainer(Thread):
    """
    Central trainer thread that performs ALL neural network updates.
    Workers only collect experiences, this thread does all the training.
    """
    
    def __init__(self, master_bot: RLBotStrategy, experience_buffer: SharedExperienceBuffer,
                 stats: ParallelTrainingStats, stop_event: Event, model_sync_event: Event,
                 train_interval: int, batch_size: int):
        super().__init__(name='CentralTrainer', daemon=True)
        self.master_bot = master_bot
        self.experience_buffer = experience_buffer
        self.stats = stats
        self.stop_event = stop_event
        self.model_sync_event = model_sync_event
        self.train_interval = train_interval  # How often to train (seconds)
        self.batch_size = batch_size
        
    def run(self):
        """Run central training loop."""
        logger.info("Central Trainer started")
        
        while not self.stop_event.is_set():
            time.sleep(self.train_interval)
            
            if self.stop_event.is_set():
                break
            
            # Perform training update
            try:
                self._train_step()
            except Exception as e:
                logger.error(f"Training error: {e}", exc_info=True)
        
        logger.info("Central Trainer stopped")
    
    def _train_step(self):
        """Perform one training step on collected experiences."""
        card_count = self.experience_buffer.size('card')
        challenge_count = self.experience_buffer.size('challenge')
        
        if card_count < self.batch_size and challenge_count < self.batch_size:
            logger.debug(f"Not enough experiences (card: {card_count}, challenge: {challenge_count})")
            return
        
        logger.info(f"🎓 Training on {card_count} card + {challenge_count} challenge experiences")
        
        # Train card network
        if card_count >= self.batch_size:
            batch = self.experience_buffer.get_batch(self.batch_size, 'card')
            if batch:
                self.master_bot._train_from_batch(
                    batch,
                    self.master_bot.card_count_net,
                    self.master_bot.target_card_count_net,
                    self.master_bot.card_count_optimizer
                )
        
        # Train challenge network
        if challenge_count >= self.batch_size:
            batch = self.experience_buffer.get_batch(self.batch_size, 'challenge')
            if batch:
                self.master_bot._train_from_batch(
                    batch,
                    self.master_bot.challenge_net,
                    self.master_bot.target_challenge_net,
                    self.master_bot.challenge_optimizer
                )
        
        # Update target networks periodically
        if self.stats.training_count % 10 == 0:
            self.master_bot.update_target_networks()
            logger.debug("Updated target networks")
        
        # Record training
        self.stats.record_training()
        
        # Signal workers to sync their models
        self.model_sync_event.set()
        time.sleep(0.5)  # Give workers time to sync
        self.model_sync_event.clear()
        
        logger.info(f"✅ Training complete (update #{self.stats.training_count})")


class TrainingCoordinator:
    """
    Coordinates parallel training workers and central trainer.
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.save_dir = config['save_dir']
        os.makedirs(self.save_dir, exist_ok=True)
        
        # Setup logging first
        self.log_file = setup_logging(self.save_dir)
        
        # Initialize MASTER bot (only one that gets trained)
        self.master_bot = RLBotStrategy(
            training_mode=True,  # Master bot is in training mode
            epsilon=config['initial_epsilon']
        )
        
        # Shared components
        self.stats = ParallelTrainingStats(self.save_dir)
        self.experience_buffer = SharedExperienceBuffer(config['buffer_size'])
        self.stop_event = Event()
        self.model_sync_event = Event()
        
        # Workers (each with own bot)
        self.workers: List[GameWorker] = []
        
        # Central trainer
        self.central_trainer = None
        
        # Background threads
        total_episodes = config['total_episodes']
        self.checkpoint_rate = total_episodes // 20 if total_episodes >= 200 else 10
        self.checkpoint_thread = None
        self.epsilon_decay_thread = None
    
    def start_workers(self):
        """Start all worker threads."""
        logger.info(f"Starting {self.config['num_workers']} workers...")
        
        for i in range(self.config['num_workers']):
            worker = GameWorker(
                worker_id=i,
                master_bot=self.master_bot,
                stats=self.stats,
                experience_buffer=self.experience_buffer,
                stop_event=self.stop_event,
                max_episodes=self.config['total_episodes'],
                model_sync_event=self.model_sync_event
            )
            worker.start()
            self.workers.append(worker)
            time.sleep(0.25)  # Stagger worker starts
    
    def start_central_trainer(self):
        """Start central trainer thread."""
        logger.info(f"Starting central trainer (interval: {self.config['train_interval']}s)...")
        
        self.central_trainer = CentralTrainer(
            master_bot=self.master_bot,
            experience_buffer=self.experience_buffer,
            stats=self.stats,
            stop_event=self.stop_event,
            model_sync_event=self.model_sync_event,
            train_interval=self.config['train_interval'],
            batch_size=self.config['batch_size']
        )
        self.central_trainer.start()
    
    def start_checkpoint_thread(self):
        """Start background checkpoint thread."""
        def checkpoint_loop():
            last_saved_episode = 0
            while not self.stop_event.is_set():
                time.sleep(self.config['checkpoint_interval'])
                
                stats = self.stats.get_current_stats()
                episodes = stats['episodes']
                if episodes > last_saved_episode + self.checkpoint_rate:
                    checkpoint_path = os.path.join(
                        self.save_dir,
                        f"rl_bot_episode_{episodes}.pth"
                    )
                    
                    self.master_bot.save_model(checkpoint_path)
                    logger.info(f"💾 Checkpoint saved at episode {episodes}")
                    last_saved_episode = episodes

        self.checkpoint_thread = Thread(target=checkpoint_loop, daemon=True, name='Checkpoint')
        self.checkpoint_thread.start()
    
    def start_epsilon_decay_thread(self):
        """Start background epsilon decay thread."""
        def decay_loop():
            while not self.stop_event.is_set():
                time.sleep(5)  # Check every 5 seconds
                
                stats = self.stats.get_current_stats()
                episodes = stats['episodes']
                
                if episodes >= self.config['epsilon_decay_episodes']:
                    new_epsilon = self.config['final_epsilon']
                else:
                    decay_rate = (
                        (self.config['initial_epsilon'] - self.config['final_epsilon']) 
                        / self.config['epsilon_decay_episodes']
                    )
                    new_epsilon = self.config['initial_epsilon'] - decay_rate * episodes
                
                self.master_bot.epsilon = new_epsilon
        
        self.epsilon_decay_thread = Thread(target=decay_loop, daemon=True, name='EpsilonDecay')
        self.epsilon_decay_thread.start()
    
    def monitor_progress(self):
        """Monitor training progress and print updates."""
        last_episodes = 0
        start_time = time.time()
        
        while not self.stop_event.is_set():
            time.sleep(30)  # Print update every 30 seconds
            
            stats = self.stats.get_current_stats()
            episodes = stats['episodes']
            
            if episodes >= self.config['total_episodes']:
                logger.info("🎯 Target episodes reached! Stopping training...")
                self.stop_event.set()
                break
            
            if episodes > last_episodes:
                elapsed = time.time() - start_time
                eps_per_hour = episodes / (elapsed / 3600) if elapsed > 0 else 0
                
                buffer_card = self.experience_buffer.size('card')
                buffer_challenge = self.experience_buffer.size('challenge')
                
                logger.info(
                    f"📈 Progress: {episodes}/{self.config['total_episodes']} episodes | "
                    f"WR: {stats['win_rate']:.1%} | "
                    f"AP: {stats['avg_placement']:.2f} | "
                    f"Speed: {eps_per_hour:.1f} eps/hr | "
                    f"ε: {self.master_bot.epsilon:.3f} | "
                    f"Buffer: {buffer_card}+{buffer_challenge} | "
                    f"Training: {stats['training_count']}"
                )
                
                if episodes >= self.config['total_episodes']:
                    self.stop_event.set()
                    break
                
                last_episodes = episodes
            
            else:
                logger.info("⏳ No new episodes completed in the last interval...")
    
    def train(self):
        """Run the complete training process."""
        logger.info("="*80)
        logger.info("🤖 PARALLEL RL TRAINING FOR TEKTHIB (Separate Worker Models)")
        logger.info("="*80)
        logger.info("Configuration:")
        logger.info(f"  Workers:              {self.config['num_workers']}")
        logger.info(f"  Target Episodes:      {self.config['total_episodes']}")
        logger.info(f"  Initial Epsilon:      {self.config['initial_epsilon']}")
        logger.info(f"  Final Epsilon:        {self.config['final_epsilon']}")
        logger.info(f"  Epsilon Decay:        {self.config['epsilon_decay_episodes']} episodes")
        logger.info(f"  Train Interval:       {self.config['train_interval']}s")
        logger.info(f"  Batch Size:           {self.config['batch_size']}")
        logger.info(f"  Checkpoint Interval:  {self.config['checkpoint_interval']}s")
        logger.info(f"  Buffer Size:          {self.config['buffer_size']}")
        logger.info(f"  Save Directory:       {self.save_dir}")
        logger.info(f"  Log File:             {self.log_file}")
        logger.info("="*80)
        logger.info("")
        
        try:
            # Start all components
            logger.info("🚀 Starting training components...")
            self.start_workers()
            self.start_central_trainer()
            self.start_checkpoint_thread()
            self.start_epsilon_decay_thread()
            logger.info("✅ All components started successfully")
            logger.info("")
            
            # Monitor progress
            self.monitor_progress()
            
            # Wait for workers to complete
            logger.info("⏳ Waiting for workers to complete...")
            for worker in self.workers:
                worker.join(timeout=120)
            
            logger.info("")
            logger.info("="*80)
            logger.info("✅ TRAINING COMPLETED SUCCESSFULLY!")
            logger.info("="*80)
            self.stats.print_summary()
            
            # Save final model
            final_path = os.path.join(self.save_dir, "rl_bot_final.pth")
            self.master_bot.save_model(final_path)
            logger.info(f"💾 Final model saved: {final_path}")
            logger.info(f"📊 Training stats saved: {self.stats.stats_file}")
            logger.info(f"📝 Full log available at: {self.log_file}")
            logger.info("="*80)
            
        except KeyboardInterrupt:
            logger.info("")
            logger.info("="*80)
            logger.info("⚠️  TRAINING INTERRUPTED BY USER")
            logger.info("="*80)
            self.stop_event.set()
            
            # Wait for workers to stop
            logger.info("⏳ Stopping workers gracefully...")
            for worker in self.workers:
                worker.join(timeout=5)
            
            self.stats.print_summary()
            
            # Save interrupted model
            interrupt_path = os.path.join(self.save_dir, "rl_bot_interrupted.pth")
            self.master_bot.save_model(interrupt_path)
            logger.info(f"💾 Model saved: {interrupt_path}")
            logger.info(f"📊 Training stats saved: {self.stats.stats_file}")
            logger.info(f"📝 Full log available at: {self.log_file}")
            logger.info("="*80)
        
        except Exception as e:
            logger.error("="*80)
            logger.error("❌ TRAINING FAILED WITH ERROR")
            logger.error("="*80)
            logger.error(f"Error: {e}", exc_info=True)
            self.stop_event.set()
            
            # Try to save emergency model
            try:
                emergency_path = os.path.join(self.save_dir, "rl_bot_emergency.pth")
                self.master_bot.save_model(emergency_path)
                logger.info(f"💾 Emergency model saved: {emergency_path}")
            except Exception as save_error:
                logger.error(f"Failed to save emergency model: {save_error}")
            
            logger.info(f"📝 Full log available at: {self.log_file}")
            logger.error("="*80)
            raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Parallel RL Training for Tekthib')
    parser.add_argument('--workers', type=int, default=10,
                       help='Number of parallel workers (default: 10)')
    parser.add_argument('--episodes', type=int, default=1000,
                       help='Total episodes to train (default: 1000)')
    parser.add_argument('--epsilon-start', type=float, default=1.0,
                       help='Initial exploration rate (default: 1.0)')
    parser.add_argument('--epsilon-end', type=float, default=0.01,
                       help='Final exploration rate (default: 0.01)')
    parser.add_argument('--epsilon-decay', type=int, default=700,
                       help='Episodes over which to decay epsilon (default: 700)')
    parser.add_argument('--train-interval', type=int, default=30,
                       help='Training interval in seconds (default: 30)')
    parser.add_argument('--batch-size', type=int, default=64,
                       help='Training batch size (default: 64)')
    parser.add_argument('--checkpoint-interval', type=int, default=120,
                       help='Checkpoint interval in seconds (default: 120)')
    parser.add_argument('--buffer-size', type=int, default=20000,
                       help='Experience buffer size (default: 20000)')
    parser.add_argument('--save-dir', type=str, default='rl_checkpoints_parallel',
                       help='Directory for checkpoints (default: rl_checkpoints_parallel)')
    
    args = parser.parse_args()
    
    config = {
        'num_workers': args.workers,
        'total_episodes': args.episodes,
        'initial_epsilon': args.epsilon_start,
        'final_epsilon': args.epsilon_end,
        'epsilon_decay_episodes': args.epsilon_decay,
        'train_interval': args.train_interval,
        'batch_size': args.batch_size,
        'checkpoint_interval': args.checkpoint_interval,
        'buffer_size': args.buffer_size,
        'save_dir': args.save_dir
    }
    
    coordinator = TrainingCoordinator(config)
    coordinator.train()


if __name__ == "__main__":
    main()