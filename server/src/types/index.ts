import { PlayerWithHand, Card, Rank, GamePhase, PlayerStats } from 'shared';

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, PlayerWithHand>;
  gameState: GameState | null;
  createdAt: Date;
  maxPlayers: number;
  isPublic: boolean;
  hostName: string;
}

export interface GameState {
  phase: GamePhase;
  currentPlayerIndex: number;
  currentRank: Rank | null;
  pile: Card[];
  lastPlayedCards: Card[];
  lastPlayerId: string | null;
  playerOrder: string[]; // Array of player IDs
  winners: string[];
  loser: string | null;
  consecutivePasses: number;
  playerStats: Map<string, PlayerStats>; // Track statistics for each player
}
