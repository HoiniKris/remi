import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from 'dotenv';
import { testConnection, closePool } from './config/database.js';
import { runMigrations } from './config/migrate.js';
import authRoutes from './routes/auth.js';
import { WebSocketServer } from './websocket/WebSocketServer.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    const connected = await testConnection();
    dbStatus = connected ? 'connected' : 'disconnected';
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    message:
      dbStatus === 'disconnected' ? 'Run "docker compose up -d" to start database' : undefined,
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection (optional in development)
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Database connected - running migrations...');
      await runMigrations();
    } else {
      console.warn('⚠️  Database not available - starting without database');
      console.warn('⚠️  To enable database features, start Docker:');
      console.warn('   docker compose up -d');
    }

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket server
    const wsServer = new WebSocketServer(httpServer);
    console.log('✅ WebSocket server initialized');

    // Start server regardless of database connection
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
      if (!connected) {
        console.log('⚠️  Database features disabled - install Docker to enable');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await closePool();
  process.exit(0);
});

startServer();

export default app;
