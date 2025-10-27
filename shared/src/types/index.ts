// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'Joker';

export const SuitTypes = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

export const RankTypes = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'Joker'] as const;

export const playableRanks = RankTypes.filter(rank => rank !== 'Joker');

export type GamePhase = 'waiting' | 'playing' | 'ended';

export type BotPersonality = 'aggressive' | 'truthful' | 'unpredictable';

export interface Card {
  id: string;
  suit: Suit | 'joker';
  rank: Rank;
  deckNumber: 1 | 2; // For tracking double deck
}

export interface DisplayGameCard extends Card {
  selected: boolean;
}

export interface Player {
  id: string;
  name: string;
  cardCount?: number;
  isConnected: boolean;
  isReady: boolean;
  isBot: boolean;
  botPersonality?: BotPersonality;
}

export interface PlayerWithHand extends Player {
  hand: Card[];
}

export interface LastPlay {
  player: string;
  cardCount: number;
  claimedRank: string;
}

// Player statistics for tracking game performance
export interface PlayerStats {
  timesCaughtBluffing: number;      // Called out and was lying
  timesBluffedSuccessfully: number;  // Lied and wasn't caught
  timesFalselyAccused: number;       // Challenged but was telling truth
  timesToldTruth: number;            // Played cards honestly and wasn't challenged
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
  | 'ADD_BOTS'
  | 'BOTS_ADDED'
  | 'REMOVE_BOT'
  | 'BOT_REMOVED'
  | 'PLAY_CARDS'
  | 'CARDS_PLAYED'
  | 'CHALLENGE'
  | 'CHALLENGE_SUBMITTED'
  | 'CHALLENGE_RESULT'
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
  | 'SWITCH_PLAYER_MIC'
  | 'PLAYER_MIC_SWITCHED'
  | 'PLAY_AGAIN'
  | 'GAME_RESET'
  | 'SPECTATE_ROOM'
  | 'SPECTATOR_JOINED'
  | 'LEAVE_SPECTATE'
  | 'SPECTATOR_LEFT';

  
export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  timestamp?: number;
  autoPlayTimeout?: number;
}

export interface RTCSignalPayload {
  targetPlayerId: string;
  fromPlayerId?: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface KickPlayerPayload {
  playerId: string;
}

export interface MutePlayerPayload {
  playerId: string;
  mute: boolean;
}


// Specific message payloads
export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface CreateRoomPayload {
  playerName: string;
  autoPlayTimeout: number;
  maxPlayers?: number;
  isPublic?: boolean;
  challengeSuspenseEnabled: boolean;
}

export interface StartGamePayload {
  autoPlayTimeout: number;
  challengeSuspenseEnabled: boolean;
}

export interface PlayCardsPayload {
  cardIds: string[];
  claimedRank: Rank;
}

export interface ChallengePayload {
  challengerId: string;
  lastPlayInfo?: {
    playerId: string;
    claimedRank: Rank;
  };
}

export interface ChatMessagePayload {
  message: string;
  playerId: string;
  playerName: string;
  isBotMessage?: boolean; // Flag to indicate this is a bot message with i18n key
}

export interface AddBotsPayload {
  count: number;
}

export interface RemoveBotPayload {
  botId: string;
}

export interface PlayAgainPayload {
  roomCode: string;
  playerId: string;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: {
    total_games: number;
    wins: number;
    losses: number;
    total_cards_played: number;
    total_bluffs: number;
    successful_bluffs: number;
    total_challenges: number;
    successful_challenges: number;
    failed_challenges: number;
    win_rate: number;
    bluff_success_rate: number;
    challenge_success_rate: number;
  };
}

export interface GameHistoryItem {
  id: string;
  player_name: string;
  final_position: number;
  cards_played: number;
  bluffs_made: number;
  successful_bluffs: number;
  challenges_made: number;
  successful_challenges: number;
  is_winner: boolean;
  is_loser: boolean;
  created_at: string;
  games: {
    id: string;
    room_code: string;
    started_at: string;
    ended_at: string;
    total_players: number;
    total_rounds: number;
  };
}
