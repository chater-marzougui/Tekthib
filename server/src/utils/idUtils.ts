/**
 * Generates a unique ID with timestamp and random suffix
 * @param prefix - The prefix for the ID (e.g., 'room', 'bot')
 * @returns A unique ID string
 */
export function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Reassign host to the first available player if current host left
 * @param players - Map of players in the room
 * @param playerLeavingId - ID of player leaving/being removed
 * @returns New host ID if reassignment was needed, undefined otherwise
 */
export function reassignHostIfNeeded(
  players: Map<string, { id: string }>,
  playerLeavingId: string,
  currentHostId: string,
): string | undefined {
  // Only reassign if the player leaving is the current host
  if (playerLeavingId !== currentHostId) {
    return undefined;
  }

  // Assign first available player as new host
  const newHostId = Array.from(players.keys())[0];
  return newHostId;
}
