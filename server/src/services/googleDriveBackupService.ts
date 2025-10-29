// services/googleDriveBackup.ts
import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import { Readable } from 'node:stream';

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
      // Read OAuth credentials
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

    // Check if folder exists
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

    // Create folder if it doesn't exist
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
   *
   * Calculations based on actual data:
   * - Current: 218,010 rows = ~93 MB
   * - Average: 452 bytes per row
   * - Target: 400 MB threshold (leaving buffer before 450 MB)
   * - Formula: 400 MB / 452 bytes = ~884,955 rows
   *
   * Testing threshold: 150,000 rows (~66 MB) - ALREADY EXCEEDED!
   */
  async shouldBackup(): Promise<{
    needsBackup: boolean;
    count: number;
    sizeMB: number;
  }> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Count total rows in game_history
    const { count, error } = await supabase
      .from('game_history')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count game_history records: ${error.message}`);
    }

    const rowCount = count || 0;
    const estimatedSizeMB = (rowCount * 452) / (1024 * 1024); // 452 bytes per row

    // Testing threshold: 150,000 rows (~66 MB)
    // Production threshold: 884,955 rows (~400 MB)
    const THRESHOLD_ROWS = 150000; // Start with testing threshold

    return {
      needsBackup: rowCount >= THRESHOLD_ROWS,
      count: rowCount,
      sizeMB: Math.round(estimatedSizeMB * 100) / 100,
    };
  }

  /**
   * Convert game history records to CSV format
   */
  private convertToCSV(records: GameHistoryRecord[]): string {
    if (records.length === 0) return '';

    // CSV Headers
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

    const csvRows = [headers.join(',')];

    // Add data rows
    for (const record of records) {
      const row = [
        record.id,
        record.game_id,
        record.event_type,
        record.player_user_id || '',
        `"${record.player_name.replace(/"/g, '""')}"`, // Escape quotes
        `"${JSON.stringify(record.event_data).replace(/"/g, '""')}"`,
        record.round_number?.toString() || '',
        record.timestamp,
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Fetch all game history records from Supabase
   */
  private async fetchAllGameHistory(): Promise<GameHistoryRecord[]> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const allRecords: GameHistoryRecord[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    console.log('Fetching game history records...');

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

      allRecords.push(...(data as GameHistoryRecord[]));
      offset += batchSize;

      if (allRecords.length % 50000 === 0) {
        console.log(`Fetched ${allRecords.length} records so far...`);
      }

      if (data.length < batchSize) {
        hasMore = false;
      }
    }

    console.log(`Total records fetched: ${allRecords.length}`);
    return allRecords;
  }

  /**
   * Upload CSV to Google Drive
   */
  private async uploadToGoogleDrive(
    csvContent: string,
    filename: string,
  ): Promise<string> {
    const folderId = await this.getOrCreateFolder();

    const fileMetadata = {
      name: filename,
      parents: [folderId],
      mimeType: 'text/csv',
    };

    // Convert string to stream
    const stream = Readable.from([csvContent]);

    const media = {
      mimeType: 'text/csv',
      body: stream,
    };

    console.log(`Uploading ${filename} to Google Drive...`);

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log(`Upload complete! File ID: ${response.data.id}`);
    return response.data.id!;
  }

  /**
   * Delete game history records that were backed up
   * Uses the IDs from backed up records to prevent race conditions
   */
  private async deleteBackedUpRecords(
    latestTimestamp: string,
  ): Promise<number> {
    if (!supabase) throw new Error('Supabase is not configured');

    const batchSize = 20000;
    let totalDeleted = 0;
    let done = false;
    let cutoff = latestTimestamp;

    console.log(
      `🧹 Deleting all records up to ${latestTimestamp} in chunks...`,
    );

    while (!done) {
      // 1️⃣ Get the timestamp at the Nth row (the cutoff for this batch)
      const { data, error } = await supabase
        .from('game_history')
        .select('timestamp')
        .lte('timestamp', cutoff)
        .order('timestamp', { ascending: true })
        .range(batchSize - 1, batchSize - 1); // get only the 20 000th record

      if (error)
        throw new Error(`Fetch for delete batch failed: ${error.message}`);

      // If less than one result → this is the last chunk
      if (!data || data.length === 0) {
        break;
      }

      const boundary = data[0].timestamp;

      // 2️⃣ Delete everything up to that timestamp
      const { error: delErr, count } = await supabase
        .from('game_history')
        .delete({ count: 'exact' })
        .lte('timestamp', boundary);

      if (delErr) throw new Error(`Delete batch failed: ${delErr.message}`);

      totalDeleted += count || 0;
      console.log(`🗑️ Deleted batch up to ${boundary} (${count} records)`);

      // 3️⃣ Prepare next loop iteration
      cutoff = boundary;
    }

    console.log(`✅ Total deleted: ${totalDeleted} records`);
    return totalDeleted;
  }

  /**
   * Main backup method
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

      // Check if backup is needed
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

      console.log('⚠️  Backup threshold exceeded! Starting backup...');

      // Fetch all records
      const records = await this.fetchAllGameHistory();

      if (records.length === 0) {
        console.log('No records to backup');
        return {
          success: false,
          recordsBackedUp: 0,
          recordsDeleted: 0,
        };
      }

      const latestTimestamp = records[records.length - 1].timestamp;
      console.log(`Latest record timestamp: ${latestTimestamp}`);

      // Convert to CSV
      console.log('Converting records to CSV...');
      const csvContent = this.convertToCSV(records);

      // Generate filename with timestamp
      const filename = `game_history_backup_${latestTimestamp}.csv`;

      // Upload to Google Drive
      const fileId = await this.uploadToGoogleDrive(csvContent, filename);

      // Extract IDs of records that were backed up
      const backedUpIds = records.map((r) => r.id);
      console.log(
        `Backed up ${backedUpIds.length} records, preparing to delete...`,
      );

      // Delete ONLY the records that were backed up (prevents race condition)
      const deletedCount = await this.deleteBackedUpRecords(latestTimestamp);

      console.log('✅ Backup process completed successfully');

      return {
        success: true,
        fileId,
        filename,
        recordsBackedUp: records.length,
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
