import { Room } from '../types';
import { PlayerWithHand, BotPersonality } from 'shared';
import { GameEngine } from '../game/GameEngine';
import { gameHistoryService } from '../services/gameHistoryService';
import config from '../config/config';

class RoomManager {
  private readonly rooms: Map<string, Room> = new Map();
  private readonly gameEngines: Map<string, GameEngine> = new Map();
  private readonly gameStartTimes: Map<string, Date> = new Map();

  // Pool of bot names that don't reveal personality
  private readonly botNames: string[] = [
    'Bot Alpha',
    'Bot Beta',
    'Bot Gamma',
    'Bot Delta',
    'Bot Echo',
    'Bot Nova',
    'Bot Omega',
    'Bot Zeta',
    'Bot Sigma',
    'Bot Phoenix',
    'Bot Nexus',
    'Bot Titan',
    'Bot Cyber',
    'Bot Quantum',
    'Bot Phantom',
  ];

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

  /**
   * Get an available bot name that's not already taken in the room
   */
  private getAvailableBotName(room: Room): string {
    const existingNames = new Set(
      Array.from(room.players.values()).map(p => p.name)
    );

    // Shuffle bot names for variety
    const shuffledNames = [...this.botNames].sort(() => Math.random() - 0.5);

    // Find first available name
    for (const name of shuffledNames) {
      if (!existingNames.has(name)) {
        return name;
      }
    }

    // If all names taken, add a number suffix
    let counter = 1;
    while (existingNames.has(`Bot Player ${counter}`)) {
      counter++;
    }
    return `Bot Player ${counter}`;
  }

  createRoom(
    hostId: string,
    hostName: string,
    autoPlayTimeout: number,
    challengeSuspenseEnabled: boolean,
    maxPlayers: number = 10,
    isPublic: boolean = true,
  ): Room {
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
      autoPlayTimeout,
      challengeSuspenseEnabled,
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

    const personalities: BotPersonality[] = [
      'aggressive',
      'truthful',
      'unpredictable',
    ];
    const botIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const personality = personalities[i % personalities.length]; // Distribute personalities evenly

      // Get an available bot name (doesn't reveal personality)
      const botName = this.getAvailableBotName(room);

      const bot: PlayerWithHand = {
        id: botId,
        name: botName,
        hand: [],
        isConnected: true,
        isReady: true,
        isBot: true,
        botPersonality: personality,
      };

      room.players.set(botId, bot);
      botIds.push(botId);
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

    const allReady = Array.from(room.players.values()).every(
      (p) => p.isReady || p.isBot,
    );
    if (!allReady) {
      return { canStart: false, reason: 'Not all players are ready' };
    }

    return { canStart: true };
  }

  startGame(
    roomId: string,
    botChatCallback?: (botId: string, message: string) => void,
  ): GameEngine | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const gameEngine = new GameEngine(room.players, room.autoPlayTimeout);

    // Set up bot chat callback if provided
    if (botChatCallback) {
      gameEngine.setBotChatCallback(botChatCallback);
    }

    // Set up game end callback to save history
    gameEngine.setGameEndCallback(() => {
      this.saveGameHistory(roomId).catch((error) => {
        console.error('Failed to save game history:', error);
      });
    });

    // Track game start time
    this.gameStartTimes.set(roomId, new Date());

    this.gameEngines.set(roomId, gameEngine);
    room.gameState = gameEngine.getGameState();
    room.gameState.phase = 'playing';
    return gameEngine;
  }

  resetGame(
    roomId: string,
    playerId: string,
  ): {
    success: boolean;
    error?: string;
    room?: Room;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.players.forEach((player) => {
      if (!player.isBot && player.id !== playerId) {
        player.isReady = false;
      } else {
        player.isReady = true; // Bots and host are always ready
      }
      player.hand = [];
    });

    // Clear game engine, state, and start time
    this.gameEngines.delete(roomId);
    this.gameStartTimes.delete(roomId);
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
    return Array.from(this.rooms.values()).filter((room) => room.isPublic);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Clean up game engine resources
    const gameEngine = this.gameEngines.get(roomId);
    if (gameEngine) {
      gameEngine.cleanup();
    }

    this.rooms.delete(roomId);
    this.gameEngines.delete(roomId);
    return true;
  }

  deleteAllRooms(): number {
    let deletedCount = 0;
    for (const roomId of this.rooms.keys()) {
      if (this.deleteRoom(roomId)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  cleanup(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      const allPlayerBotsOrDisconnected = Array.from(
        room.players.values(),
      ).every((player) => player.isBot || !player.isConnected);
      // Delete old inactive rooms
      if (allPlayerBotsOrDisconnected) {
        // Clean up game engine resources
        const gameEngine = this.gameEngines.get(roomId);
        if (gameEngine) {
          gameEngine.cleanup();
        }
        this.rooms.delete(roomId);
        this.gameEngines.delete(roomId);
      }
    }
  }

  setAutoPlayTimeout(roomId: string, timeout: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.autoPlayTimeout = timeout;
    return true;
  }

  setChallengeSuspense(roomId: string, enabled: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.challengeSuspenseEnabled = enabled;
    return true;
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

  /**
   * Save game history to database when game ends
   * Only saves if Supabase is configured
   */
  async saveGameHistory(roomId: string): Promise<void> {
    // Check if Supabase is configured
    if (!config.supabase.url || !config.supabase.serviceKey) {
      console.log('Supabase not configured, skipping game history save');
      return;
    }

    const room = this.rooms.get(roomId);
    const gameEngine = this.gameEngines.get(roomId);
    const startTime = this.gameStartTimes.get(roomId);

    if (!room || !gameEngine || !startTime) {
      console.error('Cannot save game history: room, game engine, or start time not found');
      return;
    }

    const gameState = gameEngine.getGameState();
    if (gameState.phase !== 'ended') {
      console.error('Cannot save game history: game has not ended');
      return;
    }

    try {
      const endTime = new Date();
      const participants = Array.from(room.players.entries()).map(([playerId, player], index) => {
        const stats = gameState.playerStats.get(playerId);
        const isWinner = gameState.winners.includes(playerId);
        const isLoser = gameState.loser === playerId;

        // Calculate stats from PlayerStats interface
        const bluffsMade = (stats?.timesBluffedSuccessfully || 0) + (stats?.timesCaughtBluffing || 0);
        const successfulBluffs = stats?.timesBluffedSuccessfully || 0;
        const challengesMade = (stats?.timesCaughtBluffing || 0) + (stats?.timesFalselyAccused || 0);
        const successfulChallenges = stats?.timesCaughtBluffing || 0;
        const failedChallenges = stats?.timesFalselyAccused || 0;
        const cardsPlayed = (stats?.timesToldTruth || 0) + bluffsMade;

        return {
          userId: playerId,
          playerName: player.name,
          finalPosition: isWinner ? gameState.winners.indexOf(playerId) + 1 : 
                        isLoser ? room.players.size : index + 1,
          cardsPlayed,
          bluffsMade,
          successfulBluffs,
          challengesMade,
          successfulChallenges,
          failedChallenges,
          isWinner,
          isLoser,
          isBot: player.isBot || false,
        };
      });

      // Calculate total challenges from player stats
      const totalChallenges = Array.from(gameState.playerStats.values()).reduce(
        (sum, stats) => sum + ((stats?.timesCaughtBluffing || 0) + (stats?.timesFalselyAccused || 0)),
        0,
      );

      await gameHistoryService.saveGame(
        {
          roomCode: room.code,
          startedAt: startTime,
          endedAt: endTime,
          winnerUserId: gameState.winners[0],
          loserUserId: gameState.loser || undefined,
          totalPlayers: room.players.size,
          totalRounds: 0, // We don't track rounds currently
          totalChallenges,
          gameSettings: {
            maxPlayers: room.maxPlayers,
            autoPlayTimeout: room.autoPlayTimeout,
            challengeSuspenseEnabled: room.challengeSuspenseEnabled,
          },
        },
        participants,
        [], // Events - we'll add these in future iterations
      );

      console.log(`Game history saved for room ${room.code}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error saving game history for room ${roomId}:`, errorMessage);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
}

export const roomManager = new RoomManager();

// Cleanup every 20 minutes
setInterval(
  () => {
    roomManager.cleanup();
  },
  20 * 60 * 1000,
);
