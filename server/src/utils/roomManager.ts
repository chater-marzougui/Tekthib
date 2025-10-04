import { Room } from '../types';
import { PlayerWithHand } from 'shared';
import { GameEngine } from '../game/GameEngine';

class RoomManager {
  private readonly rooms: Map<string, Room> = new Map();
  private readonly gameEngines: Map<string, GameEngine> = new Map();

  generateRoomCode(): string {
    // Generate 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Ensure uniqueness
    if (this.getRoomByCode(code)) {
      return this.generateRoomCode();
    }

    return code;
  }

  createRoom(hostId: string, hostName: string, maxPlayers: number = 10, isPublic: boolean = true): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const code = this.generateRoomCode();

    const host: PlayerWithHand = {
      id: hostId,
      name: hostName,
      hand: [],
      isConnected: true,
      isReady: false,
      isBot: false,
    };

    const room: Room = {
      id: roomId,
      code,
      hostId,
      players: new Map([[hostId, host]]),
      gameState: null,
      createdAt: new Date(),
      maxPlayers,
      isPublic,
      hostName,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find((room) => room.code === code);
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addPlayerToRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    isBot: boolean = false,
  ): {
    success: boolean;
    error?: string;
    room?: Room;
  } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.gameState?.phase === 'playing' && !isBot) {
      return { success: false, error: 'Game already in progress' };
    }

    const player: PlayerWithHand = {
      id: playerId,
      name: playerName,
      hand: [],
      isConnected: true,
      isReady: isBot, // Bots are always ready
      isBot,
    };

    room.players.set(playerId, player);
    return { success: true, room };
  }

  addBotsToRoom(
    roomId: string,
    count: number,
  ): {
    success: boolean;
    error?: string;
    botIds?: string[];
  } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const availableSlots = room.maxPlayers - room.players.size;
    if (count > availableSlots) {
      return {
        success: false,
        error: `Only ${availableSlots} slots available`,
      };
    }

    const botIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const botName = `Bot ${room.players.size + 1}`;

      const result = this.addPlayerToRoom(roomId, botId, botName, true);
      if (result.success) {
        botIds.push(botId);
      }
    }

    return { success: true, botIds };
  }

  removeBotFromRoom(
    roomId: string,
    botId: string,
  ): {
    success: boolean;
    error?: string;
  } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const bot = room.players.get(botId);

    if (!bot) {
      return { success: false, error: 'Bot not found in room' };
    }

    if (!bot.isBot) {
      return { success: false, error: 'Player is not a bot' };
    }

    // Check if game is in progress
    if (room.gameState?.phase === 'playing') {
      return { success: false, error: 'Cannot remove bot during active game' };
    }

    // Remove the bot from the room
    room.players.delete(botId);

    // If the bot was the host, assign new host
    if (botId === room.hostId) {
      const newHostId = Array.from(room.players.keys())[0];
      room.hostId = newHostId;
    }

    return { success: true };
  }

  removePlayerFromRoom(
    roomId: string,
    playerId: string,
  ): {
    success: boolean;
    roomDeleted: boolean;
  } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, roomDeleted: false };
    }

    room.players.delete(playerId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      this.gameEngines.delete(roomId);
      return { success: true, roomDeleted: true };
    }

    // If host left, assign new host
    if (playerId === room.hostId) {
      const newHostId = Array.from(room.players.keys())[0];
      room.hostId = newHostId;
    }

    return { success: true, roomDeleted: false };
  }

  setPlayerReady(roomId: string, playerId: string, ready: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.isReady = ready;
    return true;
  }

  canStartGame(roomId: string): {
    canStart: boolean;
    reason?: string;
  } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { canStart: false, reason: 'Room not found' };
    }

    if (room.players.size < 3) {
      return { canStart: false, reason: 'Need at least 3 players' };
    }

    const allReady = Array.from(room.players.values()).every((p) => p.isReady || p.isBot);
    if (!allReady) {
      return { canStart: false, reason: 'Not all players are ready' };
    }

    return { canStart: true };
  }

  startGame(roomId: string): GameEngine | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const gameEngine = new GameEngine(room.players);
    this.gameEngines.set(roomId, gameEngine);
    room.gameState = gameEngine.getGameState();

    return gameEngine;
  }

  resetGame(roomId: string): {
    success: boolean;
    error?: string;
    room?: Room;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.players.forEach((player) => {
      if (!player.isBot) {
        player.isReady = false;
      } else {
        player.isReady = true; // Bots are always ready
      }
      player.hand = [];
    });

    // Clear game engine and state
    this.gameEngines.delete(roomId);
    room.gameState = null;

    return { success: true, room };
  }

  getGameEngine(roomId: string): GameEngine | undefined {
    return this.gameEngines.get(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(room => room.isPublic);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours

    for (const [roomId, room] of this.rooms.entries()) {
      const age = now - room.createdAt.getTime();

      // Delete old inactive rooms
      if (age > maxAge) {
        this.rooms.delete(roomId);
        this.gameEngines.delete(roomId);
      }
    }
  }

  getSystemState() {
    const rooms = Array.from(this.rooms.values()).map((room) => {
      const players = Array.from(room.players.values());
      const gameEngine = this.gameEngines.get(room.id);

      return {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt,
        playerCount: players.length,
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isConnected: p.isConnected,
          cardCount: p.hand.length,
        })),
        gameState: gameEngine
          ? {
              phase: gameEngine.getGameState().phase,
              currentPlayerIndex: gameEngine.getGameState().currentPlayerIndex,
              pileCount: gameEngine.getGameState().pile.length,
              currentRank: gameEngine.getGameState().currentRank,
            }
          : null,
      };
    });

    return {
      totalRooms: this.rooms.size,
      totalPlayers: Array.from(this.rooms.values()).reduce(
        (sum, room) => sum + room.players.size,
        0,
      ),
      rooms,
    };
  }
}

export const roomManager = new RoomManager();

// Cleanup every 30 minutes
setInterval(
  () => {
    roomManager.cleanup();
  },
  30 * 60 * 1000,
);
