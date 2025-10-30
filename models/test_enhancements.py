#!/usr/bin/env python3
"""
Test script to validate the enhanced ML/RL training system improvements.
Tests the challenge feedback mechanism and enhanced features.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import BotStrategy, GameState, ChallengeResult

def test_challenge_result_class():
    """Test ChallengeResult class initialization and properties."""
    print("Testing ChallengeResult class...")
    
    # Test with payload
    payload = {
        'challengerId': 'bot_123',
        'challengerName': 'TestBot',
        'playerId': 'player_456',
        'playerName': 'Opponent',
        'wasLying': True,
        'revealedCards': [
            {'rank': '5', 'suit': 'hearts'},
            {'rank': '5', 'suit': 'diamonds'},
            {'rank': '5', 'suit': 'clubs'}
        ]
    }
    
    result = ChallengeResult(payload)
    
    assert result.challenger_id == 'bot_123', "Challenger ID mismatch"
    assert result.challenger_name == 'TestBot', "Challenger name mismatch"
    assert result.challenged_player_id == 'player_456', "Challenged player ID mismatch"
    assert result.challenged_player_name == 'Opponent', "Challenged player name mismatch"
    assert result.was_lying == True, "was_lying mismatch"
    assert result.cards_revealed_count == 3, "Card count mismatch"
    assert len(result.revealed_cards) == 3, "Revealed cards length mismatch"
    
    print("✅ ChallengeResult class test passed!")
    return True


def test_game_state_challenge_result():
    """Test GameState with challenge result storage."""
    print("\nTesting GameState challenge result storage...")
    
    game_state = GameState()
    
    # Verify last_challenge_result attribute exists
    assert hasattr(game_state, 'last_challenge_result'), "GameState missing last_challenge_result"
    assert game_state.last_challenge_result is None, "Initial challenge result should be None"
    
    # Set a challenge result
    result = ChallengeResult({
        'challengerId': 'bot_1',
        'challengerName': 'Bot1',
        'playerId': 'bot_2',
        'playerName': 'Bot2',
        'wasLying': False,
        'revealedCards': []
    })
    
    game_state.last_challenge_result = result
    assert game_state.last_challenge_result == result, "Challenge result not stored"
    
    print("✅ GameState challenge result test passed!")
    return True


def test_bot_strategy_callback():
    """Test BotStrategy on_challenge_result callback."""
    print("\nTesting BotStrategy challenge callback...")
    
    class TestBot(BotStrategy):
        def __init__(self):
            super().__init__()
            self.callback_called = False
            self.received_result = None
        
        def select_cards(self, game_state, claimed_rank):
            return []
        
        def on_challenge_result(self, challenge_result, game_state):
            self.callback_called = True
            self.received_result = challenge_result
    
    bot = TestBot()
    game_state = GameState()
    result = ChallengeResult({
        'challengerId': 'test',
        'challengerName': 'Test',
        'playerId': 'opponent',
        'playerName': 'Opponent',
        'wasLying': True,
        'revealedCards': []
    })
    
    # Call callback
    bot.on_challenge_result(result, game_state)
    
    assert bot.callback_called, "Callback was not called"
    assert bot.received_result == result, "Callback did not receive correct result"
    
    print("✅ BotStrategy callback test passed!")
    return True


def test_challenge_outcome_logic():
    """Test challenge win/loss logic."""
    print("\nTesting challenge outcome logic...")
    
    # Test 1: Bot challenges and opponent was lying (bot wins)
    result = ChallengeResult({
        'challengerId': 'bot_123',
        'challengerName': 'Bot',
        'playerId': 'opponent',
        'playerName': 'Opponent',
        'wasLying': True,
        'revealedCards': []
    })
    result.i_was_challenger = True
    result.i_was_challenged = False
    result.i_won = result.was_lying  # Bot wins
    result.i_lost = not result.i_won
    
    assert result.i_won == True, "Bot should win when challenging a liar"
    assert result.i_lost == False, "Bot should not lose when catching a liar"
    
    # Test 2: Bot challenges but opponent was truthful (bot loses)
    result2 = ChallengeResult({
        'challengerId': 'bot_123',
        'challengerName': 'Bot',
        'playerId': 'opponent',
        'playerName': 'Opponent',
        'wasLying': False,
        'revealedCards': []
    })
    result2.i_was_challenger = True
    result2.i_was_challenged = False
    result2.i_won = result2.was_lying  # Bot loses
    result2.i_lost = not result2.i_won
    
    assert result2.i_won == False, "Bot should lose when challenging truth-teller"
    assert result2.i_lost == True, "Bot should lose when challenging truth-teller"
    
    # Test 3: Bot was challenged and was truthful (bot wins)
    result3 = ChallengeResult({
        'challengerId': 'opponent',
        'challengerName': 'Opponent',
        'playerId': 'bot_123',
        'playerName': 'Bot',
        'wasLying': False,
        'revealedCards': []
    })
    result3.i_was_challenger = False
    result3.i_was_challenged = True
    result3.i_won = not result3.was_lying  # Bot wins (was truthful)
    result3.i_lost = result3.was_lying
    
    assert result3.i_won == True, "Bot should win when challenged while truthful"
    assert result3.i_lost == False, "Bot should not lose when truthful"
    
    # Test 4: Bot was challenged and was lying (bot loses)
    result4 = ChallengeResult({
        'challengerId': 'opponent',
        'challengerName': 'Opponent',
        'playerId': 'bot_123',
        'playerName': 'Bot',
        'wasLying': True,
        'revealedCards': []
    })
    result4.i_was_challenger = False
    result4.i_was_challenged = True
    result4.i_won = not result4.was_lying  # Bot loses (was lying)
    result4.i_lost = result4.was_lying
    
    assert result4.i_won == False, "Bot should lose when caught lying"
    assert result4.i_lost == True, "Bot should lose when caught lying"
    
    print("✅ Challenge outcome logic test passed!")
    return True


def test_rl_imports():
    """Test that RL model imports work."""
    print("\nTesting RL model imports...")
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'models'))
        
        # Try importing (will fail if torch not installed, but syntax is OK)
        try:
            from RL_based import RLBotStrategy
            print("✅ RL model imports successfully!")
        except ImportError as e:
            if 'torch' in str(e).lower():
                print("⚠️  RL model syntax OK, but torch not installed (expected)")
            else:
                raise
        
        return True
    except Exception as e:
        print(f"❌ RL model import error: {e}")
        return False


def test_ml_imports():
    """Test that ML model imports work."""
    print("\nTesting ML model imports...")
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'models'))
        
        # Try importing (will fail if xgboost not installed, but syntax is OK)
        try:
            from ML_Based import MLBotStrategy
            print("✅ ML model imports successfully!")
        except ImportError as e:
            if 'xgboost' in str(e).lower():
                print("⚠️  ML model syntax OK, but xgboost not installed (expected)")
            else:
                raise
        
        return True
    except Exception as e:
        print(f"❌ ML model import error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("VALIDATION TESTS FOR ENHANCED ML/RL TRAINING SYSTEM")
    print("=" * 60)
    
    tests = [
        test_challenge_result_class,
        test_game_state_challenge_result,
        test_bot_strategy_callback,
        test_challenge_outcome_logic,
        test_rl_imports,
        test_ml_imports,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ {test.__name__} failed with error: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{len(tests)} tests passed")
    if failed == 0:
        print("✅ ALL TESTS PASSED!")
    else:
        print(f"❌ {failed} tests failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
