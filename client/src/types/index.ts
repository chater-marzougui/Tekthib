import type { Rank, Player, GamePhase } from 'shared';
// Room types
export interface Room {
  id: string;
  code: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
}

export interface GameState {
  phase: GamePhase;
  currentPlayerIndex: number;
  currentPlayerId: string;
  currentRank: Rank | null;
  players: Player[];
  pileCount: number;
  lastPlayedCount: number;
  lastPlayerId: string | null;
  playerOrder: string[];
  winners: string[];
  loser: string | null;
  playerHandCounts: Record<string, number>;
}