import { createServer } from 'node:http';
import app from './app';
import { setupWebSocket } from './websocket';
import { backupCronService } from './services/backupCron';

const PORT = process.env.PORT || 3001;

const server = createServer(app);

// Setup WebSocket server
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);

  // Start the backup cron job
  try {
    backupCronService.start();
    console.log('✅ Backup cron job started successfully');
  } catch (error) {
    console.error('❌ Failed to start backup cron job:', error);
    console.error('Backup system will not run automatically');
  }
});


// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  backupCronService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  backupCronService.stop();
  process.exit(0);
});
