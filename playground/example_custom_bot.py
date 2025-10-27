#!/usr/bin/env python3
"""
Example: Using the Tekthib Bot SDK with Custom Strategy

This is a minimal example showing how to create and run a custom bot
with just a few lines of code.

Usage:
    python example_custom_bot.py
"""

import os
import logging
from dotenv import load_dotenv

# Import the SDK and a strategy
from tekthib_bot_sdk import TekthibBotSDK
from bot_strategies import SmartStrategy  # Or use any other strategy

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    # Get configuration from environment
    server_url = os.getenv("SERVER_URL", "ws://localhost:3001")
    room_code = os.getenv("ROOM_CODE", "")
    player_name = os.getenv("PLAYER_NAME", "SmartBot")
    is_host = os.getenv("IS_HOST", "False").lower() == "true"
    bots_to_add = int(os.getenv("BOTS_TO_ADD", "0"))
    
    # Validate configuration
    if not room_code and not is_host:
        print("ERROR: Either set ROOM_CODE or IS_HOST=true")
        return
    
    # Create bot SDK instance
    sdk = TekthibBotSDK(
        server_url=server_url,
        room_code=room_code,
        player_name=player_name,
        is_host=is_host,
        bots_to_add=bots_to_add
    )
    
    # Set the strategy (this is where you customize behavior!)
    strategy = SmartStrategy()
    sdk.set_strategy(strategy)
    
    # Optional: Add event listeners
    def on_game_started(payload):
        print("🎮 Game has started! Let's play!")
    
    def on_game_ended(payload):
        winners = payload.get("winners", [])
        if sdk.client_id in winners:
            print("🎉 We won!")
        else:
            print("😔 Better luck next time!")
    
    sdk.on_event("game_started", on_game_started)
    sdk.on_event("game_ended", on_game_ended)
    
    # Run the bot
    print(f"Starting bot: {player_name}")
    print(f"Strategy: {strategy.__class__.__name__}")
    sdk.run()


if __name__ == "__main__":
    main()
