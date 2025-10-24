# Tekthib WebRTC Testing Suite

Test WebRTC voice chat functionality **from a single computer** without needing multiple devices!

## 🚀 Quick Start

### Option 1: Browser Test (Recommended)
**Best for:** Visual testing with real audio

```bash
# 1. Start the server
cd server && npm run dev

# 2. Open in browser
# Just open test/browser-test.html
# Click "Start Multi-Tab Test"
# Allow popups and microphone access
```

### Option 2: Automated Script
**Best for:** Quick setup and testing

```bash
cd test
./quick-start.sh
# Choose option 1 or 2 from the menu
```

### Option 3: Node.js Test
**Best for:** Testing signaling without WebRTC

```bash
# 1. Start the server
cd server && npm run dev

# 2. Run connectivity test
cd test/node
npm install
npm run dev-connection
```

## 📖 Documentation

- **[Complete Testing Guide](TESTING_GUIDE.md)** - Comprehensive guide with all testing methods
- **[Implementation Details](IMPLEMENTATION.md)** - Technical architecture
- **[Examples](EXAMPLES.md)** - Usage examples and scenarios

## 🎯 What This Solves

**Problem:** Testing WebRTC voice chat requires 2+ people/devices  
**Solution:** Open multiple browser tabs on one computer, each acting as a separate peer

## ✅ Features

- ✅ **Real audio testing** - Uses actual microphone
- ✅ **Visual interface** - See connection status and logs
- ✅ **Multi-peer support** - Test 2-8 peers simultaneously
- ✅ **No compilation** - Browser-based, works immediately
- ✅ **Works on one PC** - No need for multiple devices

## 🔧 Available Test Tools

### 1. Browser Multi-Tab Test (`browser-test.html`)
- Opens multiple tabs automatically
- Real WebRTC with audio
- Visual monitoring
- **Start here for most testing**

### 2. Node.js Connectivity Test (`node/testConnection.ts`)
- Tests WebSocket signaling
- No WebRTC complexity
- Quick validation
- Good for CI/CD

### 3. Test Signaling Server (`signaling-server.mjs`)
- Standalone WebSocket server
- No game logic
- Rapid development iteration

## 📊 Test Scenarios

### Quick 2-Peer Test
```bash
# Browser: Set peers to 2, click "Start Test"
# Node: NUM_CLIENTS=2 npm run dev-connection
```

### Multi-Peer Mesh (4+ peers)
```bash
# Browser: Set peers to 4+, click "Start Test"
# Verify all peers connect to each other
```

### Manual Room Test
```bash
# 1. Open browser-test.html in multiple tabs
# 2. Tab 1: Connect → Create Room
# 3. Other tabs: Connect → Join Room (use same code)
```

## 🐛 Troubleshooting

### Popups blocked?
Allow popups for the test page or use Manual mode

### Microphone not working?
Check browser permissions and reload the page

### Server not running?
```bash
cd server && npm run dev
```

### wrtc package won't install?
That's OK! Use the browser-based test instead - it's more reliable

## 📝 Next Steps

1. Read the [Complete Testing Guide](TESTING_GUIDE.md)
2. Try the browser test
3. Report any issues with logs and steps to reproduce

## 💡 Pro Tips

- **Use Chrome DevTools** (F12) to see detailed WebRTC logs
- **Check chrome://webrtc-internals** for connection diagnostics  
- **Start with 2 peers** then scale up to test mesh topology
- **Monitor the logs** - they show exactly what's happening

---

**Need help?** See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed instructions and troubleshooting.
