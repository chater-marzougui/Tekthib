import {
  Card,
  playableRanks,
  Player,
  PlayerWithHand,
  Rank,
  BotPersonality,
} from 'shared';
import { GameEngine } from './GameEngine';
import { BotMemory } from './BotMemory';
import {
  getBotChatMessage,
  shouldBotChat,
  BotChatContext,
} from './BotChatMessages';

export class BotPlayer {
  private readonly gameEngine: GameEngine;
  private readonly playerId: string;
  private readonly personality: BotPersonality;
  private readonly memory: BotMemory;
  private chatCallback?: (message: string) => void;

  constructor(
    gameEngine: GameEngine,
    playerId: string,
    personality: BotPersonality,
  ) {
    this.gameEngine = gameEngine;
    this.playerId = playerId;
    this.personality = personality;
    this.memory = new BotMemory(personality);
  }

  /**
   * Set callback for bot to send chat messages
   */
  setChatCallback(callback: (message: string) => void): void {
    this.chatCallback = callback;
  }

  /**
   * Send a chat message if probability allows
   */
  private maybeSendChat(context: BotChatContext): void {
    if (this.chatCallback && shouldBotChat(context)) {
      const message = getBotChatMessage(this.personality, context);
      this.chatCallback(message);
    }
  }

  // Challenge probability adjustment constants
  private static readonly FIRST_PLAY_REDUCTION = 0.4; // 60% reduction (multiply by 0.4)
  private static readonly SMALL_PILE_REDUCTION = 0.8; // 20% reduction
  private static readonly LARGE_PILE_INCREASE = 1.15; // 15% increase
  private static readonly MEDIUM_CARD_COUNT_MIN = 3;
  private static readonly MEDIUM_CARD_COUNT_MAX = 6;
  private static readonly MEDIUM_CARD_REDUCTION = 0.8; // 20% reduction

  /**
   * Determines if the bot should challenge the current play
   * @param isCurrentPlayer - whether it's the bot's turn
   * @returns true if bot should challenge
   */
  shouldChallenge(isCurrentPlayer: boolean): boolean {
    const gameState = this.gameEngine.getPublicGameState();
    const lastPlayerId = gameState.lastPlayerId;

    if (!lastPlayerId) return false;
    const lastPlayedCount = gameState.lastPlayedCount;

    if (lastPlayedCount === 0) return false; // No cards played, nothing to challenge
    if (lastPlayedCount >= 8) return true; // Impossible play, must challenge

    // Initialize memory for the player being considered for challenge
    this.memory.initializePlayer(lastPlayerId);

    // CRITICAL ENDGAME: If bot is the only non-winner left
    const nonWinners = gameState.players.filter(
      (p: Player) => p.cardCount !== 0,
    );
    if (nonWinners.length === 1 && nonWinners[0].id === this.playerId) {
      // Must challenge to have any chance of winning
      return true;
    }

    // Get personality modifiers
    const personalityMod = this.memory.getPersonalityModifier();

    // REDUCED base probability (was 0.3/0.2, now 0.2/0.15)
    let challengeProbability = isCurrentPlayer ? 0.2 : 0.15;

    // Apply personality modifier
    challengeProbability += personalityMod.challengeBonus;

    // Count bots to reduce excessive challenging
    const botCount = gameState.players.filter((p: Player) => p.isBot).length;
    if (botCount > 1) {
      const reductionFactor = Math.min(0.5, botCount * 0.075);
      challengeProbability *= 1 - reductionFactor;
    }

    // PILE SIZE CONSIDERATION: Larger piles are more suspicious but also riskier to challenge
    const pileSize = gameState.pileCount;
    if (pileSize === 0 && lastPlayedCount < 4) {
      // FIRST PLAY: No history, much less likely to challenge
      challengeProbability *= BotPlayer.FIRST_PLAY_REDUCTION;
    } else if (pileSize < 5) {
      // Small pile, less reward for challenging
      challengeProbability *= BotPlayer.SMALL_PILE_REDUCTION;
    } else if (pileSize > 15) {
      // Large pile, more suspicious but higher stakes
      challengeProbability *= BotPlayer.LARGE_PILE_INCREASE;
    }

    // Check opponent's bluff rate
    if (this.memory.isRiskyPlayer(lastPlayerId)) {
      challengeProbability += 0.15; // More likely to challenge known bluffers
    }

    // CARD COUNT ANALYSIS: Playing many cards truthfully is more likely
    if (
      lastPlayedCount >= BotPlayer.MEDIUM_CARD_COUNT_MIN &&
      lastPlayedCount <= BotPlayer.MEDIUM_CARD_COUNT_MAX
    ) {
      // Playing 3-6 cards is often truthful (player has those cards)
      // REDUCE challenge probability slightly
      challengeProbability *= BotPlayer.MEDIUM_CARD_REDUCTION;
    } else if (lastPlayedCount > BotPlayer.MEDIUM_CARD_COUNT_MAX) {
      // Playing 7+ cards is extremely suspicious
      challengeProbability += 0.1 * lastPlayedCount;
    } else if (lastPlayedCount === 1) {
      challengeProbability *= 0.6; // Single cards more likely to be true
    } else if (lastPlayedCount === 2) {
      challengeProbability *= 0.7; // Two cards reasonably likely to be true
    }

    // Game position adjustment
    const myCardCount = gameState.playerHandCounts[this.playerId] || 0;
    const opponentCardCount = gameState.playerHandCounts[lastPlayerId] || 0;
    const averageCardCount =
      Object.values(gameState.playerHandCounts).reduce((a, b) => a + b, 0) /
      Object.keys(gameState.playerHandCounts).length;

    const positionAdjustment = this.memory.getPositionBasedChallengeAdjustment(
      myCardCount,
      opponentCardCount,
      averageCardCount,
    );
    challengeProbability += positionAdjustment;

    // Ensure probability stays in valid range
    challengeProbability = Math.max(0.05, Math.min(0.95, challengeProbability));

    return Math.random() < challengeProbability;
  }

  /**
   * Determines what cards the bot should play
   * @param botPlayer - the bot player object
   * @param currentRank - the current rank that must be claimed
   * @returns object with cardIds to play and claimed rank
   */
  decidePlay(
    botPlayer: PlayerWithHand,
    currentRank: Rank | null,
  ): {
    cardIds: string[];
    claimedRank: Rank;
  } {
    const hand = botPlayer.hand;
    const gameState = this.gameEngine.getPublicGameState();

    // Calculate game position
    const myCardCount = hand.length;
    const averageCardCount =
      Object.values(gameState.playerHandCounts).reduce((a, b) => a + b, 0) /
      Object.keys(gameState.playerHandCounts).length;

    // Get personality-adjusted bluff rate
    const bluffRate = this.memory.getPositionBasedBluffRate(
      myCardCount,
      averageCardCount,
    );

    if (currentRank) {
      const result = this.playWithCurrentRank(hand, currentRank, bluffRate);

      // Check if we're playing more than 3 cards (big play)
      if (result.cardIds.length > 3) {
        this.maybeSendChat('bigPlay');
      }

      return result;
    } else {
      const result = this.playNewRank(hand);

      // Check if we're playing more than 3 cards (big play)
      if (result.cardIds.length > 3) {
        this.maybeSendChat('bigPlay');
      }

      return result;
    }
  }

  /**
   * Play cards when there's a current rank to match
   */
  private playWithCurrentRank(
    hand: Card[],
    currentRank: Rank,
    bluffRate: number,
  ): { cardIds: string[]; claimedRank: Rank } {
    const matchingCards = hand.filter(
      (card) => card.rank === currentRank || card.rank === 'Joker',
    );

    if (matchingCards.length > 0) {
      // Bot has matching cards - decide whether to lie anyway
      const shouldLieAnyway = Math.random() < bluffRate * 0.3; // Reduced chance when actually having cards

      if (shouldLieAnyway && hand.length > matchingCards.length) {
        return this.playMixedCards(matchingCards, hand, currentRank);
      } else {
        return this.playHonestCards(matchingCards, currentRank);
      }
    } else {
      // Bot doesn't have the rank - must lie
      return this.playBluffCards(hand, currentRank, bluffRate);
    }
  }

  /**
   * Play a mix of real and fake cards (bluffing with some truth)
   */
  private playMixedCards(
    matchingCards: Card[],
    hand: Card[],
    currentRank: Rank,
  ): { cardIds: string[]; claimedRank: Rank } {
    const numWrongCards = Math.floor(Math.random() * 3) + 1;
    const wrongCards = hand
      .filter((c) => c.rank !== currentRank && c.rank !== 'Joker')
      .slice(0, numWrongCards);

    const numMatchingToPlay = Math.max(
      Math.min(
        Math.floor(Math.random() * matchingCards.length),
        matchingCards.length,
      ),
      0,
    );

    const someMatchingCards = matchingCards.slice(0, numMatchingToPlay);
    const cardsToPlay = [...someMatchingCards, ...wrongCards];

    return {
      cardIds: cardsToPlay.map((c) => c.id),
      claimedRank: currentRank,
    };
  }

  /**
   * Play honest cards (all matching)
   */
  private playHonestCards(
    matchingCards: Card[],
    currentRank: Rank,
  ): { cardIds: string[]; claimedRank: Rank } {
    const numMatchingToPlay = Math.max(
      Math.min(
        Math.floor(Math.random() * matchingCards.length) + 1,
        matchingCards.length,
      ),
      1,
    );

    const someMatchingCards = matchingCards.slice(0, numMatchingToPlay);

    return {
      cardIds: someMatchingCards.map((c) => c.id),
      claimedRank: currentRank,
    };
  }

  /**
   * Play bluff cards (no matching cards)
   */
  private playBluffCards(
    hand: Card[],
    currentRank: Rank,
    bluffRate: number,
  ): { cardIds: string[]; claimedRank: Rank } {
    // Adjust number of cards based on personality and risk
    let maxCards = 3;
    if (this.personality === 'aggressive') {
      maxCards = 4;
    } else if (this.personality === 'truthful') {
      maxCards = 2;
    }

    const numCards = Math.floor(Math.random() * maxCards) + 1;
    const cardsToPlay = hand.slice(0, Math.min(numCards, hand.length));

    return {
      cardIds: cardsToPlay.map((c) => c.id),
      claimedRank: currentRank,
    };
  }

  /**
   * Play cards when starting a new rank
   */
  private playNewRank(hand: Card[]): { cardIds: string[]; claimedRank: Rank } {
    const rankCounts = new Map<Rank, Card[]>();

    // Group cards by rank (excluding Jokers)
    for (const card of hand) {
      if (card.rank !== 'Joker') {
        if (!rankCounts.has(card.rank)) {
          rankCounts.set(card.rank, []);
        }
        rankCounts.get(card.rank)!.push(card);
      }
    }

    // Find the most common rank
    let bestRank: Rank | null = null;
    let maxCount = 0;
    for (const [rank, cards] of rankCounts) {
      if (cards.length > maxCount) {
        maxCount = cards.length;
        bestRank = rank;
      }
    }

    // Fallback if no rank found (only has Jokers)
    if (!bestRank) {
      bestRank =
        playableRanks[Math.floor(Math.random() * playableRanks.length)];
      return {
        cardIds: hand.map((c) => c.id),
        claimedRank: bestRank,
      };
    }

    const cardsOfBestRank = rankCounts.get(bestRank) || [];

    // Add jokers to the play (they're wild)
    const jokers = hand.filter((c) => c.rank === 'Joker');
    const shouldUseJokers = Math.random() < 0.3;
    const allCardsToPlay = shouldUseJokers
      ? [
          ...cardsOfBestRank,
          ...jokers.slice(0, Math.floor(Math.random() * jokers.length) + 1),
        ]
      : cardsOfBestRank;

    // If no cards to play, must play at least something
    if (allCardsToPlay.length === 0 && hand.length > 0) {
      allCardsToPlay.push(hand[0]);
    }

    return {
      cardIds: allCardsToPlay.map((c) => c.id),
      claimedRank: bestRank,
    };
  }

  /**
   * Record observation when a challenge happens (for learning)
   */
  recordChallengeResult(
    challengerId: string,
    playerId: string,
    wasLying: boolean,
  ): void {
    if (wasLying) {
      this.memory.recordFailedBluff(playerId);
      this.memory.recordSuccessfulChallenge(challengerId);

      // Bot caught someone bluffing
      if (challengerId === this.playerId) {
        this.maybeSendChat('caughtBluff');
      }

      return;
    }
    this.memory.recordSuccessfulBluff(playerId);
    this.memory.recordFailedChallenge(challengerId);
  }

  /**
   * Record when a play goes unchallenged (for learning)
   */
  recordUnchallengedPlay(playerId: string, wasBluff: boolean): void {
    if (wasBluff) {
      this.memory.recordSuccessfulBluff(playerId);

      // Bot got away with a bluff
      if (playerId === this.playerId) {
        this.maybeSendChat('successfulBluff');
      }
    }
  }

  /**
   * Send random chat during opponent's turn
   */
  maybeRandomChat(): void {
    this.maybeSendChat('random');
  }

  /**
   * Get bot personality
   */
  getPersonality(): BotPersonality {
    return this.personality;
  }
}
