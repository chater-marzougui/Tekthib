import { createServer } from 'http';
import app from './app';
import { setupWebSocket } from './websocket';

const PORT = process.env.PORT || 3001;

const server = createServer(app);

// Setup WebSocket server
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});