import { BotPersonality } from 'shared';

interface PlayerRiskProfile {
  totalPlays: number;
  successfulBluffs: number;
  failedBluffs: number;
  successfulChallenges: number;
  failedChallenges: number;
  recentBluffRate: number; // Rolling average
}

export class BotMemory {
  private playerProfiles: Map<string, PlayerRiskProfile> = new Map();
  private readonly personality: BotPersonality;

  constructor(personality: BotPersonality) {
    this.personality = personality;
  }

  /**
   * Initialize tracking for a player
   */
  initializePlayer(playerId: string): void {
    if (!this.playerProfiles.has(playerId)) {
      this.playerProfiles.set(playerId, {
        totalPlays: 0,
        successfulBluffs: 0,
        failedBluffs: 0,
        successfulChallenges: 0,
        failedChallenges: 0,
        recentBluffRate: 0.3, // Start with neutral assumption
      });
    }
  }

  /**
   * Record when a player's bluff succeeded (wasn't challenged)
   */
  recordSuccessfulBluff(playerId: string): void {
    const profile = this.getOrCreateProfile(playerId);
    profile.successfulBluffs++;
    profile.totalPlays++;
    this.updateBluffRate(playerId);
  }

  /**
   * Record when a player's bluff was caught
   */
  recordFailedBluff(playerId: string): void {
    const profile = this.getOrCreateProfile(playerId);
    profile.failedBluffs++;
    profile.totalPlays++;
    this.updateBluffRate(playerId);
  }

  /**
   * Record when a player successfully challenged
   */
  recordSuccessfulChallenge(playerId: string): void {
    const profile = this.getOrCreateProfile(playerId);
    profile.successfulChallenges++;
  }

  /**
   * Record when a player's challenge was wrong
   */
  recordFailedChallenge(playerId: string): void {
    const profile = this.getOrCreateProfile(playerId);
    profile.failedChallenges++;
  }

  /**
   * Get the estimated bluff rate for a player
   */
  getPlayerBluffRate(playerId: string): number {
    const profile = this.playerProfiles.get(playerId);
    if (!profile || profile.totalPlays < 3) {
      return 0.3; // Default neutral assumption
    }
    return profile.recentBluffRate;
  }

  /**
   * Check if a player is considered "risky" (bluffs frequently)
   */
  isRiskyPlayer(playerId: string): boolean {
    return this.getPlayerBluffRate(playerId) > 0.5;
  }

  /**
   * Calculate challenge probability adjustment based on game position
   */
  getPositionBasedChallengeAdjustment(
    myCardCount: number,
    opponentCardCount: number,
    averageCardCount: number,
  ): number {
    // If bot is ahead (fewer cards), be more cautious
    if (myCardCount < averageCardCount * 0.7) {
      return -0.1; // Reduce challenge probability
    }
    
    // If bot is behind, be more aggressive
    if (myCardCount > averageCardCount * 1.3) {
      return 0.15; // Increase challenge probability
    }

    // If opponent is close to winning (very few cards), challenge more
    if (opponentCardCount <= 3) {
      return 0.2;
    }

    return 0;
  }

  /**
   * Calculate bluff probability based on game position and personality
   */
  getPositionBasedBluffRate(
    myCardCount: number,
    averageCardCount: number,
  ): number {
    let baseRate: number;

    // Base rate by personality
    switch (this.personality) {
      case 'aggressive':
        baseRate = 0.65;
        break;
      case 'truthful':
        baseRate = 0.15;
        break;
      case 'unpredictable':
        baseRate = 0.4;
        break;
    }

    // Adjust based on position
    if (myCardCount < averageCardCount * 0.7) {
      // Ahead - bluff less to protect lead
      return Math.max(baseRate - 0.2, 0.1);
    } else if (myCardCount > averageCardCount * 1.3) {
      // Behind - bluff more to catch up
      return Math.min(baseRate + 0.2, 0.85);
    }

    return baseRate;
  }

  /**
   * Get personality-specific behavior modifier
   */
  getPersonalityModifier(): {
    challengeBonus: number;
    bluffBonus: number;
    riskTolerance: number;
  } {
    switch (this.personality) {
      case 'aggressive':
        return {
          challengeBonus: 0.15,
          bluffBonus: 0.2,
          riskTolerance: 0.7,
        };
      case 'truthful':
        return {
          challengeBonus: -0.1,
          bluffBonus: -0.15,
          riskTolerance: 0.3,
        };
      case 'unpredictable':
        return {
          challengeBonus: Math.random() * 0.3 - 0.15,
          bluffBonus: Math.random() * 0.3 - 0.15,
          riskTolerance: 0.5,
        };
    }
  }

  private getOrCreateProfile(playerId: string): PlayerRiskProfile {
    this.initializePlayer(playerId);
    return this.playerProfiles.get(playerId)!;
  }

  private updateBluffRate(playerId: string): void {
    const profile = this.playerProfiles.get(playerId);
    if (!profile) return;

    const totalBluffs = profile.successfulBluffs + profile.failedBluffs;
    if (totalBluffs > 0) {
      // Weight recent behavior more heavily
      const observedRate = totalBluffs / Math.max(profile.totalPlays, 1);
      profile.recentBluffRate = profile.recentBluffRate * 0.7 + observedRate * 0.3;
    }
  }
}
