import express, { Express } from 'express';
import cors from 'cors';
import { roomManager } from './utils/roomManager';

const app: Express = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: roomManager.getRoomCount()
  });
});

// Get room info by code (for checking if room exists)
app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.getRoomByCode(req.params.code.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    id: room.id,
    code: room.code,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    inProgress: room.gameState?.phase === 'playing'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;