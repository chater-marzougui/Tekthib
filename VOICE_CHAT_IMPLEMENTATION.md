# Voice Chat Features Implementation

## Overview
This document describes the voice chat features that have been implemented for the Tekthib game, including host-based controls, per-player muting, and seamless transition between room and game pages.

## Features Implemented

### 1. Host-Based Controls

#### Kick Player
- **Description**: Host can remove players from the room
- **Implementation**: 
  - New WebSocket message types: `KICK_PLAYER`, `PLAYER_KICKED`
  - Server validates that only host can kick
  - Cannot kick yourself or bots
  - Kicked player receives notification and is redirected
  - Other players are notified of the kick

#### Mute Player Microphone
- **Description**: Host can disable a player's microphone
- **Implementation**:
  - New WebSocket message types: `SWITCH_PLAYER_MIC`, `PLAYER_MIC_SWITCHED`
  - Server validates that only host can mute
  - Muted player's microphone is forcefully disabled
  - Player cannot unmute until they leave/rejoin or game ends
  - Visual indicator shows when muted by host

### 2. Per-Player Muting

#### Local Audio Muting
- **Description**: Any player can mute specific players without affecting others
- **Implementation**:
  - Maintains a local set of muted player IDs
  - Controls audio element volume (0 for muted, 1 for unmuted)
  - Purely client-side - doesn't affect other players' experience
  - Independent toggle button for each player in the voice chat UI

### 3. Seamless Voice Chat Transition

#### Persistent Voice Connections
- **Description**: Voice chat continues uninterrupted when moving from room to game
- **Implementation**:
  - Created `VoiceChatProvider` context that wraps both pages
  - Removed cleanup on unmount from the voice chat hook
  - Voice connections persist across React component lifecycles
  - Same peer connections and audio streams maintained
  - Players can continue talking during the transition

### 4. Enhanced UI Components

#### VoiceChat Component
New component with comprehensive features:
- Join/Leave voice chat button
- Personal mute/unmute button
- Player list showing all connected voice participants
- Per-player controls:
  - Volume icon to mute/unmute that player (for you only)
  - Host-only controls: Mute mic button and Kick button
- Visual indicators:
  - Connection status (green dot)
  - Muted state (red indicator)
  - Host-muted state (orange warning)
- Connected player count

## File Structure

### New Files
```
client/src/
├── hooks/
│   └── useVoiceChat.ts         # Voice chat hook with host controls
├── context/
│   └── VoiceChatContext.tsx    # Context provider for persistent voice chat
└── components/chat/
    └── VoiceChat.tsx           # UI component with controls
```

### Modified Files
```
client/src/
├── pages/
│   ├── RoomPage.tsx                    # Wrapped with VoiceChatProvider, uses enhanced component
│   └── GamePage.tsx                    # Added voice chat, wrapped with provider
├── types/index.ts                      # Added KICK_PLAYER, SWITCH_PLAYER_MIC message types
└── hooks/useVoiceChat.ts               # Minor cleanup (unused param)

server/src/
├── types/index.ts                      # Added kick/mute payload types and message types
├── websocket/
│   ├── index.ts                        # Added routing for kick/mute messages
│   └── handlers/
│       └── roomHandlers.ts             # Added kick and mute handlers

README.md                                # Updated with voice chat features and future work
```

## Technical Details

### WebSocket Message Flow

#### Kick Player Flow
```
Host Client → KICK_PLAYER → Server
Server validates host permissions
Server → PLAYER_KICKED → Kicked Player (with redirect)
Server → PLAYER_LEFT → All Other Players
```

#### Mute Player Flow
```
Host Client → SWITCH_PLAYER_MIC → Server
Server validates host permissions
Server → PLAYER_MIC_SWITCHED → Target Player (disables mic)
Server → PLAYER_MIC_SWITCHED → All Players (for UI update)
```

### Voice Chat Architecture

```
┌─────────────────────────────────────────────────┐
│         VoiceChatProvider (Context)             │
│  - Wraps both RoomPage and GamePage             │
│  - Maintains voice state across navigation      │
│  - Single source of truth for voice connections │
└─────────────────┬───────────────────────────────┘
                  │
                  ├─► useVoiceChat Hook
                  │   - WebRTC peer connections
                  │   - Audio stream management
                  │   - Per-player mute state
                  │   - Host control functions
                  │
                  └─► VoiceChat Component
                      - Join/Leave controls
                      - Player list with controls
                      - Mute/Kick buttons (host)
                      - Volume controls (everyone)
```

### WebRTC Connection Management

The enhanced hook manages:
1. **Peer Connections**: Map of player ID to RTCPeerConnection
2. **Audio Elements**: Map of player ID to HTMLAudioElement
3. **Muted Players**: Set of locally muted player IDs
4. **Host Muted State**: Boolean flag if muted by host

Key features:
- Automatic reconnection on failure
- Pending ICE candidates queue
- Audio element volume control for local muting
- Cleanup of disconnected players

## Usage Examples

### As a Host in RoomPage
```typescript
// The host sees extra controls:
// - Kick button (UserX icon) next to each player
// - Mute mic button (MicOff icon) next to each player
// - Can use both while voice chat is active
```

### As a Player in RoomPage or GamePage
```typescript
// Any player can:
// - Join/leave voice chat
// - Mute/unmute themselves (unless host-muted)
// - Click volume icon to mute specific players (local only)
```

### Transitioning from Room to Game
```typescript
// Voice connections persist:
// 1. Players join voice in RoomPage
// 2. Host starts game
// 3. All players navigate to GamePage
// 4. Voice chat continues without interruption
// 5. Same peer connections and audio streams active
```

## Testing Checklist

- [x] Build client and server successfully
- [ ] Manual testing (requires running application):
  - [ ] Join voice chat in room page
  - [ ] Verify audio between players works
  - [ ] Test host kick functionality
  - [ ] Test host mute functionality
  - [ ] Test per-player local muting
  - [ ] Verify voice continues when game starts
  - [ ] Test voice chat in game page
  - [ ] Verify reconnection after temporary disconnect

## Future Enhancements

From the README, planned enhancements include:
- AI model for detecting keywords like "LIAR" and "BLUFF"
- Voice activity indicators (speaking animations)
- Spatial audio based on player position
- Voice recording for highlights
- Better mobile support

## Notes

1. **Security**: Host validation is done server-side to prevent unauthorized kicks/mutes
2. **Performance**: WebRTC uses peer-to-peer connections, reducing server load
3. **Compatibility**: Uses standard WebRTC APIs supported in modern browsers
4. **Audio Quality**: Echo cancellation and noise suppression enabled by default
5. **State Management**: Context provider ensures voice state persists across navigation
