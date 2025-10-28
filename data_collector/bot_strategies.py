#!/usr/bin/env python3
"""
Bot Strategy Examples for Tekthib

This module contains example bot strategies that you can use as templates
for your own custom AI implementations.
"""

import random
from typing import Dict, List
from tekthib_bot_sdk import BotStrategy, GameState


class RandomStrategy(BotStrategy):
    """
    Simple random strategy - plays random cards and challenges randomly.
    Good baseline for testing.
    """
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """Play 1-4 random cards from hand."""
        if not game_state.hand:
            return []
        
        num_to_play = random.randint(1, min(4, len(game_state.hand)))
        return random.sample(game_state.hand, num_to_play)
    
    def should_challenge(self, game_state: GameState) -> bool:
        """Challenge 20% of the time."""
        return random.random() < 0.2


class TruthfulStrategy(BotStrategy):
    """
    Always plays matching cards when possible, rarely bluffs.
    Challenges based on probability when pile is large.
    """
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """Play matching cards when available, otherwise minimum cards."""
        # Find matching cards
        matching = [c for c in game_state.hand if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        if matching:
            # Play all matching cards (up to 4)
            return matching[:min(4, len(matching))]
        else:
            # No matching cards - play minimum (1 card)
            return [game_state.hand[0]] if game_state.hand else []
    
    def should_challenge(self, game_state: GameState) -> bool:
        """Challenge when pile is large (more than 8 cards)."""
        return game_state.pile_count > 8


class AggressiveStrategy(BotStrategy):
    """
    Plays many cards at once and challenges frequently.
    High risk, high reward.
    """
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """Try to play 3-4 cards when possible."""
        if not game_state.hand:
            return []
        
        # Find matching cards
        matching = [c for c in game_state.hand if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        if len(matching) >= 3:
            # Play many matching cards
            return matching[:4]
        elif len(matching) >= 1:
            # Play matching cards we have
            return matching
        else:
            # Bluff with 2-3 cards
            max_cards = min(3, len(game_state.hand))
            num_to_play = random.randint(1, max(1, max_cards))
            return random.sample(game_state.hand, num_to_play)
    
    def should_challenge(self, game_state: GameState) -> bool:
        """Challenge 40% of the time, more often when last play was many cards."""
        base_chance = 0.4
        if game_state.last_played_count >= 3:
            base_chance = 0.6  # Challenge more when opponent played many cards
        return random.random() < base_chance


class ConservativeStrategy(BotStrategy):
    """
    Minimizes risk - plays few cards, rarely challenges.
    Focuses on survival over winning quickly.
    """
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """Play minimum cards, prefer truthful plays."""
        # Find matching cards
        matching = [c for c in game_state.hand if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        if matching:
            # Play 1-2 matching cards
            return matching[:min(2, len(matching))]
        else:
            # Play single card to minimize risk
            return [game_state.hand[0]] if game_state.hand else []
    
    def should_challenge(self, game_state: GameState) -> bool:
        """Only challenge when very suspicious (4 cards played)."""
        return game_state.last_played_count >= 4


class SmartStrategy(BotStrategy):
    """
    Balanced strategy with card counting and probability-based decisions.
    Tracks what's been played and makes informed decisions.
    """
    
    def __init__(self):
        super().__init__()
        # Track cards seen
        self.seen_cards = {}  # rank -> count
        self.total_decks = 2  # Game uses 2 decks
        
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """
        Make intelligent card selection based on:
        - Cards in hand
        - Risk of being challenged
        - Game state
        """
        matching = [c for c in game_state.hand if c["rank"] == claimed_rank or c["rank"] == "Joker"]
        
        # Calculate how many matching cards are still in play
        cards_per_rank = 8  # 4 per deck * 2 decks
        seen = self.seen_cards.get(claimed_rank, 0)
        remaining = cards_per_rank - seen
        
        if matching:
            # We have matching cards
            if len(matching) >= 2:
                # Play 2-3 matching cards for credibility
                max_to_play = min(3, len(matching))
                num_to_play = random.randint(2, max(2, max_to_play))
                return matching[:num_to_play]
            else:
                # Play our single matching card
                return matching
        else:
            # Bluffing - decide based on risk
            my_hand_size = len(game_state.hand)
            
            if my_hand_size <= 3:
                # Low on cards - play conservatively (1 card)
                return [game_state.hand[0]]
            elif remaining <= 2:
                # Few matching cards left - risky to bluff many
                return [game_state.hand[0]]
            else:
                # Safe to bluff 1-2 cards
                num = random.randint(1, min(2, len(game_state.hand)))
                return random.sample(game_state.hand, num)
    
    def should_challenge(self, game_state: GameState) -> bool:
        """
        Challenge based on:
        - Number of cards played
        - Cards remaining of that rank
        - Pile size
        """
        if game_state.last_played_count == 0:
            return False
        
        # Calculate probability opponent is bluffing
        claimed = game_state.current_rank
        if not claimed:
            return False
        
        cards_per_rank = 8
        seen = self.seen_cards.get(claimed, 0)
        remaining = cards_per_rank - seen
        
        # High suspicion if:
        # 1. They played more cards than remaining of that rank
        if game_state.last_played_count > remaining:
            return True
        
        # 2. They played 4 cards (full set - suspicious)
        if game_state.last_played_count >= 4:
            return random.random() < 0.5
        
        # 3. They played 3 cards and few remain
        if game_state.last_played_count >= 3 and remaining <= 4:
            return random.random() < 0.4
        
        # 4. Pile is huge (over 12 cards)
        if game_state.pile_count > 12:
            return random.random() < 0.3
        
        return False

# Example: Custom strategy template
class MyCustomStrategy(BotStrategy):
    """
    Template for your custom strategy.
    
    Replace the logic in these methods with your own AI!
    """
    
    def __init__(self):
        super().__init__()
        # Add any initialization here
        # e.g., load your ML model, set up parameters, etc.
    
    def select_cards(self, game_state: GameState, claimed_rank: str) -> List[Dict]:
        """
        YOUR LOGIC HERE
        
        Access game state:
        - game_state.hand: Your cards
        - game_state.pile_count: Cards in center pile
        - game_state.players: All players and their card counts
        - game_state.current_rank: Required rank to play
        
        Return: List of card dictionaries to play
        """
        # Example: Simple implementation
        matching = [c for c in game_state.hand if c["rank"] == claimed_rank]
        
        if matching:
            return matching[:1]  # Play one matching card
        else:
            return [game_state.hand[0]] if game_state.hand else []
    
    def should_challenge(self, game_state: GameState) -> bool:
        """
        YOUR LOGIC HERE
        
        Decide whether to challenge the last play.
        
        Return: True to challenge, False to pass
        """
        # Example: Challenge if they played 4 cards
        return game_state.last_played_count >= 4
    
    def choose_rank(self, game_state: GameState) -> str:
        """
        YOUR LOGIC HERE (Optional - has default implementation)
        
        Choose which rank to claim when starting a new pile.
        
        Return: Rank string (e.g., "2", "K", "A")
        """
        # Use default implementation or customize
        return super().choose_rank(game_state)
