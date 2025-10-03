import { WebSocket } from 'ws';
import { WSMessage, RTCSignalPayload } from 'shared';
import { sendToPlayer, sendToClient } from '../index';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

export function handleWebRTCMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  switch (message.type) {
    case 'RTC_OFFER':
      handleRTCOffer(ws, clients, message.payload as RTCSignalPayload);
      break;

    case 'RTC_ANSWER':
      handleRTCAnswer(ws, clients, message.payload as RTCSignalPayload);
      break;

    case 'RTC_ICE_CANDIDATE':
      handleRTCIceCandidate(ws, clients, message.payload as RTCSignalPayload);
      break;
  }
}

function handleRTCOffer(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: RTCSignalPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  // Forward offer to target player
  sendToPlayer(clients, payload.targetPlayerId, {
    type: 'RTC_OFFER',
    payload: {
      fromPlayerId: clientInfo.id,
      signal: payload.signal,
    },
  });
}

function handleRTCAnswer(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: RTCSignalPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  // Forward answer to target player
  sendToPlayer(clients, payload.targetPlayerId, {
    type: 'RTC_ANSWER',
    payload: {
      fromPlayerId: clientInfo.id,
      signal: payload.signal,
    },
  });
}

function handleRTCIceCandidate(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: RTCSignalPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  // Forward ICE candidate to target player
  sendToPlayer(clients, payload.targetPlayerId, {
    type: 'RTC_ICE_CANDIDATE',
    payload: {
      fromPlayerId: clientInfo.id,
      signal: payload.signal,
    },
  });
}
