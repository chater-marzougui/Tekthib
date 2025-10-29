import express, { Express } from 'express';
import cors from 'cors';
import { roomManager } from './utils/roomManager';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import backupRoutes from './routes/backupCron';
import { backupCronService } from './services/backupCron';

const app: Express = express();
const ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://chater-marzougui.me', 'https://chater-marzougui.me/Tekthib']
  : ['http://localhost:5173'];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.redirect('https://chater-marzougui.me/Tekthib');
});

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

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Backup cron routes
app.use('/api', backupRoutes);

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
