import { PlayerWithHand, Card, Rank, GamePhase } from 'shared';

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, PlayerWithHand>;
  gameState: GameState | null;
  createdAt: Date;
  maxPlayers: number;
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
}
