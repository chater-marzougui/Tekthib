import { WebSocket } from 'ws';
import { WSMessage, PlayCardsPayload, ChallengePayload } from 'shared';
import { roomManager } from '../../utils/roomManager';
import { sendToClient, broadcastToRoom } from '../index';
import { GameEngine } from '../../game/GameEngine';

interface ClientInfo {
  id: string;
  roomId?: string;
  name?: string;
}

interface GetGameStatePayload {
  roomCode: string;
  playerId: string;
}

export function handleGameMessages(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  message: WSMessage,
): void {
  switch (message.type) {
    case 'GET_GAME_STATE':
      handleGetGameState(ws, clients, message.payload as GetGameStatePayload);
      break;

    case 'PLAY_CARDS':
      handlePlayCards(ws, clients, message.payload as PlayCardsPayload);
      break;

    case 'CHALLENGE':
      handleChallenge(ws, clients, message.payload as ChallengePayload);
      break;
  }
}

/**
 * Exported function to trigger bot turn from external handlers
 */
export function triggerBotTurn(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
): void {
  const gameEngine = roomManager.getGameEngine(roomId);
  if (gameEngine) {
    setTimeout(() => {
      processBotTurn(clients, roomId, gameEngine);
    }, 3500); // Give players time to see the initial state
  }
}

/**
 * Exported function to setup game engine callbacks
 */
export function setupGameEngineCallbacks(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  // Set up timer broadcast callback to keep clients updated
  gameEngine.setTimerBroadcastCallback(() => {
    const publicGameState = gameEngine.getPublicGameState();
    
    // Broadcast updated timer to all clients in the room
    broadcastToRoom(clients, roomId, {
      type: 'TIMER_UPDATE',
      payload: {
        remainingTime: publicGameState.remainingTime,
      },
    });
  });

  // Set up auto-play callback to notify when a player times out
  gameEngine.setAutoPlayCallback((playerId: string, cardIds: string[], claimedRank: string) => {
    const room = roomManager.getRoom(roomId);
    const player = room?.players.get(playerId);
    const publicGameState = gameEngine.getPublicGameState();

    // Broadcast the auto-played cards
    broadcastToRoom(clients, roomId, {
      type: 'CARDS_PLAYED',
      payload: {
        playerId: playerId,
        playerName: player?.name || 'Unknown',
        cardCount: cardIds.length,
        claimedRank: claimedRank,
        gameState: publicGameState,
        wasAutoPlayed: true, // Flag to indicate this was an auto-play
      },
    });

    // Send updated hands to all players
    clients.forEach((client, clientWs) => {
      if (client.roomId === roomId) {
        sendToClient(clientWs, {
          type: 'GAME_STATE_UPDATE',
          payload: {
            hand: gameEngine.getPlayerHand(client.id),
            gameState: publicGameState,
          },
        });
      }
    });

    // Check if game ended
    if (publicGameState.phase === 'ended') {
      gameEngine.stopTurnTimer();
      broadcastToRoom(clients, roomId, {
        type: 'GAME_ENDED',
        payload: {
          winners: publicGameState.winners,
          loser: publicGameState.loser,
          gameState: publicGameState,
        },
      });
      return;
    }

    // Start timer for next turn
    startTimerForRoom(clients, roomId, gameEngine);

    // After auto-play, check if any bot wants to challenge
    setTimeout(() => {
      processBotChallenge(clients, roomId, gameEngine);
    }, 3000);
  });
}

/**
 * Start timer for the current turn (simpler version - callbacks already set)
 */
function startTimerForRoom(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  // Just start the timer - callbacks are already configured
  gameEngine.startTurnTimer();
}

function handleGetGameState(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: GetGameStatePayload,
): void {
  const { roomCode, playerId } = payload;

  const room = roomManager.getRoomByCode(roomCode);
  if (!room) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Room not found' },
    });
    return;
  }

  // Check if player is in the room
  const player = room.players.get(playerId);
  if (!player) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Player not in room' },
    });
    return;
  }

  // Update client info to reconnect to room
  const clientInfo = clients.get(ws);
  if (clientInfo) {
    clientInfo.roomId = room.id;
    clientInfo.name = player.name;
  }

  const gameEngine = roomManager.getGameEngine(room.id);
  if (!gameEngine) {
    // Game not started yet, send room info
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
        playerId,
      },
    });
    return;
  }

  // Game is started, send game state and hand
  const publicGameState = gameEngine.getPublicGameState();
  const playerHand = gameEngine.getPlayerHand(playerId);
  sendToClient(ws, {
    type: 'INITIAL_GAME_STATE',
    payload: {
      hand: playerHand,
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

function handlePlayCards(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: PlayCardsPayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const gameEngine = roomManager.getGameEngine(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Game not started' },
    });
    return;
  }

  const result = gameEngine.playCards(
    clientInfo.id,
    payload.cardIds,
    payload.claimedRank,
  );

  if (!result.success) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error },
    });
    return;
  }

  const publicGameState = gameEngine.getPublicGameState();

  // Broadcast to all players in room
  broadcastToRoom(clients, clientInfo.roomId, {
    type: 'CARDS_PLAYED',
    payload: {
      playerId: clientInfo.id,
      playerName: clientInfo.name,
      cardCount: payload.cardIds.length,
      claimedRank: payload.claimedRank,
      gameState: publicGameState,
    },
  });

  // Send updated hand to the player who just played
  sendToClient(ws, {
    type: 'GAME_STATE_UPDATE',
    payload: {
      hand: gameEngine.getPlayerHand(clientInfo.id),
      gameState: publicGameState,
    },
  });

  // Check if game ended
  if (publicGameState.phase === 'ended') {
    gameEngine.stopTurnTimer();
    broadcastToRoom(clients, clientInfo.roomId, {
      type: 'GAME_ENDED',
      payload: {
        winners: publicGameState.winners,
        loser: publicGameState.loser,
        gameState: publicGameState,
      },
    });
    return;
  }

  // Start timer for next turn
  startTimerForRoom(clients, clientInfo.roomId, gameEngine);

  // After a human plays, check if any bot wants to challenge
  setTimeout(() => {
    processBotChallenge(clients, clientInfo.roomId!, gameEngine);
  }, 3000); // 3 second delay for realism
}

function handleChallenge(
  ws: WebSocket,
  clients: Map<WebSocket, ClientInfo>,
  payload: ChallengePayload,
): void {
  const clientInfo = clients.get(ws)!;

  if (!clientInfo.roomId) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Not in a room' },
    });
    return;
  }

  const gameEngine = roomManager.getGameEngine(clientInfo.roomId);
  if (!gameEngine) {
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: 'Game not started' },
    });
    return;
  }

  const result = gameEngine.challenge(payload.challengerId, payload.lastPlayInfo);

  if (!result.success) {
    // If mismatch, silently ignore (game has moved on)
    if (result.mismatch) {
      return;
    }
    sendToClient(ws, {
      type: 'ERROR',
      payload: { message: result.error },
    });
    return;
  }

  // Store roomId for use in setTimeout
  const roomId = clientInfo.roomId;
  const room = roomManager.getRoom(roomId);

  // Immediately broadcast that a challenge has been submitted
  // This allows clients to play suspense sound if enabled
  if (room?.challengeSuspenseEnabled) {
    broadcastToRoom(clients, roomId, {
      type: 'CHALLENGE_SUBMITTED',
      payload: {
        challengerId: payload.challengerId,
      },
    });
  }

  // Add 3-second delay before revealing challenge result for tension
  setTimeout(() => {
    const publicGameState = gameEngine.getPublicGameState();

    // Get challenger and liar names
    let challengerName = '';
    let playerName = '';

    publicGameState.players.forEach((p) => {
      if (p.id === payload.challengerId) {
        challengerName = p.name || 'Unknown';
      }
      if (p.id === result.playerId) {
        playerName = p.name || 'Unknown';
      }
    });

    // Broadcast challenge result to all players
    broadcastToRoom(clients, roomId, {
      type: 'CHALLENGE_RESULT',
      payload: {
        challengerId: payload.challengerId,
        challengerName,
        wasLying: result.wasLying,
        playerId: result.playerId,
        playerName,
        revealedCards: result.revealedCards,
        gameState: publicGameState,
      },
    });

    // Send updated hands to affected players
    clients.forEach((client, clientWs) => {
      if (client.roomId === roomId) {
        sendToClient(clientWs, {
          type: 'GAME_STATE_UPDATE',
          payload: {
            hand: gameEngine.getPlayerHand(client.id),
            gameState: publicGameState,
          },
        });
      }
    });

    // Start timer for next turn
    startTimerForRoom(clients, roomId, gameEngine);

    // After human challenges, trigger bot turn if needed
    setTimeout(() => {
      processBotTurn(clients, roomId, gameEngine);
    }, 2000);
  }, 3000); // 3-second delay for challenge result reveal
}

/**
 * Process bot challenge after a play
 */
function processBotChallenge(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  if (!gameEngine) return;

  // Get current play info for validation
  const publicGameState = gameEngine.getPublicGameState();
  const lastPlayInfo = publicGameState.lastPlayerId && publicGameState.currentRank
    ? {
        playerId: publicGameState.lastPlayerId,
        claimedRank: publicGameState.currentRank,
      }
    : undefined;

  const botChallengerId = gameEngine.getBotChallenger();

  if (botChallengerId) {
    // Bot challenges!
    const result = gameEngine.challenge(botChallengerId, lastPlayInfo);

    if (result.success) {
      const room = roomManager.getRoom(roomId);
      
      // Immediately broadcast that a challenge has been submitted
      // This allows clients to play suspense sound if enabled
      const challengeSuspenseEnabled = room?.challengeSuspenseEnabled;
      if (challengeSuspenseEnabled) {
        broadcastToRoom(clients, roomId, {
          type: 'CHALLENGE_SUBMITTED',
          payload: {
            challengerId: botChallengerId,
          },
        });
      }
      
      // Add 3-second delay before revealing challenge result for tension
      setTimeout(() => {
        const publicGameState = gameEngine.getPublicGameState();

        // Get challenger and player names
        const challengerPlayer = room?.players.get(botChallengerId);
        const lastPlayer = room?.players.get(result.playerId);

        // Broadcast challenge result
        broadcastToRoom(clients, roomId, {
          type: 'CHALLENGE_RESULT',
          payload: {
            challengerId: botChallengerId,
            challengerName: challengerPlayer?.name || 'Bot',
            wasLying: result.wasLying,
            playerId: result.playerId,
            playerName: lastPlayer?.name || 'Unknown',
            revealedCards: result.revealedCards,
            gameState: publicGameState,
          },
        });

        // Send updated hands
        clients.forEach((client, clientWs) => {
          if (client.roomId === roomId) {
            sendToClient(clientWs, {
              type: 'GAME_STATE_UPDATE',
              payload: {
                hand: gameEngine.getPlayerHand(client.id),
                gameState: publicGameState,
              },
            });
          }
        });

        // Check if game ended after challenge
        if (publicGameState.phase === 'ended') {
          gameEngine.stopTurnTimer();
          broadcastToRoom(clients, roomId, {
            type: 'GAME_ENDED',
            payload: {
              winners: publicGameState.winners,
              loser: publicGameState.loser,
              gameState: publicGameState,
            },
          });
          return;
        }

        // Start timer for next turn after challenge
        startTimerForRoom(clients, roomId, gameEngine);
        
        // After challenge, trigger next bot turn if needed
        setTimeout(() => {
          processBotTurn(clients, roomId, gameEngine);
        }, 3000);
      }, challengeSuspenseEnabled ? 3000 : 0); // 3-second delay for challenge result reveal
    }
  } else {
    // No bot challenged, proceed to next turn (might be a bot)
    setTimeout(() => {
      processBotTurn(clients, roomId, gameEngine);
    }, 1500);
  }
}

/**
 * Process bot turn if current player is a bot
 */
function processBotTurn(
  clients: Map<WebSocket, ClientInfo>,
  roomId: string,
  gameEngine: GameEngine,
): void {
  if (!gameEngine) return;

  const publicGameState = gameEngine.getPublicGameState();

  // Check if game ended
  if (publicGameState.phase === 'ended') {
    broadcastToRoom(clients, roomId, {
      type: 'GAME_ENDED',
      payload: {
        winners: publicGameState.winners,
        loser: publicGameState.loser,
        gameState: publicGameState,
      },
    });
    return;
  }

  if (!gameEngine.isCurrentPlayerBot()) {
    // Current player is human, trigger random bot chat and start timer
    gameEngine.triggerRandomBotChat();
    startTimerForRoom(clients, roomId, gameEngine);
    return;
  }

  const currentPlayerId = publicGameState.currentPlayerId;
  const botPlay = gameEngine.getBotPlay(currentPlayerId);

  if (!botPlay) return;

  // Execute bot play
  const result = gameEngine.playCards(
    currentPlayerId,
    botPlay.cardIds,
    botPlay.claimedRank,
  );

  if (result.success) {
    const updatedGameState = gameEngine.getPublicGameState();
    const room = roomManager.getRoom(roomId);
    const botPlayer = room?.players.get(currentPlayerId);

    // Broadcast bot's play
    broadcastToRoom(clients, roomId, {
      type: 'CARDS_PLAYED',
      payload: {
        playerId: currentPlayerId,
        playerName: botPlayer?.name || 'Bot',
        cardCount: botPlay.cardIds.length,
        claimedRank: botPlay.claimedRank,
        gameState: updatedGameState,
      },
    });

    // Send updated hands
    clients.forEach((client, clientWs) => {
      if (client.roomId === roomId) {
        sendToClient(clientWs, {
          type: 'GAME_STATE_UPDATE',
          payload: {
            hand: gameEngine.getPlayerHand(client.id),
            gameState: updatedGameState,
          },
        });
      }
    });

    // Check if game ended
    if (updatedGameState.phase === 'ended') {
      gameEngine.stopTurnTimer();
      broadcastToRoom(clients, roomId, {
        type: 'GAME_ENDED',
        payload: {
          winners: updatedGameState.winners,
          loser: updatedGameState.loser,
          gameState: updatedGameState,
        },
      });
      return;
    }

    // Start timer for next turn after bot plays
    startTimerForRoom(clients, roomId, gameEngine);

    // After bot plays, check if any bot wants to challenge
    setTimeout(() => {
      processBotChallenge(clients, roomId, gameEngine);
    }, 3000);
  }
}
