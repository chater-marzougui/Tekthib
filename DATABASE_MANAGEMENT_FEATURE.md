# Database Management Feature Documentation

## Overview

This document describes the new database management feature added to the admin panel of Tekthib. The feature provides a comprehensive interface for managing users, games, and viewing database statistics.

## Feature Structure

### Component Organization

All database management components are located in `/client/src/components/admin/`:

```
client/src/components/admin/
├── DatabaseManagement.tsx    # Main container component with tabs
├── UserManagement.tsx         # User management interface
├── GameManagement.tsx         # Game management interface
└── DataVisualization.tsx      # Statistics dashboard
```

### API Endpoints

New endpoints have been added to `/server/src/routes/adminRoutes.ts`:

#### User Management
- `GET /api/admin/db/users` - List all users with their stats
- `PUT /api/admin/db/users/:userId` - Update user information
- `DELETE /api/admin/db/users/:userId` - Delete a user (cascades to all related data)

#### Game Management
- `GET /api/admin/db/games` - List all games with pagination (50 per page, configurable via limit parameter)
- `DELETE /api/admin/db/games/:gameId` - Delete a specific game

#### Statistics
- `GET /api/admin/db/stats` - Get database overview statistics

All endpoints require admin password authentication via query parameter or `x-admin-password` header.

## Features

### 1. System Monitor Tab (Existing)
- View active game rooms in real-time
- Monitor connected players
- Delete rooms and kick players
- Auto-refresh capability
- Real-time WebSocket state monitoring

### 2. Database Management Tab (New)

#### Overview Sub-Tab
Displays key database metrics:
- Total registered users
- Total completed games
- Games played in the last 24 hours
- Informational guide about database management features

Statistics auto-refresh every 30 seconds.

#### Users Sub-Tab
Complete user management interface:
- **List View**: Shows all registered users with stats
- **Search**: Filter users by username, email, or display name
- **User Details**: 
  - Account information (username, email, display name, ID)
  - Join date and last login
  - Game statistics (games played, win rate, wins/losses)
  - Performance metrics (cards played, bluff success rate, challenge success rate)
- **Edit User**: 
  - Update username, email, and display name
  - Real-time form validation
- **Delete User**: 
  - Confirmation dialog
  - Cascading delete (removes all user's games and stats)

#### Games Sub-Tab
Complete game history management:
- **List View**: Shows completed games with details
- **Pagination**: 50 games per page (configurable) with navigation controls
- **Search**: Filter games by room code or game ID
- **Game Details**:
  - Room code and player count
  - Start time and duration
  - Total rounds and challenges
  - Player list with final positions
  - Winner/loser badges
  - Bot indicators
- **Delete Game**: Remove individual game records

## Security Features

1. **Authentication**: All database endpoints require admin password
2. **Authorization**: Password validation occurs server-side
3. **Error Handling**: Graceful handling when Supabase is not configured
4. **Service Availability**: Returns 503 status when database features are disabled
5. **Null Safety**: TypeScript non-null assertions where database is required

## Database Configuration

The feature gracefully handles missing database configuration:

- If Supabase credentials are not configured, database features show appropriate error messages
- The system monitor tab continues to work independently
- No crashes occur due to missing database configuration

## User Interface

### Navigation
- Two-tab layout at the admin page level:
  1. **System Monitor**: Real-time room and player management
  2. **Database Management**: Historical data and user management

### Database Management Sub-Tabs
- Three sub-tabs within Database Management:
  1. **Overview**: Statistics dashboard
  2. **Users**: User management
  3. **Games**: Game history management

### Design Elements
- Consistent with existing admin UI
- Uses shadcn/ui components (Card, Tabs, Dialog, Input, Button)
- Iconify React icons for visual consistency
- Responsive grid layouts
- Color-coded status indicators (green for success, red for danger, etc.)
- Loading states and skeleton screens
- Toast notifications for user feedback

## Technical Implementation

### Frontend Architecture
- **React Hooks**: useState, useEffect for state management
- **Data Fetching**: Native fetch API with async/await
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Pagination**: Server-side pagination for games list
- **Real-time Updates**: Manual refresh buttons + auto-refresh for statistics
- **Search/Filter**: Client-side filtering for better UX

### Backend Architecture
- **Express.js Routes**: RESTful API design
- **Supabase Integration**: Postgres database via Supabase client
- **Type Safety**: Full TypeScript typing
- **Error Responses**: Standardized error object format
- **Query Optimization**: Efficient joins and indexed queries

### Database Schema
Tables accessed by this feature:
- `users`: User account information
- `player_stats`: Aggregated player statistics
- `games`: Completed game records
- `game_participants`: Player participation in games
- `game_history`: Detailed game events (not displayed in UI, but preserved)

## Usage Examples

### Viewing Users
1. Navigate to Admin page
2. Click "Database Management" tab
3. Click "Users" sub-tab
4. Browse the list or use search to find specific users
5. View detailed stats for each user

### Editing a User
1. Find the user in the Users list
2. Click the pencil (edit) icon
3. Modify username, email, or display name
4. Click "Save Changes"
5. Confirmation toast appears

### Deleting a Game
1. Navigate to Database Management > Games
2. Find the game to delete
3. Click the "Delete" button
4. Confirm the deletion in the dialog
5. Game is removed from database

### Monitoring Database Growth
1. Navigate to Database Management > Overview
2. View total users and games
3. Check recent activity (games in last 24h)
4. Statistics refresh automatically every 30 seconds

## Maintenance and Future Enhancements

### Potential Improvements
1. **Bulk Operations**: Select multiple users/games for batch deletion
2. **Advanced Filters**: Date ranges, player counts, game duration filters
3. **Export Data**: CSV/JSON export of users and games
4. **User Details Page**: Deep dive into individual user game history
5. **Charts/Graphs**: Visual representation of statistics over time
6. **Audit Log**: Track admin actions on the database
7. **Advanced Search**: Full-text search with multiple criteria

### Performance Considerations
- Games list uses pagination to avoid loading large datasets
- User stats are pre-calculated in the database (computed columns)
- Indexes on frequently queried columns (user_id, game_id, timestamps)
- Auto-refresh intervals are balanced for real-time data without excessive load

## Troubleshooting

### "Database features are disabled" message
- Check that SUPABASE_URL and SUPABASE_SERVICE_KEY are set in server/.env
- Verify the Supabase project is active and accessible
- Check server logs for connection errors

### Statistics not updating
- Check that auto-refresh is enabled (30-second interval)
- Manually click the Refresh button
- Verify network connectivity to the server

### User/Game not appearing in list
- Check if data exists in the database (use Supabase dashboard)
- Try refreshing the list
- Check for JavaScript errors in browser console
- Verify admin password is correct

## Testing

### Manual Testing Checklist
- [ ] Admin login with correct password
- [ ] Admin login with incorrect password (should fail)
- [ ] View System Monitor tab
- [ ] Switch to Database Management tab
- [ ] View Overview statistics
- [ ] Navigate to Users sub-tab
- [ ] Search for users
- [ ] Edit a user
- [ ] Delete a user (test user only!)
- [ ] Navigate to Games sub-tab
- [ ] Paginate through games
- [ ] Search for a game
- [ ] Delete a game (test game only!)
- [ ] Check that database features work with valid Supabase config
- [ ] Check that appropriate errors show without Supabase config

## Migration Notes

### For Existing Deployments
1. Pull the latest code
2. Ensure Supabase is configured (if not already)
3. No database migrations required (uses existing schema)
4. Rebuild client and server: `npm run build`
5. Restart the server
6. Test admin panel functionality

### Environment Variables
No new environment variables are required. Existing Supabase configuration is used:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_PASSWORD`

## Code Quality

- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive try-catch blocks
- **Code Organization**: Modular component structure
- **Consistent Styling**: Uses existing UI component library
- **Documentation**: Inline comments for complex logic
- **Build Verification**: Both client and server build successfully

## Security Checklist

- [x] Admin password required for all endpoints
- [x] Server-side validation and authorization
- [x] No sensitive data exposed in error messages
- [x] CSRF protection via same-origin policy
- [x] Input sanitization via Supabase parameterized queries
- [x] Confirmation dialogs for destructive operations
- [x] Graceful handling of missing credentials
