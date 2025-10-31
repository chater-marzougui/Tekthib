#!/usr/bin/env python3
"""
ML-Based Bot Strategy for Tekthib (Supervised Learning)

This bot learns from historical game data using supervised learning.
It uses XGBoost to predict optimal card plays and challenge decisions.

Training Process:
1. Extract features from game history (your 5k games CSV)
2. Train classifier on successful players' decisions
3. Use trained model to make real-time decisions

Features used:
- Hand composition (count of each rank)
- Game state (pile size, current rank, player counts)
- Contextual info (last play count, position in game)

Setup:
    pip install xgboost pandas numpy scikit-learn joblib
"""

import sys
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
import joblib
import os
import json
import time

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
except ImportError:
    print("ERROR: Missing dependencies. Install with:")
    print("pip install xgboost pandas numpy scikit-learn joblib")
    raise


# Add the data_collector directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import BotStrategy, GameState


class MLBotStrategy(BotStrategy):
    """
    Machine Learning bot using supervised learning from historical games.
    
    Training Logic:
    - Learns from CSV data exported from your database
    - Extracts features: hand composition, game state, context
    - Trains two models:
      1. Card count predictor (how many cards to play)
      2. Challenge decision classifier (challenge or not)
    """
    
    # Card ranks in order
    RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'Joker']
    
    def __init__(self, model_path: str = None):
        """
        Initialize ML bot.
        
        Args:
            model_path: Path to saved model file. If None, uses default untrained models.
        """
        super().__init__()
        
        # Models
        self.card_count_model = None  # Predicts how many cards to play
        self.challenge_model = None    # Predicts whether to challenge
        self.models_trained = False
        
        # Load models if path provided
        if model_path and os.path.exists(model_path):
            self.load_models(model_path)
        else:
            # Initialize untrained models
            self._init_default_models()
    
    def _init_default_models(self):
        """Initialize default untrained models."""
        # Card count is now a regression problem (predicting exact number)
        self.card_count_model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        self.challenge_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
    
    def train_from_csv(self, 
                       game_history_csv: str,
                       game_participants_csv: str,
                       games_csv: str,
                       save_path: str = "ml_bot_model.pkl",
                       features_cache_path: str = "ml_features_cache.pkl"):
        """
        Train the ML model from CSV files exported from database.
        
        Training Logic:
        1. Load game data from CSVs
        2. Extract features for each player action (or load from cache)
        3. Label successful actions (from winning players)
        4. Train XGBoost models
        5. Save trained models
        
        Args:
            game_history_csv: Path to game_history.csv (contains all game events)
            game_participants_csv: Path to game_participants.csv (player stats)
            games_csv: Path to games.csv (game metadata)
            save_path: Where to save trained model
            features_cache_path: Where to cache extracted features for faster retraining
        """
        total_start = time.time()
        
        # Check if cached features exist
        if os.path.exists(features_cache_path):
            print(f"📦 Found cached features at {features_cache_path}")
            print("Loading cached features...")
            load_cache_start = time.time()
            
            cached_data = joblib.load(features_cache_path)
            card_play_examples = cached_data['card_play_examples']
            challenge_examples = cached_data['challenge_examples']
            
            load_cache_time = time.time() - load_cache_start
            print(f"✅ Loaded {len(card_play_examples)} card play examples in {load_cache_time:.2f}s")
            print(f"✅ Loaded {len(challenge_examples)} challenge examples")
            
            extract_time = 0  # No extraction needed
            load_time = 0
        else:
            print("📊 No cached features found - extracting from CSVs...")
            print("Loading training data from CSVs...")
            load_start = time.time()
            
            # Load CSVs
            game_history = pd.read_csv(game_history_csv)
            game_participants = pd.read_csv(game_participants_csv)
            games = pd.read_csv(games_csv)
            
            load_time = time.time() - load_start
            print(f"✅ Loaded {len(game_history)} events from {len(games)} games in {load_time:.2f}s")
            
            # Extract training examples
            print("\n📊 Extracting training examples from game history...")
            extract_start = time.time()
            
            card_play_examples = []
            challenge_examples = []
            
            # Process each game
            for game_id in games['id'].unique():
                game_events = game_history[game_history['game_id'] == game_id].sort_values('timestamp')
                participants = game_participants[game_participants['game_id'] == game_id]
                
                # Get winner info
                winner_participant = participants[participants['is_winner'] == True]
                if len(winner_participant) == 0:
                    continue
                
                winner_user_id = winner_participant.iloc[0]['user_id']
                
                # Process events
                self._extract_training_examples(
                    game_events, 
                    winner_user_id,
                    card_play_examples,
                    challenge_examples
                )
            
            extract_time = time.time() - extract_start
            print(f"✅ Extracted {len(card_play_examples)} card play examples in {extract_time:.2f}s")
            print(f"✅ Extracted {len(challenge_examples)} challenge examples")
            
            # Cache the extracted features
            print(f"\n💾 Caching extracted features to {features_cache_path}...")
            cache_start = time.time()
            joblib.dump({
                'card_play_examples': card_play_examples,
                'challenge_examples': challenge_examples
            }, features_cache_path)
            cache_time = time.time() - cache_start
            print(f"✅ Features cached in {cache_time:.2f}s (next training will be much faster!)")
        
        # Train models
        if len(card_play_examples) > 0:
            self._train_card_count_model(card_play_examples)
        
        if len(challenge_examples) > 0:
            self._train_challenge_model(challenge_examples)
        
        # Save models
        print("\n💾 Saving trained models...")
        save_start = time.time()
        self.save_models(save_path)
        self.models_trained = True
        save_time = time.time() - save_start
        print(f"✅ Models saved in {save_time:.2f}s")
        
        total_time = time.time() - total_start
        print(f"\n🎉 Training complete! Total time: {total_time:.2f}s")
        if load_time > 0:
            print(f"   - Data loading: {load_time:.2f}s ({load_time/total_time*100:.1f}%)")
        if extract_time > 0:
            print(f"   - Feature extraction: {extract_time:.2f}s ({extract_time/total_time*100:.1f}%)")
        print(f"   - Model saving: {save_time:.2f}s ({save_time/total_time*100:.1f}%)")
    
    def _extract_training_examples(self, 
                           game_events: pd.DataFrame,
                           winner_user_id: str,
                           card_play_examples: List,
                           challenge_examples: List):
        """
        Extract training examples from game events.
        
        Logic:
        - For CARDS_PLAYED events: extract features + how many cards winner played
        - For CHALLENGE events: extract features + whether winner challenged
        """
        # Simulate game state as we replay events
        pile_count = 0
        current_rank = None
        last_played_count = 0
        last_player_id = None
        
        for _, event in game_events.iterrows():
            event_type = event['event_type']
            
            # Parse JSON data properly (handles lowercase true/false)
            try:
                if isinstance(event['event_data'], str):
                    event_data = json.loads(event['event_data'])
                else:
                    event_data = event['event_data']
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Warning: Could not parse event_data: {e}")
                continue
            
            if event_type == 'cards_played':
                player_id = event.get('player_user_id') or event_data.get('playerId')
                card_count = event_data.get('cardsCount') or event_data.get('cardCount', 1)
                claimed_rank = event_data.get('claimedRank')
                remaining_cards = event_data.get('remainingHandSize', 10)
                
                # If there was a previous play and winner didn't challenge, that's a negative example
                if last_player_id is not None and last_player_id != winner_user_id and pile_count > 0:
                    # Winner had opportunity to challenge but didn't
                    features = self._create_challenge_features(
                        pile_count=pile_count,
                        current_rank=current_rank,
                        last_played_count=last_played_count
                    )
                    challenge_examples.append({
                        'features': features,
                        'label': 0  # Didn't challenge
                    })
                
                # Extract features for card play
                features = self._create_card_play_features(
                    pile_count=pile_count,
                    current_rank=current_rank,
                    claimed_rank=claimed_rank,
                    last_played_count=last_played_count,
                    player_card_count=remaining_cards
                )
                
                # If this is winner's action, use as training example
                if player_id == winner_user_id:
                    # Label: actual number of cards they played (no artificial limit)
                    card_play_examples.append({
                        'features': features,
                        'label': card_count  # Use actual count, can be 1-56
                    })
                
                # Update state
                pile_count = event_data.get('pileSize', pile_count + card_count)
                current_rank = claimed_rank
                last_played_count = card_count
                last_player_id = player_id
            
            elif event_type == 'challenge':
                challenger_id = event_data.get('challengerId')
                was_lying = event_data.get('wasLying', False)
                
                # Extract features
                features = self._create_challenge_features(
                    pile_count=pile_count,
                    current_rank=current_rank,
                    last_played_count=last_played_count
                )
                
                # Enhanced challenge training:
                # Learn from successful challenges regardless of who won the game
                if challenger_id == winner_user_id:
                    # Winner challenged - use as positive example
                    challenge_examples.append({
                        'features': features,
                        'label': 1,  # Challenged
                        'was_successful': was_lying  # Track if challenge was successful
                    })
                
                # Also learn from successful challenges by any player
                # This helps bot learn when challenging is actually correct
                if was_lying:
                    # Challenge was successful - pile had bluffs
                    challenge_examples.append({
                        'features': features,
                        'label': 1,  # Should challenge
                        'was_successful': True
                    })
                
                # Reset pile on challenge
                pile_count = 0
                current_rank = None
                last_player_id = None
            
            elif event_type == 'round_end':
                # Reset state for new round
                pile_count = 0
                current_rank = None
                last_played_count = 0
                last_player_id = None
                    
    def _create_card_play_features(self, 
                                   pile_count: int,
                                   current_rank: Optional[str],
                                   claimed_rank: str,
                                   last_played_count: int,
                                   player_card_count: int) -> np.ndarray:
        """Create feature vector for card play decision."""
        features = [
            pile_count / 108.0,  # Normalize pile size
            last_played_count / 56.0,  # Normalize last play count
            player_card_count / 56.0,  # Normalize hand size
            1.0 if current_rank == claimed_rank else 0.0,  # Same rank as before
        ]
        return np.array(features)
    
    def _create_challenge_features(self,
                                   pile_count: int,
                                   current_rank: Optional[str],
                                   last_played_count: int) -> np.ndarray:
        """
        Create feature vector for challenge decision.
        
        Enhanced features for better challenge prediction:
        - Pile size (larger piles are more suspicious and valuable)
        - Number of cards just played (more cards = more suspicious)
        - Derived features for common bluffing patterns
        """
        features = [
            pile_count / 108.0,  # Normalize pile size
            last_played_count / 56.0,  # Normalize last play count
            1.0 if last_played_count >= 3 else 0.0,  # Many cards played (suspicious)
            1.0 if pile_count > 10 else 0.0,  # Large pile (valuable to challenge)
            1.0 if pile_count > 20 else 0.0,  # Very large pile (critical)
            (pile_count * last_played_count) / 100.0,  # Interaction: pile size × card count
            1.0 if last_played_count > 6 else 0.0,  # Many cards (very suspicious)
            1.0 if pile_count > 5 and last_played_count >= 3 else 0.0,  # High risk pattern
        ]
        return np.array(features)
    
    def _train_card_count_model(self, examples: List[Dict]):
        """Train model to predict how many cards to play (regression)."""
        print("\n🎯 Training card count predictor...")
        train_start = time.time()
        
        X = np.array([ex['features'] for ex in examples])
        y = np.array([ex['label'] for ex in examples])
        
        print(f"   Card count distribution: min={y.min()}, max={y.max()}, mean={y.mean():.2f}, median={np.median(y):.0f}")
        
        # Split train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train
        fit_start = time.time()
        self.card_count_model.fit(X_train, y_train)
        fit_time = time.time() - fit_start
        
        # Evaluate (use regression metrics)
        eval_start = time.time()
        y_pred = self.card_count_model.predict(X_test)
        
        # Calculate MAE (Mean Absolute Error) and within-1 accuracy
        mae = np.mean(np.abs(y_pred - y_test))
        within_1_acc = np.mean(np.abs(y_pred - y_test) <= 1.0)
        within_2_acc = np.mean(np.abs(y_pred - y_test) <= 2.0)
        eval_time = time.time() - eval_start
        
        train_time = time.time() - train_start
        print(f"✅ Card count model trained in {train_time:.2f}s (fit: {fit_time:.2f}s, eval: {eval_time:.2f}s)")
        print(f"   MAE: {mae:.3f} cards | Within ±1: {within_1_acc:.3f} | Within ±2: {within_2_acc:.3f}")
    
    def _train_challenge_model(self, examples: List[Dict]):
        """Train model to predict whether to challenge."""
        print("\n🎯 Training challenge predictor...")
        train_start = time.time()
        
        X = np.array([ex['features'] for ex in examples])
        y = np.array([ex['label'] for ex in examples])
        
        # Split train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train
        fit_start = time.time()
        self.challenge_model.fit(X_train, y_train)
        fit_time = time.time() - fit_start
        
        # Evaluate
        eval_start = time.time()
        y_pred = self.challenge_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        eval_time = time.time() - eval_start
        
        train_time = time.time() - train_start
        print(f"✅ Challenge model trained in {train_time:.2f}s (fit: {fit_time:.2f}s, eval: {eval_time:.2f}s)")
        print(f"   Accuracy: {accuracy:.3f} on {len(X_test)} test samples")
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """
        Use ML model to decide how many cards to play.
        
        Logic:
        1. Extract features from current game state
        2. Predict optimal card count using trained model
        3. Select cards (prefer matching, then random)
        """
        inference_start = time.time()
        
        if not game_state.hand:
            return []
        
        # Find matching cards
        matching = [c for c in game_state.hand 
                   if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        # If model is trained, use it
        if self.models_trained and self.card_count_model is not None:
            try:
                # Create features
                features = self._create_card_play_features(
                    pile_count=game_state.pile_count,
                    current_rank=game_state.current_rank,
                    claimed_rank=claimed_rank,
                    last_played_count=game_state.last_played_count,
                    player_card_count=len(game_state.hand)
                ).reshape(1, -1)
                
                # Predict card count
                predicted_count = self.card_count_model.predict(features)[0]
                # Round to nearest integer and ensure it's at least 1 and at most hand size
                predicted_count = int(round(predicted_count))
                predicted_count = max(1, min(predicted_count, len(game_state.hand)))
                
            except Exception as e:
                print(f"Model prediction error: {e}")
                predicted_count = 1
        else:
            # Fallback: play conservatively
            predicted_count = 1 if not matching else min(2, len(matching))
        
        # Select cards
        result = []
        if matching and len(matching) >= predicted_count:
            # Play matching cards
            result = matching[:predicted_count]
        elif matching:
            # Play all matching cards we have
            result = matching
        else:
            # Bluff with predicted count
            count = min(predicted_count, len(game_state.hand))
            result = game_state.hand[:count]
        
        inference_time = time.time() - inference_start
        if inference_time > 0.01:  # Only log if took more than 10ms
            print(f"⏱️  Card selection inference: {inference_time*1000:.2f}ms")
        
        return result
    
    def should_challenge(self, game_state: GameState) -> bool:
        """
        Use ML model to decide whether to challenge.
        
        Logic:
        1. Extract features from current game state
        2. Use trained model to predict if we should challenge
        3. Return prediction
        """
        inference_start = time.time()
        
        if not self.models_trained or self.challenge_model is None:
            # Fallback: conservative strategy
            return game_state.last_played_count >= 4
        
        try:
            # Create features
            features = self._create_challenge_features(
                pile_count=game_state.pile_count,
                current_rank=game_state.current_rank,
                last_played_count=game_state.last_played_count
            ).reshape(1, -1)
            
            # Predict
            should_challenge = bool(self.challenge_model.predict(features)[0])
            
            inference_time = time.time() - inference_start
            if inference_time > 0.01:  # Only log if took more than 10ms
                print(f"⏱️  Challenge inference: {inference_time*1000:.2f}ms")
            
            return should_challenge
            
        except Exception as e:
            print(f"Challenge prediction error: {e}")
            return False
    
    def on_challenge_result(self, challenge_result, game_state: GameState):
        """
        Called when challenge result is received.
        For ML model, we can track statistics but don't retrain online.
        
        Args:
            challenge_result: ChallengeResult object with detailed outcome
            game_state: Current game state after challenge
        """
        # Track challenge statistics for logging/debugging
        if not hasattr(self, 'challenge_stats'):
            self.challenge_stats = {
                'total_challenges': 0,
                'successful_challenges': 0,
                'my_challenges': 0,
                'my_successful_challenges': 0
            }
        
        if challenge_result.i_was_challenger:
            self.challenge_stats['my_challenges'] += 1
            if challenge_result.i_won:
                self.challenge_stats['my_successful_challenges'] += 1
        
        self.challenge_stats['total_challenges'] += 1
        if challenge_result.was_lying:
            self.challenge_stats['successful_challenges'] += 1
    
    def save_models(self, path: str):
        """Save trained models to disk."""
        model_data = {
            'card_count_model': self.card_count_model,
            'challenge_model': self.challenge_model,
            'models_trained': self.models_trained
        }
        joblib.dump(model_data, path)
        print(f"Models saved to {path}")
    
    def load_models(self, path: str):
        """Load trained models from disk."""
        model_data = joblib.load(path)
        self.card_count_model = model_data['card_count_model']
        self.challenge_model = model_data['challenge_model']
        self.models_trained = model_data['models_trained']
        print(f"Models loaded from {path}")


# Training script
if __name__ == "__main__":
    """
    Training Script
    
    Usage:
        # Normal training (uses cached features if available):
        python ML_Based.py
        
        # Force re-extraction of features:
        python ML_Based.py --force-extract
        
        # Delete feature cache:
        python ML_Based.py --clear-cache
        
    CSV files needed:
        - data/game_history.csv
        - data/game_participants.csv
        - data/games.csv
    
    Output:
        - ml_bot_model.pkl (trained model)
        - ml_features_cache.pkl (cached features for faster retraining)
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Train ML bot from game history')
    parser.add_argument('--clear-cache', action='store_true',
                       help='Delete cached features and exit')
    parser.add_argument('--cache-file', default='ml_features_cache.pkl',
                       help='Path to features cache file (default: ml_features_cache.pkl)')
    
    args = parser.parse_args()
    
    cache_file = args.cache_file
    
    # Handle cache clearing
    if args.clear_cache:
        if os.path.exists(cache_file):
            os.remove(cache_file)
            print(f"✅ Deleted cache file: {cache_file}")
        else:
            print(f"ℹ️  Cache file not found: {cache_file}")
    
    # Initialize bot
    bot = MLBotStrategy()
    
    # Train from your CSV files
    bot.train_from_csv(
        game_history_csv="data/game_history.csv",
        game_participants_csv="data/game_participants.csv",
        games_csv="data/games.csv",
        save_path="ml_bot_model.pkl",
        features_cache_path=cache_file
    )
    
    print("\n✅ Training complete!")
    print("To use this bot, create it with: MLBotStrategy('ml_bot_model.pkl')")