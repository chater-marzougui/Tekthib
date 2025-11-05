import { WebSocket } from 'ws';
import { WSMessage } from 'shared';
import { sendToClient } from '../index';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

/**
 * Handle chat messages via WebSocket
 * 
 * Important: Player-to-player chat messages now go through WebRTC data channels (P2P).
 * This handler should NOT receive any player-initiated chat messages.
 * 
 * Bot messages are sent by the server itself via broadcastToRoom() in roomHandlers.ts
 * (see botChatCallback), not through this handler. Bot messages never pass through
 * this handler - they are broadcast directly by the server.
 * 
 * Any CHAT_MESSAGE received here from a client indicates incorrect usage and will be rejected.
 */
export function handleChatMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  if (message.type === 'CHAT_MESSAGE') {
    // Reject all player-initiated messages - they should go through WebRTC
    sendToClient(ws, {
      type: 'ERROR',
      payload: { 
        message: 'Player chat messages must be sent via WebRTC data channels, not WebSocket'
      },
    });
    console.warn(
      `Player ${clientInfo.id} attempted to send chat via WebSocket. This is no longer supported.`
    );
  }
}
