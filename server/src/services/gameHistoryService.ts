import { supabase } from '../config/supabase';
import { googleDriveBackupService } from './googleDriveBackupService';

interface GameData {
  roomCode: string;
  startedAt: Date;
  endedAt: Date;
  winnerUserId?: string;
  loserUserId?: string;
  totalPlayers: number;
  totalRounds: number;
  totalChallenges: number;
  gameSettings?: Record<string, unknown>;
}

interface ParticipantData {
  userId?: string;
  playerName: string;
  finalPosition: number;
  cardsPlayed: number;
  bluffsMade: number;
  successfulBluffs: number;
  challengesMade: number;
  successfulChallenges: number;
  failedChallenges: number;
  isWinner: boolean;
  isLoser: boolean;
  isBot: boolean;
}

interface GameEvent {
  eventType: string;
  playerUserId?: string;
  playerName: string;
  eventData: Record<string, unknown>;
  roundNumber?: number;
  timestamp: Date;
}

export class GameHistoryService {
  async saveGame(
    gameData: GameData,
    participants: ParticipantData[],
    events: GameEvent[],
  ): Promise<string> {
    try {
      // Insert game record
      const { data: game, error: gameError } = await supabase!
        .from('games')
        .insert({
          room_code: gameData.roomCode,
          started_at: gameData.startedAt.toISOString(),
          ended_at: gameData.endedAt.toISOString(),
          winner_user_id: gameData.winnerUserId || null,
          loser_user_id: gameData.loserUserId || null,
          total_players: gameData.totalPlayers,
          total_rounds: gameData.totalRounds,
          total_challenges: gameData.totalChallenges,
          game_settings: gameData.gameSettings || {},
        })
        .select('id')
        .single();

      if (gameError || !game) {
        const errorMessage = gameError?.message || 'Unknown error occurred';
        throw new Error(`Failed to save game: ${errorMessage}`);
      }

      const gameId = game?.id;
      if (!gameId) {
        throw new Error(
          'Failed to save game: No game ID returned from database',
        );
      }

      // Insert participants
      const participantInserts = participants.map((p) => ({
        game_id: gameId,
        user_id: p.userId || null,
        player_name: p.playerName,
        final_position: p.finalPosition,
        cards_played: p.cardsPlayed,
        bluffs_made: p.bluffsMade,
        successful_bluffs: p.successfulBluffs,
        challenges_made: p.challengesMade,
        successful_challenges: p.successfulChallenges,
        failed_challenges: p.failedChallenges,
        is_winner: p.isWinner,
        is_loser: p.isLoser,
        is_bot: p.isBot,
      }));

      const { error: participantsError } = await supabase!
        .from('game_participants')
        .insert(participantInserts);

      if (participantsError) {
        console.error(
          'Failed to save participants:',
          participantsError?.message || participantsError,
        );
      }

      // Insert events
      if (events.length > 0) {
        const eventInserts = events.map((e) => ({
          game_id: gameId,
          event_type: e.eventType,
          player_user_id: e.playerUserId || null,
          player_name: e.playerName,
          event_data: e.eventData,
          round_number: e.roundNumber || null,
          timestamp: e.timestamp,
        }));

        const { error: eventsError } = await supabase!
          .from('game_history')
          .insert(eventInserts);

        if (eventsError) {
          console.error(
            'Failed to save game events:',
            eventsError?.message || eventsError,
          );
        }
      }

      // Update player stats for all non-bot participants
      await this.updatePlayerStats(participants);

      return gameId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error saving game:', errorMessage);
      if (error instanceof Error && error.stack) {
        console.debug('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  async saveGameEvent(gameId: string, event: GameEvent): Promise<void> {
    try {
      await supabase!.from('game_history').insert({
        game_id: gameId,
        event_type: event.eventType,
        player_user_id: event.playerUserId || null,
        player_name: event.playerName,
        event_data: event.eventData,
        round_number: event.roundNumber || null,
      });
    } catch (error) {
      console.error('Error saving game event:', error);
    }
  }

  private async updatePlayerStats(
    participants: ParticipantData[],
  ): Promise<void> {
    for (const participant of participants) {
      if (!participant.userId || participant.isBot) {
        continue;
      }

      try {
        // Get current stats
        const { data: currentStats, error: fetchError } = await supabase!
          .from('player_stats')
          .select('*')
          .eq('user_id', participant.userId)
          .single();

        if (fetchError) {
          // If stats don't exist, create them
          await supabase!.from('player_stats').insert({
            user_id: participant.userId,
            total_games: 1,
            wins: participant.isWinner ? 1 : 0,
            losses: participant.isLoser ? 1 : 0,
            total_cards_played: participant.cardsPlayed,
            total_bluffs: participant.bluffsMade,
            successful_bluffs: participant.successfulBluffs,
            total_challenges: participant.challengesMade,
            successful_challenges: participant.successfulChallenges,
            failed_challenges: participant.failedChallenges,
          });
          continue;
        }

        // Update existing stats
        const { error: updateError } = await supabase!
          .from('player_stats')
          .update({
            total_games: (currentStats.total_games || 0) + 1,
            wins: (currentStats.wins || 0) + (participant.isWinner ? 1 : 0),
            losses: (currentStats.losses || 0) + (participant.isLoser ? 1 : 0),
            total_cards_played:
              (currentStats.total_cards_played || 0) + participant.cardsPlayed,
            total_bluffs:
              (currentStats.total_bluffs || 0) + participant.bluffsMade,
            successful_bluffs:
              (currentStats.successful_bluffs || 0) +
              participant.successfulBluffs,
            total_challenges:
              (currentStats.total_challenges || 0) + participant.challengesMade,
            successful_challenges:
              (currentStats.successful_challenges || 0) +
              participant.successfulChallenges,
            failed_challenges:
              (currentStats.failed_challenges || 0) +
              participant.failedChallenges,
          })
          .eq('user_id', participant.userId);

        if (updateError) {
          console.error('Failed to update player stats:', updateError);
        }
      } catch (error) {
        console.error('Error updating player stats:', error);
      }
    }
  }

  async getPlayerGameHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<unknown[]> {
    const { data, error } = await supabase!
      .from('game_participants')
      .select(
        `
        *,
        games (
          id,
          room_code,
          started_at,
          ended_at,
          total_players,
          total_rounds
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error('Failed to fetch game history: ' + error.message);
    }

    return data || [];
  }

  async getGameDetails(gameId: string): Promise<unknown> {
    const { data: game, error: gameError } = await supabase!
      .from('games')
      .select(
        `
        *,
        game_participants (*),
        game_history (*)
      `,
      )
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    return game;
  }

  async getLeaderboard(
    sortBy: 'wins' | 'win_rate' | 'total_games' = 'wins',
    limit: number = 10,
  ): Promise<unknown[]> {
    const { data, error } = await supabase!
      .from('player_stats')
      .select(
        `
        *,
        users (
          username,
          display_name,
          avatar_url
        )
      `,
      )
      .order(sortBy, { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch leaderboard: ' + error.message);
    }

    return data || [];
  }

  async checkAndBackup(): Promise<void> {
    try {
      const result = await googleDriveBackupService.backupGameHistory();

      if (result.success) {
        console.log(`✅ Backup completed: ${result.filename}`);
        console.log(`   Records backed up: ${result.recordsBackedUp}`);
        console.log(`   Records deleted: ${result.recordsDeleted}`);
        console.log(`   Google Drive File ID: ${result.fileId}`);
      }
    } catch (error) {
      console.error('Failed to backup game history:', error);
      // Don't throw - we don't want backup failures to break game saving
    }
  }
}
export const gameHistoryService = new GameHistoryService();
