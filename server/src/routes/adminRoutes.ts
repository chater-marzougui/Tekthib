import { Router, Request, Response } from 'express';
import { roomManager } from '../utils/roomManager';
import config from '../config/config';

const router = Router();

// Admin endpoint to get system state
router.get('/system-state', (req: Request, res: Response) => {
  // Check password from query param or header
  const password = req.query.password || req.headers['x-admin-password'];

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  // Return system state
  const systemState = roomManager.getSystemState();
  res.json(systemState);
});

router.post('/delete-room', (req: Request, res: Response) => {
  const password = req.body.password || req.headers['x-admin-password'];
  const roomId = req.body.roomId;

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!roomId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'roomId is required',
    });
  }
  
  const success = roomManager.deleteRoom(roomId);
  if (!success) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Room not found',
    });
  }

  res.json({ success: true, message: `Room ${roomId} deleted` });
});

router.post('/delete-all-rooms', (req: Request, res: Response) => {
  const password = req.body.password || req.headers['x-admin-password'];

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  const deletedCount = roomManager.deleteAllRooms();
  res.json({ 
    success: true, 
    message: `All rooms deleted`, 
    deletedCount 
  });
});

router.post('/kick-player', (req: Request, res: Response) => {
  const password = req.body.password || req.headers['x-admin-password'];
  const roomId = req.body.roomId;
  const playerId = req.body.playerId;

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!roomId || !playerId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'roomId and playerId are required',
    });
  }

  const room = roomManager.getRoom(roomId);
  if (!room) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Room not found',
    });
  }

  const player = room.players.get(playerId);
  if (!player) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Player not found in room',
    });
  }

  if (player.isBot) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Cannot kick bots through admin',
    });
  }

  const result = roomManager.removePlayerFromRoom(roomId, playerId);
  if (!result.success) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to kick player',
    });
  }

  res.json({ 
    success: true, 
    message: `Player ${playerId} kicked from room ${roomId}`,
    roomDeleted: result.roomDeleted 
  });
});

export default router;
