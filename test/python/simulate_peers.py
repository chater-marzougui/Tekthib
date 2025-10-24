#!/usr/bin/env python3
"""
WebRTC Peer Simulation for Tekthib Voice Chat Testing (Python)

This script simulates multiple WebRTC peers connecting to the Tekthib
signaling server to test voice chat functionality using aiortc.

Usage:
    SIGNALING_URL=ws://localhost:3001 ROOM_CODE=TEST123 python simulate_peers.py

Environment Variables:
    SIGNALING_URL - WebSocket URL of signaling server (default: ws://localhost:3001)
    ROOM_CODE - Room code to join (default: auto-generated)
    NUM_PEERS - Number of peers to simulate (default: 4)
    PLAYER_PREFIX - Prefix for player names (default: PyPeer)
"""

import asyncio
import json
import logging
import math
import os
import sys
from typing import Dict, List, Optional, Set

import websockets
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    MediaStreamTrack,
)
from aiortc.contrib.media import MediaBlackhole
from av import AudioFrame
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
SIGNALING_URL = os.getenv('SIGNALING_URL', 'ws://localhost:3001')
ROOM_CODE = os.getenv('ROOM_CODE', None)
NUM_PEERS = int(os.getenv('NUM_PEERS', '4'))
PLAYER_PREFIX = os.getenv('PLAYER_PREFIX', 'PyPeer')

# ICE servers configuration
ICE_SERVERS = [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
]


class DummyAudioTrack(MediaStreamTrack):
    """
    A dummy audio track that generates a sine wave for testing.
    """
    kind = "audio"

    def __init__(self, frequency=440, sample_rate=8000):
        super().__init__()
        self.frequency = frequency
        self.sample_rate = sample_rate
        self.samples_per_frame = sample_rate // 100  # 10ms frames
        self.time_base = None
        self.pts = 0
        self.phase = 0.0

    async def recv(self):
        """Generate a frame of audio data with a sine wave"""
        # Create audio frame
        frame = AudioFrame(format='s16', layout='mono', samples=self.samples_per_frame)
        frame.sample_rate = self.sample_rate
        frame.pts = self.pts
        self.pts += self.samples_per_frame

        # Generate sine wave samples
        samples = []
        for i in range(self.samples_per_frame):
            # Generate sine wave with low amplitude (0.1 = 10% volume)
            sample = math.sin(self.phase) * 32767 * 0.1
            samples.append(int(sample))
            self.phase += (2 * math.pi * self.frequency) / self.sample_rate
            if self.phase > 2 * math.pi:
                self.phase -= 2 * math.pi

        # Convert to numpy array and write to frame
        audio_data = np.array(samples, dtype=np.int16)
        frame.planes[0].update(audio_data.tobytes())

        # Wait to maintain proper timing (10ms)
        await asyncio.sleep(0.01)
        
        return frame


class AudioReceiver:
    """
    Handles receiving and consuming audio tracks
    """
    def __init__(self, player_name: str, remote_player_id: str):
        self.player_name = player_name
        self.remote_player_id = remote_player_id
        self.packet_count = 0
        self.running = False
        self.task = None

    async def consume_track(self, track: MediaStreamTrack):
        """Consume audio frames from a track"""
        self.running = True
        logger.info(f"[{self.player_name}] 🎵 Started receiving audio from {self.remote_player_id}")
        
        try:
            while self.running:
                try:
                    frame = await asyncio.wait_for(track.recv(), timeout=5.0)
                    self.packet_count += 1
                    
                    # Log periodically to avoid spam
                    if self.packet_count % 100 == 0:
                        logger.info(
                            f"[{self.player_name}] 📊 Received {self.packet_count} audio packets "
                            f"from {self.remote_player_id}"
                        )
                except asyncio.TimeoutError:
                    logger.warning(f"[{self.player_name}] Timeout receiving audio from {self.remote_player_id}")
                    break
                except Exception as e:
                    if self.running:
                        logger.error(f"[{self.player_name}] Error receiving audio: {e}")
                    break
        finally:
            logger.info(
                f"[{self.player_name}] Stopped receiving audio from {self.remote_player_id} "
                f"(total packets: {self.packet_count})"
            )

    def stop(self):
        """Stop consuming audio"""
        self.running = False


class SimulatedPeer:
    """
    Simulated WebRTC peer that manages WebSocket signaling and peer connections
    """
    
    def __init__(self, peer_id: int, player_name: str, signaling_url: str):
        self.peer_id = peer_id
        self.player_name = player_name
        self.signaling_url = signaling_url
        self.client_id: Optional[str] = None
        self.room_code: Optional[str] = None
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.peer_connections: Dict[str, RTCPeerConnection] = {}
        self.audio_track: Optional[DummyAudioTrack] = None
        self.audio_receivers: Dict[str, AudioReceiver] = {}
        self.pending_candidates: Dict[str, List[RTCIceCandidate]] = {}
        self.is_connected = False
        self.received_tracks = 0
        self._message_handlers = {}

    async def connect(self):
        """Connect to the signaling server"""
        logger.info(f"[{self.player_name}] Connecting to {self.signaling_url}...")
        
        try:
            self.ws = await websockets.connect(self.signaling_url)
            self.is_connected = True
            logger.info(f"[{self.player_name}] WebSocket connected")

            # Send initial CONNECT message
            await self.send_message({
                'type': 'CONNECT',
                'payload': {},
            })

            # Start message handler
            asyncio.create_task(self._handle_messages())

            # Wait for CONNECTED response with client ID
            await self._wait_for_client_id()
            logger.info(f"[{self.player_name}] Received clientId: {self.client_id}")

        except Exception as e:
            logger.error(f"[{self.player_name}] Connection error: {e}")
            raise

    async def _wait_for_client_id(self, timeout=5.0):
        """Wait for client ID from server"""
        start_time = asyncio.get_event_loop().time()
        while not self.client_id:
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError("Timeout waiting for client ID")
            await asyncio.sleep(0.1)

    async def send_message(self, message: dict):
        """Send a message to the signaling server"""
        if self.ws and not self.ws.closed:
            await self.ws.send(json.dumps(message))
        else:
            logger.error(f"[{self.player_name}] Cannot send message - WebSocket not open")

    async def _handle_messages(self):
        """Handle incoming messages from signaling server"""
        try:
            async for message_data in self.ws:
                try:
                    message = json.loads(message_data)
                    await self._process_message(message)
                except json.JSONDecodeError as e:
                    logger.error(f"[{self.player_name}] Error parsing message: {e}")
                except Exception as e:
                    logger.error(f"[{self.player_name}] Error processing message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"[{self.player_name}] WebSocket connection closed")
            self.is_connected = False
        except Exception as e:
            logger.error(f"[{self.player_name}] Error in message handler: {e}")
            self.is_connected = False

    async def _process_message(self, message: dict):
        """Process a single message"""
        msg_type = message.get('type')
        payload = message.get('payload', {})

        if msg_type == 'CONNECTED':
            self.client_id = payload.get('clientId')
        
        elif msg_type == 'ROOM_CREATED':
            self.room_code = payload.get('roomCode')
            logger.info(f"[{self.player_name}] Room created: {self.room_code}")
        
        elif msg_type == 'ROOM_JOINED':
            self.room_code = payload.get('roomCode')
            logger.info(f"[{self.player_name}] Joined room: {self.room_code}")
        
        elif msg_type == 'PLAYER_JOINED':
            player = payload.get('player', {})
            logger.info(f"[{self.player_name}] Player joined: {player.get('name', 'Unknown')}")
        
        elif msg_type == 'RTC_OFFER':
            await self.handle_rtc_offer(payload)
        
        elif msg_type == 'RTC_ANSWER':
            await self.handle_rtc_answer(payload)
        
        elif msg_type == 'RTC_ICE_CANDIDATE':
            await self.handle_rtc_ice_candidate(payload)
        
        elif msg_type == 'ERROR':
            logger.error(f"[{self.player_name}] Server error: {payload.get('message')}")

    def create_dummy_audio_track(self):
        """Create a dummy audio track with sine wave"""
        # Different frequency for each peer to distinguish them
        frequency = 440 + (self.peer_id * 50)
        self.audio_track = DummyAudioTrack(frequency=frequency)
        logger.info(f"[{self.player_name}] Created dummy audio track ({frequency}Hz)")

    async def join_room(self, room_code: Optional[str] = None):
        """Join or create a room"""
        # Create dummy audio track
        self.create_dummy_audio_track()

        if room_code:
            # Join existing room
            await self.send_message({
                'type': 'JOIN_ROOM',
                'payload': {
                    'roomCode': room_code,
                    'playerName': self.player_name,
                },
            })
        else:
            # Create new room
            await self.send_message({
                'type': 'CREATE_ROOM',
                'payload': {
                    'playerName': self.player_name,
                    'autoPlayTimeout': 30000,
                    'maxPlayers': 8,
                    'isPublic': False,
                    'challengeSuspenseEnabled': False,
                },
            })

        # Wait for room code
        start_time = asyncio.get_event_loop().time()
        while not self.room_code:
            if asyncio.get_event_loop().time() - start_time > 5.0:
                raise TimeoutError("Timeout waiting for room code")
            await asyncio.sleep(0.1)

        logger.info(f"[{self.player_name}] In room: {self.room_code}")
        return self.room_code

    async def create_peer_connection(self, remote_player_id: str) -> RTCPeerConnection:
        """Create a peer connection with another peer"""
        if remote_player_id in self.peer_connections:
            logger.info(f"[{self.player_name}] Peer connection already exists for {remote_player_id}")
            return self.peer_connections[remote_player_id]

        logger.info(f"[{self.player_name}] Creating peer connection with {remote_player_id}")
        
        pc = RTCPeerConnection(configuration={'iceServers': ICE_SERVERS})

        # Add audio track
        if self.audio_track:
            pc.addTrack(self.audio_track)
            logger.info(f"[{self.player_name}] Added audio track to connection with {remote_player_id}")

        # Handle incoming tracks
        @pc.on("track")
        async def on_track(track):
            logger.info(f"[{self.player_name}] 🎵 Received audio track from {remote_player_id}")
            self.received_tracks += 1
            
            # Create receiver to consume the track
            receiver = AudioReceiver(self.player_name, remote_player_id)
            self.audio_receivers[remote_player_id] = receiver
            asyncio.create_task(receiver.consume_track(track))

        # Handle ICE candidates
        @pc.on("icecandidate")
        async def on_icecandidate(candidate):
            if candidate:
                await self.send_message({
                    'type': 'RTC_ICE_CANDIDATE',
                    'payload': {
                        'targetPlayerId': remote_player_id,
                        'signal': {
                            'candidate': candidate.candidate,
                            'sdpMid': candidate.sdpMid,
                            'sdpMLineIndex': candidate.sdpMLineIndex,
                        },
                    },
                })

        # Handle connection state changes
        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"[{self.player_name}] Connection state with {remote_player_id}: {pc.connectionState}")

        @pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            logger.info(f"[{self.player_name}] ICE connection state with {remote_player_id}: {pc.iceConnectionState}")

        self.peer_connections[remote_player_id] = pc
        return pc

    async def create_offer(self, remote_player_id: str):
        """Create and send an offer to a remote peer"""
        pc = await self.create_peer_connection(remote_player_id)

        try:
            # Create offer
            offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            # Send offer via signaling
            await self.send_message({
                'type': 'RTC_OFFER',
                'payload': {
                    'targetPlayerId': remote_player_id,
                    'signal': {
                        'type': pc.localDescription.type,
                        'sdp': pc.localDescription.sdp,
                    },
                },
            })

            logger.info(f"[{self.player_name}] Sent offer to {remote_player_id}")
        except Exception as e:
            logger.error(f"[{self.player_name}] Error creating offer: {e}")

    async def handle_rtc_offer(self, payload: dict):
        """Handle incoming RTC offer"""
        from_player_id = payload['fromPlayerId']
        signal = payload['signal']
        
        logger.info(f"[{self.player_name}] Received offer from {from_player_id}")

        pc = await self.create_peer_connection(from_player_id)

        try:
            # Set remote description
            await pc.setRemoteDescription(
                RTCSessionDescription(sdp=signal['sdp'], type=signal['type'])
            )

            # Add any pending ICE candidates
            if from_player_id in self.pending_candidates:
                for candidate in self.pending_candidates[from_player_id]:
                    await pc.addIceCandidate(candidate)
                del self.pending_candidates[from_player_id]

            # Create and send answer
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            await self.send_message({
                'type': 'RTC_ANSWER',
                'payload': {
                    'targetPlayerId': from_player_id,
                    'signal': {
                        'type': pc.localDescription.type,
                        'sdp': pc.localDescription.sdp,
                    },
                },
            })

            logger.info(f"[{self.player_name}] Sent answer to {from_player_id}")
        except Exception as e:
            logger.error(f"[{self.player_name}] Error handling offer: {e}")

    async def handle_rtc_answer(self, payload: dict):
        """Handle incoming RTC answer"""
        from_player_id = payload['fromPlayerId']
        signal = payload['signal']
        
        logger.info(f"[{self.player_name}] Received answer from {from_player_id}")

        pc = self.peer_connections.get(from_player_id)
        if not pc:
            logger.error(f"[{self.player_name}] No peer connection found for {from_player_id}")
            return

        try:
            await pc.setRemoteDescription(
                RTCSessionDescription(sdp=signal['sdp'], type=signal['type'])
            )

            # Add any pending ICE candidates
            if from_player_id in self.pending_candidates:
                for candidate in self.pending_candidates[from_player_id]:
                    await pc.addIceCandidate(candidate)
                del self.pending_candidates[from_player_id]

            logger.info(f"[{self.player_name}] Set remote description from {from_player_id}")
        except Exception as e:
            logger.error(f"[{self.player_name}] Error handling answer: {e}")

    async def handle_rtc_ice_candidate(self, payload: dict):
        """Handle incoming ICE candidate"""
        from_player_id = payload['fromPlayerId']
        signal = payload['signal']

        pc = self.peer_connections.get(from_player_id)
        
        try:
            candidate = RTCIceCandidate(
                candidate=signal['candidate'],
                sdpMid=signal.get('sdpMid'),
                sdpMLineIndex=signal.get('sdpMLineIndex'),
            )

            if pc and pc.remoteDescription:
                await pc.addIceCandidate(candidate)
            else:
                # Store for later if peer connection doesn't exist or no remote description yet
                if from_player_id not in self.pending_candidates:
                    self.pending_candidates[from_player_id] = []
                self.pending_candidates[from_player_id].append(candidate)
        except Exception as e:
            logger.error(f"[{self.player_name}] Error adding ICE candidate: {e}")

    async def cleanup(self):
        """Cleanup resources"""
        logger.info(f"[{self.player_name}] Cleaning up...")

        # Stop audio receivers
        for receiver in self.audio_receivers.values():
            receiver.stop()
        self.audio_receivers.clear()

        # Close peer connections
        for remote_id, pc in self.peer_connections.items():
            logger.info(f"[{self.player_name}] Closing connection to {remote_id}")
            await pc.close()
        self.peer_connections.clear()

        # Close WebSocket
        if self.ws and not self.ws.closed:
            await self.ws.close()

    def get_stats(self) -> dict:
        """Get statistics about this peer"""
        return {
            'playerName': self.player_name,
            'clientId': self.client_id,
            'roomCode': self.room_code,
            'isConnected': self.is_connected,
            'peerConnections': len(self.peer_connections),
            'receivedTracks': self.received_tracks,
        }


class TestRunner:
    """
    Test runner that creates and manages multiple simulated peers
    """
    
    def __init__(self, num_peers: int, signaling_url: str):
        self.num_peers = num_peers
        self.signaling_url = signaling_url
        self.peers: List[SimulatedPeer] = []
        self.room_code = ROOM_CODE

    async def run(self):
        """Run the test"""
        print('\n' + '=' * 50)
        print('  Tekthib WebRTC Peer Simulation Test (Python)')
        print('=' * 50)
        print(f'Signaling Server: {self.signaling_url}')
        print(f'Number of Peers: {self.num_peers}')
        print(f'Room Code: {self.room_code or "Auto-generated"}')
        print('=' * 50 + '\n')

        try:
            # Create all peers
            print('📝 Step 1: Creating peers...')
            for i in range(self.num_peers):
                peer = SimulatedPeer(
                    i,
                    f'{PLAYER_PREFIX}{i + 1}',
                    self.signaling_url
                )
                self.peers.append(peer)

            # Connect all peers
            print('\n🔌 Step 2: Connecting to signaling server...')
            await asyncio.gather(*[peer.connect() for peer in self.peers])
            print('✅ All peers connected\n')

            # First peer creates or joins room
            print('🏠 Step 3: Setting up room...')
            if not self.room_code:
                self.room_code = await self.peers[0].join_room()
                print(f'✅ Room created: {self.room_code}\n')
            else:
                await self.peers[0].join_room(self.room_code)

            # Small delay to ensure room is ready
            await asyncio.sleep(0.5)

            # Other peers join the room
            print('👥 Step 4: Other peers joining room...')
            for i in range(1, len(self.peers)):
                await self.peers[i].join_room(self.room_code)
                await asyncio.sleep(0.2)
            print('✅ All peers in room\n')

            # Create offers between all peers (mesh topology)
            print('🤝 Step 5: Establishing peer connections...')
            for i in range(len(self.peers)):
                for j in range(i + 1, len(self.peers)):
                    peer1 = self.peers[i]
                    peer2 = self.peers[j]
                    
                    print(f'   Creating connection: {peer1.player_name} ↔ {peer2.player_name}')
                    await peer1.create_offer(peer2.client_id)
                    await asyncio.sleep(0.1)
            print('✅ Offer/Answer exchange initiated\n')

            # Monitor connections
            print('⏳ Step 6: Monitoring connections for 15 seconds...\n')
            
            # Print stats every 3 seconds
            for _ in range(5):
                await asyncio.sleep(3)
                print('\n📊 Current Statistics:')
                print('─' * 40)
                for peer in self.peers:
                    stats = peer.get_stats()
                    print(f"  {stats['playerName']}:")
                    print(f"    - Connected: {stats['isConnected']}")
                    print(f"    - Peer Connections: {stats['peerConnections']}")
                    print(f"    - Received Tracks: {stats['receivedTracks']}")
                print('─' * 40 + '\n')

            # Final statistics
            print('\n📊 Final Statistics:')
            print('=' * 50)
            for peer in self.peers:
                stats = peer.get_stats()
                print(f"{stats['playerName']}:")
                print(f"  ✓ Client ID: {stats['clientId']}")
                print(f"  ✓ Room Code: {stats['roomCode']}")
                print(f"  ✓ Peer Connections: {stats['peerConnections']}")
                print(f"  ✓ Received Audio Tracks: {stats['receivedTracks']}")
                print('─' * 40)

            # Calculate expected vs actual
            expected_connections = self.num_peers - 1
            expected_tracks = expected_connections
            
            print('\n📈 Summary:')
            print(f'  Expected connections per peer: {expected_connections}')
            print(f'  Expected audio tracks per peer: {expected_tracks}')
            
            all_successful = all(
                peer.get_stats()['receivedTracks'] == expected_tracks
                for peer in self.peers
            )
            
            if all_successful:
                print('\n  ✅ SUCCESS: All peers successfully connected and exchanging audio!')
            else:
                print('\n  ⚠️  WARNING: Some connections may not be fully established')
            
            print('=' * 50 + '\n')

        except Exception as e:
            logger.error(f'\n❌ Test failed: {e}', exc_info=True)
        finally:
            # Cleanup
            print('🧹 Cleaning up...')
            await asyncio.gather(*[peer.cleanup() for peer in self.peers])
            print('✅ Done\n')


async def main():
    """Main entry point"""
    runner = TestRunner(NUM_PEERS, SIGNALING_URL)
    await runner.run()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n\n⚠️  Interrupted by user')
        sys.exit(0)
