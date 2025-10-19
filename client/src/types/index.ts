import type { Rank, Player, GamePhase, PlayerStats, Card } from "shared";
// Room types
export interface Room {
  id: string;
  code: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
  isPublic: boolean;
  hostName: string;
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
  playerStats: Record<string, PlayerStats>;
  removedCards: Card[];
  remainingTime: number;
  canPlay: boolean;
}

export interface ToastMessage {
  message: string;
  description: string;
  color: "green" | "red" | "blue";
}