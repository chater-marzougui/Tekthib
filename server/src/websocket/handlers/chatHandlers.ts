import { WebSocket } from 'ws';
import { WSMessage, ChatMessagePayload } from '../../types';
import { broadcastToRoom, sendToClient } from '../index';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

export function handleChatMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  if (message.type === 'CHAT_MESSAGE') {
    handleChatMessage(ws, clients, message.payload as ChatMessagePayload);
  }
}

function handleChatMessage(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: ChatMessagePayload
): void {
  const clientInfo = clients.get(ws)!;
  
  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' }
    });
    return;
  }

  // Sanitize message (basic XSS prevention)
  const sanitizedMessage = payload.message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

  if (!sanitizedMessage) {
    return;
  }

  // Broadcast to all players in room including sender
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'CHAT_MESSAGE',
    payload: {
      playerId: clientInfo.id,
      playerName: clientInfo.name || 'Unknown',
      message: sanitizedMessage,
      timestamp: Date.now()
    }
  });
}