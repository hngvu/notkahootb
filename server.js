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
// const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://notkahootui.vercel.app/')
//   .split(',')
//   .map(origin => origin.trim());

// Log CORS configuration for debugging

// Register CORS plugin with environment-based configuration
fastify.register(fastifyCors, {
  origin: 'https://notkahootui.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type']
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
    const host = '0.0.0.0';
    await fastify.listen({ port, host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();