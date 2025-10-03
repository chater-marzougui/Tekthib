import { Card, Player, PlayerWithHand, Rank, Suit, SuitTypes } from 'shared';
import { Deck } from './Deck';
import { BotPlayer } from './BotPlayer';
import { GameState } from '../types';

export class GameEngine {
  private readonly gameState: GameState;
  private readonly players: Map<string, PlayerWithHand>;
  private readonly botPlayers: Map<string, BotPlayer> = new Map();

  constructor(players: Map<string, PlayerWithHand>) {
    this.players = players;
    this.gameState = this.initializeGame();

    // Initialize bot players
    players.forEach((player, playerId) => {
      if (player.isBot) {
        this.botPlayers.set(playerId, new BotPlayer(this, playerId));
      }
    });
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

    playerOrder.forEach((playerId, index) => {
      const player = this.players.get(playerId);
      if (player) {
        player.hand = hands[index];
        this.checkAndRemoveFourOfKind(player);
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
      phase: 'playing',
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
    };
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
      this.gameState.currentRank &&
      claimedRank !== this.gameState.currentRank
    ) {
      return {
        success: false,
        error: `Must claim ${this.gameState.currentRank}`,
      };
    }

    // If there was a previous play that wasn't challenged, update stats for successful bluff
    if (this.gameState.lastPlayerId && this.gameState.lastPlayedCards.length > 0) {
      const previousPlayerId = this.gameState.lastPlayerId;
      const previousClaimedRank = this.gameState.currentRank;
      const previousCards = this.gameState.lastPlayedCards;
      
      // Check if previous play was a bluff (and got away with it)
      const wasBluff = !previousCards.every(
        (card) => card.rank === previousClaimedRank || card.rank === 'Joker'
      );
      
      const previousPlayerStats = this.gameState.playerStats.get(previousPlayerId);
      if (previousPlayerStats) {
        if (wasBluff) {
          previousPlayerStats.timesBluffedSuccessfully++;
        } else {
          previousPlayerStats.timesToldTruth++;
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
      return { success: true, newRank: claimedRank };
    }

    // Move to next player (skip winners)
    this.advanceTurn();

    return { success: true, newRank: claimedRank };
  }

  challenge(challengerId: string): {
    success: boolean;
    wasLying: boolean;
    playerId: string;
    challengerId: string;
    revealedCards: Card[];
    error?: string;
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
    const lastPlayerStats = this.gameState.playerStats.get(this.gameState.lastPlayerId);
    const challengerStats = this.gameState.playerStats.get(challengerId);
    
    if (wasLying) {
      // Last player was lying - caught bluffing
      if (lastPlayerStats) lastPlayerStats.timesCaughtBluffing++;
    } else {
      // Last player was telling truth
      if (lastPlayerStats) lastPlayerStats.timesToldTruth++;
      // Challenger falsely accused
      if (challengerStats) challengerStats.timesFalselyAccused++;
    }

    // Liar takes the pile
    getsThePile.hand.push(...this.gameState.pile);
    // Check for four of a kind after taking pile
    this.checkAndRemoveFourOfKind(getsThePile);

    // If last player was not lying he plays again, else challenger plays next
    let nextPlayerId: string;
    if (wasLying) {
      nextPlayerId = challengerId;
    } else if (lastPlayer.hand.length === 0) {
      nextPlayerId =
        this.gameState.playerOrder[
          (this.gameState.currentPlayerIndex + 1) %
            this.gameState.playerOrder.length
        ];
    } else {
      nextPlayerId = this.gameState.lastPlayerId;
    }
    const challengerIndex = this.gameState.playerOrder.indexOf(nextPlayerId);
    this.gameState.currentPlayerIndex = challengerIndex;

    // Reset pile and rank
    const revealedCards = [...this.gameState.lastPlayedCards];
    this.gameState.pile = [];
    this.gameState.currentRank = null;
    this.gameState.lastPlayedCards = [];
    this.gameState.lastPlayerId = null;

    for (const player of this.players.values()) {
      this.checkAndRemoveFourOfKind(player);
    }

    return {
      success: true,
      wasLying,
      playerId: lastPlayer.id,
      challengerId: challenger.id,
      revealedCards,
    };
  }

  private checkAndRemoveFourOfKind(player: PlayerWithHand): void {
    const rankGroups = new Map<Rank, Card[]>();

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
        // Count cards by suit
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
          // Check if we can remove 8 cards (2 of each suit)
          const canRemoveEight = SuitTypes.every(
            (suit) => (suitCounts.get(suit)?.length || 0) >= 2,
          );

          const cardsToRemove = new Set<string>();

          if (canRemoveEight) {
            // Remove 2 cards of each suit (8 total)
            SuitTypes.forEach((suit) => {
              const cardsOfSuit = suitCounts.get(suit)!;
              cardsToRemove.add(cardsOfSuit[0].id);
              cardsToRemove.add(cardsOfSuit[1].id);
            });
          } else {
            // Remove 1 card of each suit (4 total)
            SuitTypes.forEach((suit) => {
              const cardOfSuit = suitCounts.get(suit)![0];
              cardsToRemove.add(cardOfSuit.id);
            });
          }

          // Remove the cards
          player.hand = player.hand.filter((c) => !cardsToRemove.has(c.id));
        }
      }
    });
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
        this.gameState.loser = this.gameState.playerOrder.find(
          (id) => !this.gameState.winners.includes(id)
        ) || null;
        return;
      } 
    } 

    this.gameState.currentPlayerIndex = nextIndex; 
  }

  getPlayerHand(playerId: string): Card[] {
    const player = this.players.get(playerId);
    return player ? [...player.hand] : [];
  }

  getPublicGameState(): any {
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
      playerStats: Object.fromEntries(this.gameState.playerStats),
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

    // Check each bot (except the one who just played)
    for (const [botId, bot] of this.botPlayers.entries()) {
      if (botId === this.gameState.lastPlayerId) {
        continue;
      }

      const botPlayer = this.players.get(botId);
      if (!botPlayer || this.gameState.winners.includes(botId)) {
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
}
