// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'Joker';

export interface Card {
  id: string;
  suit: Suit | 'joker';
  rank: Rank;
  deckNumber: 1 | 2;
}

// Player types
export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  handCount?: number;
  isBot?: boolean;
}

// Room types
export interface Room {
  id: string;
  code: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
}

// Game state types
export type GamePhase = 'waiting' | 'playing' | 'ended';

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

// WebSocket message types
export type WSMessageType = 
  | 'JOIN_ROOM'
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
  | 'GET_GAME_STATE'
  | 'INITIAL_GAME_STATE'
  | 'PLAY_CARDS'
  | 'CARDS_PLAYED'
  | 'CHALLENGE'
  | 'CHALLENGE_RESULT'
  | 'ADD_BOTS'
  | 'BOTS_ADDED'
  | 'GAME_STATE_UPDATE'
  | 'TURN_CHANGED'
  | 'GAME_ENDED'
  | 'CHAT_MESSAGE'
  | 'ERROR'
  | 'RTC_OFFER'
  | 'RTC_ANSWER'
  | 'RTC_ICE_CANDIDATE'
  | 'CONNECT'
  | 'CONNECTED'
  | 'KICK_PLAYER'
  | 'PLAYER_KICKED'
  | 'MUTE_PLAYER'
  | 'PLAYER_MUTED';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  timestamp?: number;
}

// WebRTC signal payload
export interface RTCSignalPayload {
  targetPlayerId: string;
  fromPlayerId?: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

// Host control payloads
export interface KickPlayerPayload {
  playerId: string;
}

export interface MutePlayerPayload {
  playerId: string;
}