#!/usr/bin/env node
/**
 * Simple WebRTC Signaling Server for Testing
 * 
 * This is a minimal signaling server that implements only the WebRTC
 * signaling functionality needed to test the peer simulation scripts.
 * It's independent of the main Tekthib server and can be used for testing.
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3001;

// Client tracking
const clients = new Map();
const rooms = new Map();

// Create HTTP server
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: clients.size, rooms: rooms.size }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Signaling Test Server');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New connection');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
      sendToClient(ws, { type: 'ERROR', payload: { message: 'Invalid message format' } });
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      console.log(`Client ${clientInfo.id} disconnected`);
      
      // Remove from room if in one
      if (clientInfo.roomId) {
        const room = rooms.get(clientInfo.roomId);
        if (room) {
          room.players.delete(clientInfo.id);
          
          // Notify other players
          broadcastToRoom(clientInfo.roomId, {
            type: 'PLAYER_LEFT',
            payload: { playerId: clientInfo.id },
          }, clientInfo.id);
          
          // Delete room if empty
          if (room.players.size === 0) {
            rooms.delete(clientInfo.roomId);
            console.log(`Room ${clientInfo.roomId} deleted`);
          }
        }
      }
      
      clients.delete(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(ws, message) {
  const { type, payload } = message;

  switch (type) {
    case 'CONNECT':
      handleConnect(ws, payload);
      break;

    case 'CREATE_ROOM':
      handleCreateRoom(ws, payload);
      break;

    case 'JOIN_ROOM':
      handleJoinRoom(ws, payload);
      break;

    case 'RTC_OFFER':
    case 'RTC_ANSWER':
    case 'RTC_ICE_CANDIDATE':
      handleWebRTCSignal(ws, message);
      break;

    default:
      sendToClient(ws, { type: 'ERROR', payload: { message: `Unknown message type: ${type}` } });
  }
}

function handleConnect(ws, payload) {
  let clientId = payload.clientId;
  
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  
  clients.set(ws, { id: clientId, ws });
  console.log(`Client connected: ${clientId}`);
  
  sendToClient(ws, {
    type: 'CONNECTED',
    payload: { clientId },
  });
}

function handleCreateRoom(ws, payload) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) {
    sendToClient(ws, { type: 'ERROR', payload: { message: 'Not connected' } });
    return;
  }

  const roomCode = generateRoomCode();
  const room = {
    id: roomCode,
    host: clientInfo.id,
    players: new Map([[clientInfo.id, { 
      id: clientInfo.id, 
      name: payload.playerName,
      isConnected: true,
      isBot: false,
    }]]),
  };

  rooms.set(roomCode, room);
  clientInfo.roomId = roomCode;
  
  console.log(`Room created: ${roomCode} by ${clientInfo.id}`);
  
  sendToClient(ws, {
    type: 'ROOM_CREATED',
    payload: { 
      roomCode,
      player: room.players.get(clientInfo.id),
    },
  });
}

function handleJoinRoom(ws, payload) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) {
    sendToClient(ws, { type: 'ERROR', payload: { message: 'Not connected' } });
    return;
  }

  const { roomCode, playerName } = payload;
  const room = rooms.get(roomCode);

  if (!room) {
    sendToClient(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
    return;
  }

  const player = {
    id: clientInfo.id,
    name: playerName,
    isConnected: true,
    isBot: false,
  };

  room.players.set(clientInfo.id, player);
  clientInfo.roomId = roomCode;

  console.log(`${clientInfo.id} joined room ${roomCode}`);

  // Send confirmation to joining player
  sendToClient(ws, {
    type: 'ROOM_JOINED',
    payload: {
      roomCode,
      player,
      players: Array.from(room.players.values()),
    },
  });

  // Notify other players
  broadcastToRoom(roomCode, {
    type: 'PLAYER_JOINED',
    payload: { player },
  }, clientInfo.id);
}

function handleWebRTCSignal(ws, message) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) {
    sendToClient(ws, { type: 'ERROR', payload: { message: 'Not connected' } });
    return;
  }

  const { type, payload } = message;
  const { targetPlayerId } = payload;

  // Forward signal to target player
  const targetWs = findClientWebSocket(targetPlayerId);
  if (targetWs) {
    sendToClient(targetWs, {
      type,
      payload: {
        fromPlayerId: clientInfo.id,
        signal: payload.signal,
      },
    });
    console.log(`Forwarded ${type} from ${clientInfo.id} to ${targetPlayerId}`);
  } else {
    console.warn(`Target player ${targetPlayerId} not found for ${type}`);
  }
}

function sendToClient(ws, message) {
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify({
      ...message,
      timestamp: Date.now(),
    }));
  }
}

function broadcastToRoom(roomCode, message, excludeClientId) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clients.forEach((clientInfo, ws) => {
    if (clientInfo.roomId === roomCode && clientInfo.id !== excludeClientId) {
      sendToClient(ws, message);
    }
  });
}

function findClientWebSocket(clientId) {
  for (const [ws, info] of clients.entries()) {
    if (info.id === clientId) {
      return ws;
    }
  }
  return null;
}

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('  WebRTC Signaling Test Server');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50) + '\n');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
