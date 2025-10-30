
import os
import sys

import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data_collector.tekthib_bot_sdk import TekthibBotSDK
from ML_Based import MLBotStrategy


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


bot = MLBotStrategy('ml_bot_model.pkl')
sdk = TekthibBotSDK(server_url='wss://takthib-a00f145250bc.herokuapp.com',
                    player_name='XGBBot',
                    room_code=None,
                    is_host=True, 
                    bots_to_add=3)
sdk.set_strategy(bot)


# Optional: Add event listeners
def on_game_started(payload):
    print("🎮 Game has started! Let's play!")

def on_game_ended(payload):
    winners = payload.get("winners", [])
    
    if sdk.client_id == winners[0]:
        print("🎉 We won!")
    if sdk.client_id in winners:
        print("We got ", winners.index(sdk.client_id) + 1, " place!")
    else:
        print("😔 Better luck next time!")
        
def on_game_error(payload):
    error_message = payload.get("message", "Unknown error")
    print(f"⚠️ Game error: {error_message}")


sdk.on_event("game_started", on_game_started)
sdk.on_event("game_ended", on_game_ended)
sdk.on_event("error", on_game_error)

print(f"Starting bot: {sdk.player_name}")
print(f"Strategy: {sdk.strategy.__class__.__name__}")
sdk.run()