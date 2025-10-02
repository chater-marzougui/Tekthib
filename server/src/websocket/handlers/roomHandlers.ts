import { WebSocket } from 'ws';
import { WSMessage, CreateRoomPayload, JoinRoomPayload, AddBotsPayload } from '../../types';
import { roomManager } from '../../utils/roomManager';
import { sendToClient, broadcastToRoom } from '../index';
import { triggerBotTurn } from './gameHandlers';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

export function handleRoomMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  switch (message.type) {
    case 'CREATE_ROOM':
      handleCreateRoom(ws, clients, message.payload as CreateRoomPayload);
      break;

    case 'JOIN_ROOM':
      handleJoinRoom(ws, clients, message.payload as JoinRoomPayload);
      break;

    case 'LEAVE_ROOM':
      handleLeaveRoom(ws, clients);
      break;

    case 'READY':
      handlePlayerReady(ws, clients, message.payload);
      break;

    case 'ADD_BOTS':
      handleAddBots(ws, clients, message.payload as AddBotsPayload);
      break;

    case 'START_GAME':
      handleStartGame(ws, clients);
      break;
  }
}

function handleCreateRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: CreateRoomPayload
): void {
  const clientInfo = clients.get(ws)!;
  
  const room = roomManager.createRoom(
    clientInfo.id,
    payload.playerName,
    payload.maxPlayers || 10
  );

  clientInfo.roomId = room.id;
  clientInfo.name = payload.playerName;

  sendToClient(ws, {
    type: 'ROOM_CREATED',
    payload: {
      room: {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected
        }))
      },
      playerId: clientInfo.id
    }
  });
}

function handleJoinRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: JoinRoomPayload
): void {
  const clientInfo = clients.get(ws)!;
  
  const room = roomManager.getRoomByCode(payload.roomCode);
  
  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room not found' }
    });
    return;
  }

  const result = roomManager.addPlayerToRoom(room.id, clientInfo.id, payload.playerName);
  
  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error }
    });
    return;
  }

  clientInfo.roomId = room.id;
  clientInfo.name = payload.playerName;

  // Notify the joining player
  sendToClient(ws, {
    type: 'ROOM_JOINED',
    payload: {
      room: {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected
        }))
      },
      playerId: clientInfo.id
    }
  });

  // Notify other players in room
  broadcastToRoom(clients, room.id, {
    type: 'PLAYER_JOINED',
    payload: {
      player: {
        id: clientInfo.id,
        name: payload.playerName,
        isReady: false,
        isConnected: true
      }
    }
  }, clientInfo.id);
}

function handleLeaveRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) return;

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room) return;

  const result = roomManager.removePlayerFromRoom(clientInfo.roomId, clientInfo.id);

  // Notify others that player left
  if (!result.roomDeleted) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'PLAYER_LEFT',
      payload: {
        playerId: clientInfo.id,
        playerName: clientInfo.name,
        newHostId: room.hostId
      }
    });
  }

  sendToClient(ws, {
    type: 'ROOM_LEFT',
    payload: { success: true }
  });

  clientInfo.roomId = undefined;
  clientInfo.name = undefined;
}

function handlePlayerReady(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: { ready: boolean }
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' }
    });
    return;
  }

  const success = roomManager.setPlayerReady(
    clientInfo.roomId,
    clientInfo.id,
    payload.ready
  );

  if (success) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'GAME_STATE_UPDATE',
      payload: {
        playerId: clientInfo.id,
        isReady: payload.ready
      }
    });
  }
}

function handleAddBots(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: AddBotsPayload
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' }
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can add bots' }
    });
    return;
  }

  const result = roomManager.addBotsToRoom(clientInfo.roomId, payload.count);
  
  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error }
    });
    return;
  }

  // Notify all players about the new bots
  const updatedRoom = roomManager.getRoom(clientInfo.roomId);
  if (updatedRoom) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'BOTS_ADDED',
      payload: {
        players: Array.from(updatedRoom.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isBot: p.isBot
        }))
      }
    });
  }
}

function handleStartGame(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' }
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can start game' }
    });
    return;
  }

  const canStart = roomManager.canStartGame(clientInfo.roomId);
  if (!canStart.canStart) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: canStart.reason }
    });
    return;
  }

  const gameEngine = roomManager.startGame(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Failed to start game' }
    });
    return;
  }

  // Send game started event to all players
  const publicGameState = gameEngine.getPublicGameState();
  
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'GAME_STARTED',
    payload: { gameState: publicGameState }
  });

  // Send each player their hand privately
  clients.forEach((client, clientWs) => {
    if (client.roomId === clientInfo.roomId) {
      const hand = gameEngine.getPlayerHand(client.id);
      sendToClient(clientWs, {
        type: 'GAME_STATE_UPDATE',
        payload: {
          hand,
          gameState: publicGameState
        }
      });
    }
  });

  // Trigger bot turn if first player is a bot
  triggerBotTurn(clients, clientInfo.roomId);
}