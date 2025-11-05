import { WebSocket } from 'ws';
import { Card, Rank } from 'shared';
import { GameEngine } from '../../../game/GameEngine';
import { roomManager } from '../../../utils/roomManager';
import { broadcastToRoom } from '../../index';
import {
  broadcastGameStateUpdate,
  checkAndBroadcastGameEnd,
} from './gameStateHelper';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

interface ChallengeResult {
  success: boolean;
  wasLying: boolean;
  playerId: string;
  challengerId: string;
  revealedCards: Card[];
  error?: string;
  mismatch?: boolean;
}

/**
 * Process and broadcast a challenge with optional suspense delay
 * Handles all the common logic between human and bot challenges
 */
export function processChallengeWithSuspense(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
  challengerId: string,
  result: ChallengeResult,
  onComplete?: () => void,
): void {
  const room = roomManager.getRoom(roomId);
  const challengeSuspenseEnabled = room?.challengeSuspenseEnabled;

  // Immediately broadcast challenge submission if suspense is enabled
  if (challengeSuspenseEnabled) {
    gameEngine.setProcessingChallenge(true);

    broadcastToRoom(clients, roomId, {
      type: 'CHALLENGE_SUBMITTED',
      payload: {
        challengerId,
      },
    });
  }

  // Reveal challenge result after delay (or immediately if no suspense)
  setTimeout(
    () => {
      if (challengeSuspenseEnabled) {
        gameEngine.setProcessingChallenge(false);
      }

      broadcastChallengeResult(
        clients,
        roomId,
        gameEngine,
        challengerId,
        result,
      );

      // Check if game ended after challenge
      if (checkAndBroadcastGameEnd(clients, roomId, gameEngine)) {
        return;
      }

      // Start timer for next turn
      gameEngine.startTurnTimer();

      // Execute completion callback if provided
      if (onComplete) {
        onComplete();
      }
    },
    challengeSuspenseEnabled ? 3000 : 0,
  );
}

/**
 * Broadcast challenge result to all players
 */
function broadcastChallengeResult(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
  challengerId: string,
  result: ChallengeResult,
): void {
  const room = roomManager.getRoom(roomId);
  const publicGameState = gameEngine.getPublicGameState();

  // Get challenger and player names
  const challengerPlayer = room?.players.get(challengerId);
  const lastPlayer = room?.players.get(result.playerId);

  // Broadcast challenge result
  broadcastToRoom(clients, roomId, {
    type: 'CHALLENGE_RESULT',
    payload: {
      challengerId,
      challengerName: challengerPlayer?.name || 'Unknown',
      wasLying: result.wasLying,
      playerId: result.playerId,
      playerName: lastPlayer?.name || 'Unknown',
      revealedCards: result.revealedCards,
      gameState: publicGameState,
    },
  });

  // Send updated hands to all players
  broadcastGameStateUpdate(clients, roomId, gameEngine);
}

/**
 * Get last play info for challenge validation
 */
export function getLastPlayInfo(
  gameEngine: GameEngine,
): { playerId: string; claimedRank: Rank } | undefined {
  const publicGameState = gameEngine.getPublicGameState();

  if (publicGameState.lastPlayerId && publicGameState.currentRank) {
    return {
      playerId: publicGameState.lastPlayerId,
      claimedRank: publicGameState.currentRank,
    };
  }

  return undefined;
}
