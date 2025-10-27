import { WebSocket } from 'ws';
import {
  WSMessage,
  CreateRoomPayload,
  JoinRoomPayload,
  AddBotsPayload,
  KickPlayerPayload,
  MutePlayerPayload,
  RemoveBotPayload,
  PlayAgainPayload,
  StartGamePayload,
} from 'shared';
import { roomManager } from '../../utils/roomManager';
import { sendToClient, broadcastToRoom, sendToPlayer } from '../index';
import { triggerBotTurn, setupGameEngineCallbacks } from './gameHandlers';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

export function handleRoomMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
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

    case 'REMOVE_BOT':
      handleRemoveBot(ws, clients, message.payload as RemoveBotPayload);
      break;

    case 'START_GAME':
      handleStartGame(ws, clients, message.payload as StartGamePayload);
      break;

    case 'KICK_PLAYER':
      handleKickPlayer(ws, clients, message.payload as KickPlayerPayload);
      break;

    case 'SWITCH_PLAYER_MIC':
      handleMutePlayer(ws, clients, message.payload as MutePlayerPayload);
      break;

    case 'PLAY_AGAIN':
      handlePlayAgain(ws, clients, message.payload as PlayAgainPayload);
      break;
  }
}

function handleCreateRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: CreateRoomPayload,
): void {
  const clientInfo = clients.get(ws)!;

  const room = roomManager.createRoom(
    clientInfo.id,
    payload.playerName,
    payload.autoPlayTimeout,
    payload.challengeSuspenseEnabled,
    payload.maxPlayers || 10,
    payload.isPublic ?? true,
  );

  clientInfo.roomId = room.id;
  clientInfo.name = payload.playerName;
  for (const p of room.players.values()) { p.isReady = true; }

  sendToClient(ws, {
    type: 'ROOM_CREATED',
    payload: {
      room: {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        autoPlayTimeout: room.autoPlayTimeout,
        challengeSuspenseEnabled: room.challengeSuspenseEnabled,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isBot: p.isBot,
        })),
      },
      playerId: clientInfo.id,
    },
  });
}

function handleJoinRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: JoinRoomPayload,
): void {
  const clientInfo = clients.get(ws)!;

  const room = roomManager.getRoomByCode(payload.roomCode);

  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room not found', code: 'ROOM_NOT_FOUND' },
    });
    return;
  }

  // Check if game has already started
  const gameEngine = roomManager.getGameEngine(room.id);
  const wasPlayerInGame = room.players.has(clientInfo.id);
  
  // If game is in progress and player was not in it originally, deny joining
  if (gameEngine && !wasPlayerInGame) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { 
        message: 'Game already in progress', 
        code: 'GAME_IN_PROGRESS',
        roomCode: payload.roomCode,
      },
    });
    return;
  }

  // If game is in progress and player was in it, redirect to game page
  if (gameEngine && wasPlayerInGame) {
    clientInfo.roomId = room.id;
    clientInfo.name = room.players.get(clientInfo.id)?.name || payload.playerName;
    
    // Update player connection status
    const player = room.players.get(clientInfo.id);
    if (player) {
      player.isConnected = true;
    }

    // Send them to game page with GAME_STARTED message
    sendToClient(ws, {
      type: 'GAME_STARTED',
      payload: {
        roomCode: payload.roomCode,
      },
    });
    return;
  }

  const result = roomManager.addPlayerToRoom(
    room.id,
    clientInfo.id,
    payload.playerName,
  );

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error },
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
        autoPlayTimeout: room.autoPlayTimeout,
        challengeSuspenseEnabled: room.challengeSuspenseEnabled,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isBot: p.isBot,
        })),
      },
      playerId: clientInfo.id,
    },
  });

  // Notify other players in room
  broadcastToRoom(
    clients,
    room.id,
    {
      type: 'PLAYER_JOINED',
      payload: {
        player: {
          id: clientInfo.id,
          name: payload.playerName,
          isReady: false,
          isConnected: true,
          isBot: false,
        },
      },
    },
    clientInfo.id,
  );
}

function handleLeaveRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) return;

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room) return;

  const result = roomManager.removePlayerFromRoom(
    clientInfo.roomId,
    clientInfo.id,
  );

  // Notify others that player left
  if (!result.roomDeleted) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'PLAYER_LEFT',
      payload: {
        playerId: clientInfo.id,
        playerName: clientInfo.name,
        newHostId: room.hostId,
      },
    });
  }

  sendToClient(ws, {
    type: 'ROOM_LEFT',
    payload: { success: true },
  });

  clientInfo.roomId = undefined;
  clientInfo.name = undefined;
}

function handlePlayerReady(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: { ready: boolean },
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const success = roomManager.setPlayerReady(
    clientInfo.roomId,
    clientInfo.id,
    payload.ready,
  );

  if (success) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'GAME_STATE_UPDATE',
      payload: {
        playerId: clientInfo.id,
        isReady: payload.ready,
      },
    });
  }
}

function handleAddBots(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: AddBotsPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can add bots' },
    });
    return;
  }

  const botsCount = room.players.size + payload.count > room.maxPlayers
    ? room.maxPlayers - room.players.size
    : payload.count;

  const result = roomManager.addBotsToRoom(clientInfo.roomId, botsCount);

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error },
    });
    return;
  }

  // Notify all players about the new bots
  const updatedRoom = roomManager.getRoom(clientInfo.roomId);
  if (updatedRoom) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'BOTS_ADDED',
      payload: {
        players: Array.from(updatedRoom.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isBot: p.isBot,
        })),
      },
    });
  }
}


function handleRemoveBot(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: RemoveBotPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can remove bots' },
    });
    return;
  }

  const result = roomManager.removeBotFromRoom(clientInfo.roomId, payload.botId);

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error },
    });
    return;
  }

  // Notify all players about the new bots
  const updatedRoom = roomManager.getRoom(clientInfo.roomId);
  if (updatedRoom) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'BOT_REMOVED',
      payload: {
        players: Array.from(updatedRoom.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isBot: p.isBot,
        })),
      },
    });
  }
}

function handleStartGame(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: StartGamePayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can start game' },
    });
    return;
  }

  const canStart = roomManager.canStartGame(clientInfo.roomId);
  if (!canStart.canStart) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: canStart.reason },
    });
    return;
  }

  roomManager.setAutoPlayTimeout(clientInfo.roomId, payload.autoPlayTimeout);
  roomManager.setChallengeSuspense(clientInfo.roomId, payload.challengeSuspenseEnabled);

  // Create bot chat callback
  const botChatCallback = (botId: string, message: string) => {
    const botPlayer = room.players.get(botId);
    if (botPlayer) {
      broadcastToRoom(clients, clientInfo.roomId!, {
        type: 'CHAT_MESSAGE',
        payload: {
          playerId: botId,
          playerName: botPlayer.name,
          message: message,
          isBotMessage: true, // Flag to indicate this is a bot message with i18n key
          timestamp: Date.now(),
        },
      });
    }
  };

  const gameEngine = roomManager.startGame(clientInfo.roomId, botChatCallback);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Failed to start game' },
    });
    return;
  }

  // Setup game engine callbacks for timer and auto-play
  setupGameEngineCallbacks(clients, clientInfo.roomId, gameEngine);

  // Start the turn timer for the first player BEFORE getting public game state
  gameEngine.startTurnTimer();

  // Send game started event to all players
  const publicGameState = gameEngine.getPublicGameState();
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'GAME_STARTED',
    payload: { gameState: publicGameState },
  });

  // Send each player their hand and initial game state privately
  for (const [clientWs, client] of clients.entries()) {
    if (client.roomId === clientInfo.roomId) {
      const hand = gameEngine.getPlayerHand(client.id);
      // Send INITIAL_GAME_STATE to ensure all players (especially host) get the full state
      sendToClient(clientWs, {
        type: 'INITIAL_GAME_STATE',
        payload: {
          hand,
          gameState: publicGameState,
          room: {
            id: room.id,
            code: room.code,
            hostId: room.hostId,
            maxPlayers: room.maxPlayers,
            autoPlayTimeout: room.autoPlayTimeout,
            challengeSuspenseEnabled: room.challengeSuspenseEnabled,
            players: Array.from(room.players.values()).map((p) => ({
              id: p.id,
              name: p.name,
              isReady: p.isReady,
              isConnected: p.isConnected,
              isBot: p.isBot,
            })),
          },
        },
      });
    }
  }

  // Trigger bot turn if first player is a bot
  triggerBotTurn(clients, clientInfo.roomId);
}

function handleKickPlayer(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: KickPlayerPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can kick players' },
    });
    return;
  }

  // Don't allow kicking yourself
  if (payload.playerId === clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Cannot kick yourself' },
    });
    return;
  }

  // Don't allow kicking bots (they can be removed differently if needed)
  const playerToKick = room.players.get(payload.playerId);
  if (!playerToKick) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Player not found' },
    });
    return;
  }

  if (playerToKick.isBot) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Cannot kick bots' },
    });
    return;
  }

  // Notify the kicked player
  sendToPlayer(clients, payload.playerId, {
    type: 'PLAYER_KICKED',
    payload: {
      message: 'You have been kicked from the room by the host',
      playerId: payload.playerId,
    },
  });

  // Remove player from room
  const result = roomManager.removePlayerFromRoom(
    clientInfo.roomId,
    payload.playerId,
  );

  // Notify others that player was kicked
  if (!result.roomDeleted) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'PLAYER_LEFT',
      payload: {
        playerId: payload.playerId,
        playerName: playerToKick.name,
        kicked: true,
      },
    });
  }

  // Clear the kicked player's room info
  for (const client of clients.values()) {
    if (client.id === payload.playerId) {
      client.roomId = undefined;
      client.name = undefined;
    }
  }
}

function handleMutePlayer(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: MutePlayerPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  if (!room || room.hostId !== clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Only host can mute players' },
    });
    return;
  }

  // Don't allow muting yourself
  if (payload.playerId === clientInfo.id) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Cannot mute yourself' },
    });
    return;
  }

  const playerToMute = room.players.get(payload.playerId);
  if (!playerToMute) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Player not found' },
    });
    return;
  }

  if (playerToMute.isBot) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Bots have no microphone' },
    });
    return;
  }

  // Notify the muted player to disable their microphone
  sendToPlayer(clients, payload.playerId, {
    type: 'PLAYER_MIC_SWITCHED',
    payload: {
      message: 'Your microphone has been disabled by the host',
      playerId: payload.playerId,
      mute: payload.mute,
    },
  });

  // Also notify all other players for UI updates
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'PLAYER_MIC_SWITCHED',
    payload: {
      playerId: payload.playerId,
      playerName: playerToMute.name,
      mute: payload.mute,
    },
  });
}
function handlePlayAgain(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: PlayAgainPayload,
): void {
  // Get room by code instead of clientInfo.roomId since they might have left
  const room = roomManager.getRoomByCode(payload.roomCode);

  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room not found', code: 'ROOM_NOT_FOUND' },
    });
    return;
  }

  // Check if player is already in the room
  const existingPlayer = room.players.get(payload.playerId);
  
  if (!existingPlayer) {
    // Player needs to rejoin the room
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Please rejoin the room first' },
    });
    return;
  }

  // Check if game is still in progress (not ended)
  // if (room.gameState && room.gameState.phase === 'playing') {
  //   sendToClient(ws, {
  //     type: 'ERROR',
  //     payload: { message: 'Game still in progress' },
  //   });
  //   return;
  // }

  // Check if game has already been reset (no gameState means it's reset)
  if (!room.gameState) {
    // Game already reset, just send current room state
    sendToClient(ws, {
      type: 'GAME_RESET',
      payload: {
        room: {
          id: room.id,
          code: room.code,
          hostId: room.hostId,
          maxPlayers: room.maxPlayers,
          players: Array.from(room.players.values()).map((p) => ({
            id: p.id,
            name: p.name,
            isReady: p.isReady,
            isConnected: p.isConnected,
            isBot: p.isBot,
          })),
        },
      },
    });
    return;
  }

  // Game is ended, first player to click resets it and becomes host
  const result = roomManager.resetGame(room.id, payload.playerId);

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error || 'Failed to reset game' },
    });
    return;
  }

  // Set this player as the new host
  room.hostId = payload.playerId;

  // Reset all players' ready status
  for (const player of room.players.values()) {
    player.isReady = player.id === payload.playerId;
  }

  // Broadcast to all players that game has been reset
  broadcastToRoom(clients, room.id, {
    type: 'GAME_RESET',
    payload: {
      room: {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isBot: p.isBot,
        })),
      },
    },
  });
}