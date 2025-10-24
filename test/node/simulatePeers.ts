/**
 * WebRTC Peer Simulation for Tekthib Voice Chat Testing
 * 
 * This script simulates multiple WebRTC peers connecting to the Tekthib
 * signaling server to test voice chat functionality without browsers.
 * 
 * Usage:
 *   SIGNALING_URL=ws://localhost:3001 ROOM_CODE=TEST123 node simulatePeers.js
 * 
 * Environment Variables:
 *   SIGNALING_URL - WebSocket URL of signaling server (default: ws://localhost:3001)
 *   ROOM_CODE - Room code to join (default: auto-generated)
 *   NUM_PEERS - Number of peers to simulate (default: 4)
 *   PLAYER_PREFIX - Prefix for player names (default: TestPeer)
 */

import { RTCPeerConnection, RTCAudioSink, nonstandard } from 'wrtc';
import WebSocket from 'ws';
import type { WSMessage } from 'shared';

// Configuration from environment variables
const SIGNALING_URL = process.env.SIGNALING_URL || 'ws://localhost:3001';
const ROOM_CODE = process.env.ROOM_CODE || null;
const NUM_PEERS = Number.parseInt(process.env.NUM_PEERS || '4', 10);
const PLAYER_PREFIX = process.env.PLAYER_PREFIX || 'TestPeer';

// ICE servers configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Simulated WebRTC Peer
 * Manages WebSocket connection, WebRTC peer connections, and audio tracks
 */
class SimulatedPeer {
  id: number;
  playerName: string;
  signalingUrl: string;
  clientId: string | null;
  roomCode: string | null;
  ws: WebSocket | null;
  peerConnections: Map<string, RTCPeerConnection>;
  audioSource: any;
  audioTrack: any;
  localStream: any;
  audioInterval: any;
  pendingCandidates: Map<string, any[]>;
  isConnected: boolean;
  receivedTracks: number;

  constructor(id: number, playerName: string, signalingUrl: string) {
    this.id = id;
    this.playerName = playerName;
    this.signalingUrl = signalingUrl;
    this.clientId = null;
    this.roomCode = null;
    this.ws = null;
    this.peerConnections = new Map(); // Map of remotePlayerId -> RTCPeerConnection
    this.audioSource = null;
    this.audioTrack = null;
    this.localStream = null;
    this.audioInterval = null;
    this.pendingCandidates = new Map(); // Store ICE candidates before remote description
    this.isConnected = false;
    this.receivedTracks = 0;
  }

  /**
   * Initialize the peer and connect to signaling server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[${this.playerName}] Connecting to ${this.signalingUrl}...`);
      
      this.ws = new WebSocket(this.signalingUrl);

      this.ws.on('open', () => {
        console.log(`[${this.playerName}] WebSocket connected`);
        this.isConnected = true;
        
        // Send initial CONNECT message
        this.sendMessage({
          type: 'CONNECT',
          payload: {},
        });
      });

      this.ws.on('message', (data: any) => {
        try {
          const message = JSON.parse(String(data)) as WSMessage;
          this.handleMessage(message);
          
          // Resolve when we get client ID
          if (message.type === 'CONNECTED' && !this.clientId) {
            this.clientId = message.payload.clientId;
            console.log(`[${this.playerName}] Received clientId: ${this.clientId}`);
            resolve();
          }
        } catch (error) {
          console.error(`[${this.playerName}] Error parsing message:`, error);
        }
      });

      this.ws.on('error', (error) => {
        console.error(`[${this.playerName}] WebSocket error:`, error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log(`[${this.playerName}] WebSocket closed`);
        this.isConnected = false;
        this.cleanup();
      });

      // Timeout if connection takes too long
      setTimeout(() => {
        if (!this.clientId) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Send a message to the signaling server
   */
  sendMessage(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(`[${this.playerName}] Cannot send message - WebSocket not open`);
    }
  }

  /**
   * Handle incoming messages from signaling server
   */
  handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'CONNECTED':
        // Handled in connect()
        break;

      case 'ROOM_CREATED':
        this.roomCode = message.payload.roomCode;
        console.log(`[${this.playerName}] Room created: ${this.roomCode}`);
        break;

      case 'ROOM_JOINED':
        this.roomCode = message.payload.roomCode;
        console.log(`[${this.playerName}] Joined room: ${this.roomCode}`);
        break;

      case 'PLAYER_JOINED':
        console.log(`[${this.playerName}] Player joined: ${message.payload.player?.name || 'Unknown'}`);
        break;

      case 'RTC_OFFER':
        this.handleRTCOffer(message.payload);
        break;

      case 'RTC_ANSWER':
        this.handleRTCAnswer(message.payload);
        break;

      case 'RTC_ICE_CANDIDATE':
        this.handleRTCIceCandidate(message.payload);
        break;

      case 'ERROR':
        console.error(`[${this.playerName}] Server error:`, message.payload?.message);
        break;

      default:
        // Ignore other message types
        break;
    }
  }

  /**
   * Create or join a room
   */
  async joinRoom(roomCode: string | null = null): Promise<string | null> {
    // Create dummy audio track
    this.createDummyAudioTrack();

    if (roomCode) {
      // Join existing room
      this.sendMessage({
        type: 'JOIN_ROOM',
        payload: {
          roomCode,
          playerName: this.playerName,
        },
      });
    } else {
      // Create new room
      this.sendMessage({
        type: 'CREATE_ROOM',
        payload: {
          playerName: this.playerName,
          autoPlayTimeout: 30000,
          maxPlayers: 8,
          isPublic: false,
          challengeSuspenseEnabled: false,
        },
      });
    }

    // Wait for room creation/join confirmation
    await new Promise<void>((resolve) => {
      const checkRoom = setInterval(() => {
        if (this.roomCode) {
          clearInterval(checkRoom);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkRoom);
        resolve();
      }, 5000);
    });

    console.log(`[${this.playerName}] In room: ${this.roomCode}`);
    return this.roomCode;
  }

  /**
   * Create a dummy audio track with a sine wave
   */
  createDummyAudioTrack(): void {
    try {
      const { RTCAudioSource } = nonstandard as any;
      this.audioSource = new RTCAudioSource();
      
      // Create audio track from source
      this.audioTrack = this.audioSource.createTrack();
      
      console.log(`[${this.playerName}] Created dummy audio track`);

      // Generate a simple sine wave for testing
      // This simulates audio data being sent
      const sampleRate = 8000;
      const frequency = 440; // A4 note
      const samples = new Int16Array(sampleRate / 100); // 10ms of audio
      
      let phase = 0;
      const generateSamples = () => {
        for (let i = 0; i < samples.length; i++) {
          samples[i] = Math.sin(phase) * 0x7fff * 0.1; // Low volume
          phase += (2 * Math.PI * frequency) / sampleRate;
          if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
        }
        
        this.audioSource.onData({
          samples,
          sampleRate,
          bitsPerSample: 16,
          channelCount: 1,
          numberOfFrames: samples.length,
        });
      };

      // Send audio samples every 10ms
      this.audioInterval = setInterval(generateSamples, 10);
      
    } catch (error) {
      console.error(`[${this.playerName}] Error creating audio track:`, error);
    }
  }

  /**
   * Create peer connection with another peer
   */
  createPeerConnection(remotePlayerId: string): RTCPeerConnection {
    if (this.peerConnections.has(remotePlayerId)) {
      console.log(`[${this.playerName}] Peer connection already exists for ${remotePlayerId}`);
      return this.peerConnections.get(remotePlayerId)!;
    }

    console.log(`[${this.playerName}] Creating peer connection with ${remotePlayerId}`);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add audio track to connection
    if (this.audioTrack) {
      pc.addTrack(this.audioTrack);
      console.log(`[${this.playerName}] Added audio track to connection with ${remotePlayerId}`);
    }

    // Handle incoming tracks
    pc.ontrack = (event: any) => {
      console.log(`[${this.playerName}] 🎵 Received audio track from ${remotePlayerId}`);
      this.receivedTracks++;
      
      // Create audio sink to consume the track
      const audioSink = new RTCAudioSink(event.track);
      audioSink.ondata = (data: any) => {
        // Audio data received - just log periodically
        if (Math.random() < 0.01) { // Log 1% of the time to avoid spam
          console.log(`[${this.playerName}] 📊 Receiving audio packets from ${remotePlayerId} (${data.samples.length} samples)`);
        }
      };
    };

    // Handle ICE candidates
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'RTC_ICE_CANDIDATE',
          payload: {
            targetPlayerId: remotePlayerId,
            signal: event.candidate.toJSON(),
          },
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[${this.playerName}] Connection state with ${remotePlayerId}: ${pc.connectionState}`);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[${this.playerName}] ICE connection state with ${remotePlayerId}: ${pc.iceConnectionState}`);
    };

    this.peerConnections.set(remotePlayerId, pc);
    return pc;
  }

  /**
   * Create and send an offer to a remote peer
   */
  async createOffer(remotePlayerId: string): Promise<void> {
    const pc = this.createPeerConnection(remotePlayerId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.sendMessage({
        type: 'RTC_OFFER',
        payload: {
          targetPlayerId: remotePlayerId,
          signal: pc.localDescription!.toJSON(),
        },
      });

      console.log(`[${this.playerName}] Sent offer to ${remotePlayerId}`);
    } catch (error) {
      console.error(`[${this.playerName}] Error creating offer:`, error);
    }
  }

  /**
   * Handle incoming RTC offer
   */
  async handleRTCOffer(payload: any): Promise<void> {
    const { fromPlayerId, signal } = payload;
    console.log(`[${this.playerName}] Received offer from ${fromPlayerId}`);

    const pc = this.createPeerConnection(fromPlayerId);

    try {
      await pc.setRemoteDescription(signal);

      // Add any pending ICE candidates
      const pending = this.pendingCandidates.get(fromPlayerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(fromPlayerId);

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendMessage({
        type: 'RTC_ANSWER',
        payload: {
          targetPlayerId: fromPlayerId,
          signal: pc.localDescription!.toJSON(),
        },
      });

      console.log(`[${this.playerName}] Sent answer to ${fromPlayerId}`);
    } catch (error) {
      console.error(`[${this.playerName}] Error handling offer:`, error);
    }
  }

  /**
   * Handle incoming RTC answer
   */
  async handleRTCAnswer(payload: any): Promise<void> {
    const { fromPlayerId, signal } = payload;
    console.log(`[${this.playerName}] Received answer from ${fromPlayerId}`);

    const pc = this.peerConnections.get(fromPlayerId);
    if (!pc) {
      console.error(`[${this.playerName}] No peer connection found for ${fromPlayerId}`);
      return;
    }

    try {
      await pc.setRemoteDescription(signal);

      // Add any pending ICE candidates
      const pending = this.pendingCandidates.get(fromPlayerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(fromPlayerId);

      console.log(`[${this.playerName}] Set remote description from ${fromPlayerId}`);
    } catch (error) {
      console.error(`[${this.playerName}] Error handling answer:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleRTCIceCandidate(payload: any): Promise<void> {
    const { fromPlayerId, signal } = payload;
    
    const pc = this.peerConnections.get(fromPlayerId);
    if (!pc) {
      // Store for later if peer connection doesn't exist yet
      const pending = this.pendingCandidates.get(fromPlayerId) || [];
      pending.push(signal);
      this.pendingCandidates.set(fromPlayerId, pending);
      return;
    }

    try {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(signal);
      } else {
        // Store for later if no remote description yet
        const pending = this.pendingCandidates.get(fromPlayerId) || [];
        pending.push(signal);
        this.pendingCandidates.set(fromPlayerId, pending);
      }
    } catch (error) {
      console.error(`[${this.playerName}] Error adding ICE candidate:`, error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log(`[${this.playerName}] Cleaning up...`);

    // Stop audio generation
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
    }

    // Stop audio track
    if (this.audioTrack) {
      this.audioTrack.stop();
    }

    // Close all peer connections
    for (const [remoteId, pc] of this.peerConnections) {
      console.log(`[${this.playerName}] Closing connection to ${remoteId}`);
      pc.close();
    }
    this.peerConnections.clear();

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Get statistics about this peer
   */
  getStats() {
    return {
      playerName: this.playerName,
      clientId: this.clientId,
      roomCode: this.roomCode,
      isConnected: this.isConnected,
      peerConnections: this.peerConnections.size,
      receivedTracks: this.receivedTracks,
    };
  }
}

/**
 * Test runner - creates and manages multiple simulated peers
 */
class TestRunner {
  numPeers: number;
  signalingUrl: string;
  peers: SimulatedPeer[];
  roomCode: string | null;
  
  constructor(numPeers: number, signalingUrl: string) {
    this.numPeers = numPeers;
    this.signalingUrl = signalingUrl;
    this.peers = [];
    this.roomCode = ROOM_CODE;
  }

  /**
   * Run the test
   */
  async run(): Promise<void> {
    console.log('\n=================================================');
    console.log('  Tekthib WebRTC Peer Simulation Test');
    console.log('=================================================');
    console.log(`Signaling Server: ${this.signalingUrl}`);
    console.log(`Number of Peers: ${this.numPeers}`);
    console.log(`Room Code: ${this.roomCode || 'Auto-generated'}`);
    console.log('=================================================\n');

    try {
      // Create all peers
      console.log('📝 Step 1: Creating peers...');
      for (let i = 0; i < this.numPeers; i++) {
        const peer = new SimulatedPeer(
          i,
          `${PLAYER_PREFIX}${i + 1}`,
          this.signalingUrl
        );
        this.peers.push(peer);
      }

      // Connect all peers
      console.log('\n🔌 Step 2: Connecting to signaling server...');
      await Promise.all(this.peers.map((peer) => peer.connect()));
      console.log('✅ All peers connected\n');

      // First peer creates or joins room, others join
      console.log('🏠 Step 3: Setting up room...');
      if (this.roomCode === null) {
        this.roomCode = await this.peers[0].joinRoom();
        console.log(`✅ Room created: ${this.roomCode}\n`);
      } else {
        await this.peers[0].joinRoom(this.roomCode);
      }

      // Small delay to ensure room is ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Other peers join the room
      console.log('👥 Step 4: Other peers joining room...');
      for (let i = 1; i < this.peers.length; i++) {
        await this.peers[i].joinRoom(this.roomCode);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      console.log('✅ All peers in room\n');

      // Create offers between all peers (mesh topology)
      console.log('🤝 Step 5: Establishing peer connections...');
      for (let i = 0; i < this.peers.length; i++) {
        for (let j = i + 1; j < this.peers.length; j++) {
          const peer1 = this.peers[i];
          const peer2 = this.peers[j];
          
          if (peer2.clientId) {
            console.log(`   Creating connection: ${peer1.playerName} ↔ ${peer2.playerName}`);
            await peer1.createOffer(peer2.clientId);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
      console.log('✅ Offer/Answer exchange initiated\n');

      // Monitor connections for a while
      console.log('⏳ Step 6: Monitoring connections for 15 seconds...\n');
      
      // Print stats every 3 seconds
      const statsInterval = setInterval(() => {
        console.log('\n📊 Current Statistics:');
        console.log('─────────────────────────────────────────');
        for (const peer of this.peers) {
          const stats = peer.getStats();
          console.log(`  ${stats.playerName}:`);
          console.log(`    - Connected: ${stats.isConnected}`);
          console.log(`    - Peer Connections: ${stats.peerConnections}`);
          console.log(`    - Received Tracks: ${stats.receivedTracks}`);
        }
        console.log('─────────────────────────────────────────\n');
      }, 3000);

      await new Promise((resolve) => setTimeout(resolve, 15000));
      clearInterval(statsInterval);

      // Final statistics
      console.log('\n📊 Final Statistics:');
      console.log('=================================================');
      for (const peer of this.peers) {
        const stats = peer.getStats();
        console.log(`${stats.playerName}:`);
        console.log(`  ✓ Client ID: ${stats.clientId}`);
        console.log(`  ✓ Room Code: ${stats.roomCode}`);
        console.log(`  ✓ Peer Connections: ${stats.peerConnections}`);
        console.log(`  ✓ Received Audio Tracks: ${stats.receivedTracks}`);
        console.log('─────────────────────────────────────────');
      }

      // Calculate expected vs actual
      const expectedConnections = this.numPeers - 1;
      const expectedTracks = expectedConnections;
      
      console.log('\n📈 Summary:');
      console.log(`  Expected connections per peer: ${expectedConnections}`);
      console.log(`  Expected audio tracks per peer: ${expectedTracks}`);
      
      const allSuccessful = this.peers.every(
        (peer) => peer.getStats().receivedTracks === expectedTracks
      );
      
      if (allSuccessful) {
        console.log('\n  ✅ SUCCESS: All peers successfully connected and exchanging audio!');
      } else {
        console.log('\n  ⚠️  WARNING: Some connections may not be fully established');
      }
      
      console.log('=================================================\n');

    } catch (error) {
      console.error('\n❌ Test failed:', error);
    } finally {
      // Cleanup
      console.log('🧹 Cleaning up...');
      for (const peer of this.peers) {
        peer.cleanup();
      }
      console.log('✅ Done\n');
      
      // Exit after a short delay to allow cleanup
      setTimeout(() => process.exit(0), 1000);
    }
  }
}

// Main execution
const runner = new TestRunner(NUM_PEERS, SIGNALING_URL);
await runner.run();
