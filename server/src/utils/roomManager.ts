import { Room, Player } from '../types';
import { GameEngine } from '../game/GameEngine';

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private gameEngines: Map<string, GameEngine> = new Map();

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

  createRoom(hostId: string, hostName: string, maxPlayers: number = 10): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const code = this.generateRoomCode();

    const host: Player = {
      id: hostId,
      name: hostName,
      hand: [],
      isConnected: true,
      isReady: false
    };

    const room: Room = {
      id: roomId,
      code,
      hostId,
      players: new Map([[hostId, host]]),
      gameState: null,
      createdAt: new Date(),
      maxPlayers
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addPlayerToRoom(roomId: string, playerId: string, playerName: string): {
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

    if (room.gameState?.phase === 'playing') {
      return { success: false, error: 'Game already in progress' };
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      isConnected: true,
      isReady: false
    };

    room.players.set(playerId, player);
    return { success: true, room };
  }

  removePlayerFromRoom(roomId: string, playerId: string): {
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

    const allReady = Array.from(room.players.values()).every(p => p.isReady);
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

  getGameEngine(roomId: string): GameEngine | undefined {
    return this.gameEngines.get(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
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
}

export const roomManager = new RoomManager();

// Cleanup every 30 minutes
setInterval(() => {
  roomManager.cleanup();
}, 30 * 60 * 1000);