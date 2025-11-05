import { WebSocket } from 'ws';
import { WSMessage, ChatMessagePayload } from 'shared';
import { sendToClient } from '../index';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

/**
 * Handle chat messages via WebSocket
 * Note: Player-to-player chat messages now go through WebRTC data channels (P2P).
 * This handler should only receive messages from bots, which are sent by the server itself.
 * Regular player messages sent here will be rejected.
 */
export function handleChatMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  if (message.type === 'CHAT_MESSAGE') {
    // Reject player-to-player messages - they should go through WebRTC
    sendToClient(ws, {
      type: 'ERROR',
      payload: { 
        message: 'Player chat messages should be sent via WebRTC data channels, not WebSocket'
      },
    });
    console.warn(
      `Player ${clientInfo.id} attempted to send chat via WebSocket. This is no longer supported.`
    );
  }
}
