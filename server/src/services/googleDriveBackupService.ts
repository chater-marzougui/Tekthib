// services/googleDriveBackup.ts
import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import { PassThrough } from 'node:stream';

interface GameHistoryRecord {
  id: string;
  game_id: string;
  event_type: string;
  player_user_id: string | null;
  player_name: string;
  event_data: Record<string, unknown>;
  round_number: number | null;
  timestamp: string;
}

export class GoogleDriveBackupService {
  private readonly drive;
  private folderId: string | null = null;
  private readonly oAuth2Client;

  constructor() {
    try {
      const {
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REFRESH_TOKEN,
      } = process.env;

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        throw new Error("Missing required Google OAuth environment variables");
      }

      this.oAuth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground",
      );

      this.oAuth2Client.setCredentials({
        refresh_token: GOOGLE_REFRESH_TOKEN,
      });

      this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
      console.log('✅ Google Drive OAuth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive OAuth:', error);
      throw error;
    }
  }

  /**
   * Get or create the backup folder in Google Drive
   */
  private async getOrCreateFolder(): Promise<string> {
    if (this.folderId) return this.folderId;

    const folderName = 'Tekthib_Game_History_Backups';

    const response = await this.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      this.folderId = response.data.files[0].id!;
      console.log(`✅ Using existing folder: ${folderName} (${this.folderId})`);
      return this.folderId;
    }

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    this.folderId = folder.data.id!;
    console.log(`✅ Created new folder: ${folderName} (${this.folderId})`);
    return this.folderId;
  }

  /**
   * Check if backup is needed based on row count threshold
   */
  async shouldBackup(): Promise<{
    needsBackup: boolean;
    count: number;
    sizeMB: number;
  }> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { count, error } = await supabase
      .from('game_history')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count game_history records: ${error.message}`);
    }

    const rowCount = count || 0;
    const estimatedSizeMB = (rowCount * 452) / (1024 * 1024);

    const THRESHOLD_ROWS = 150000;

    return {
      needsBackup: rowCount >= THRESHOLD_ROWS,
      count: rowCount,
      sizeMB: Math.round(estimatedSizeMB * 100) / 100,
    };
  }

  /**
   * Convert a single record to CSV row
   */
  private recordToCSVRow(record: GameHistoryRecord): string {
    const row = [
      record.id,
      record.game_id,
      record.event_type,
      record.player_user_id || '',
      `"${record.player_name.replace(/"/g, '""')}"`,
      `"${JSON.stringify(record.event_data).replace(/"/g, '""')}"`,
      record.round_number?.toString() || '',
      record.timestamp,
    ];
    return row.join(',');
  }

  /**
   * Create a streaming CSV generator
   * Fetches data in batches and yields CSV rows without loading everything into memory
   */
  private async *streamCSVData(): AsyncGenerator<string, void, unknown> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Yield CSV header first
    const headers = [
      'id',
      'game_id',
      'event_type',
      'player_user_id',
      'player_name',
      'event_data',
      'round_number',
      'timestamp',
    ];
    yield headers.join(',') + '\n';

    const batchSize = 5000; // Smaller batches to reduce memory usage
    let offset = 0;
    let hasMore = true;
    let totalProcessed = 0;

    console.log('Streaming CSV data in batches...');

    while (hasMore) {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .order('timestamp', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch game_history: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      // Convert batch to CSV rows and yield
      const rows = (data as GameHistoryRecord[])
        .map(record => this.recordToCSVRow(record))
        .join('\n');
      
      yield rows + '\n';

      totalProcessed += data.length;
      offset += batchSize;

      if (totalProcessed % 50000 === 0) {
        console.log(`Streamed ${totalProcessed} records...`);
      }

      if (data.length < batchSize) {
        hasMore = false;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`Total records streamed: ${totalProcessed}`);
  }

  /**
   * Upload CSV to Google Drive using streaming
   * This avoids loading the entire CSV into memory
   */
  private async uploadToGoogleDriveStreaming(
    filename: string,
  ): Promise<{ fileId: string; latestTimestamp: string; recordCount: number }> {
    const folderId = await this.getOrCreateFolder();

    const fileMetadata = {
      name: filename,
      parents: [folderId],
      mimeType: 'text/csv',
    };

    console.log(`📤 Uploading ${filename} to Google Drive (streaming)...`);

    // Create a PassThrough stream to pipe data to Google Drive
    const stream = new PassThrough();
    
    let latestTimestamp = '';
    let recordCount = 0;

    // Start streaming data in the background
    (async () => {
      try {
        for await (const chunk of this.streamCSVData()) {
          stream.write(chunk);
          recordCount += chunk.split('\n').filter(line => line.trim()).length - 1;
          
          // Extract latest timestamp from chunks
          const lines = chunk.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            const match = lastLine.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+\d{2}:\d{2})$/);
            if (match) {
              latestTimestamp = match[1];
            }
          }
        }
        stream.end();
      } catch (error) {
        stream.destroy(error as Error);
      }
    })();

    const media = {
      mimeType: 'text/csv',
      body: stream,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log(`✅ Upload complete! File ID: ${response.data.id}`);
    
    return {
      fileId: response.data.id!,
      latestTimestamp,
      recordCount: recordCount - 1, // Subtract header row
    };
  }

  /**
   * Delete game history records that were backed up
   */
  private async deleteBackedUpRecords(
    latestTimestamp: string,
  ): Promise<number> {
    if (!supabase) throw new Error('Supabase is not configured');

    const batchSize = 20000;
    let totalDeleted = 0;

    console.log(
      `🧹 Deleting all records up to ${latestTimestamp} in batches of ${batchSize}...`,
    );

    while (true) {
      // Check how many records are left to delete
      const { count: remainingCount, error: countError } = await supabase
        .from('game_history')
        .select('*', { count: 'exact', head: true })
        .lte('timestamp', latestTimestamp);

      if (countError) {
        throw new Error(`Failed to count remaining records: ${countError.message}`);
      }

      if (!remainingCount || remainingCount === 0) {
        console.log('✅ All records deleted successfully');
        break;
      }

      console.log(`📊 ${remainingCount} records remaining to delete...`);

      // Get the boundary timestamp for this batch
      const { data: boundaryData, error: boundaryError } = await supabase
        .from('game_history')
        .select('timestamp')
        .lte('timestamp', latestTimestamp)
        .order('timestamp', { ascending: true })
        .range(batchSize - 1, batchSize - 1);

      if (boundaryError) {
        throw new Error(`Failed to get batch boundary: ${boundaryError.message}`);
      }

      const deleteTimestamp = boundaryData && boundaryData.length > 0 
        ? boundaryData[0].timestamp 
        : latestTimestamp;

      // Delete this batch
      const { error: deleteError, count: deletedCount } = await supabase
        .from('game_history')
        .delete({ count: 'exact' })
        .lte('timestamp', deleteTimestamp);

      if (deleteError) {
        throw new Error(`Delete batch failed: ${deleteError.message}`);
      }

      const actualDeleted = deletedCount || 0;
      totalDeleted += actualDeleted;
      
      console.log(`🗑️  Deleted batch up to ${deleteTimestamp} (${actualDeleted} records, ${totalDeleted} total)`);

      if (actualDeleted < batchSize) {
        console.log('✅ Deletion complete - last batch processed');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Total deleted: ${totalDeleted} records`);
    return totalDeleted;
  }

  /**
   * Main backup method with streaming
   */
  async backupGameHistory(): Promise<{
    success: boolean;
    fileId?: string;
    filename?: string;
    recordsBackedUp: number;
    recordsDeleted: number;
    sizeMB?: number;
  }> {
    try {
      console.log('Starting game history backup process...');

      const { needsBackup, count, sizeMB } = await this.shouldBackup();
      console.log(`Current game_history: ${count} rows (~${sizeMB} MB)`);

      if (!needsBackup) {
        console.log('Backup not needed yet');
        return {
          success: false,
          recordsBackedUp: 0,
          recordsDeleted: 0,
        };
      }

      console.log('⚠️  Backup threshold exceeded! Starting streaming backup...');

      // Generate filename
      const timestamp = new Date().toISOString();
      const filename = `game_history_backup_${timestamp}.csv`;

      // Upload using streaming (memory efficient)
      const { fileId, latestTimestamp, recordCount } = 
        await this.uploadToGoogleDriveStreaming(filename);

      console.log(`Backed up ${recordCount} records, preparing to delete...`);

      // Delete the backed up records
      const deletedCount = await this.deleteBackedUpRecords(latestTimestamp);

      console.log('✅ Backup process completed successfully');

      return {
        success: true,
        fileId,
        filename,
        recordsBackedUp: recordCount,
        recordsDeleted: deletedCount,
        sizeMB,
      };
    } catch (error) {
      console.error('❌ Backup process failed:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for testing
   */
  async testBackup(): Promise<void> {
    console.log('🧪 Running test backup...');
    const result = await this.backupGameHistory();
    console.log('Test backup result:', result);
  }
}

export const googleDriveBackupService = new GoogleDriveBackupService();