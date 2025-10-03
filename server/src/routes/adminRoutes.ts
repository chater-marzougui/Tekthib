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

export default router;
