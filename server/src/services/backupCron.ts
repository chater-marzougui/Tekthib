// services/backupCron.ts
import cron, { ScheduledTask } from 'node-cron';
import { googleDriveBackupService } from './googleDriveBackupService';

export class BackupCronService {
  private cronJob: ScheduledTask | null = null;

  /**
   * Start the backup cron job
   * Runs every 20 minutes to check if backup is needed
   */
  start(): void {
    if (this.cronJob) {
      console.log('⚠️  Backup cron job is already running');
      return;
    }

    // Cron pattern: Every 20 minutes
    // Format: minute hour day month weekday
    // "*/20 * * * *" = At every 20th minute (00, 20, 40)
    this.cronJob = cron.schedule('*/20 * * * *', async () => {
      console.log(
        '\n🕐 Backup cron job triggered at:',
        new Date().toISOString(),
      );

      try {
        const result = await googleDriveBackupService.backupGameHistory();

        if (result.success) {
          console.log('✅ Scheduled backup completed successfully');
          console.log(`   Filename: ${result.filename}`);
          console.log(`   Records backed up: ${result.recordsBackedUp}`);
          console.log(`   Records deleted: ${result.recordsDeleted}`);
          console.log(`   Size: ~${result.sizeMB} MB`);
          console.log(`   Google Drive File ID: ${result.fileId}`);
        } else {
          console.log('ℹ️  No backup needed - threshold not reached');
        }
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
        // Log error but don't crash the server
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Stack trace:', error.stack);
        }
      }

      console.log('Next backup check in 20 minutes\n');
    });

    console.log('✅ Backup cron job started - running every 20 minutes');
    console.log('   Pattern: */20 * * * * (at every 20th minute)');
    console.log('   Run times: 00, 20, 40 minutes of every hour');
  }

  /**
   * Stop the backup cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Backup cron job stopped');
    } else {
      console.log('⚠️  Backup cron job is not running');
    }
  }

  /**
   * Check if cron job is running
   */
  isRunning(): boolean {
    return this.cronJob !== null;
  }

  /**
   * Get cron job status
   */
  getStatus(): {
    running: boolean;
    schedule: string;
    nextRun: string | null;
  } {
    if (!this.cronJob) {
      return {
        running: false,
        schedule: '*/20 * * * *',
        nextRun: null,
      };
    }

    // Calculate next run time (approximate)
    const now = new Date();
    const minutes = now.getMinutes();
    const nextMinute = Math.ceil(minutes / 20) * 20;
    const nextRun = new Date(now);
    nextRun.setMinutes(nextMinute);
    nextRun.setSeconds(0);

    if (nextMinute >= 60) {
      nextRun.setHours(nextRun.getHours() + 1);
      nextRun.setMinutes(nextMinute % 60);
    }

    return {
      running: true,
      schedule: '*/20 * * * * (every 20 minutes)',
      nextRun: nextRun.toISOString(),
    };
  }

  /**
   * Run backup immediately (bypasses schedule)
   */
  async runNow(): Promise<{
    success: boolean;
    fileId?: string;
    filename?: string;
    recordsBackedUp: number;
    recordsDeleted: number;
  }> {
    console.log('🔧 Manual backup triggered via cron service');
    return await googleDriveBackupService.backupGameHistory();
  }
}

export const backupCronService = new BackupCronService();
