# Supabase Setup Guide for Tekthib

This guide will walk you through setting up Supabase for the Tekthib game to enable user authentication, game history tracking, and player statistics.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create a Supabase Project](#create-a-supabase-project)
3. [Set Up Database Schema](#set-up-database-schema)
4. [Configure Environment Variables](#configure-environment-variables)
5. [Testing the Integration](#testing-the-integration)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js 18+ installed
- The Tekthib repository cloned locally

## Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: `tekthib` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Plan**: Free tier is sufficient for development
4. Click "Create new project"
5. Wait for the project to be provisioned (this takes a few minutes)

## Set Up Database Schema

Once your project is ready:

1. In the Supabase dashboard, go to the **SQL Editor** (left sidebar)
2. Open the file `server/supabase-schema.sql` from this repository
3. Copy the entire contents of the file
4. Paste it into the SQL Editor in Supabase
5. Click **Run** to execute the schema

This will create:
- **users** table - User profiles and authentication
- **player_stats** table - Player statistics (games, wins, losses, etc.)
- **games** table - Completed game records
- **game_participants** table - Player participation in games
- **game_history** table - Detailed event history for each game

### Verify Schema Creation

After running the SQL, verify the tables were created:
1. Go to **Table Editor** in the Supabase dashboard
2. You should see all 5 tables listed
3. Check that each table has the correct columns and indexes

## Configure Environment Variables

### Server Configuration

1. In the Supabase dashboard, go to **Settings** → **API**
2. Find these two values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **Service Role Key** (anon key won't work - you need service_role)

3. Create or update `server/.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Admin Password
ADMIN_PASSWORD=your-admin-password-here

# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

⚠️ **Important**: 
- Use the **Service Role Key**, not the anon key
- Keep the service role key secret - never commit it to version control
- The `.env` file is already in `.gitignore`
- Change the `JWT_SECRET` to a random string for production

### Client Configuration

The client uses the same API URL for both HTTP and WebSocket connections:

Create or update `client/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

For production, update these to your production server URLs.

## Testing the Integration

### 1. Start the Server

```bash
cd server
npm install
npm run dev
```

The server should start without errors. Check the console for:
- No "Supabase configuration is missing" warnings
- Server listening on port 3001

### 2. Test Authentication Endpoints

#### Sign Up
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123456",
    "displayName": "Test User"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "display_name": "Test User",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "test123456"
  }'
```

#### Get Profile (Authenticated)
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Verify Database Records

1. Go to Supabase **Table Editor**
2. Check the **users** table - you should see your test user
3. Check the **player_stats** table - a stats record should be created automatically

### 4. Test Frontend

```bash
cd client
npm install
npm run dev
```

1. Open http://localhost:5173/Tekthib/
2. Click your avatar in the top-right corner
3. Click "Login" in the dropdown menu
4. You should see the authentication page
5. Try signing up or logging in with your test account

## API Endpoints

### Authentication

All auth endpoints are under `/api/auth`:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/signup` | POST | Create new account | No |
| `/login` | POST | Login to existing account | No |
| `/refresh` | POST | Refresh JWT token | No |
| `/profile` | GET | Get user profile with stats | Yes |
| `/profile` | PUT | Update user profile | Yes |
| `/game-history` | GET | Get user's game history | Yes |
| `/game/:gameId` | GET | Get detailed game info | Yes |

### Request/Response Examples

#### Sign Up
**Request:**
```json
{
  "username": "player1",
  "email": "player1@example.com",
  "password": "securepass123",
  "displayName": "Player One"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "username": "player1",
    "email": "player1@example.com",
    "display_name": "Player One",
    "avatar_url": null,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "token": "jwt-token-here",
  "refreshToken": "refresh-token-here"
}
```

#### Login
**Request:**
```json
{
  "usernameOrEmail": "player1",
  "password": "securepass123"
}
```

**Response:** Same as sign up

#### Get Profile
**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Response:**
```json
{
  "id": "uuid-here",
  "username": "player1",
  "email": "player1@example.com",
  "display_name": "Player One",
  "avatar_url": null,
  "created_at": "2024-01-15T10:30:00Z",
  "stats": {
    "total_games": 15,
    "wins": 8,
    "losses": 7,
    "total_cards_played": 250,
    "total_bluffs": 45,
    "successful_bluffs": 30,
    "total_challenges": 20,
    "successful_challenges": 12,
    "failed_challenges": 8,
    "win_rate": 53.33,
    "bluff_success_rate": 66.67,
    "challenge_success_rate": 60.00
  }
}
```

## Frontend Integration

### Using the AuthContext

The `AuthContext` provides authentication state and methods:

```typescript
import { useAuth } from "@/context/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, login, signup, logout } = useAuth();

  // Check if user is logged in
  if (isAuthenticated) {
    console.log("User:", user.username);
  }

  // Login
  const handleLogin = async () => {
    try {
      await login("username", "password");
    } catch (error) {
      console.error(error);
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
  };
}
```

### Protected Routes

To create a protected route that requires authentication:

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return <div>Protected content</div>;
}
```

## How Game History Works

### Automatic Saving

When a game ends, the server automatically:

1. Creates a record in the `games` table
2. Saves all participant data in `game_participants`
3. Records detailed game events in `game_history` table
4. Updates player statistics in `player_stats`

This happens in `GameEngine.ts` when the game phase changes to `'ended'`.

### What Gets Saved

For each completed game:

- **Game Info**: Room code, start/end times, winner, loser, total rounds, total challenges
- **Participants**: Each player's stats (cards played, bluffs, challenges, final position)
- **Game Events**: Detailed event history including:
  - Game start with initial state (card distribution, player order)
  - Round starts (each new round with the starting player)
  - Cards played (each card play with claimed rank, actual cards, pile size)
  - Challenges (challenge results, revealed cards, who took the pile)
  - Round ends (after each challenge with the result)
  - Game end (final statistics for all players)
- **Statistics**: Aggregated stats for each player (total wins, losses, bluff success rates, etc.)

### Game Event Tracking

The game now tracks detailed events throughout gameplay:

1. **Game Start**: Records initial player setup, hand sizes, and removed cards
2. **Round Tracking**: Each round is numbered and tracked from start to finish
3. **Card Plays**: Every card played is logged with the claimed rank and actual cards
4. **Challenges**: Challenge events record who challenged, the result, and pile distribution
5. **Game End**: Final statistics and winner/loser information

All events are timestamped and include the round number for historical playback capability.

## New Features

### Leaderboards

A leaderboard is now available on the home page showing top players:

- **API Endpoint**: `GET /api/auth/leaderboard?sortBy=wins&limit=10`
- **Sort Options**: 
  - `wins` - Sort by total wins
  - `win_rate` - Sort by win percentage
  - `total_games` - Sort by total games played
- **Display**: Shows top 5 players in each category with trophy icons for top 3

### User Profiles

Users can now view detailed profiles:

- **Route**: `/profile/:username`
- **API Endpoints**:
  - `GET /api/auth/profile/:username` - Get user profile by username
  - `GET /api/auth/user/:userId/game-history` - Get user's game history
- **Features**:
  - User statistics (games played, wins, losses, win rate)
  - Bluff and challenge success rates
  - Recent game history with detailed stats
  - Clickable from NavUser dropdown

### Accessing Profile Pages

Users can access profiles by:
1. Clicking their display name in the NavUser dropdown (top right)
2. Navigating to `/profile/username` directly

## Troubleshooting

### "Supabase configuration is missing"

**Problem**: Server logs show this warning
**Solution**: 
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `server/.env`
- Make sure you're using the service role key, not the anon key
- Restart the server after changing `.env`

### Authentication Fails with 401

**Problem**: Login/signup returns 401 Unauthorized
**Solution**:
- Verify the JWT_SECRET is set in `server/.env`
- Check server logs for error messages
- Ensure the database schema was created correctly

### CORS Errors

**Problem**: Frontend can't connect to backend
**Solution**:
- Check that the client's `VITE_API_URL` matches your server URL
- Verify CORS is configured correctly in `server/src/app.ts`
- For local development, make sure you're using `http://localhost:5173`

### Database Connection Errors

**Problem**: Can't connect to Supabase
**Solution**:
- Verify your Supabase project is active (not paused)
- Check the Project URL in the Supabase dashboard
- Ensure you're using the correct service role key
- Check your internet connection

### Row Level Security (RLS) Issues

**Problem**: Can't query tables even with correct credentials
**Solution**:
- The service role key bypasses RLS
- If you're using the anon key, RLS policies will apply
- For this app, always use the service role key on the server

## Security Best Practices

1. **Never expose the service role key**
   - Keep it in `.env` files only
   - Never commit it to version control
   - Never send it to the client

2. **Use strong JWT secrets**
   - Generate a random string for `JWT_SECRET`
   - Change it regularly in production
   - Use different secrets for dev and prod

3. **Validate inputs**
   - The server validates all inputs
   - Don't rely on client-side validation alone

4. **Use HTTPS in production**
   - Always use SSL/TLS for production
   - Update API URLs to use `https://`

5. **Rotate credentials**
   - Regenerate service role keys periodically
   - Update them across all environments

## Next Steps

After setting up Supabase, these features are now available:

✅ **Completed Features:**
1. **Detailed game history tracking**: All game events are recorded including rounds, card plays, and challenges
2. **Leaderboards**: Top players displayed on home page sorted by wins, win rate, or total games
3. **User profile pages**: View detailed stats and game history for any player

🔮 **Future Enhancements:**
4. **Add achievements**: Track special accomplishments (e.g., "Master Bluffer", "Challenge Champion")
5. **Enable social features**: Friends list, direct challenges, tournaments
6. **Advanced analytics**: Trend charts, performance over time, player comparisons
7. **Replay system**: Use game_history events to replay past games

## Support

For issues or questions:
- Check the [main README](./README.md)
- Review server logs for error messages
- Verify all environment variables are set correctly
- Test endpoints with curl/Postman before using the frontend
