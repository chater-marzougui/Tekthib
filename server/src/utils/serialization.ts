import { Room } from '../types';
import { PlayerWithHand } from 'shared';

/**
 * Serialized player data for client transmission
 */
export interface SerializedPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  isBot: boolean;
}

/**
 * Serialized room data for client transmission
 */
export interface SerializedRoom {
  id: string;
  code: string;
  hostId: string;
  maxPlayers: number;
  autoPlayTimeout: number;
  challengeSuspenseEnabled: boolean;
  players: SerializedPlayer[];
}

/**
 * Serialize a single player for client transmission
 */
export function serializePlayer(player: PlayerWithHand): SerializedPlayer {
  return {
    id: player.id,
    name: player.name,
    isReady: player.isReady,
    isConnected: player.isConnected,
    isBot: player.isBot,
  };
}

/**
 * Serialize all players in a room
 */
export function serializePlayers(
  players: Map<string, PlayerWithHand>,
): SerializedPlayer[] {
  return Array.from(players.values()).map(serializePlayer);
}

/**
 * Serialize room data for client transmission
 */
export function serializeRoom(room: Room): SerializedRoom {
  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    autoPlayTimeout: room.autoPlayTimeout,
    challengeSuspenseEnabled: room.challengeSuspenseEnabled,
    players: serializePlayers(room.players),
  };
}
