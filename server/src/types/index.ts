// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'Joker';

export interface Card {
  id: string;
  suit: Suit | 'joker';
  rank: Rank;
  deckNumber: 1 | 2; // For tracking double deck
}

// Player types
export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isConnected: boolean;
  isReady: boolean;
}

// Room types
export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  gameState: GameState | null;
  createdAt: Date;
  maxPlayers: number;
}

// Game state types
export type GamePhase = 'waiting' | 'playing' | 'ended';

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

// WebSocket message types
export type WSMessageType = 
  | 'JOIN_ROOM'
  | 'CONNECT'
  | 'CONNECTED'
  | 'LEAVE_ROOM'
  | 'CREATE_ROOM'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'ROOM_LEFT'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'READY'
  | 'START_GAME'
  | 'GAME_STARTED'
  | 'PLAY_CARDS'
  | 'CARDS_PLAYED'
  | 'CHALLENGE'
  | 'CHALLENGE_RESULT'
  | 'GAME_STATE_UPDATE'
  | 'TURN_CHANGED'
  | 'GAME_ENDED'
  | 'CHAT_MESSAGE'
  | 'ERROR'
  | 'RTC_OFFER'
  | 'RTC_ANSWER'
  | 'RTC_ICE_CANDIDATE';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  timestamp?: number;
}

// Specific message payloads
export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface CreateRoomPayload {
  playerName: string;
  maxPlayers?: number;
}

export interface PlayCardsPayload {
  cardIds: string[];
  claimedRank: Rank;
}

export interface ChallengePayload {
  challengerId: string;
}

export interface ChatMessagePayload {
  message: string;
  playerId: string;
  playerName: string;
}

export interface RTCSignalPayload {
  targetPlayerId: string;
  signal: any; // RTCSessionDescription or RTCIceCandidate
}