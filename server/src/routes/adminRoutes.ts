import { Router, Request, Response } from 'express';
import { roomManager } from '../utils/roomManager';
import config from '../config/config';
import { supabase } from '../config/supabase';

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

// Database Management Endpoints

// Get all users with stats
router.get('/db/users', async (req: Request, res: Response) => {
  const password = req.query.password || req.headers['x-admin-password'];

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!supabase) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database features are disabled. Configure Supabase to enable.',
    });
  }

  try {
    const { data: users, error } = await supabase!
      .from('users')
      .select(`
        id,
        username,
        email,
        display_name,
        avatar_url,
        created_at,
        last_login_at,
        player_stats (
          total_games,
          wins,
          losses,
          win_rate,
          total_cards_played,
          total_bluffs,
          successful_bluffs,
          bluff_success_rate,
          total_challenges,
          successful_challenges,
          challenge_success_rate
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ users: users || [] });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
});

// Get all games
router.get('/db/games', async (req: Request, res: Response) => {
  const password = req.query.password || req.headers['x-admin-password'];
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!supabase) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database features are disabled. Configure Supabase to enable.',
    });
  }

  try {
    const { data: games, error, count } = await supabase!
      .from('games')
      .select(`
        id,
        room_code,
        started_at,
        ended_at,
        duration_minutes,
        total_players,
        total_rounds,
        total_challenges,
        winner_user_id,
        loser_user_id,
        game_participants (
          player_name,
          is_winner,
          is_loser,
          is_bot,
          final_position
        )
      `, { count: 'exact' })
      .order('ended_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({ 
      games: games || [], 
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// Delete a game
router.delete('/db/games/:gameId', async (req: Request, res: Response) => {
  const password = req.body.password || req.headers['x-admin-password'];
  const { gameId } = req.params;

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!gameId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'gameId is required',
    });
  }

  if (!supabase) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database features are disabled. Configure Supabase to enable.',
    });
  }

  try {
    const { error } = await supabase!
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: `Game ${gameId} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game', message: error.message });
  }
});

// Update user
router.put('/db/users/:userId', async (req: Request, res: Response) => {
  const password = req.body.password || req.headers['x-admin-password'];
  const { userId } = req.params;
  const { username, email, display_name, avatar_url } = req.body;

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!userId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userId is required',
    });
  }

  if (!supabase) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database features are disabled. Configure Supabase to enable.',
    });
  }

  try {
    const updates: any = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (display_name !== undefined) updates.display_name = display_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabase!
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ success: true, user: data, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

// Delete user
router.delete('/db/users/:userId', async (req: Request, res: Response) => {
  const password = req.body.password || req.headers['x-admin-password'];
  const { userId } = req.params;

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!userId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userId is required',
    });
  }

  if (!supabase) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database features are disabled. Configure Supabase to enable.',
    });
  }

  try {
    const { error } = await supabase!
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: `User ${userId} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

// Get database statistics
router.get('/db/stats', async (req: Request, res: Response) => {
  const password = req.query.password || req.headers['x-admin-password'];

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin password',
    });
  }

  if (!supabase) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database features are disabled. Configure Supabase to enable.',
    });
  }

  try {
    // Get user count
    const { count: userCount, error: userError } = await supabase!
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    // Get game count
    const { count: gameCount, error: gameError } = await supabase!
      .from('games')
      .select('*', { count: 'exact', head: true });

    if (gameError) throw gameError;

    // Get total games played in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentGames, error: recentError } = await supabase!
      .from('games')
      .select('*', { count: 'exact', head: true })
      .gte('ended_at', oneDayAgo);

    if (recentError) throw recentError;

    res.json({
      totalUsers: userCount || 0,
      totalGames: gameCount || 0,
      gamesLast24h: recentGames || 0,
    });
  } catch (error: any) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

export default router;
