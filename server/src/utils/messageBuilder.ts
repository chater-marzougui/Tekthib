import { SerializedRoom } from './serialization';

/**
 * Build room created payload
 */
export function buildRoomCreatedPayload(room: SerializedRoom, playerId: string) {
  return {
    room,
    playerId,
  };
}

/**
 * Build room joined payload
 */
export function buildRoomJoinedPayload(room: SerializedRoom, playerId: string) {
  return {
    room,
    playerId,
  };
}

/**
 * Build player joined payload
 */
export function buildPlayerJoinedPayload(
  playerId: string,
  playerName: string,
  isBot: boolean = false,
) {
  return {
    player: {
      id: playerId,
      name: playerName,
      isReady: false,
      isConnected: true,
      isBot,
    },
  };
}

/**
 * Build player left payload
 */
export function buildPlayerLeftPayload(
  playerId: string,
  playerName?: string,
  newHostId?: string,
  kicked: boolean = false,
) {
  return {
    playerId,
    playerName,
    newHostId,
    kicked,
  };
}

/**
 * Build error payload
 */
export function buildErrorPayload(message: string, code?: string) {
  return { message, code };
}

/**
 * Build game reset payload
 */
export function buildGameResetPayload(room: SerializedRoom) {
  return { room };
}
