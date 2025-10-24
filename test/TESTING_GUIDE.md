# Complete WebRTC Voice Chat Testing Guide

## 🎯 Overview

This guide provides multiple approaches to test Tekthib's WebRTC voice chat functionality **from a single computer**, solving the problem of needing multiple physical devices for testing.

### The Problem
- WebRTC voice chat sometimes works, sometimes doesn't
- Testing requires at least 2 people/devices to establish a connection  
- "One hand can't clap" - you can't test voice chat alone with traditional methods

### The Solutions
We provide **3 different testing approaches**, from simplest to most advanced:

## 🚀 Method 1: Browser-Based Multi-Tab Testing (Recommended)

**Best for:** Quick, visual testing with real audio on one computer  
**Requires:** Modern web browser (Chrome, Firefox, Edge)  
**Setup Time:** < 1 minute

### How It Works
Open multiple browser tabs on one computer, each acting as a separate peer with its own WebRTC connection. Real microphone audio is used, so you can actually test if sound reaches other peers.

### Quick Start

1. **Start the Tekthib server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Open the test page:**
   - Open `test/browser-test.html` in your browser
   - Or navigate to your hosted instance

3. **Run the test:**
   - Click "Start Multi-Tab Test"
   - Allow popups when prompted
   - Allow microphone access in each tab
   - Watch the logs and statistics

### Features
- ✅ **Real audio testing** - Uses your actual microphone
- ✅ **Visual interface** - See connection status, logs, and statistics
- ✅ **Automatic setup** - Opens multiple tabs and connects them automatically
- ✅ **Manual mode** - Can also manually open tabs and connect them
- ✅ **Works on one PC** - No need for multiple devices
- ✅ **No installation** - Just open the HTML file

### Testing Scenarios

#### Scenario 1: Quick 2-Peer Test
```
1. Open browser-test.html
2. Set "Number of Peers" to 2
3. Click "Start Multi-Tab Test"
4. Speak into microphone in one tab
5. Listen for audio in the other tab
```

#### Scenario 2: Multi-Peer Mesh Test
```
1. Set "Number of Peers" to 4 (or more)
2. Click "Start Multi-Tab Test"
3. Check that all peers connect to each other
4. Verify audio is received from all peers
```

#### Scenario 3: Manual Room Join
```
1. Open multiple browser tabs manually
2. In tab 1: Connect → Create Room
3. Copy the room code
4. In other tabs: Connect → Paste room code → Join Room
5. Test voice chat between tabs
```

### Interpreting Results

**Success indicators:**
- ✅ "Connected Peers" matches expected count
- ✅ "Audio Tracks" equals number of other peers
- ✅ Log shows "Received audio track from [peer]"
- ✅ Connection state shows "connected"
- ✅ You can hear audio from other tabs

**Failure indicators:**
- ❌ ICE connection state stays in "checking" or "failed"
- ❌ No audio tracks received
- ❌ Console shows errors about permissions or connectivity
- ❌ Cannot hear audio from other tabs

## 🔧 Method 2: Node.js WebSocket Connectivity Test

**Best for:** Testing signaling server without WebRTC complexity  
**Requires:** Node.js installed  
**Setup Time:** 2-3 minutes

### What It Tests
- ✅ WebSocket connection establishment
- ✅ Room creation and joining
- ✅ Message routing between peers
- ❌ Does NOT test actual WebRTC audio connections

### Quick Start

1. **Install dependencies:**
   ```bash
   cd test
   npm install
   cd node
   npm install
   ```

2. **Start the Tekthib server** (in another terminal):
   ```bash
   cd server
   npm run dev
   ```

3. **Run the connectivity test:**
   ```bash
   cd test/node
   npm run dev-connection
   ```

   Or with custom settings:
   ```bash
   SIGNALING_URL=ws://localhost:3001 NUM_CLIENTS=4 npm run dev-connection
   ```

### Expected Output

```
==================================================
  WebSocket Connectivity Test
==================================================
Signaling Server: ws://localhost:3001
Number of Clients: 2
==================================================

[TestClient1] Connecting...
[TestClient1] ✓ WebSocket connected
[TestClient1] ✓ Received client ID: abc123
[TestClient2] Connecting...
[TestClient2] ✓ WebSocket connected
[TestClient2] ✓ Received client ID: def456

✓ All clients connected successfully

[TestClient1] Creating room...
[TestClient1] ✓ Room created: ROOM123

[TestClient2] Joining room ROOM123...
[TestClient2] ✓ Joined room: ROOM123

✓ All clients joined the room

==================================================
  Tests Passed: 3
  Tests Failed: 0
==================================================

✅ SUCCESS: WebSocket signaling is working correctly!
```

### What Success Means
- Signaling server is running correctly
- WebSocket connections work
- Room management is functional
- You can proceed to test actual WebRTC connections

## 🖥️ Method 3: Standalone Test Signaling Server

**Best for:** Testing without the full Tekthib server  
**Requires:** Node.js installed  
**Setup Time:** 1 minute

### Use Cases
- Isolating WebRTC issues from game logic
- Rapid development iteration
- CI/CD testing
- Learning WebRTC without game complexity

### Quick Start

1. **Install dependencies:**
   ```bash
   cd test
   npm install
   ```

2. **Start the test signaling server:**
   ```bash
   npm run signaling-server
   ```

   The server starts on port 3001 by default.

3. **Test with browser or Node.js:**
   - Open `browser-test.html` and connect to `ws://localhost:3001`
   - Or run: `cd test/node && SIGNALING_URL=ws://localhost:3001 npm run dev-connection`

### What It Provides
- Lightweight WebSocket server
- Forwards WebRTC signaling messages
- No game logic, just pure signaling
- Perfect for testing WebRTC in isolation

## 📋 Troubleshooting Guide

### Problem: Browser tabs can't hear each other

**Possible causes:**
1. **Microphone permission denied**
   - Solution: Check browser permissions, reload page, allow microphone

2. **ICE connection fails**
   - Solution: Check firewall, ensure STUN servers are accessible
   - Try: Add more STUN servers in the browser-test.html code

3. **Audio not playing**
   - Solution: Check browser audio settings, unmute tabs
   - Try: Click in the tab to trigger audio playback (Chrome requires user interaction)

4. **NAT/Firewall blocking**
   - Solution: If testing across networks, you may need a TURN server
   - For local testing: Ensure localhost connections are allowed

### Problem: WebSocket connection fails

**Possible causes:**
1. **Server not running**
   - Solution: Start the server with `npm run dev:server`

2. **Wrong URL**
   - Solution: Verify server URL matches (default: ws://localhost:3001)

3. **Port already in use**
   - Solution: Change server port or stop conflicting service

### Problem: wrtc package won't install

**This is a known issue** - the `wrtc` npm package requires native compilation and often fails.

**Solution:** Use the browser-based test instead:
- Browser-test.html uses the browser's native WebRTC implementation
- No compilation needed
- More reliable for testing
- Actually uses real audio

### Problem: Popups blocked in multi-tab test

**Solution:**
1. Allow popups for the test page
2. Or manually open tabs:
   - Open multiple browser tabs manually
   - Use "Manual" mode to connect and join the same room

## 🎓 Understanding the Test Results

### Connection Flow

```
1. WebSocket Connect → Server assigns clientId
2. Create/Join Room → Room code assigned
3. Peer Discovery → Other peers in room discovered
4. WebRTC Negotiation → Offer/Answer exchange
5. ICE Candidates → Network path discovery
6. Connection Established → Audio streams exchanged
7. Audio Playing → Success!
```

### Key Metrics

| Metric | What It Means | Good Value |
|--------|---------------|------------|
| **Connected Peers** | Number of WebRTC peer connections | N-1 (for N total peers) |
| **Audio Tracks** | Number of remote audio streams received | N-1 (for N total peers) |
| **Messages Received** | WebSocket messages processed | > 10 (increases over time) |
| **Connection State** | Overall WebSocket status | "Connected" |

### Debug Logs

Enable verbose logging:
- **Browser**: Open DevTools Console (F12)
- **Node.js**: Set `DEBUG=*` environment variable

Look for:
- `RTCPeerConnection` lifecycle events
- `iceConnectionState` changes
- `iceCandidate` exchanges
- Audio track events

## 🔬 Advanced Testing

### Load Testing

Test with many peers to find limits:

```bash
# Browser-based: Set "Number of Peers" to 8+
# Monitor CPU, memory, and network usage

# Node.js connectivity test:
SIGNALING_URL=ws://localhost:3001 NUM_CLIENTS=10 npm run dev-connection
```

### Network Simulation

Test with poor network conditions:
1. Open Chrome DevTools → Network tab
2. Enable throttling (e.g., "Slow 3G")
3. Run tests to see how WebRTC handles network issues

### Cross-Browser Testing

Test compatibility:
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

Each browser has slight WebRTC differences.

### Automated Testing

For CI/CD integration:

```yaml
# Example GitHub Actions
- name: Start Server
  run: cd server && npm start &
  
- name: Test WebRTC Signaling
  run: cd test/node && npm run test-connection
```

## 📊 Comparing Testing Methods

| Method | Real Audio | Visual UI | No Install | Multi-Peer | Complexity |
|--------|-----------|-----------|------------|------------|------------|
| **Browser Multi-Tab** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ⭐ Simple |
| **Node Connectivity** | ❌ No | ❌ No | ❌ npm install | ✅ Yes | ⭐⭐ Medium |
| **Test Server** | ❌ No | Depends | ❌ npm install | ✅ Yes | ⭐⭐ Medium |

## 🎯 Recommended Workflow

**For quick testing:**
1. Use browser-test.html with 2 peers
2. Verify audio works
3. Done!

**For thorough testing:**
1. Start with Node connectivity test (verify signaling)
2. If that passes, use browser-test.html (verify WebRTC + audio)
3. Test with increasing peer counts (2, 4, 6, 8)
4. Test network conditions (throttling, reconnection)

**For debugging issues:**
1. Node connectivity test (isolate signaling issues)
2. Test signaling server standalone (isolate server issues)
3. Browser test with DevTools (see detailed WebRTC logs)
4. Check STUN/TURN server accessibility

## 📚 Additional Resources

- **WebRTC Basics**: https://webrtc.org/getting-started/overview
- **Debugging WebRTC**: chrome://webrtc-internals (Chrome)
- **MDN WebRTC API**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Tekthib Server Code**: `server/src/websocket/handlers/webrtcHandlers.ts`
- **Client Voice Chat**: `client/src/hooks/useVoiceChat.ts`

## 🐛 Reporting Issues

When reporting WebRTC voice chat issues, include:

1. **Test method used** (browser, node, etc.)
2. **Browser/Node version**
3. **Console errors** (with stack traces)
4. **Connection state** when issue occurs
5. **Number of peers** in test
6. **Network environment** (local, remote, VPN, etc.)
7. **Steps to reproduce**

## ✨ Summary

**Main takeaway:** You can now test WebRTC voice chat from a single computer using multiple browser tabs!

**Quick start:**
```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Open browser
# Just open test/browser-test.html in your browser
# Click "Start Multi-Tab Test"
# Allow microphone in each tab
# Test voice chat!
```

No more waiting for your roommate! 🎉
