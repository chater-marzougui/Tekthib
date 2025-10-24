# WebRTC Testing Examples

This document provides practical examples for using the Tekthib WebRTC testing suite.

## Example 1: Basic Connectivity Test

Verify WebSocket signaling is working:

```bash
# Start test signaling server
cd test
npm install
npm run signaling-server

# In another terminal, test connectivity
cd test/node
npm install --no-optional
SIGNALING_URL=ws://localhost:3001 NUM_CLIENTS=3 node testConnection.js
```

**Expected Output:**
```
✅ SUCCESS: WebSocket signaling is working correctly!
```

## Example 2: Test with Tekthib Server

Test against the actual game server:

```bash
# Terminal 1: Start Tekthib server
cd server
npm run dev

# Terminal 2: Run connectivity test
cd test/node
SIGNALING_URL=ws://localhost:3001 NUM_CLIENTS=4 node testConnection.js
```

## Example 3: Full WebRTC Simulation (Node.js)

**Prerequisites:** Successfully installed `wrtc` package

```bash
# Start test server
cd test
npm run signaling-server

# In another terminal, run full WebRTC test
cd test/node
npm install  # Includes wrtc
SIGNALING_URL=ws://localhost:3001 NUM_PEERS=4 node simulatePeers.js
```

**Expected Output:**
```
✅ SUCCESS: All peers successfully connected and exchanging audio!

Final Statistics:
TestPeer1:
  ✓ Peer Connections: 3
  ✓ Received Audio Tracks: 3
...
```

## Example 4: Python WebRTC Simulation

Use Python instead of Node.js (useful when wrtc compilation fails):

```bash
# Setup Python environment
cd test/python
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run test
SIGNALING_URL=ws://localhost:3001 NUM_PEERS=4 python simulate_peers.py
```

## Example 5: Custom Room Code

Test joining a specific room:

```bash
# Peer 1: Create/join room MYTEST
cd test/node
ROOM_CODE=MYTEST PLAYER_PREFIX=Alice node testConnection.js

# Peer 2: Join same room
ROOM_CODE=MYTEST PLAYER_PREFIX=Bob node testConnection.js
```

## Example 6: Load Testing

Test with increasing peer counts:

```bash
# 4 peers = 6 connections total (mesh)
NUM_PEERS=4 node testConnection.js

# 8 peers = 28 connections total
NUM_PEERS=8 node testConnection.js

# 12 peers = 66 connections total
NUM_PEERS=12 node testConnection.js
```

## Example 7: Remote Server Testing

Test against a deployed server:

```bash
# Test production server
SIGNALING_URL=wss://your-app.herokuapp.com NUM_PEERS=3 node testConnection.js

# Test staging environment
SIGNALING_URL=wss://staging.your-app.com NUM_PEERS=5 python simulate_peers.py
```

## Example 8: Debugging WebRTC Issues

Add verbose logging:

```bash
# Node.js with debug output
DEBUG=* SIGNALING_URL=ws://localhost:3001 node simulatePeers.js

# Python with debug logging
# Edit simulate_peers.py and change:
# logging.basicConfig(level=logging.DEBUG)
python simulate_peers.py
```

## Example 9: CI/CD Integration

GitHub Actions example:

```yaml
name: WebRTC Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm run install:all
          cd test && npm install
          cd node && npm install --no-optional
      
      - name: Build server
        run: npm run build:server
      
      - name: Start signaling server
        run: |
          cd test
          npm run signaling-server &
          sleep 3
      
      - name: Run connectivity tests
        run: |
          cd test/node
          SIGNALING_URL=ws://localhost:3001 node testConnection.js
```

## Example 10: Docker Testing

Test in a containerized environment:

```bash
# Create Dockerfile for tests
cat > Dockerfile.test << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY test/ ./test/
RUN cd test && npm install && cd node && npm install --no-optional
CMD ["npm", "run", "signaling-server"]
EOF

# Build and run
docker build -f Dockerfile.test -t tekthib-test .
docker run -p 3001:3001 tekthib-test

# Test from host
cd test/node
SIGNALING_URL=ws://localhost:3001 node testConnection.js
```

## Troubleshooting Examples

### Issue: wrtc fails to install

**Solution:**
```bash
# Use connectivity test instead
cd test/node
npm install --no-optional
node testConnection.js

# Or use Python
cd test/python
python simulate_peers.py
```

### Issue: Connection refused

**Solution:**
```bash
# Check if server is running
curl http://localhost:3001/health

# Verify correct port
SIGNALING_URL=ws://localhost:3001 node testConnection.js
```

### Issue: Peers connect but no audio

**Possible causes:**
1. STUN servers unreachable (firewall)
2. NAT traversal issues
3. wrtc not properly installed

**Debug:**
```bash
# Check STUN connectivity
ping stun.l.google.com

# Verify wrtc installation
cd test/node
node -e "console.log(require('wrtc'))"
```

## Performance Testing Examples

### Measure Connection Time

```bash
# Time how long it takes to establish connections
time SIGNALING_URL=ws://localhost:3001 NUM_PEERS=4 node testConnection.js
```

### Monitor Memory Usage

```bash
# Watch memory while running test
watch -n 1 'ps aux | grep node'

# In another terminal
NUM_PEERS=10 node simulatePeers.js
```

### Test Concurrent Rooms

```bash
# Multiple tests in parallel (different rooms)
for i in {1..5}; do
  ROOM_CODE=TEST$i NUM_PEERS=3 node testConnection.js &
done
wait
```

## Tips and Best Practices

1. **Start Simple**: Always run `testConnection.js` first before trying full WebRTC
2. **Use Test Server**: Use `signaling-server.mjs` for quick iteration
3. **Monitor Logs**: Keep signaling server logs visible for debugging
4. **Incremental Testing**: Start with 2-3 peers, then increase
5. **Environment Variables**: Use `.env` files for consistent configuration
6. **Cleanup**: Kill test processes between runs to avoid port conflicts

## Additional Resources

- [WebRTC Basics](https://webrtc.org/getting-started/overview)
- [STUN/TURN Servers](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- [aiortc Documentation](https://aiortc.readthedocs.io/)
- [wrtc Package](https://github.com/node-webrtc/node-webrtc)
