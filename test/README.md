# Tekthib WebRTC Testing Suite

This directory contains comprehensive testing utilities for Tekthib's WebRTC voice chat functionality. These tools allow you to simulate multiple peers connecting to your signaling server without needing multiple physical devices or browsers.

## Overview

The testing suite provides two implementations:

1. **Node.js** (`/test/node/`) - Using `wrtc` and `ws` packages
2. **Python** (`/test/python/`) - Using `aiortc` and `websockets` packages

Both implementations simulate multiple WebRTC peers that:
- Connect to the Tekthib signaling server via WebSocket
- Exchange WebRTC offers/answers/ICE candidates
- Generate dummy audio tracks (sine waves)
- Receive and log audio from other peers
- Report statistics on connection success

## Directory Structure

```
test/
├── README.md                    # This file
├── node/                        # Node.js implementation
│   ├── package.json            # Node dependencies
│   └── simulatePeers.js        # Main test script
└── python/                      # Python implementation
    ├── requirements.txt        # Python dependencies
    └── simulate_peers.py       # Main test script
```

## Prerequisites

### For Node.js Tests

- **Node.js** v18 or higher
- **npm** or **yarn**
- **Operating System**: Linux, macOS, or Windows (with build tools)

> **Note**: The `wrtc` package requires native compilation. On Windows, you may need to install [windows-build-tools](https://www.npmjs.com/package/windows-build-tools).

### For Python Tests

- **Python** 3.8 or higher
- **pip**
- **libavformat**, **libavcodec**, **libavutil** (ffmpeg libraries)

On Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev libavformat-dev libavcodec-dev libavutil-dev
```

On macOS (using Homebrew):
```bash
brew install python ffmpeg
```

On Windows:
```bash
# Install ffmpeg using chocolatey
choco install ffmpeg
```

## Installation

### Node.js Setup

```bash
# Navigate to the node test directory
cd test/node

# Install dependencies (wrtc may fail on some systems - see troubleshooting)
npm install --no-optional  # Install without wrtc first to test connectivity
npm install                # Then try with wrtc for full WebRTC testing
```

**Note**: The `wrtc` package requires native compilation and may fail in some environments. If you encounter issues, you can still test WebSocket connectivity without it (see Test Signaling Only section below).

### Python Setup

```bash
# Navigate to the python test directory
cd test/python

# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Running the Test Signaling Server

If you want to test without the full Tekthib server, we provide a lightweight signaling server:

```bash
cd test
npm install
npm run signaling-server
```

This test server implements only WebRTC signaling (WebSocket message forwarding) and is useful for:
- Testing the peer simulation scripts independently
- Development without running the full game server
- CI/CD testing of WebRTC functionality

### Test Signaling Only (Without WebRTC)

If you want to verify that the signaling server is working before attempting full WebRTC testing:

```bash
cd test/node
npm install --no-optional  # Installs only ws package
SIGNALING_URL=ws://localhost:3001 NUM_CLIENTS=4 node testConnection.js
```

This lighter test verifies:
- WebSocket connectivity
- Room creation and joining
- Message exchange via signaling server

### Running Node.js Tests

Before running the tests, make sure your Tekthib server is running (typically on port 3001).

```bash
# Basic usage (uses defaults)
cd test/node
node simulatePeers.js

# Custom configuration with environment variables
SIGNALING_URL=ws://localhost:3001 ROOM_CODE=TEST123 NUM_PEERS=6 node simulatePeers.js

# Using a remote server
SIGNALING_URL=wss://your-server.com node simulatePeers.js
```

### Running Python Tests

```bash
# Basic usage (uses defaults)
cd test/python
python simulate_peers.py

# Custom configuration with environment variables
SIGNALING_URL=ws://localhost:3001 ROOM_CODE=TEST123 NUM_PEERS=6 python simulate_peers.py

# Using a remote server
SIGNALING_URL=wss://your-server.com python simulate_peers.py
```

## Configuration Options

Both implementations support the same environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SIGNALING_URL` | WebSocket URL of the signaling server | `ws://localhost:3001` |
| `ROOM_CODE` | Room code to join (if not set, creates new room) | `null` (auto-generated) |
| `NUM_PEERS` | Number of simulated peers | `4` |
| `PLAYER_PREFIX` | Prefix for player names | `TestPeer` (Node) / `PyPeer` (Python) |

### Examples

**Test with 8 peers in auto-generated room:**
```bash
NUM_PEERS=8 node simulatePeers.js
```

**Join specific room with custom names:**
```bash
ROOM_CODE=MYROOM123 PLAYER_PREFIX=Bot node simulatePeers.js
```

**Connect to production server:**
```bash
SIGNALING_URL=wss://tekthib-prod.herokuapp.com NUM_PEERS=4 python simulate_peers.py
```

## What the Tests Do

### Connection Flow

1. **Create Peers** - Instantiates the specified number of peer objects
2. **Connect to Signaling Server** - Establishes WebSocket connections
3. **Room Setup** - First peer creates/joins room, others follow
4. **Peer Connection Establishment** - Creates WebRTC peer connections in mesh topology
5. **Audio Exchange** - Sends and receives dummy audio tracks
6. **Monitoring** - Reports statistics every 3 seconds for 15 seconds
7. **Cleanup** - Closes all connections and exits

### Expected Output

Both scripts provide detailed console output showing:

- Connection status for each peer
- WebSocket messages being exchanged
- WebRTC signaling (offers, answers, ICE candidates)
- Connection state changes
- Audio track reception events
- Periodic statistics updates
- Final success/failure summary

### Success Criteria

A test is considered successful when:
- All peers connect to the signaling server
- All peers join the room
- Each peer establishes connections with all other peers
- Each peer receives audio tracks from all other peers
- Expected connections = `NUM_PEERS - 1` per peer
- Expected audio tracks = `NUM_PEERS - 1` per peer

## Troubleshooting

### Node.js Issues

**Problem**: `wrtc` installation fails
```bash
# The wrtc package requires native compilation and may fail in CI/CD
# or containerized environments. Options:

# Option 1: Test signaling only (without WebRTC)
npm install --no-optional
node testConnection.js

# Option 2: Use Docker with prebuilt binaries
# See: https://github.com/node-webrtc/node-webrtc#docker

# Option 3: Install build tools (Linux)
sudo apt-get install build-essential python3

# Option 4: Use the Python implementation instead
cd ../python
python simulate_peers.py
```

**Problem**: `Error: ECONNREFUSED` when connecting
```bash
# Solution: Ensure the Tekthib server is running
cd ../../server
npm run dev
```

### Python Issues

**Problem**: `ModuleNotFoundError: No module named 'av'`
```bash
# Solution: Install system dependencies first
sudo apt-get install libavformat-dev libavcodec-dev libavutil-dev
pip install av
```

**Problem**: `ImportError: cannot import name 'RTCPeerConnection'`
```bash
# Solution: Reinstall aiortc
pip uninstall aiortc
pip install aiortc>=1.6.0
```

**Problem**: WebSocket connection fails with SSL errors
```bash
# Solution: If using wss:// with self-signed cert, you may need to disable SSL verification
# (Not recommended for production)
```

### General Issues

**Problem**: Peers connect but no audio tracks received
- Check firewall settings - ensure STUN servers are accessible
- Verify NAT/router configuration if testing across networks
- Check server logs for WebRTC signaling errors

**Problem**: ICE connection fails
- Ensure STUN servers in the configuration are accessible
- If behind NAT, you may need a TURN server
- Check network connectivity between peers

**Problem**: Only some peers connect successfully
- Increase delays between peer creation (modify sleep/timeout values)
- Check server capacity and resource limits
- Review server logs for rate limiting or connection limits

## Architecture Notes

### Mesh Topology

Both implementations use a **mesh topology** where each peer connects directly to every other peer. For `N` peers:
- Total connections: `N × (N-1) / 2`
- Connections per peer: `N - 1`

Example with 4 peers:
```
Peer1 ↔ Peer2
Peer1 ↔ Peer3
Peer1 ↔ Peer4
Peer2 ↔ Peer3
Peer2 ↔ Peer4
Peer3 ↔ Peer4
```

### Audio Generation

- **Node.js**: Uses `wrtc.RTCAudioSource` to generate PCM audio samples (sine wave)
- **Python**: Uses `aiortc.MediaStreamTrack` with numpy to generate audio frames

Each peer generates a unique frequency:
- Peer 0: 440 Hz (A4)
- Peer 1: 490 Hz
- Peer 2: 540 Hz
- etc.

This helps distinguish audio sources during debugging.

### Signaling Protocol

Both implementations follow the Tekthib signaling protocol:

1. `CONNECT` → `CONNECTED` (with clientId)
2. `CREATE_ROOM` / `JOIN_ROOM` → `ROOM_CREATED` / `ROOM_JOINED`
3. `RTC_OFFER` → `RTC_ANSWER` (peer-to-peer via server)
4. `RTC_ICE_CANDIDATE` exchanges (peer-to-peer via server)

## Performance Testing

To stress-test the server with many peers:

```bash
# Test with 10 peers (45 total connections)
NUM_PEERS=10 node simulatePeers.js

# Test with 20 peers (190 total connections) - requires powerful server
NUM_PEERS=20 python simulate_peers.py
```

**Warning**: High peer counts can consume significant CPU, memory, and bandwidth.

## Integration with CI/CD

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Start Tekthib Server
  run: |
    cd server
    npm run build
    npm start &
    sleep 5

- name: Run WebRTC Tests
  run: |
    cd test/node
    npm install
    SIGNALING_URL=ws://localhost:3001 node simulatePeers.js
```

## Contributing

When modifying the test scripts:
1. Maintain compatibility with the existing signaling protocol
2. Keep both Node.js and Python implementations in sync
3. Update this README with any new configuration options
4. Test with various peer counts (2, 4, 8, 10)

## Support

For issues or questions:
- Check the [main Tekthib README](../../README.md)
- Review server logs in `server/src/websocket/`
- Open an issue on the GitHub repository

## License

Same as the main Tekthib project - MIT License
