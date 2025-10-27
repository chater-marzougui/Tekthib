import { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage } from 'shared';
import { handleGameMessages } from './handlers/gameHandlers';
import { handleWebRTCMessages } from './handlers/webrtcHandlers';
import { handleRoomMessages } from './handlers/roomHandlers';
import { handleChatMessages } from './handlers/chatHandlers';
import { roomManager } from '../utils/roomManager';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

const clients = new Map<WebSocket, ClientInfo>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    handleConnect(ws, { type: 'CONNECT', payload: {} });
    ws.on('message', (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
        sendToClient(ws, {
          type: 'ERROR',
          payload: { message: 'Invalid message format' },
        });
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo?.roomId) {
        // Mark player as disconnected instead of removing them
        const room = roomManager.getRoom(clientInfo.roomId);
        if (room) {
          const player = room.players.get(clientInfo.id);
          if (player) {
            player.isConnected = false;

            // Notify other players
            broadcastToRoom(clients, clientInfo.roomId, {
              type: 'GAME_STATE_UPDATE',
              payload: {
                playerId: clientInfo.id,
                isConnected: false,
              },
            });
          }
        }
      }

      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server initialized');
  return wss;
}

function handleMessage(ws: WebSocket, message: WSMessage): void {
  const clientInfo = clients.get(ws);
  if (message.type === 'CONNECT') {
    handleConnect(ws, message);
    return;
  }
  if (!clientInfo) return;
  // Route message to appropriate handler
  switch (message.type) {
    case 'CREATE_ROOM':
    case 'JOIN_ROOM':
    case 'LEAVE_ROOM':
    case 'READY':
    case 'ADD_BOTS':
    case 'REMOVE_BOT':
    case 'START_GAME':
    case 'KICK_PLAYER':
    case 'PLAY_AGAIN':
    case 'SWITCH_PLAYER_MIC':
      handleRoomMessages(ws, clients, message);
      break;

    case 'GET_GAME_STATE':
    case 'PLAY_CARDS':
    case 'CHALLENGE':
      handleGameMessages(ws, clients, message);
      break;

    case 'CHAT_MESSAGE':
      handleChatMessages(ws, clients, message);
      break;

    case 'RTC_OFFER':
    case 'RTC_ANSWER':
    case 'RTC_ICE_CANDIDATE':
      handleWebRTCMessages(ws, clients, message);
      break;

    default:
      sendToClient(ws, {
        type: 'ERROR',
        payload: { message: 'Unknown message type' },
      });
  }
}

export function sendToClient(
  ws: WebSocket,
  message: WSMessage,
  roomId?: string,
): void {
  if (ws.readyState === WebSocket.OPEN) {
    // Attach autoPlayTimeout to the message if client is in a room
    let autoPlayTimeout: number | undefined;

    // Try to get roomId from parameter first, then from clients map
    let effectiveRoomId = roomId;
    if (!effectiveRoomId) {
      const clientInfo = clients.get(ws);
      effectiveRoomId = clientInfo?.roomId;
    }

    if (effectiveRoomId) {
      const room = roomManager.getRoom(effectiveRoomId);
      if (room) {
        autoPlayTimeout = room.autoPlayTimeout;
      }
    }

    ws.send(
      JSON.stringify({
        ...message,
        timestamp: Date.now(),
        autoPlayTimeout,
      }),
    );
  }
}

export function broadcastToRoom(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  message: WSMessage,
  excludeClientId?: string,
): void {
  for (const [ws, clientInfo] of clients) {
    if (clientInfo.roomId === roomId && clientInfo.id !== excludeClientId) {
      sendToClient(ws, message, roomId);
    }
  }
}

export function sendToPlayer(
  clients: Map<WebSocket, ClientInfo>,
  playerId: string,
  message: WSMessage,
): void {
  for (const [ws, clientInfo] of clients) {
    if (clientInfo.id === playerId) {
      sendToClient(ws, message, clientInfo.roomId);
    }
  }
}

function handleConnect(ws: WebSocket, message: WSMessage): void {
  const payload = message.payload as { clientId?: string };
  let clientId = payload.clientId;

  if (clientId) {
    // Reconnecting client - check if they were in a room
    let existingRoom: string | undefined;
    let existingName: string | undefined;

    // Find if this client was in a room
    for (const room of roomManager.getAllRooms()) {
      const player = room.players.get(clientId);
      if (player) {
        existingRoom = room.id;
        existingName = player.name;
        // Mark player as reconnected
        player.isConnected = true;
        break;
      }
    }

    clients.set(ws, {
      id: clientId,
      roomId: existingRoom,
      name: existingName,
    });
  } else {
    // New client
    clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    clients.set(ws, { id: clientId });
  }

  sendToClient(ws, {
    type: 'CONNECTED',
    payload: { clientId },
  });
}
