import Fastify from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import fastifyCors from '@fastify/cors';
import 'dotenv/config';

// Import routes
import { setupGameRoutes } from './routes/gameRoutes.js';
import { setupWebSocketRoutes } from './routes/websocketRoutes.js';

const fastify = Fastify({ logger: true });

// Parse CORS origins from environment variable
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001')
  .split(',')
  .map(origin => origin.trim());

// Register CORS plugin with environment-based configuration
fastify.register(fastifyCors, {
  origin: allowedOrigins,
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
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    console.log(`Backend server running on http://${host}:${port}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();