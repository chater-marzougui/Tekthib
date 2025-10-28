import { WebSocket } from 'ws';
import { WSMessage, Player } from 'shared';
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
 * Gets the current game state from GameEngine (authoritative source)
 */
export function buildSpectatorGameState(room: any) {
  // Get the GameEngine which has the authoritative game state
  const gameEngine = roomManager.getGameEngine(room.id);
  
  // If no game engine exists, the game hasn't started yet
  if (!gameEngine) return null;

  // Get the current public game state from the engine
  const publicGameState = gameEngine.getPublicGameState();

  return {
    phase: publicGameState.phase,
    currentPlayerIndex: publicGameState.currentPlayerIndex,
    currentPlayerId: publicGameState.currentPlayerId,
    pileCount: publicGameState.pileCount,
    currentRank: publicGameState.currentRank,
    lastPlayerId: publicGameState.lastPlayerId,
    lastPlayedCount: publicGameState.lastPlayedCount,
    winners: publicGameState.winners,
    playerOrder: publicGameState.playerOrder,
    playerHandCounts: publicGameState.playerHandCounts,
    removedCards: publicGameState.removedCards || [],
    players: publicGameState.players.map((player: Player) => ({
      id: player.id,
      name: player.name,
      cardCount: player.cardCount,
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
  const gameEngine = roomManager.getGameEngine(room.id);
  if (gameEngine) {
    // Game is in progress - send the current game state
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
  if (!clientInfo?.isSpectator) return;

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
