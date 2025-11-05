import { PlayerStats } from 'shared';

/**
 * Calculate player statistics from game state stats
 */
export function calculatePlayerGameStats(stats: PlayerStats | undefined) {
  const bluffsMade =
    (stats?.timesBluffedSuccessfully || 0) + (stats?.timesCaughtBluffing || 0);
  const successfulBluffs = stats?.timesBluffedSuccessfully || 0;
  const challengesMade =
    (stats?.timesCaughtBluffing || 0) + (stats?.timesFalselyAccused || 0);
  const successfulChallenges = stats?.timesCaughtBluffing || 0;
  const failedChallenges = stats?.timesFalselyAccused || 0;
  const cardsPlayed = (stats?.timesToldTruth || 0) + bluffsMade;

  return {
    bluffsMade,
    successfulBluffs,
    challengesMade,
    successfulChallenges,
    failedChallenges,
    cardsPlayed,
  };
}

/**
 * Calculate final position of a player in the game
 */
export function calculateFinalPosition(
  isWinner: boolean,
  isLoser: boolean,
  winnersList: string[],
  playerId: string,
  roomSize: number,
  index: number,
): number {
  if (isWinner) {
    return winnersList.indexOf(playerId) + 1;
  }

  if (isLoser) {
    return roomSize;
  }

  return index + 1;
}

/**
 * Calculate total challenges from player stats
 */
export function calculateTotalChallenges(
  playerStatsMap: Map<string, PlayerStats>,
): number {
  return Array.from(playerStatsMap.values()).reduce(
    (sum, stats) =>
      sum +
      ((stats?.timesCaughtBluffing || 0) + (stats?.timesFalselyAccused || 0)),
    0,
  );
}
