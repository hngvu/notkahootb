import Fastify from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import fastifyCors from '@fastify/cors';

// Import routes
import { setupGameRoutes } from './routes/gameRoutes.js';
import { setupWebSocketRoutes } from './routes/websocketRoutes.js';

const fastify = Fastify({ logger: true });

// Register CORS plugin
fastify.register(fastifyCors, {
  origin: 'http://localhost:3001', // Allow requests from frontend
  credentials: true
});

// Register WebSocket plugin BEFORE routes
fastify.register(fastifyWebSocket);
fastify.register(fastifyMultipart);

// Register routes
fastify.register(setupGameRoutes);
fastify.register(setupWebSocketRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Backend server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();