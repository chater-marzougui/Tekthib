import { WebSocket } from 'ws';
import { WSMessage, PlayCardsPayload, ChallengePayload } from 'shared';
import { roomManager } from '../../utils/roomManager';
import { sendToClient, broadcastToRoom } from '../index';
import { GameEngine } from '../../game/GameEngine';
import { serializeRoom } from '../../utils/serialization';
import { buildErrorPayload } from '../../utils/messageBuilder';
import {
  broadcastGameStateUpdate,
  checkAndBroadcastGameEnd,
} from './helpers/gameStateHelper';
import { processChallengeWithSuspense } from './helpers/challengeHelper';
import { processBotTurn, processBotChallenge } from './helpers/botTurnHelper';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

interface GetGameStatePayload {
  roomCode: string;
  playerId: string;
}

export function handleGameMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  switch (message.type) {
    case 'GET_GAME_STATE':
      handleGetGameState(ws, clients, message.payload as GetGameStatePayload);
      break;

    case 'PLAY_CARDS':
      handlePlayCards(ws, clients, message.payload as PlayCardsPayload);
      break;

    case 'CHALLENGE':
      handleChallenge(ws, clients, message.payload as ChallengePayload);
      break;
  }
}

/**
 * Exported function to trigger bot turn from external handlers
 */
export function triggerBotTurn(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
): void {
  const gameEngine = roomManager.getGameEngine(roomId);
  if (gameEngine) {
    setTimeout(() => {
      processBotTurn(clients, roomId, gameEngine);
    }, 3500);
  }
}

/**
 * Exported function to setup game engine callbacks
 */
export function setupGameEngineCallbacks(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  // Set up auto-play callback to notify when a player times out
  gameEngine.setAutoPlayCallback(
    (playerId: string, cardIds: string[], claimedRank: string) => {
      const room = roomManager.getRoom(roomId);
      const player = room?.players.get(playerId);
      const publicGameState = gameEngine.getPublicGameState();

      // Broadcast the auto-played cards
      broadcastToRoom(clients, roomId, {
        type: 'CARDS_PLAYED',
        payload: {
          playerId: playerId,
          playerName: player?.name || 'Unknown',
          cardCount: cardIds.length,
          claimedRank: claimedRank,
          gameState: publicGameState,
          wasAutoPlayed: true,
        },
      });

      // Send updated hands to all players
      broadcastGameStateUpdate(clients, roomId, gameEngine);

      // Check if game ended
      if (checkAndBroadcastGameEnd(clients, roomId, gameEngine)) {
        return;
      }

      // Start timer for next turn
      gameEngine.startTurnTimer();

      // After auto-play, check if any bot wants to challenge
      setTimeout(() => {
        processBotChallenge(clients, roomId, gameEngine);
      }, 3000);
    },
  );
}

function handleGetGameState(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: GetGameStatePayload,
): void {
  const { roomCode, playerId } = payload;
  const room = roomManager.getRoomByCode(roomCode);

  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Room not found'),
    });
    return;
  }

  // Check if player is in the room
  const player = room.players.get(playerId);
  if (!player) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Player not in room'),
    });
    return;
  }

  // Update client info to reconnect to room
  const clientInfo = clients.get(ws);
  if (clientInfo) {
    clientInfo.roomId = room.id;
    clientInfo.name = player.name;
  }

  const gameEngine = roomManager.getGameEngine(room.id);
  
  if (!gameEngine) {
    // Game not started yet, send room info
    sendToClient(ws, {
      type: 'ROOM_JOINED',
      payload: {
        room: serializeRoom(room),
        playerId,
      },
    });
    return;
  }

  // Game is started, send game state and hand
  const publicGameState = gameEngine.getPublicGameState();
  const playerHand = gameEngine.getPlayerHand(playerId);
  
  sendToClient(ws, {
    type: 'INITIAL_GAME_STATE',
    payload: {
      hand: playerHand,
      gameState: publicGameState,
      room: serializeRoom(room),
    },
  });
}

function handlePlayCards(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: PlayCardsPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const gameEngine = roomManager.getGameEngine(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Game not started'),
    });
    return;
  }

  const result = gameEngine.playCards(
    clientInfo.id,
    payload.cardIds,
    payload.claimedRank,
  );

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(result.error!),
    });
    return;
  }

  const publicGameState = gameEngine.getPublicGameState();

  // Broadcast to all players in room
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'CARDS_PLAYED',
    payload: {
      playerId: clientInfo.id,
      playerName: clientInfo.name,
      cardCount: payload.cardIds.length,
      claimedRank: payload.claimedRank,
      gameState: publicGameState,
    },
  });

  // Send updated hand to the player who just played
  sendToClient(ws, {
    type: 'GAME_STATE_UPDATE',
    payload: {
      hand: gameEngine.getPlayerHand(clientInfo.id),
      gameState: publicGameState,
    },
  });

  // Check if game ended
  if (checkAndBroadcastGameEnd(clients, clientInfo.roomId, gameEngine)) {
    return;
  }

  // Start timer for next turn
  gameEngine.startTurnTimer();

  // After a human plays, check if any bot wants to challenge
  setTimeout(() => {
    processBotChallenge(clients, clientInfo.roomId!, gameEngine);
  }, 3000);
}

function handleChallenge(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: ChallengePayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const gameEngine = roomManager.getGameEngine(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Game not started'),
    });
    return;
  }

  const result = gameEngine.challenge(
    payload.challengerId,
    payload.lastPlayInfo,
  );

  if (!result.success) {
    // If mismatch, silently ignore (game has moved on)
    if (result.mismatch) {
      return;
    }
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(result.error!),
    });
    return;
  }

  // Process the challenge with optional suspense delay
  processChallengeWithSuspense(
    clients,
    clientInfo.roomId,
    gameEngine,
    payload.challengerId,
    result,
    () => {
      // After human challenges, trigger bot turn if needed
      setTimeout(() => {
        processBotTurn(clients, clientInfo.roomId!, gameEngine);
      }, 2000);
    },
  );
}

