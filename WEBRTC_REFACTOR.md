# WebRTC Refactor: Voice Chat + DataChannel

## Overview

This refactor replaces the `VoiceChatWrapper` with a cleaner `WebRTCWrapper` that manages both **voice chat** and **DataChannel** connections. The implementation is modular, maintainable, and ready for future enhancements.

---

## Changes Made

### 1. New Components & Files

#### `/client/src/hooks/useWebRTC.ts` (NEW)
- Replaces `useVoiceChat.ts` with cleaner, more modular code
- Manages RTCPeerConnection lifecycle for all peers
- Handles voice chat (getUserMedia, audio tracks, muting)
- **Adds DataChannel setup** for each peer connection
- Implements proper cleanup when leaving rooms

#### `/client/src/context/WebRTCContext.tsx` (NEW)
- Provides WebRTC state and methods to components
- Replaces `VoiceChatContext.tsx`
- Exports `useVoiceChatContext` alias for backward compatibility

#### `/client/src/components/WebRTCWrapper.tsx` (NEW)
- Wraps routes with WebRTC provider
- Tracks room state and player list
- Replaces `VoiceChatWrapper.tsx`

### 2. Modified Files

#### `/client/src/App.tsx`
- Imports `WebRTCWrapper` instead of `VoiceChatWrapper`
- Uses new WebRTC infrastructure

#### `/client/src/components/chat/VoiceChat.tsx`
- Updated import to use `WebRTCContext` instead of `VoiceChatContext`
- No other changes needed (backward compatible)

---

## Key Features

### ✅ Voice Chat
- **Toggle Voice**: User clicks "Enable Voice" to activate microphone
- **Peer-to-Peer Audio**: Uses WebRTC to stream audio between players
- **Mute Controls**: Local mute, player-specific mute, host mute controls
- **Audio Levels**: Visual indicators for speaking players
- **Auto-Cleanup**: Connections close when players leave

### ✅ DataChannel (Testing)
- **Automatic Setup**: Each peer connection gets a DataChannel named `"game-data"`
- **Test Messages**: Sends a test message when channel opens
- **Console Logging**: All DataChannel events logged to console
- **Ready for Extension**: Structure in place to add gameplay sync later

### ✅ Connection Management
- **Signaling**: Uses existing WebSocket infrastructure
- **ICE Handling**: Proper ICE candidate exchange
- **Reconnection**: Attempts to reconnect on failure
- **State Tracking**: Monitors connection and signaling states

---

## How It Works

### Initialization Flow
1. User joins room → `WebRTCWrapper` tracks players
2. User clicks "Enable Voice" → `enableVoiceChat()` called
3. Microphone access requested → `getUserMedia()`
4. Peer connections created for each player
5. **DataChannel created** for each connection
6. WebRTC signaling via WebSocket (offer/answer/ICE)
7. Voice streams and DataChannel ready

### DataChannel Usage
```typescript
// Created in createPeerConnection()
const dataChannel = pc.createDataChannel("game-data");

// Events handled:
dataChannel.onopen = () => {
  // Send test message
  dataChannel.send(JSON.stringify({
    type: "TEST",
    from: localPlayerId,
    message: "DataChannel connection established"
  }));
};

dataChannel.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("[DataChannel] Message:", data);
};
```

### Voice Toggle Flow
```typescript
// Enable voice
await enableVoiceChat()
  → getUserMedia({ audio: true })
  → Create RTCPeerConnection for each peer
  → Add audio tracks + DataChannel
  → Send WebRTC offers

// Disable voice
disableVoiceChat()
  → Stop audio tracks
  → Close DataChannels
  → Close peer connections
  → Cleanup audio elements
```

### Cleanup on Leave
When a player leaves:
- Their peer connections are closed
- DataChannels are closed
- Audio elements removed from DOM
- Audio analysis stopped
- All references cleared

---

## Testing the DataChannel

1. **Start the app**: `npm run dev:client` and `npm run dev:server`
2. **Open browser console** (F12)
3. **Join a room** with 2+ players
4. **Enable voice chat** on both clients
5. **Check console logs**:
   ```
   [DataChannel] Created for peer: player-123
   [DataChannel] Opened with player-123
   [DataChannel] Message from player-123: {type: "TEST", ...}
   ```

---

## Architecture Benefits

### Modularity
- `useWebRTC` is a single, focused hook
- Easy to test and extend
- Clear separation of concerns

### Maintainability
- Well-documented code with comments
- Type-safe TypeScript
- Follows React best practices

### Extensibility
- DataChannel infrastructure ready for game sync
- Can add message types without major refactor
- Easy to add new WebRTC features

---

## Future Enhancements

The DataChannel is ready for:
- **Game State Sync**: Send card plays, challenges via DataChannel
- **Low-Latency Updates**: Faster than WebSocket for small messages
- **Fallback Logic**: Use WebSocket if DataChannel fails
- **P2P Chat**: Direct messaging between players

---

## Backward Compatibility

- `VoiceChat.tsx` component unchanged (just import update)
- `useVoiceChatContext` exported as alias
- All existing voice features work identically
- No breaking changes to game logic

---

## File Summary

| File | Purpose | Lines |
|------|---------|-------|
| `useWebRTC.ts` | WebRTC connection management | ~830 |
| `WebRTCContext.tsx` | React context provider | ~80 |
| `WebRTCWrapper.tsx` | Wrapper component | ~150 |
| `App.tsx` | Updated imports | 2 changes |
| `VoiceChat.tsx` | Updated import | 1 change |

**Total new code**: ~1,060 lines  
**Total changes**: Minimal, focused refactor

---

## Notes

- **No game logic modified**: All gameplay remains unchanged
- **WebSocket signaling unchanged**: Uses existing infrastructure
- **Server code unchanged**: No backend modifications needed
- **DataChannel is for testing only**: Not integrated with game yet
- **Voice chat fully functional**: All features preserved

---

## Console Commands for Debugging

```javascript
// Check peer connections
peerConnectionsRef.current

// Check DataChannels
peerConnectionsRef.current.forEach((pc, id) => {
  console.log(id, pc.dataChannel?.readyState);
});

// Send test message manually
const pc = peerConnectionsRef.current.get("player-id");
if (pc?.dataChannel?.readyState === "open") {
  pc.dataChannel.send(JSON.stringify({ test: true }));
}
```
