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
import {
  validateRoomExists,
  validateIsHost,
  validatePlayerInRoom,
  validateNotBot,
  validateNotSelf,
  validateRoomHasSpace,
} from '../../utils/validation';
import { serializeRoom } from '../../utils/serialization';
import {
  buildRoomCreatedPayload,
  buildRoomJoinedPayload,
  buildPlayerJoinedPayload,
  buildPlayerLeftPayload,
  buildErrorPayload,
  buildGameResetPayload,
} from '../../utils/messageBuilder';

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
    payload.testMode ?? false,
  );

  clientInfo.roomId = room.id;
  clientInfo.name = payload.playerName;
  
  // Set all players (just the host at this point) as ready
  for (const p of room.players.values()) {
    p.isReady = true;
  }

  sendToClient(ws, {
    type: 'ROOM_CREATED',
    payload: buildRoomCreatedPayload(serializeRoom(room), clientInfo.id),
  });
}

function handleJoinRoom(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: JoinRoomPayload,
): void {
  const clientInfo = clients.get(ws)!;
  const room = roomManager.getRoomByCode(payload.roomCode);

  // Validate room exists
  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Room not found', 'ROOM_NOT_FOUND'),
    });
    return;
  }

  // Check if game has already started
  const gameEngine = roomManager.getGameEngine(room!.id);
  const wasPlayerInGame = room!.players.has(clientInfo.id);

  // If game is in progress and player was not in it originally, deny joining
  if (gameEngine && !wasPlayerInGame) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Game already in progress', 'GAME_IN_PROGRESS'),
    });
    return;
  }

  // If game is in progress and player was in it, redirect to game page
  if (gameEngine && wasPlayerInGame) {
    clientInfo.roomId = room!.id;
    clientInfo.name = room!.players.get(clientInfo.id)?.name || payload.playerName;

    // Update player connection status
    const player = room!.players.get(clientInfo.id);
    if (player) {
      player.isConnected = true;
    }

    sendToClient(ws, {
      type: 'GAME_STARTED',
      payload: { roomCode: payload.roomCode },
    });
    return;
  }

  const result = roomManager.addPlayerToRoom(
    room!.id,
    clientInfo.id,
    payload.playerName,
  );

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(result.error!),
    });
    return;
  }

  clientInfo.roomId = room!.id;
  clientInfo.name = payload.playerName;

  // Notify the joining player
  sendToClient(ws, {
    type: 'ROOM_JOINED',
    payload: buildRoomJoinedPayload(serializeRoom(room!), clientInfo.id),
  });

  // Notify other players in room
  broadcastToRoom(
    clients,
    room!.id,
    {
      type: 'PLAYER_JOINED',
      payload: buildPlayerJoinedPayload(clientInfo.id, payload.playerName),
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
    broadcastToRoom(
      clients,
      clientInfo.roomId,
      {
        type: 'PLAYER_LEFT',
        payload: buildPlayerLeftPayload(
          clientInfo.id,
          clientInfo.name,
          room.hostId,
        ),
      },
    );
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
      payload: buildErrorPayload('Not in a room'),
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
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  
  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(roomValidation.error!),
    });
    return;
  }

  const hostValidation = validateIsHost(room!, clientInfo.id);
  if (!hostValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(hostValidation.error!),
    });
    return;
  }

  const botsCount =
    room!.players.size + payload.count > room!.maxPlayers
      ? room!.maxPlayers - room!.players.size
      : payload.count;

  const result = roomManager.addBotsToRoom(clientInfo.roomId, botsCount);

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(result.error!),
    });
    return;
  }

  // Notify all players about the new bots
  const updatedRoom = roomManager.getRoom(clientInfo.roomId);
  if (updatedRoom) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'BOTS_ADDED',
      payload: {
        players: serializeRoom(updatedRoom).players,
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
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  
  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(roomValidation.error!),
    });
    return;
  }

  const hostValidation = validateIsHost(room!, clientInfo.id);
  if (!hostValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(hostValidation.error!),
    });
    return;
  }

  const result = roomManager.removeBotFromRoom(
    clientInfo.roomId,
    payload.botId,
  );

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(result.error!),
    });
    return;
  }

  // Notify all players about bot removal
  const updatedRoom = roomManager.getRoom(clientInfo.roomId);
  if (updatedRoom) {
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'BOT_REMOVED',
      payload: {
        players: serializeRoom(updatedRoom).players,
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
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  
  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(roomValidation.error!),
    });
    return;
  }

  const hostValidation = validateIsHost(room!, clientInfo.id);
  if (!hostValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(hostValidation.error!),
    });
    return;
  }

  const canStart = roomManager.canStartGame(clientInfo.roomId);
  if (!canStart.canStart) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(canStart.reason!),
    });
    return;
  }

  roomManager.setAutoPlayTimeout(clientInfo.roomId, payload.autoPlayTimeout);
  roomManager.setChallengeSuspense(
    clientInfo.roomId,
    payload.challengeSuspenseEnabled,
  );

  // Create bot chat callback
  const botChatCallback = (botId: string, message: string) => {
    const botPlayer = room!.players.get(botId);
    if (botPlayer) {
      broadcastToRoom(clients, clientInfo.roomId!, {
        type: 'CHAT_MESSAGE',
        payload: {
          playerId: botId,
          playerName: botPlayer.name,
          message: message,
          isBotMessage: true,
          timestamp: Date.now(),
        },
      });
    }
  };

  const gameEngine = roomManager.startGame(
    clientInfo.roomId,
    botChatCallback,
  );
  
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Failed to start game'),
    });
    return;
  }

  // Setup game engine callbacks for timer and auto-play
  setupGameEngineCallbacks(clients, clientInfo.roomId, gameEngine);

  // Start the turn timer for the first player BEFORE getting public game state
  gameEngine.startTurnTimer();

  // Send game started event to all players
  const publicGameState = gameEngine.getPublicGameState();
  const serializedRoom = serializeRoom(room!);
  
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'GAME_STARTED',
    payload: { gameState: publicGameState },
  });

  // Send each player their hand and initial game state privately
  for (const [clientWs, client] of clients.entries()) {
    if (client.roomId === clientInfo.roomId) {
      const hand = gameEngine.getPlayerHand(client.id);
      sendToClient(clientWs, {
        type: 'INITIAL_GAME_STATE',
        payload: {
          hand,
          gameState: publicGameState,
          room: serializedRoom,
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
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  
  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(roomValidation.error!),
    });
    return;
  }

  const hostValidation = validateIsHost(room!, clientInfo.id);
  if (!hostValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(hostValidation.error!),
    });
    return;
  }

  const selfValidation = validateNotSelf(clientInfo.id, payload.playerId);
  if (!selfValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(selfValidation.error!),
    });
    return;
  }

  const playerToKick = room!.players.get(payload.playerId);
  const playerValidation = validatePlayerInRoom(room!, payload.playerId);
  if (!playerValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(playerValidation.error!),
    });
    return;
  }

  const botValidation = validateNotBot(playerToKick!);
  if (!botValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Cannot kick bots'),
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
      payload: buildPlayerLeftPayload(
        payload.playerId,
        playerToKick!.name,
        undefined,
        true,
      ),
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
      payload: buildErrorPayload('Not in a room'),
    });
    return;
  }

  const room = roomManager.getRoom(clientInfo.roomId);
  
  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(roomValidation.error!),
    });
    return;
  }

  const hostValidation = validateIsHost(room!, clientInfo.id);
  if (!hostValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(hostValidation.error!),
    });
    return;
  }

  const selfValidation = validateNotSelf(clientInfo.id, payload.playerId);
  if (!selfValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(selfValidation.error!),
    });
    return;
  }

  const playerToMute = room!.players.get(payload.playerId);
  const playerValidation = validatePlayerInRoom(room!, payload.playerId);
  if (!playerValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(playerValidation.error!),
    });
    return;
  }

  if (playerToMute!.isBot) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Bots have no microphone'),
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
      playerName: playerToMute!.name,
      mute: payload.mute,
    },
  });
}
function handlePlayAgain(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: PlayAgainPayload,
): void {
  const room = roomManager.getRoomByCode(payload.roomCode);

  const roomValidation = validateRoomExists(room);
  if (!roomValidation.valid) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Room not found', 'ROOM_NOT_FOUND'),
    });
    return;
  }

  // Check if player is already in the room
  const existingPlayer = room!.players.get(payload.playerId);

  if (!existingPlayer) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload('Please rejoin the room first'),
    });
    return;
  }

  // Check if game has already been reset (no gameState means it's reset)
  if (!room!.gameState) {
    sendToClient(ws, {
      type: 'GAME_RESET',
      payload: buildGameResetPayload(serializeRoom(room!)),
    });
    return;
  }

  // Game is ended, first player to click resets it and becomes host
  const result = roomManager.resetGame(room!.id, payload.playerId);

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: buildErrorPayload(result.error || 'Failed to reset game'),
    });
    return;
  }

  // Set this player as the new host
  room!.hostId = payload.playerId;

  // Reset all players' ready status
  for (const player of room!.players.values()) {
    player.isReady = player.id === payload.playerId;
  }

  // Broadcast to all players that game has been reset
  broadcastToRoom(clients, room!.id, {
    type: 'GAME_RESET',
    payload: buildGameResetPayload(serializeRoom(room!)),
  });
}
