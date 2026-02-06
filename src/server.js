import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDatabase, closeDatabase } from './db/mongodb.js';
import { badgeRoutes } from './routes/badge.js';
import { authRoutes } from './routes/auth.js';
import { apiRoutes } from './routes/api.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { redis } from './services/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

// Configuration
const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};

async function start() {
  try {
    // Initialize database
    await connectDatabase();
    
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true
    });
    
    await fastify.register(formbody);
    
    await fastify.register(jwt, {
      secret: config.jwtSecret
    });
    
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });
    
    // Serve static files
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
      prefix: '/'
    });
    
    // Decorate with config
    fastify.decorate('config', config);
    
    // Register routes
    await fastify.register(badgeRoutes);
    await fastify.register(authRoutes, { prefix: '/auth' });
    await fastify.register(apiRoutes, { prefix: '/api' });
    await fastify.register(dashboardRoutes);
    
    // Health check
    fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
    
    // Start server
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`Server running at http://localhost:${config.port}`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await fastify.close();
  await closeDatabase();
  await redis.quit();
  process.exit(0);
});

start();
