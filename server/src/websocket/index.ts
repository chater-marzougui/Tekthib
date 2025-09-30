import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage } from '../types';
import { handleGameMessages } from './handlers/gameHandlers';
import { handleWebRTCMessages } from './handlers/webrtcHandlers';
import { handleRoomMessages } from './handlers/roomHandlers';
import { handleChatMessages } from './handlers/chatHandlers';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

const clients = new Map<WebSocket, ClientInfo>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    clients.set(ws, {
      id: clientId
    });

    console.log(`Client connected: ${clientId}`);

    // Send welcome message
    sendToClient(ws, {
      type: 'ROOM_JOINED',
      payload: { clientId }
    });

    ws.on('message', (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
        sendToClient(ws, {
          type: 'ERROR',
          payload: { message: 'Invalid message format' }
        });
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      console.log(`Client disconnected: ${clientInfo?.id}`);
      
      if (clientInfo?.roomId) {
        handleRoomMessages(ws, clients, {
          type: 'LEAVE_ROOM',
          payload: { roomId: clientInfo.roomId, playerId: clientInfo.id }
        });
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
  if (!clientInfo) return;

  // Route message to appropriate handler
  switch (message.type) {
    case 'CREATE_ROOM':
    case 'JOIN_ROOM':
    case 'LEAVE_ROOM':
    case 'READY':
    case 'START_GAME':
      handleRoomMessages(ws, clients, message);
      break;

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
        payload: { message: 'Unknown message type' }
      });
  }
}

export function sendToClient(ws: WebSocket, message: WSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      ...message,
      timestamp: Date.now()
    }));
  }
}

export function broadcastToRoom(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  message: WSMessage,
  excludeClientId?: string
): void {
  clients.forEach((clientInfo, ws) => {
    if (clientInfo.roomId === roomId && clientInfo.id !== excludeClientId) {
      sendToClient(ws, message);
    }
  });
}

export function sendToPlayer(
  clients: Map<WebSocket, ClientInfo>,
  playerId: string,
  message: WSMessage
): void {
  clients.forEach((clientInfo, ws) => {
    if (clientInfo.id === playerId) {
      sendToClient(ws, message);
    }
  });
}