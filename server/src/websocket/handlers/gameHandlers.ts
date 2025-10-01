import { WebSocket } from 'ws';
import { WSMessage, PlayCardsPayload, ChallengePayload } from '../../types';
import { roomManager } from '../../utils/roomManager';
import { sendToClient, broadcastToRoom } from '../index';

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
  message: WSMessage
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


function handleGetGameState(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: GetGameStatePayload
): void {
  const { roomCode, playerId } = payload;
  
  const room = roomManager.getRoomByCode(roomCode);
  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room not found' }
    });
    
    console.log('Engine not found:', roomCode);
    return;
  }

  const gameEngine = roomManager.getGameEngine(room.id);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Game not started' }
    });
    console.log('Engine not found:', room.id);
    return;
  }

  const publicGameState = gameEngine.getPublicGameState();
  const playerHand = gameEngine.getPlayerHand(playerId);
  sendToClient(ws, {
    type: 'INITIAL_GAME_STATE',
    payload: {
      hand: playerHand,
      gameState: publicGameState
    }
  });
}

function handlePlayCards(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: PlayCardsPayload
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' }
    });
    return;
  }

  const gameEngine = roomManager.getGameEngine(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Game not started' }
    });
    return;
  }

  const result = gameEngine.playCards(
    clientInfo.id,
    payload.cardIds,
    payload.claimedRank
  );

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error }
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
      gameState: publicGameState
    }
  });

  // Send updated hand to the player who just played
  sendToClient(ws, {
    type: 'GAME_STATE_UPDATE',
    payload: {
      hand: gameEngine.getPlayerHand(clientInfo.id),
      gameState: publicGameState
    }
  });

  // Check if game ended
  if (publicGameState.phase === 'ended') {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'GAME_ENDED',
      payload: {
        winners: publicGameState.winners,
        loser: publicGameState.loser,
        gameState: publicGameState
      }
    });
  }
}

function handleChallenge(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: ChallengePayload
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' }
    });
    return;
  }

  const gameEngine = roomManager.getGameEngine(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Game not started' }
    });
    return;
  }

  const result = gameEngine.challenge(payload.challengerId);

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error }
    });
    return;
  }

  const publicGameState = gameEngine.getPublicGameState();

  // Get challenger and liar names
  let challengerName = '';
  let liarName = '';
  
  clients.forEach((client) => {
    if (client.id === payload.challengerId) {
      challengerName = client.name || 'Unknown';
    }
    if (client.id === result.liarId) {
      liarName = client.name || 'Unknown';
    }
  });

  // Broadcast challenge result to all players
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'CHALLENGE_RESULT',
    payload: {
      challengerId: payload.challengerId,
      challengerName,
      wasLying: result.wasLying,
      liarId: result.liarId,
      liarName,
      revealedCards: result.revealedCards,
      gameState: publicGameState
    }
  });

  // Send updated hands to affected players
  clients.forEach((client, clientWs) => {
    if (client.roomId === clientInfo.roomId) {
      sendToClient(clientWs, {
        type: 'GAME_STATE_UPDATE',
        payload: {
          hand: gameEngine.getPlayerHand(client.id),
          gameState: publicGameState
        }
      });
    }
  });
}