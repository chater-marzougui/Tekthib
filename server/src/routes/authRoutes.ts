import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { gameHistoryService } from '../services/gameHistoryService';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username, email, and password are required',
      });
    }

    // Basic validation
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        error: 'Invalid username',
        message: 'Username must be between 3 and 50 characters',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 6 characters',
      });
    }

    // Use a safer email validation to prevent ReDoS
    const emailRegex = /^[\w.+-]+@[\w.-]+\.[\w.-]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    const result = await authService.signup(username, email, password, displayName);

    res.status(201).json(result);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      error: 'Signup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username/email and password are required',
      });
    }

    const result = await authService.login(usernameOrEmail, password);

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Invalid credentials',
    });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json(result);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await authService.getUserProfile(req.user.id);

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { display_name, avatar_url } = req.body;

    const profile = await authService.updateProfile(req.user.id, {
      display_name,
      avatar_url,
    });

    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/game-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await gameHistoryService.getPlayerGameHistory(
      req.user.id,
      limit,
      offset,
    );

    res.json(history);
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      error: 'Failed to get game history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/game/:gameId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const gameDetails = await gameHistoryService.getGameDetails(req.params.gameId);

    res.json(gameDetails);
  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({
      error: 'Failed to get game details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
