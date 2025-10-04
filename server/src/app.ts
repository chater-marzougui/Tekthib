import express, { Express } from 'express';
import cors from 'cors';
import { roomManager } from './utils/roomManager';
import adminRoutes from './routes/adminRoutes';

const app: Express = express();

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: roomManager.getRoomCount(),
  });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.getRoomByCode(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({
      error: 'Room not found',
      code: 'ROOM_NOT_FOUND',
    });
  }

  if (room.gameState?.phase === 'playing') {
    return res.status(403).json({
      error: 'Game already started',
      code: 'GAME_ALREADY_STARTED',
    });
  }

  if (room.players.size >= room.maxPlayers) {
    return res.status(403).json({
      error: 'Room is full',
      code: 'ROOM_FULL',
    });
  }

  res.json({
    id: room.id,
    code: room.code,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    inProgress: room.gameState?.phase === 'ended',
  });
});

// Get all rooms (public and private)
app.get('/api/rooms', (req, res) => {
  const allRooms = roomManager.getAllRooms();
  
  const roomList = allRooms.map(room => ({
    id: room.id,
    hostName: room.hostName,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    isPublic: room.isPublic,
    inProgress: room.gameState?.phase === 'playing' || room.gameState?.phase === 'ended',
    code: room.isPublic ? room.code : undefined, // Only expose code for public rooms
  }));

  res.json(roomList);
});

// Admin routes
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
    next();
  },
);

export default app;
