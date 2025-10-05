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

export default router;
