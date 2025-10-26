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

interface UserPreferences {
  theme: string;
  locale: string;
  sound_effects_enabled: boolean;
  show_bot_messages: boolean;
  show_system_messages: boolean;
  show_challenge_toasts: boolean;
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
    const { data: existingUser } = await supabase!
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
      const { data: existingUser } = await supabase!
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
    const { data: user, error } = await supabase!
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
    await supabase!.from('player_stats').insert({
      user_id: userId,
    });

    // Initialize user preferences with defaults
    await supabase!.from('user_preferences').insert({
      user_id: userId,
      theme: 'dark',
      locale: 'en',
      sound_effects_enabled: true,
      show_bot_messages: true,
      show_system_messages: true,
      show_challenge_toasts: true,
    });

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login
    await supabase!
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return { user, token, refreshToken, clientId: userId };
  }

  async login(
    usernameOrEmail: string,
    password: string,
  ): Promise<{ user: UserProfile; token: string; refreshToken: string; preferences: UserPreferences | null }> {
    // Find user
    const { data: user, error } = await supabase!
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
    await supabase!
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Get user preferences
    const { data: preferences } = await supabase!
      .from('user_preferences')
      .select('theme, locale, sound_effects_enabled, show_bot_messages, show_system_messages, show_challenge_toasts')
      .eq('user_id', user.id)
      .single();

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Remove password hash from response
    const { password_hash, ...userProfile } = user;

    return { user: userProfile, token, refreshToken, preferences };
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
      const { data: user, error } = await supabase!
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
    const { data: user, error } = await supabase!
      .from('users')
      .select('id, username, email, display_name, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Get stats
    const { data: stats } = await supabase!
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      ...user,
      stats: stats || this.getDefaultStats(),
    };
  }

  async getUserProfileByUsername(
    username: string,
  ): Promise<UserProfile & { stats: UserStats }> {
    const { data: user, error } = await supabase!
      .from('users')
      .select('id, username, email, display_name, avatar_url, created_at')
      .eq('username', username)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Get stats
    const { data: stats } = await supabase!
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
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
    const { data: user, error } = await supabase!
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

  async updateUsername(
    userId: string,
    newUsername: string,
  ): Promise<UserProfile> {
    // Check if username is already taken
    const { data: existingUser } = await supabase!
      .from('users')
      .select('id')
      .eq('username', newUsername)
      .neq('id', userId)
      .single();

    if (existingUser) {
      throw new Error('Username already taken');
    }

    // Validate username
    if (newUsername.length < 3 || newUsername.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }

    const { data: user, error } = await supabase!
      .from('users')
      .update({ username: newUsername })
      .eq('id', userId)
      .select('id, username, email, display_name, avatar_url, created_at')
      .single();

    if (error || !user) {
      throw new Error('Failed to update username');
    }

    return user;
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Get current user
    const { data: user, error } = await supabase!
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    const { error: updateError } = await supabase!
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Failed to update password');
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data: preferences, error } = await supabase!
      .from('user_preferences')
      .select('theme, locale, sound_effects_enabled, show_bot_messages, show_system_messages, show_challenge_toasts')
      .eq('user_id', userId)
      .single();

    if (error || !preferences) {
      // Return defaults if preferences don't exist
      return {
        theme: 'dark',
        locale: 'en',
        sound_effects_enabled: true,
        show_bot_messages: true,
        show_system_messages: true,
        show_challenge_toasts: true,
      };
    }

    return preferences;
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    // Check if preferences exist
    const { data: existing } = await supabase!
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existing) {
      // Create new preferences
      const { data: newPreferences, error } = await supabase!
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...preferences,
        })
        .select('theme, locale, sound_effects_enabled, show_bot_messages, show_system_messages, show_challenge_toasts')
        .single();

      if (error || !newPreferences) {
        throw new Error('Failed to create preferences');
      }

      return newPreferences;
    }

    // Update existing preferences
    const { data: updatedPreferences, error } = await supabase!
      .from('user_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select('theme, locale, sound_effects_enabled, show_bot_messages, show_system_messages, show_challenge_toasts')
      .single();

    if (error || !updatedPreferences) {
      throw new Error('Failed to update preferences');
    }

    return updatedPreferences;
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
