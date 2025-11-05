import { WebSocket } from 'ws';
import { GameEngine } from '../../../game/GameEngine';
import { roomManager } from '../../../utils/roomManager';
import { broadcastToRoom } from '../../index';
import {
  broadcastGameStateUpdate,
  checkAndBroadcastGameEnd,
} from './gameStateHelper';
import {
  processChallengeWithSuspense,
  getLastPlayInfo,
} from './challengeHelper';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

/**
 * Process bot challenge after a play
 */
export function processBotChallenge(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  const lastPlayInfo = getLastPlayInfo(gameEngine);
  const botChallengerId = gameEngine.getBotChallenger();

  if (botChallengerId) {
    // Bot wants to challenge
    const result = gameEngine.challenge(botChallengerId, lastPlayInfo);

    if (result.success) {
      processChallengeWithSuspense(
        clients,
        roomId,
        gameEngine,
        botChallengerId,
        result,
        () => {
          // After challenge, trigger next bot turn
          setTimeout(() => {
            processBotTurn(clients, roomId, gameEngine);
          }, 3000);
        },
      );
    }
  } else {
    // No bot challenged, proceed to next turn
    setTimeout(() => {
      processBotTurn(clients, roomId, gameEngine);
    }, 1500);
  }
}

/**
 * Process bot turn if current player is a bot
 */
export function processBotTurn(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  const publicGameState = gameEngine.getPublicGameState();

  // Check if game ended
  if (checkAndBroadcastGameEnd(clients, roomId, gameEngine)) {
    return;
  }

  if (!gameEngine.isCurrentPlayerBot()) {
    // Current player is human, trigger random bot chat and start timer
    gameEngine.triggerRandomBotChat();
    gameEngine.startTurnTimer();
    return;
  }

  // Current player is a bot - execute bot's play
  const currentPlayerId = publicGameState.currentPlayerId;
  const botPlay = gameEngine.getBotPlay(currentPlayerId);

  if (!botPlay) return;

  const result = gameEngine.playCards(
    currentPlayerId,
    botPlay.cardIds,
    botPlay.claimedRank,
  );

  if (!result.success) return;

  // Broadcast bot's play
  const room = roomManager.getRoom(roomId);
  const botPlayer = room?.players.get(currentPlayerId);
  const updatedGameState = gameEngine.getPublicGameState();

  broadcastToRoom(clients, roomId, {
    type: 'CARDS_PLAYED',
    payload: {
      playerId: currentPlayerId,
      playerName: botPlayer?.name || 'Bot',
      cardCount: botPlay.cardIds.length,
      claimedRank: botPlay.claimedRank,
      gameState: updatedGameState,
    },
  });

  // Send updated hands to all players
  broadcastGameStateUpdate(clients, roomId, gameEngine);

  // Check if game ended after bot's play
  if (checkAndBroadcastGameEnd(clients, roomId, gameEngine)) {
    return;
  }

  // Start timer for next turn
  gameEngine.startTurnTimer();

  // After bot plays, check if any bot wants to challenge
  setTimeout(() => {
    processBotChallenge(clients, roomId, gameEngine);
  }, 3000);
}
