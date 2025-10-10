# Voice Chat Troubleshooting Guide

## Quick Reference

### If voice chat doesn't work, check these in order:

## 1. Browser Console Errors

### ✗ "RTCPeerConnection is not defined" (Firefox)
**Cause**: webrtc-adapter not loaded properly
**Fix**: Verify `import "webrtc-adapter"` is the FIRST import in `client/src/main.tsx`

### ✗ "Cannot create peer connection - no local stream available"
**Cause**: Trying to create peer connection before joining voice chat
**Fix**: This should no longer occur with the fix. If it does, check that `handleOffer` has the guard clause:
```typescript
if (!isVoiceEnabled || !localStreamRef.current) {
  return;
}
```

### ✗ "RTCIceCandidate is not defined"
**Cause**: webrtc-adapter not loaded early enough
**Fix**: Same as RTCPeerConnection error above

### ✗ "NotAllowedError: Permission denied"
**Cause**: User denied microphone permission OR browser blocked auto-play
**Solution**: 
- User must grant microphone permission when prompted
- User must click "Join Voice Chat" button (not auto-join)

## 2. Voice Chat Behavior Issues

### Voice chat joins automatically
**Expected**: Should NOT happen anymore
**If it happens**: 
1. Check that `sessionStorage.getItem("voiceChatEnabled")` is removed
2. Check that the auto-reconnect useEffect is removed
3. Clear browser cache and localStorage/sessionStorage

### Microphone prompt doesn't appear
**Cause**: Browser already denied permission OR trying to access without user gesture
**Solution**:
1. Check browser microphone permissions (usually in address bar)
2. Reset permissions and try again
3. Ensure user clicked "Join Voice Chat" button

### Can't hear other players
**Possible causes**:
1. Other player hasn't joined voice chat
2. Other player's microphone is muted
3. Your browser has muted their audio element
4. Network/firewall blocking WebRTC connections

**Debug steps**:
1. Check browser console for "Audio playing for: [playerId]"
2. Check audio level bars - should show activity when other player speaks
3. Check Network tab for WebSocket messages (RTC_OFFER, RTC_ANSWER, RTC_ICE_CANDIDATE)
4. Try on same local network first to rule out firewall issues

### Other players can't hear you
**Possible causes**:
1. Your microphone is muted (button shows "Unmute")
2. Host has muted your microphone
3. Your microphone isn't working
4. Wrong microphone selected in browser

**Debug steps**:
1. Check mute button state
2. Check for "Muted by Host" message
3. Test microphone in browser settings
4. Check browser console for "Local stream initialized with tracks: 1"

## 3. Specific Browser Issues

### Chrome/Chromium-based Browsers
**Common issues**:
- Microphone blocked by site settings
- Corporate policy blocking WebRTC

**Solutions**:
- Check chrome://settings/content/microphone
- Check chrome://policy for WebRTC restrictions

### Firefox
**Common issues**:
- RTCPeerConnection not defined (should be fixed now)
- Stricter autoplay policy

**Solutions**:
- Ensure webrtc-adapter is loaded in main.tsx
- Check about:preferences#privacy for microphone permissions

### Safari
**Common issues**:
- More restrictive WebRTC policies
- May require user gesture for audio element.play()

**Solutions**:
- Always use "Join Voice Chat" button
- Check Safari Privacy settings

## 4. Network/Server Issues

### ICE connection fails (stays "checking" or "failed")
**Possible causes**:
- Firewall blocking UDP
- No TURN server configured (only STUN)
- NAT traversal issues

**Debug steps**:
1. Check browser console for ICE connection state logs
2. Verify STUN servers are reachable: `stun:stun.l.google.com:19302`
3. Consider adding TURN servers for restrictive networks

**Current STUN servers** (in useVoiceChat.ts):
```typescript
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};
```

### WebSocket disconnects
**Symptoms**: Voice chat stops working, players disappear
**Cause**: WebSocket connection lost
**Solution**: Reconnection should happen automatically, but may need to leave and rejoin room

## 5. Testing Tips

### Local Testing (same machine)
1. Use different browsers (Chrome + Firefox)
2. Use private/incognito windows
3. Test with microphone input (speak to verify audio levels)

### Remote Testing (different machines/networks)
1. Test on same local network first
2. Then test over internet
3. Check firewall rules if connections fail
4. May need TURN server for some networks

### Debugging Tools
1. **Browser DevTools Console**: Primary debugging tool
2. **Network Tab**: Check WebSocket messages
3. **Application Tab**: Check sessionStorage (should be empty for voice chat)
4. **Media Devices**: chrome://webrtc-internals/ (Chrome) or about:webrtc (Firefox)

## 6. Verification Checklist

Run the verification script:
```bash
./verify-voice-chat-fix.sh
```

Expected output: All checks should pass ✓

### Manual Verification
- [ ] Voice chat OFF by default when opening room
- [ ] Clicking "Join Voice Chat" prompts for microphone
- [ ] After granting permission, voice chat activates
- [ ] Audio level bars show activity when speaking
- [ ] Other players can hear you when you speak
- [ ] You can hear other players when they speak
- [ ] No console errors about RTCPeerConnection
- [ ] No console errors about local stream

## 7. Known Limitations

### No TURN Server
- May not work on very restrictive corporate networks
- Peer-to-peer connections may fail if both users behind NAT
- Solution: Add TURN server configuration if needed

### No Persistence
- Voice chat doesn't persist across page navigation by design
- Users must rejoin voice chat after navigating from lobby to game
- This is intentional to require explicit consent

### Browser Permissions
- User must grant microphone permission each session (unless "Remember" is checked)
- Some browsers reset permissions on page refresh
- This is browser security behavior, not a bug

## 8. Support Information

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Brave 1.25+
- ✅ Edge 90+
- ⚠️ Safari 14+ (should work, not thoroughly tested)

### Not Supported
- ✗ Internet Explorer (no WebRTC support)
- ✗ Very old browser versions
- ✗ Browsers without microphone access

## 9. Getting Help

If voice chat still doesn't work after following this guide:

1. Check browser console for errors (press F12)
2. Copy error messages exactly
3. Note which browser and version (Help → About)
4. Describe exact steps that cause the issue
5. Check if it works in a different browser

### Useful Console Commands
```javascript
// Check if RTCPeerConnection is available
console.log(typeof RTCPeerConnection);  // Should be "function"

// Check if microphone is available
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log(devices.filter(d => d.kind === 'audioinput')));

// Check current audio context state
// (Run after joining voice chat)
console.log(audioContextsRef.current);
```
