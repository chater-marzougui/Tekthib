import { Card, playableRanks, Player, PlayerWithHand, Rank } from 'shared';
import { GameEngine } from './GameEngine';

export class BotPlayer {
  private readonly gameEngine: GameEngine;
  private readonly roomId: string;

  constructor(gameEngine: GameEngine, roomId: string) {
    this.gameEngine = gameEngine;
    this.roomId = roomId;
  }

  /**
   * Determines if the bot should challenge the current play
   * @param isCurrentPlayer - whether it's the bot's turn
   * @returns true if bot should challenge
   */
  shouldChallenge(isCurrentPlayer: boolean): boolean {
    const gameState = this.gameEngine.getPublicGameState();

    // Count how many bots are in the game
    const botCount = gameState.players.filter((p: Player) => p.isBot).length;

    // Base probabilities
    let baseProbability = isCurrentPlayer ? 0.3 : 0.2;

    // Reduce challenge probability based on number of bots
    // The more bots, the lower the probability to avoid excessive challenges
    if (botCount > 1) {
      const reductionFactor = Math.min(0.8, botCount * 0.075);
      baseProbability *= 1 - reductionFactor;
    }

    // Further reduce if many cards were played (likely telling truth)
    const lastPlayedCount = gameState.lastPlayedCount;
    if (lastPlayedCount > 4) {
      baseProbability += 0.05 * lastPlayedCount;
    } else if (lastPlayedCount === 2) {
      baseProbability *= 0.8;
    } else if (lastPlayedCount < 2) {
      baseProbability *= 0.6;
    }

    return Math.random() < baseProbability;
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

    // If there's a current rank, we must claim it
    if (currentRank) {
      // Check if bot has cards of the current rank
      const matchingCards = hand.filter(
        (card) => card.rank === currentRank || card.rank === 'Joker',
      );

      if (matchingCards.length > 0) {
        // Bot has the cards, but might lie occasionally (20% chance)
        const shouldLieAnyway = Math.random() < 0.2;

        if (shouldLieAnyway && hand.length > matchingCards.length) {
          // Lie by playing some wrong cards mixed with right ones
          const numWrongCards = Math.floor(Math.random() * 3) + 1;
          const wrongCards = hand
            .filter((c) => c.rank !== currentRank && c.rank !== 'Joker')
            .slice(0, numWrongCards);

          // Mix some matching cards with wrong ones
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
        } else {
          // Play truthfully - all matching cards

          const numMatchingToPlay = Math.max(
            Math.min(
              Math.floor(Math.random() * matchingCards.length) + 1,
              matchingCards.length,
            ),
            0,
          );

          const someMatchingCards = matchingCards.slice(0, numMatchingToPlay);
          return {
            cardIds: someMatchingCards.map((c) => c.id),
            claimedRank: currentRank,
          };
        }
      } else {
        // Bot doesn't have the rank, so it must lie
        // Play 1-3 random cards (smaller lies are safer)
        const numCards = Math.floor(Math.random() * 3) + 1;
        const cardsToPlay = hand.slice(0, Math.min(numCards, hand.length));
        return {
          cardIds: cardsToPlay.map((c) => c.id),
          claimedRank: currentRank,
        };
      }
    } else {
      // No current rank - bot can claim any rank
      // Find the rank with most cards in hand (excluding Joker)
      const rankCounts = new Map<Rank, Card[]>();
      hand.forEach((card) => {
        if (card.rank !== 'Joker') {
          if (!rankCounts.has(card.rank)) {
            rankCounts.set(card.rank, []);
          }
          rankCounts.get(card.rank)!.push(card);
        }
      });

      // Find the most common rank
      let bestRank: Rank | null = null;
      let maxCount = 0;
      rankCounts.forEach((cards, rank) => {
        if (cards.length > maxCount) {
          maxCount = cards.length;
          bestRank = rank;
        }
      });

      // Fallback if no rank found (only has Jokers)
      if (!bestRank) {
        const nonJoker = hand.find((c) => c.rank !== 'Joker');
        if (nonJoker) {
          bestRank = nonJoker.rank;
        } else {
          // Only has Jokers - claim a random rank
          bestRank =
            playableRanks[Math.floor(Math.random() * playableRanks.length)];
        }
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
  }
}
