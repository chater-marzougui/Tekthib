import { WebSocket } from 'ws';
import { GameEngine } from '../../../game/GameEngine';
import { sendToClient, broadcastToRoom } from '../../index';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

/**
 * Send updated game state and hand to all players in a room
 */
export function broadcastGameStateUpdate(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  const publicGameState = gameEngine.getPublicGameState();

  for (const [clientWs, client] of clients) {
    if (client.roomId === roomId) {
      sendToClient(clientWs, {
        type: 'GAME_STATE_UPDATE',
        payload: {
          hand: gameEngine.getPlayerHand(client.id),
          gameState: publicGameState,
        },
      });
    }
  }
}

/**
 * Broadcast game ended message to all players in a room
 */
export function broadcastGameEnded(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  const publicGameState = gameEngine.getPublicGameState();

  broadcastToRoom(clients, roomId, {
    type: 'GAME_ENDED',
    payload: {
      winners: publicGameState.winners,
      loser: publicGameState.loser,
      gameState: publicGameState,
    },
  });
}

/**
 * Check if game has ended and broadcast if so
 * Returns true if game ended, false otherwise
 */
export function checkAndBroadcastGameEnd(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): boolean {
  const publicGameState = gameEngine.getPublicGameState();

  if (publicGameState.phase === 'ended') {
    gameEngine.stopTurnTimer();
    broadcastGameEnded(clients, roomId, gameEngine);
    return true;
  }

  return false;
}
