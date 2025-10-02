import { Card, GameState, Player, Rank } from '../types';
import { Deck } from './Deck';

export class GameEngine {
  private readonly gameState: GameState;
  private readonly players: Map<string, Player>;

  constructor(players: Map<string, Player>) {
    this.players = players;
    this.gameState = this.initializeGame();
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

    // Remove cards from player's hand
    const playedCards = player.hand.filter((c) => cardIds.includes(c.id));
    player.hand = player.hand.filter((c) => !cardIds.includes(c.id));

    // Add to pile
    this.gameState.pile.push(...playedCards);
    this.gameState.lastPlayedCards = playedCards;
    this.gameState.lastPlayerId = playerId;
    this.gameState.currentRank = claimedRank;

    // Check for four of a kind
    this.checkAndRemoveFourOfKind(player);

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
    const getsThePile = this.players.get(wasLying ? this.gameState.lastPlayerId : challengerId)!;

    // Liar takes the pile
    getsThePile.hand.push(...this.gameState.pile);
    // Check for four of a kind after taking pile
    this.checkAndRemoveFourOfKind(getsThePile);

    // If last player was not lying he plays again, else challenger plays next
    let nextPlayerId: string;
    if(wasLying) {
      nextPlayerId = challengerId;
    } else if (lastPlayer.hand.length === 0) {
      nextPlayerId = this.gameState.playerOrder[(this.gameState.currentPlayerIndex + 1) % this.gameState.playerOrder.length];
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

    return {
      success: true,
      wasLying,
      playerId: lastPlayer.id,
      challengerId: challenger.id,
      revealedCards,
    };
  }

  private checkAndRemoveFourOfKind(player: Player): void {
    const rankCounts = new Map<Rank, Card[]>();

    // Count cards by rank
    player.hand.forEach((card) => {
      if (card.rank !== 'Joker') {
        if (!rankCounts.has(card.rank)) {
          rankCounts.set(card.rank, []);
        }
        rankCounts.get(card.rank)!.push(card);
      }
    });

    // Remove sets of 4
    rankCounts.forEach((cards, rank) => {
      if (cards.length === 4) {
        player.hand = player.hand.filter((c) => c.rank !== rank);
      }
    });
  }

  private advanceTurn(): void {
    const startIndex = this.gameState.currentPlayerIndex;
    let nextIndex = (startIndex + 1) % this.gameState.playerOrder.length;

    // Skip winners
    while (
      this.gameState.winners.includes(this.gameState.playerOrder[nextIndex])
    ) {
      nextIndex = (nextIndex + 1) % this.gameState.playerOrder.length;

      // Prevent infinite loop
      if (nextIndex === startIndex) break;
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
    };
  }
}
