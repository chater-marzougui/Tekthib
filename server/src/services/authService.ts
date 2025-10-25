import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { supabase } from '../config/supabase';
import config from '../config/config';

const SALT_ROUNDS = 10;

interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserStats {
  total_games: number;
  wins: number;
  losses: number;
  total_cards_played: number;
  total_bluffs: number;
  successful_bluffs: number;
  total_challenges: number;
  successful_challenges: number;
  failed_challenges: number;
  win_rate: number;
  bluff_success_rate: number;
  challenge_success_rate: number;
}

export class AuthService {
  /**
   * Generate a custom user ID
   */
  private generateUserId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  async signup(
    username: string,
    email: string,
    password: string,
    displayName?: string,
    clientId?: string | null,
  ): Promise<{
    user: UserProfile;
    token: string;
    refreshToken: string;
    clientId: string;
  }> {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate custom user ID
    if (clientId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', clientId)
        .single();

      if (existingUser) { 
        clientId = null;
      }
    }
    const userId = clientId || this.generateUserId();

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        email,
        password_hash: passwordHash,
        display_name: displayName || username,
      })
      .select('id, username, email, display_name, avatar_url, created_at')
      .single();

    if (error || !user) {
      throw new Error('Failed to create user: ' + error?.message);
    }

    // Initialize player stats
    await supabase.from('player_stats').insert({
      user_id: userId,
    });

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return { user, token, refreshToken, clientId: userId };
  }

  async login(
    usernameOrEmail: string,
    password: string,
  ): Promise<{ user: UserProfile; token: string; refreshToken: string }> {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, username, email, password_hash, display_name, avatar_url, created_at',
      )
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Remove password hash from response
    const { password_hash, ...userProfile } = user;

    return { user: userProfile, token, refreshToken };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
        id: string;
        username: string;
        email: string;
      };

      // Verify user still exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const token = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return { token, refreshToken: newRefreshToken };
    } catch (error: any) {
      throw new Error('Invalid refresh token: ' + error.message);
    }
  }

  async getUserProfile(
    userId: string,
  ): Promise<UserProfile & { stats: UserStats }> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, display_name, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Get stats
    const { data: stats } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      ...user,
      stats: stats || this.getDefaultStats(),
    };
  }

  async updateProfile(
    userId: string,
    updates: { display_name?: string; avatar_url?: string },
  ): Promise<UserProfile> {
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, username, email, display_name, avatar_url, created_at')
      .single();

    if (error || !user) {
      throw new Error('Failed to update profile');
    }

    return user;
  }

  private generateToken(user: {
    id: string;
    username: string;
    email: string;
  }): string {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as StringValue,
    };
    return jwt.sign(payload, config.jwt.secret as jwt.Secret, options);
  }

  private generateRefreshToken(user: {
    id: string;
    username: string;
    email: string;
  }): string {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as StringValue,
    };
    return jwt.sign(payload, config.jwt.secret as jwt.Secret, options);
  }

  private getDefaultStats(): UserStats {
    return {
      total_games: 0,
      wins: 0,
      losses: 0,
      total_cards_played: 0,
      total_bluffs: 0,
      successful_bluffs: 0,
      total_challenges: 0,
      successful_challenges: 0,
      failed_challenges: 0,
      win_rate: 0,
      bluff_success_rate: 0,
      challenge_success_rate: 0,
    };
  }
}

export const authService = new AuthService();
