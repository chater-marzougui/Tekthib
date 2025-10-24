#!/usr/bin/env node
/**
 * Simple WebSocket Connectivity Test
 * 
 * Tests basic WebSocket connectivity and signaling without WebRTC.
 * This is useful for verifying the signaling server is working before
 * attempting full WebRTC peer simulation.
 * 
 * Usage:
 *   SIGNALING_URL=ws://localhost:3001 node testConnection.js
 */

import WebSocket from 'ws';

const SIGNALING_URL = process.env.SIGNALING_URL || 'ws://localhost:3001';
const NUM_CLIENTS = parseInt(process.env.NUM_CLIENTS || '2', 10);

console.log('\n' + '='.repeat(50));
console.log('  WebSocket Connectivity Test');
console.log('='.repeat(50));
console.log(`Signaling Server: ${SIGNALING_URL}`);
console.log(`Number of Clients: ${NUM_CLIENTS}`);
console.log('='.repeat(50) + '\n');

class TestClient {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.ws = null;
    this.clientId = null;
    this.roomCode = null;
    this.messagesReceived = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.name}] Connecting...`);
      
      this.ws = new WebSocket(SIGNALING_URL);

      this.ws.on('open', () => {
        console.log(`[${this.name}] ✓ WebSocket connected`);
        this.ws.send(JSON.stringify({ type: 'CONNECT', payload: {} }));
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.messagesReceived.push(message);
        
        switch (message.type) {
          case 'CONNECTED':
            this.clientId = message.payload.clientId;
            console.log(`[${this.name}] ✓ Received client ID: ${this.clientId}`);
            resolve();
            break;
          
          case 'ROOM_CREATED':
            this.roomCode = message.payload.roomCode;
            console.log(`[${this.name}] ✓ Room created: ${this.roomCode}`);
            break;
          
          case 'ROOM_JOINED':
            this.roomCode = message.payload.roomCode;
            console.log(`[${this.name}] ✓ Joined room: ${this.roomCode}`);
            break;
          
          case 'PLAYER_JOINED':
            const playerName = message.payload.player?.name || 'Unknown';
            console.log(`[${this.name}] ℹ Player joined: ${playerName}`);
            break;
          
          case 'ERROR':
            console.error(`[${this.name}] ✗ Error: ${message.payload?.message}`);
            break;
        }
      });

      this.ws.on('error', (error) => {
        console.error(`[${this.name}] ✗ WebSocket error:`, error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log(`[${this.name}] Connection closed`);
      });

      setTimeout(() => {
        if (!this.clientId) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  createRoom() {
    console.log(`[${this.name}] Creating room...`);
    this.ws.send(JSON.stringify({
      type: 'CREATE_ROOM',
      payload: {
        playerName: this.name,
        autoPlayTimeout: 30000,
        maxPlayers: 8,
        isPublic: false,
        challengeSuspenseEnabled: false,
      },
    }));
  }

  joinRoom(roomCode) {
    console.log(`[${this.name}] Joining room ${roomCode}...`);
    this.ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: {
        roomCode,
        playerName: this.name,
      },
    }));
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats() {
    return {
      name: this.name,
      clientId: this.clientId,
      roomCode: this.roomCode,
      messagesReceived: this.messagesReceived.length,
    };
  }
}

async function runTest() {
  const clients = [];
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Step 1: Create clients
    console.log('Step 1: Creating test clients...\n');
    for (let i = 0; i < NUM_CLIENTS; i++) {
      clients.push(new TestClient(i, `TestClient${i + 1}`));
    }

    // Step 2: Connect all clients
    console.log('\nStep 2: Connecting to signaling server...\n');
    await Promise.all(clients.map(client => client.connect()));
    console.log('\n✓ All clients connected successfully');
    testsPassed++;

    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: First client creates room
    console.log('\nStep 3: Creating room...\n');
    clients[0].createRoom();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (clients[0].roomCode) {
      console.log(`\n✓ Room created: ${clients[0].roomCode}`);
      testsPassed++;
    } else {
      console.log('\n✗ Room creation failed');
      testsFailed++;
    }

    // Step 4: Other clients join
    if (clients.length > 1 && clients[0].roomCode) {
      console.log('\nStep 4: Other clients joining room...\n');
      for (let i = 1; i < clients.length; i++) {
        clients[i].joinRoom(clients[0].roomCode);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const allJoined = clients.every(client => client.roomCode === clients[0].roomCode);
      if (allJoined) {
        console.log('\n✓ All clients joined the room');
        testsPassed++;
      } else {
        console.log('\n✗ Not all clients joined successfully');
        testsFailed++;
      }
    }

    // Step 5: Display stats
    console.log('\n' + '='.repeat(50));
    console.log('  Test Results');
    console.log('='.repeat(50));
    
    clients.forEach(client => {
      const stats = client.getStats();
      console.log(`\n${stats.name}:`);
      console.log(`  Client ID: ${stats.clientId}`);
      console.log(`  Room Code: ${stats.roomCode || 'N/A'}`);
      console.log(`  Messages Received: ${stats.messagesReceived}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`  Tests Passed: ${testsPassed}`);
    console.log(`  Tests Failed: ${testsFailed}`);
    console.log('='.repeat(50));

    if (testsFailed === 0) {
      console.log('\n✅ SUCCESS: WebSocket signaling is working correctly!\n');
      console.log('You can now proceed to test WebRTC peer connections.');
      console.log('Note: wrtc package requires native compilation which may');
      console.log('fail in some environments. Refer to README for alternatives.\n');
    } else {
      console.log('\n⚠️  WARNING: Some tests failed\n');
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    testsFailed++;
  } finally {
    // Cleanup
    console.log('Cleaning up...');
    clients.forEach(client => client.close());
    
    setTimeout(() => {
      process.exit(testsFailed > 0 ? 1 : 0);
    }, 500);
  }
}

runTest();
