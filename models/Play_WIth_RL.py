#!/usr/bin/env python3
"""
Play with Trained RL Bot

This script loads a trained RL model and uses it to play Tekthib.
The bot will use its learned strategies with minimal exploration.
"""

import os
import sys
import logging

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import TekthibBotSDK
from RL_based import RLBotStrategy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configuration
MODEL_PATH = 'rl_checkpoints/rl_bot_final.pth'  # Path to trained model
EXPLORATION_RATE = 0.01  # Minimal exploration in play mode

"""Main function to play with trained RL bot."""

# Check if model exists
if not os.path.exists(MODEL_PATH):
    print(f"❌ Error: Model file not found: {MODEL_PATH}")
    print("\nAvailable checkpoints:")
    checkpoint_dir = 'rl_checkpoints'
    if os.path.exists(checkpoint_dir):
        checkpoints = [f for f in os.listdir(checkpoint_dir) if f.endswith('.pth')]
        for ckpt in sorted(checkpoints):
            print(f"  - {ckpt}")
    else:
        print("  No checkpoints found. Please train the model first.")
    sys.exit(1)

print("🤖 Loading Trained RL Bot")
print("="*60)
print(f"Model: {MODEL_PATH}")
print(f"Exploration Rate: {EXPLORATION_RATE}")
print("="*60 + "\n")

# Load trained bot
bot = RLBotStrategy(
    model_path=MODEL_PATH,
    training_mode=False,  # Not training, just playing
    epsilon=EXPLORATION_RATE  # Minimal exploration
)

# Create SDK
sdk = TekthibBotSDK(
    server_url='wss://takthib-a00f145250bc.herokuapp.com',
    player_name='RLBot_Pro',
    room_code=None,  # Set to specific code to join existing room
    is_host=True,
    bots_to_add=3  # Play against 3 other bots
)

sdk.set_strategy(bot)

# Event handlers
def on_game_started(payload):
    print("🎮 Game started! Using learned strategies...")

def on_game_ended(payload):
    winners = payload.get("winners", [])
    
    if sdk.client_id in winners:
        placement = winners.index(sdk.client_id) + 1
        if placement == 1:
            print("🏆 Victory! Bot won the game!")
        else:
            print(f"📊 Bot finished in place {placement}")
    else:
        print("😔 Bot didn't place in top positions")

def on_game_error(payload):
    error_message = payload.get("message", "Unknown error")
    print(f"⚠️ Game error: {error_message}")

# Register event handlers
sdk.on_event("game_started", on_game_started)
sdk.on_event("game_ended", on_game_ended)
sdk.on_event("error", on_game_error)

# Start playing
print(f"Starting bot: {sdk.player_name}")
print(f"Strategy: Trained RL Bot (Episodes: {bot.episode_count})")

if bot.episode_rewards:
    recent_avg = sum(bot.episode_rewards[-100:]) / len(bot.episode_rewards[-100:])
    print(f"Training Performance: {recent_avg:+.3f} average reward (last 100 episodes)")

print("\nBot is ready to play! Press Ctrl+C to stop.\n")

try:
    sdk.run()
except KeyboardInterrupt:
    print("\n\n👋 Bot stopped by user")
