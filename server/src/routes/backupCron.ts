// routes/backup.ts
import express, { Request, Response } from 'express';
import { googleDriveBackupService } from '../services/googleDriveBackupService';
import { backupCronService } from '../services/backupCron';

const router = express.Router();

/**
 * GET /api/backup/status
 * Check if backup is needed and get current row count
 */
router.get('/backup/status', async (req: Request, res: Response) => {
  try {
    const status = await googleDriveBackupService.shouldBackup();
    
    res.json({
      success: true,
      needsBackup: status.needsBackup,
      rowCount: status.count,
      sizeMB: status.sizeMB,
      thresholds: {
        current: {
          rows: 150000,
          sizeMB: 66,
          description: 'Testing threshold - ALREADY EXCEEDED',
        },
        production: {
          rows: 884955,
          sizeMB: 400,
          description: 'Production threshold (will update after testing)',
        },
      },
      message: status.needsBackup 
        ? '⚠️  Backup recommended - threshold exceeded!' 
        : 'Backup not needed yet',
    });
  } catch (error) {
    console.error('Error checking backup status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/backup/manual
 * Manually trigger a backup
 */
router.post('/backup/manual', async (req: Request, res: Response) => {
  try {
    console.log('📦 Manual backup initiated via API');
    
    const result = await googleDriveBackupService.backupGameHistory();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup completed successfully',
        data: {
          filename: result.filename,
          fileId: result.fileId,
          recordsBackedUp: result.recordsBackedUp,
          recordsDeleted: result.recordsDeleted,
          sizeMB: result.sizeMB,
          googleDriveUrl: `https://drive.google.com/file/d/${result.fileId}/view`,
        },
      });
    } else {
      res.json({
        success: false,
        message: 'Backup not needed - threshold not reached',
      });
    }
  } catch (error) {
    console.error('Error during manual backup:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/backup/test
 * Test backup (for initial testing)
 */
router.post('/backup/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test backup initiated via API');
    
    const status = await googleDriveBackupService.shouldBackup();
    
    if (status.count === 0) {
      return res.json({
        success: false,
        message: 'No records in game_history to backup',
      });
    }
    
    console.log(`Found ${status.count} records (~${status.sizeMB} MB) to backup`);
    
    const result = await googleDriveBackupService.backupGameHistory();
    
    res.json({
      success: true,
      message: 'Test backup completed',
      data: {
        filename: result.filename,
        fileId: result.fileId,
        recordsBackedUp: result.recordsBackedUp,
        recordsDeleted: result.recordsDeleted,
        sizeMB: result.sizeMB,
        googleDriveUrl: `https://drive.google.com/file/d/${result.fileId}/view`,
        note: '',
      },
    });
  } catch (error) {
    console.error('Error during test backup:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/backup/cron/status
 * Get cron job status
 */
router.get('/backup/cron/status', (req: Request, res: Response) => {
  try {
    const status = backupCronService.getStatus();
    
    res.json({
      success: true,
      cron: status,
      description: 'Backup runs every 2 hours (00:00, 02:00, 04:00, etc.)',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/backup/cron/start
 * Start the backup cron job
 */
router.post('/backup/cron/start', (req: Request, res: Response) => {
  try {
    backupCronService.start();
    const status = backupCronService.getStatus();
    
    res.json({
      success: true,
      message: 'Backup cron job started',
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/backup/cron/stop
 * Stop the backup cron job
 */
router.post('/backup/cron/stop', (req: Request, res: Response) => {
  try {
    backupCronService.stop();
    
    res.json({
      success: true,
      message: 'Backup cron job stopped',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/backup/cron/run-now
 * Trigger backup immediately (bypasses schedule)
 */
router.post('/backup/cron/run-now', async (req: Request, res: Response) => {
  try {
    const result = await backupCronService.runNow();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup executed successfully',
        data: {
          filename: result.filename,
          fileId: result.fileId,
          recordsBackedUp: result.recordsBackedUp,
          recordsDeleted: result.recordsDeleted,
          googleDriveUrl: `https://drive.google.com/file/d/${result.fileId}/view`,
        },
      });
    } else {
      res.json({
        success: false,
        message: 'Backup not needed - threshold not reached',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;