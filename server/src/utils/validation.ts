import { Room } from '../types';
import { PlayerWithHand } from 'shared';

/**
 * Validation result type for room operations
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a room exists
 */
export function validateRoomExists(room: Room | undefined): ValidationResult {
  if (!room) {
    return { valid: false, error: 'Room not found' };
  }
  return { valid: true };
}

/**
 * Validate that a player is the host of a room
 */
export function validateIsHost(
  room: Room,
  playerId: string,
): ValidationResult {
  if (room.hostId !== playerId) {
    return { valid: false, error: 'Only host can perform this action' };
  }
  return { valid: true };
}

/**
 * Validate that a player exists in a room
 */
export function validatePlayerInRoom(
  room: Room,
  playerId: string,
): ValidationResult {
  const player = room.players.get(playerId);
  if (!player) {
    return { valid: false, error: 'Player not found in room' };
  }
  return { valid: true };
}

/**
 * Validate that a player is not a bot
 */
export function validateNotBot(player: PlayerWithHand): ValidationResult {
  if (player.isBot) {
    return { valid: false, error: 'Cannot perform this action on bots' };
  }
  return { valid: true };
}

/**
 * Validate that a player is not trying to target themselves
 */
export function validateNotSelf(
  playerId: string,
  targetId: string,
): ValidationResult {
  if (playerId === targetId) {
    return { valid: false, error: 'Cannot perform this action on yourself' };
  }
  return { valid: true };
}

/**
 * Validate that a room has space for more players
 */
export function validateRoomHasSpace(
  room: Room,
  additionalPlayers: number = 1,
): ValidationResult {
  const availableSlots = room.maxPlayers - room.players.size;
  if (additionalPlayers > availableSlots) {
    return {
      valid: false,
      error:
        availableSlots === 0
          ? 'Room is full'
          : `Only ${availableSlots} slots available`,
    };
  }
  return { valid: true };
}
