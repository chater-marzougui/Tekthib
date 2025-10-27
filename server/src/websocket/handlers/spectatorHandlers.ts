import { WebSocket } from 'ws';
import { WSMessage } from 'shared';
import { roomManager } from '../../utils/roomManager';
import { sendToClient } from '../index';

// Import ClientInfo from parent module to avoid duplication
interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
  isSpectator?: boolean;
}

/**
 * Helper function to transform game state for spectators
 */
function buildSpectatorGameState(room: any) {
  if (!room.gameState) return null;

  const currentPlayerId =
    room.gameState.playerOrder[room.gameState.currentPlayerIndex];

  return {
    phase: room.gameState.phase,
    currentPlayerIndex: room.gameState.currentPlayerIndex,
    currentPlayerId: currentPlayerId,
    pileCount: room.gameState.pile.length,
    currentRank: room.gameState.currentRank,
    lastPlayerId: room.gameState.lastPlayerId,
    lastPlayedCount: room.gameState.lastPlayedCards.length,
    winners: room.gameState.winners,
    players: Array.from(room.players.values()).map((player: any) => ({
      id: player.id,
      name: player.name,
      cardCount: player.hand.length,
      isConnected: player.isConnected,
      isReady: player.isReady,
      isBot: player.isBot,
    })),
  };
}

/**
 * Handle spectator-related WebSocket messages
 */
export function handleSpectatorMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  switch (message.type) {
    case 'SPECTATE_ROOM':
      handleSpectateRoom(ws, clients, message);
      break;

    case 'LEAVE_SPECTATE':
      handleLeaveSpectate(ws, clients, message);
      break;
  }
}

/**
 * Handle a spectator joining a room
 */
function handleSpectateRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  const { roomCode } = message.payload;

  if (!roomCode) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room code is required' },
    });
    return;
  }

  const room = roomManager.getRoomByCode(roomCode);

  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room not found' },
    });
    return;
  }

  // Mark client as spectator
  clientInfo.roomId = room.id;
  clientInfo.isSpectator = true;
  clients.set(ws, clientInfo);

  // Send confirmation to spectator
  sendToClient(ws, {
    type: 'SPECTATOR_JOINED',
    payload: {
      roomCode: room.code,
      roomId: room.id,
    },
  });

  // Send current game state to spectator
  if (room.gameState) {
    const spectatorGameState = buildSpectatorGameState(room);

    sendToClient(ws, {
      type: 'INITIAL_GAME_STATE',
      payload: {
        gameState: spectatorGameState,
        isSpectator: true,
      },
    });
  } else {
    // Room exists but game hasn't started
    const roomInfo = {
      code: room.code,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
      players: Array.from(room.players.values()).map((player) => ({
        id: player.id,
        name: player.name,
        isConnected: player.isConnected,
        isReady: player.isReady,
        isBot: player.isBot,
      })),
    };

    sendToClient(ws, {
      type: 'INITIAL_GAME_STATE',
      payload: {
        room: roomInfo,
        isSpectator: true,
      },
    });
  }

  console.log(
    `Spectator ${clientInfo.name || clientInfo.id} joined room ${room.code}`,
  );
}

/**
 * Handle a spectator leaving a room
 */
function handleLeaveSpectate(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo || !clientInfo.isSpectator) return;

  const roomId = clientInfo.roomId;
  clientInfo.roomId = undefined;
  clientInfo.isSpectator = false;
  clients.set(ws, clientInfo);

  sendToClient(ws, {
    type: 'SPECTATOR_LEFT',
    payload: {},
  });

  console.log(
    `Spectator ${clientInfo.name || clientInfo.id} left room ${roomId}`,
  );
}

export { ClientInfo };
