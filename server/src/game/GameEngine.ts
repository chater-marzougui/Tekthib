import {
  Card,
  Player,
  PlayerStats,
  PlayerWithHand,
  Rank,
  Suit,
  SuitTypes,
  BotPersonality,
} from 'shared';
import { Deck } from './Deck';
import { BotPlayer } from './BotPlayer';
import { GameState } from '../types';

export interface GameEvent {
  eventType: 'game_start' | 'round_start' | 'cards_played' | 'challenge' | 'round_end' | 'game_end';
  playerUserId?: string;
  playerName: string;
  eventData: Record<string, unknown>;
  roundNumber?: number;
  timestamp: Date;
}

interface ReturnGameState
  extends Omit<GameState, 'pile' | 'lastPlayedCards' | 'playerStats'> {
  currentPlayerId: string;
  players: Player[];
  pileCount: number;
  lastPlayedCount: number;
  playerHandCounts: {
    [k: string]: number;
  };
  playerStats: { [k: string]: PlayerStats };
  remainingTime: number;
  canPlay: boolean;
}

export class GameEngine {
  private readonly gameState: GameState;
  private readonly players: Map<string, PlayerWithHand>;
  private readonly botPlayers: Map<string, BotPlayer> = new Map();
  private readonly autoPlayTimeout: number = 0;
  private botChatCallback?: (botId: string, message: string) => void;
  private turnTimer: NodeJS.Timeout | null = null;
  private turnStartTime: number = 0;
  private autoPlayCallback?: (playerId: string, cardIds: string[], claimedRank: Rank) => void;
  private processingChallenge: boolean = false;
  private gameEndCallback?: () => void;
  private readonly gameEvents: GameEvent[] = [];
  private currentRoundNumber: number = 0;

  constructor(players: Map<string, PlayerWithHand>, autoPlayTimeout: number = 0) {
    this.players = players;
    this.autoPlayTimeout = autoPlayTimeout;
    this.gameState = this.initializeGame();

    // Initialize bot players with their personalities
    players.forEach((player, playerId) => {
      if (player.isBot) {
        const personality = player.botPersonality || this.assignRandomPersonality();
        const botPlayer = new BotPlayer(this, playerId, personality);
        this.botPlayers.set(playerId, botPlayer);
      }
    });
  }

  /**
   * Set callback for bot chat messages
   */
  setBotChatCallback(callback: (botId: string, message: string) => void): void {
    this.botChatCallback = callback;
    
    // Set chat callback for all bot players
    this.botPlayers.forEach((bot, botId) => {
      bot.setChatCallback((message: string) => {
        callback(botId, message);
      });
    });
  }

  /**
   * Set callback for auto-play events
   */
  setAutoPlayCallback(callback: (playerId: string, cardIds: string[], claimedRank: Rank) => void): void {
    this.autoPlayCallback = callback;
  }

  /**
   * Set callback for game end events
   */
  setGameEndCallback(callback: () => void): void {
    this.gameEndCallback = callback;
  }

  /**
   * Assign a random personality to a bot
   */
  private assignRandomPersonality(): BotPersonality {
    const personalities: BotPersonality[] = ['aggressive', 'truthful', 'unpredictable'];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  private initializeGame(): GameState {
    const playerOrder = Array.from(this.players.keys());

    // Shuffle player order
    for (let i = playerOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerOrder[i], playerOrder[j]] = [playerOrder[j], playerOrder[i]];
    }

    // Distribute cards
    const deck = new Deck();
    const hands = deck.distributeCards(this.players.size);
    const removedCards: Card[] = [];

    playerOrder.forEach((playerId, index) => {
      const player = this.players.get(playerId);
      if (player) {
        player.hand = hands[index];
        removedCards.push(...this.checkAndRemoveFourOfKind(player, true));
      }
    });

    // Initialize player stats
    const playerStats = new Map<string, import('shared').PlayerStats>();
    playerOrder.forEach((playerId) => {
      playerStats.set(playerId, {
        timesCaughtBluffing: 0,
        timesBluffedSuccessfully: 0,
        timesFalselyAccused: 0,
        timesToldTruth: 0,
      });
    });

    return {
      phase: 'waiting',
      currentPlayerIndex: 0,
      currentRank: null,
      pile: [],
      lastPlayedCards: [],
      lastPlayerId: null,
      playerOrder,
      winners: [],
      loser: null,
      consecutivePasses: 0,
      playerStats,
      removedCards,
    };
  }

  /**
   * Record the initial game state when the game starts
   */
  recordGameStart(): void {
    // Build initial state data
    const playerData: Record<string, unknown>[] = [];
    this.gameState.playerOrder.forEach((playerId) => {
      const player = this.players.get(playerId);
      if (player) {
        playerData.push({
          playerId,
          playerName: player.name,
          isBot: player.isBot,
          initialHandSize: player.hand.length,
        });
      }
    });

    this.addGameEvent({
      eventType: 'game_start',
      playerName: 'System',
      eventData: {
        totalPlayers: this.players.size,
        playerOrder: this.gameState.playerOrder,
        players: playerData,
        removedCardsCount: this.gameState.removedCards.length,
      },
      timestamp: new Date(),
    });

    // Start the first round
    this.startNewRound();
  }

  /**
   * Start a new round
   */
  private startNewRound(): void {
    this.currentRoundNumber++;
    const currentPlayer = this.players.get(this.gameState.playerOrder[this.gameState.currentPlayerIndex]);
    
    this.addGameEvent({
      eventType: 'round_start',
      playerUserId: currentPlayer?.id,
      playerName: currentPlayer?.name || 'Unknown',
      eventData: {
        roundNumber: this.currentRoundNumber,
        startingPlayerId: currentPlayer?.id,
        startingPlayerName: currentPlayer?.name,
      },
      roundNumber: this.currentRoundNumber,
      timestamp: new Date(),
    });
  }

  /**
   * Add a game event to the history
   */
  private addGameEvent(event: GameEvent): void {
    this.gameEvents.push(event);
  }

  /**
   * Get all game events
   */
  getGameEvents(): GameEvent[] {
    return [...this.gameEvents];
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getCurrentPlayer(): Player | undefined {
    const currentPlayerId =
      this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    return this.players.get(currentPlayerId);
  }

  playCards(
    playerId: string,
    cardIds: string[],
    claimedRank: Rank,
  ): {
    success: boolean;
    error?: string;
    newRank?: Rank;
  } {
    // Block all plays while processing a challenge
    if (this.processingChallenge) {
      return { success: false, error: 'Processing Challenge' };
    }

    // Verify it's the player's turn
    const currentPlayerId =
      this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    if (playerId !== currentPlayerId) {
      return { success: false, error: 'Not your turn' };
    }

    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Verify player has these cards
    const playerCardIds = player.hand.map((c) => c.id);
    const allCardsValid = cardIds.every((id) => playerCardIds.includes(id));
    if (!allCardsValid) {
      return { success: false, error: 'Invalid cards' };
    }

    // If there's a current rank, must claim the same rank
    if (
      this.gameState.pile.length > 0 &&
      this.gameState.currentRank &&
      claimedRank !== this.gameState.currentRank
    ) {
      return {
        success: false,
        error: `Must claim ${this.gameState.currentRank}`,
      };
    }

    // If there was a previous play that wasn't challenged, update stats for successful bluff
    if (
      this.gameState.lastPlayerId &&
      this.gameState.lastPlayedCards.length > 0
    ) {
      const previousPlayerId = this.gameState.lastPlayerId;
      const previousClaimedRank = this.gameState.currentRank;
      const previousCards = this.gameState.lastPlayedCards;

      // Check if previous play was a bluff (and got away with it)
      const wasBluff = !previousCards.every(
        (card) => card.rank === previousClaimedRank || card.rank === 'Joker',
      );

      const previousPlayerStats =
        this.gameState.playerStats.get(previousPlayerId);
      if (previousPlayerStats) {
        if (wasBluff) {
          previousPlayerStats.timesBluffedSuccessfully++;
          
          // Record for bot learning
          this.botPlayers.forEach((bot) => {
            bot.recordUnchallengedPlay(previousPlayerId, true);
          });
        } else {
          previousPlayerStats.timesToldTruth++;
          
          // Record for bot learning
          this.botPlayers.forEach((bot) => {
            bot.recordUnchallengedPlay(previousPlayerId, false);
          });
        }
      }
    }

    // Remove cards from player's hand
    const playedCards = player.hand.filter((c) => cardIds.includes(c.id));
    player.hand = player.hand.filter((c) => !cardIds.includes(c.id));

    // Add to pile
    this.gameState.pile.push(...playedCards);
    this.gameState.lastPlayedCards = playedCards;
    this.gameState.lastPlayerId = playerId;
    this.gameState.currentRank = claimedRank;

    // Record the card play event
    this.addGameEvent({
      eventType: 'cards_played',
      playerUserId: playerId,
      playerName: player.name,
      eventData: {
        cardsPlayed: playedCards.map(c => ({ rank: c.rank, suit: c.suit })),
        claimedRank,
        cardsCount: playedCards.length,
        remainingHandSize: player.hand.length,
        pileSize: this.gameState.pile.length,
      },
      roundNumber: this.currentRoundNumber,
      timestamp: new Date(),
    });

    // Check for four of a kind
    for (const player of this.players.values()) {
      if (player.hand.length === 0) continue;
      this.checkAndRemoveFourOfKind(player);
    }

    for (const player of this.players.values()) {
      if (
        player.id === playerId ||
        this.gameState.winners.includes(player.id)
      ) {
        continue;
      } else if (
        player.hand.length === 0 &&
        !this.gameState.winners.includes(player.id)
      ) {
        this.gameState.winners.push(player.id);
      }
    }

    const remainingPlayers = this.gameState.playerOrder.filter(
      (id) => !this.gameState.winners.includes(id),
    );

    if (remainingPlayers.length === 1) {
      this.gameState.loser = remainingPlayers[0];
      this.gameState.phase = 'ended';
      
      // Record game end event
      this.addGameEvent({
        eventType: 'game_end',
        playerName: 'System',
        eventData: {
          winners: this.gameState.winners,
          loser: this.gameState.loser,
          totalRounds: this.currentRoundNumber,
          finalStats: Array.from(this.gameState.playerStats.entries()).map(([playerId, stats]) => ({
            playerId,
            playerName: this.players.get(playerId)?.name,
            stats,
          })),
        },
        timestamp: new Date(),
      });

      // Trigger game end callback
      if (this.gameEndCallback) {
        this.gameEndCallback();
      }
      return { success: true, newRank: claimedRank };
    }

    // Move to next player (skip winners)
    this.advanceTurn();

    return { success: true, newRank: claimedRank };
  }

  challenge(
    challengerId: string,
    lastPlayInfo?: { playerId: string; claimedRank: Rank }
  ): {
    success: boolean;
    wasLying: boolean;
    playerId: string;
    challengerId: string;
    revealedCards: Card[];
    error?: string;
    mismatch?: boolean;
  } {
    if (!this.gameState.lastPlayerId) {
      return {
        success: false,
        wasLying: false,
        playerId: '',
        challengerId: '',
        revealedCards: [],
        error: 'No cards to challenge',
      };
    }

    // Validate lastPlayInfo if provided (fail-safe check)
    if (lastPlayInfo) {
      if (
        lastPlayInfo.playerId !== this.gameState.lastPlayerId ||
        lastPlayInfo.claimedRank !== this.gameState.currentRank
      ) {
        // Play has moved on - silently ignore this challenge
        return {
          success: false,
          wasLying: false,
          playerId: '',
          challengerId: '',
          revealedCards: [],
          mismatch: true,
        };
      }
    }

    const lastPlayer = this.players.get(this.gameState.lastPlayerId);
    const challenger = this.players.get(challengerId);

    if (!lastPlayer || !challenger) {
      return {
        success: false,
        wasLying: false,
        playerId: '',
        challengerId: '',
        revealedCards: [],
        error: 'Player not found',
      };
    }

    // Check if last played cards match claimed rank
    const claimedRank = this.gameState.currentRank!;
    const allMatch = this.gameState.lastPlayedCards.every(
      (card) => card.rank === claimedRank || card.rank === 'Joker', // Jokers are wild
    );

    const wasLying = !allMatch;
    const getsThePile = this.players.get(
      wasLying ? this.gameState.lastPlayerId : challengerId,
    )!;

    // Update player statistics
    const lastPlayerStats = this.gameState.playerStats.get(
      this.gameState.lastPlayerId,
    );
    const challengerStats = this.gameState.playerStats.get(challengerId);

    if (wasLying) {
      // Last player was lying - caught bluffing
      if (lastPlayerStats) lastPlayerStats.timesCaughtBluffing++;
      
      // Record for bot learning
      this.botPlayers.forEach((bot) => {
        bot.recordChallengeResult(challengerId, this.gameState.lastPlayerId!, true);
      });
    } else {
      // Last player was telling truth
      if (lastPlayerStats) lastPlayerStats.timesToldTruth++;
      // Challenger falsely accused
      if (challengerStats) challengerStats.timesFalselyAccused++;
      
      // Record for bot learning
      this.botPlayers.forEach((bot) => {
        bot.recordChallengeResult(challengerId, this.gameState.lastPlayerId!, false);
      });
    }

    // Liar takes the pile
    getsThePile.hand.push(...this.gameState.pile);
    // Check for four of a kind after taking pile
    this.checkAndRemoveFourOfKind(getsThePile);

    // Record the challenge event
    this.addGameEvent({
      eventType: 'challenge',
      playerUserId: challengerId,
      playerName: challenger.name,
      eventData: {
        challengerId,
        challengerName: challenger.name,
        challengedPlayerId: lastPlayer.id,
        challengedPlayerName: lastPlayer.name,
        wasLying,
        claimedRank,
        revealedCards: this.gameState.pile.map(c => ({ rank: c.rank, suit: c.suit })),
        cardsCount: this.gameState.pile.length,
        pileTakenBy: getsThePile.id,
        pileTakenByName: getsThePile.name,
      },
      roundNumber: this.currentRoundNumber,
      timestamp: new Date(),
    });

    // Record round end event
    this.addGameEvent({
      eventType: 'round_end',
      playerName: 'System',
      eventData: {
        roundNumber: this.currentRoundNumber,
        endReason: 'challenge',
        challengeResult: wasLying ? 'caught_bluffing' : 'false_accusation',
      },
      roundNumber: this.currentRoundNumber,
      timestamp: new Date(),
    });

    // If last player was not lying he plays again, else challenger plays next
    let nextPlayerId: string;
    if (wasLying) {
      nextPlayerId = challengerId;
    } else if (lastPlayer.hand.length === 0) {
      if (!this.gameState.winners.includes(lastPlayer.id)) {
        this.gameState.winners.push(lastPlayer.id);
      }
      let nextIndex =
        (this.gameState.currentPlayerIndex + 1) %
        this.gameState.playerOrder.length;
      while (
        this.gameState.winners.includes(this.gameState.playerOrder[nextIndex])
      ) {
        nextIndex = (nextIndex + 1) % this.gameState.playerOrder.length;
      }
      nextPlayerId = this.gameState.playerOrder[nextIndex];
    } else {
      nextPlayerId = this.gameState.lastPlayerId;
    }
    const challengerIndex = this.gameState.playerOrder.indexOf(nextPlayerId);
    this.gameState.currentPlayerIndex = challengerIndex;

    // Reset pile and rank
    const revealedCards = [...this.gameState.pile];
    this.gameState.pile = [];
    this.gameState.currentRank = null;
    this.gameState.lastPlayedCards = [];
    this.gameState.lastPlayerId = null;

    // Start a new round after challenge
    this.startNewRound();

    return {
      success: true,
      wasLying,
      playerId: lastPlayer.id,
      challengerId: challenger.id,
      revealedCards,
    };
  }

  private checkAndRemoveFourOfKind(
    player: PlayerWithHand,
    isInitialCheck: boolean = false,
  ): Card[] {
    const rankGroups = new Map<Rank, Card[]>();
    const removedCardsList: Card[] = []; // This will be the return value

    // Group cards by rank (excluding Jokers)
    player.hand.forEach((card) => {
      if (card.rank !== 'Joker') {
        if (!rankGroups.has(card.rank)) {
          rankGroups.set(card.rank, []);
        }
        rankGroups.get(card.rank)!.push(card);
      }
    });

    // Check each rank group for suit-complete four-of-a-kind or eight-of-a-kind
    rankGroups.forEach((cards, _) => {
      if (cards.length >= 4) {
        const suitCounts = new Map<Suit, Card[]>();
        cards.forEach((card) => {
          if (card.suit !== 'joker') {
            if (!suitCounts.has(card.suit)) {
              suitCounts.set(card.suit, []);
            }
            suitCounts.get(card.suit)!.push(card);
          }
        });

        const hasAllSuits = SuitTypes.every((suit) => suitCounts.has(suit));

        if (hasAllSuits) {
          const canRemoveEight = SuitTypes.every(
            (suit) => (suitCounts.get(suit)?.length || 0) >= 2,
          );

          const cardsToRemove = new Set<string>();
          const cardsToTrack: Card[] = []; // Temporary array for this rank group

          if (canRemoveEight) {
            SuitTypes.forEach((suit) => {
              const cardsOfSuit = suitCounts.get(suit)!;
              cardsToRemove.add(cardsOfSuit[0].id);
              cardsToRemove.add(cardsOfSuit[1].id);
              cardsToTrack.push(cardsOfSuit[0], cardsOfSuit[1]);
            });
          } else {
            SuitTypes.forEach((suit) => {
              const cardOfSuit = suitCounts.get(suit)![0];
              cardsToRemove.add(cardOfSuit.id);
              cardsToTrack.push(cardOfSuit);
            });
          }

          // Add to game state if not initial check
          if (!isInitialCheck) {
            this.gameState.removedCards.push(...cardsToTrack);
          }
          // Always add to return list
          removedCardsList.push(...cardsToTrack);

          // Remove the cards from player's hand
          player.hand = player.hand.filter((c) => !cardsToRemove.has(c.id));
        }
      }
    });

    if (
      player.hand.length === 0 &&
      !this.gameState.winners.includes(player.id)
    ) {
      this.gameState.winners.push(player.id);
    }

    return removedCardsList;
  }

  private advanceTurn(): void {
    const startIndex = this.gameState.currentPlayerIndex;
    let nextIndex = (startIndex + 1) % this.gameState.playerOrder.length;
    let skippedCount = 0;

    // Skip winners
    while (
      this.gameState.winners.includes(this.gameState.playerOrder[nextIndex])
    ) {
      nextIndex = (nextIndex + 1) % this.gameState.playerOrder.length;
      skippedCount++;

      // If we've looped through all players and they're all winners except one
      if (skippedCount >= this.gameState.playerOrder.length) {
        this.gameState.phase = 'ended';
        this.gameState.loser =
          this.gameState.playerOrder.find(
            (id) => !this.gameState.winners.includes(id),
          ) || null;

        // Record game end event
        this.addGameEvent({
          eventType: 'game_end',
          playerName: 'System',
          eventData: {
            winners: this.gameState.winners,
            loser: this.gameState.loser,
            totalRounds: this.currentRoundNumber,
            finalStats: Array.from(this.gameState.playerStats.entries()).map(([playerId, stats]) => ({
              playerId,
              playerName: this.players.get(playerId)?.name,
              stats,
            })),
          },
          timestamp: new Date(),
        });

        // Trigger game end callback
        if (this.gameEndCallback) {
          this.gameEndCallback();
        }

        return;
      }
    }

    this.gameState.currentPlayerIndex = nextIndex;
  }

  getPlayerHand(playerId: string): Card[] {
    const player = this.players.get(playerId);
    return player ? [...player.hand] : [];
  }

  getPublicGameState(): ReturnGameState {
    return {
      phase: this.gameState.phase,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
      currentPlayerId:
        this.gameState.playerOrder[this.gameState.currentPlayerIndex],
      players: Array.from(this.players.values()),
      currentRank: this.gameState.currentRank,
      pileCount: this.gameState.pile.length,
      lastPlayedCount: this.gameState.lastPlayedCards.length,
      lastPlayerId: this.gameState.lastPlayerId,
      playerOrder: this.gameState.playerOrder,
      winners: this.gameState.winners,
      loser: this.gameState.loser,
      playerHandCounts: Object.fromEntries(
        this.gameState.playerOrder.map((id) => [
          id,
          this.players.get(id)?.hand.length || 0,
        ]),
      ),
      consecutivePasses: this.gameState.consecutivePasses,
      playerStats: Object.fromEntries(this.gameState.playerStats),
      removedCards: [...this.gameState.removedCards],
      remainingTime: this.getRemainingTime(),
      canPlay: !this.processingChallenge,
    };
  }

  /**
   * Checks if any bot wants to challenge the current play
   * Returns the bot ID that will challenge, or null if none challenge
   */
  getBotChallenger(): string | null {
    if (!this.gameState.lastPlayerId) {
      return null;
    }

    // Create array of bot IDs and shuffle to prevent first bot from dominating
    const botIds = Array.from(this.botPlayers.keys());
    for (let i = botIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [botIds[i], botIds[j]] = [botIds[j], botIds[i]];
    }

    // Check each bot (except the one who just played)
    for (const botId of botIds) {
      if (botId === this.gameState.lastPlayerId) {
        continue;
      }

      const bot = this.botPlayers.get(botId);
      const botPlayer = this.players.get(botId);
      if (!bot || !botPlayer || this.gameState.winners.includes(botId)) {
        continue;
      }

      const isCurrentPlayer =
        botId === this.gameState.playerOrder[this.gameState.currentPlayerIndex];

      if (bot.shouldChallenge(isCurrentPlayer)) {
        return botId;
      }
    }

    return null;
  }

  /**
   * Gets the bot's play decision
   */
  getBotPlay(botId: string): { cardIds: string[]; claimedRank: Rank } | null {
    const bot = this.botPlayers.get(botId);
    const botPlayer = this.players.get(botId);

    if (!bot || !botPlayer) {
      return null;
    }

    return bot.decidePlay(botPlayer, this.gameState.currentRank);
  }

  /**
   * Check if the current player is a bot
   */
  isCurrentPlayerBot(): boolean {
    const currentPlayerId =
      this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    const player = this.players.get(currentPlayerId);
    return player?.isBot === true;
  }

  /**
   * Trigger random chat from non-current-turn bots
   */
  triggerRandomBotChat(): void {
    const currentPlayerId =
      this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    
    for (const [botId, bot] of this.botPlayers) {
      // Only non-current-turn bots can send random chat
      if (botId !== currentPlayerId) {
        bot.maybeRandomChat();
      }
    }
  }

  /**
   * Start or reset the turn timer
   */
  startTurnTimer(): void {
    // Clear existing timer and broadcast interval
    this.stopTurnTimer();

    // Only start timer if autoPlayTimeout is enabled (>= 10 seconds)
    if (this.autoPlayTimeout < 10) {
      return;
    }

    // Check if there's at least one connected human player
    const hasHumanPlayers = Array.from(this.players.values()).some(
      (p) => !p.isBot && p.isConnected
    );

    if (!hasHumanPlayers) {
      // Don't start timer if no human players connected
      return;
    }

    this.turnStartTime = Date.now();

    // Set up timeout to auto-play when timer expires
    this.turnTimer = setTimeout(() => {
      this.handleAutoPlay();
    }, this.autoPlayTimeout * 1000);
  }

  /**
   * Stop the turn timer
   */
  stopTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  /**
   * Get remaining time for current turn
   */
  getRemainingTime(): number {
    if (this.autoPlayTimeout < 10 || this.turnStartTime === 0) {
      return 0;
    }
    const elapsed = Math.floor((Date.now() - this.turnStartTime) / 1000);
    const remaining = Math.max(0, this.autoPlayTimeout - elapsed);
    return remaining;
  }

  /**
   * Handle auto-play when timer expires
   * Returns the play details if successful, null otherwise
   */
  handleAutoPlay(): { playerId: string; cardIds: string[]; claimedRank: Rank } | null {
    this.stopTurnTimer();

    const currentPlayerId =
      this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    const player = this.players.get(currentPlayerId);

    if (!player || player.isBot) {
      // Don't auto-play for bots
      return null;
    }

    // Check if player is still connected
    if (!player.isConnected) {
      // Player disconnected, skip turn (handler will restart timer)
      this.advanceTurn();
      return null;
    }

    // Auto-play random cards for the human player
    const numCards = Math.min(
      Math.floor(Math.random() * 4) + 1,
      player.hand.length
    );
    const cardIds = player.hand.slice(0, numCards).map((c) => c.id);

    // Determine rank to claim
    const rankToClaim = this.gameState.currentRank || 
      this.getRandomPlayableRank();

    // Execute the play
    const result = this.playCards(currentPlayerId, cardIds, rankToClaim);

    if (result.success) {
      // Trigger auto-play callback to notify handlers
      if (this.autoPlayCallback) {
        this.autoPlayCallback(currentPlayerId, cardIds, rankToClaim);
      }
      
      // Return the auto-play details
      return { playerId: currentPlayerId, cardIds, claimedRank: rankToClaim };
    }

    return null;
  }

  /**
   * Get a random playable rank
   */
  private getRandomPlayableRank(): Rank {
    const playableRanks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return playableRanks[Math.floor(Math.random() * playableRanks.length)];
  }

  /**
   * Clean up resources when game ends
   */
  cleanup(): void {
    this.stopTurnTimer();
  }

  /**
   * Set the processing challenge flag to block plays during challenge resolution
   */
  setProcessingChallenge(isProcessing: boolean): void {
    this.processingChallenge = isProcessing;
  }

  /**
   * Check if a challenge is currently being processed
   */
  isProcessingChallenge(): boolean {
    return this.processingChallenge;
  }
}
