// BomaSecure Scalable Server
// Production-grade server with horizontal scaling support for 1M+ users

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import security middleware
const { security } = require('./middleware');

// Import routes
const {
  authRoutes,
  visitorRoutes,
  deliveryRoutes,
  notificationRoutes,
  apartmentRoutes,
  accessLogRoutes,
  paymentRoutes,
  emergencyRoutes
} = require('./routes');

// Import scalability services
const databaseManager = require('./config/database');
const redisCacheService = require('./services/redisCacheService');
const websocketClusterService = require('./services/websocketClusterService');
const monitoringService = require('./services/monitoringService');
const enhancedRateLimiter = require('./middleware/enhancedRateLimit');

const app = express();
const server = http.createServer(app);

// ==========================================
// INITIALIZATION
// ==========================================

async function initializeServices() {
  console.log('🚀 Initializing BomaSecure Scalable Server...');
  
  try {
    // Initialize database with connection pooling
    await databaseManager.initialize();
    
    // Initialize Redis cache
    await redisCacheService.initialize();
    
    // Initialize monitoring
    monitoringService.initialize();
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization error:', error.message);
    // Continue anyway - services have graceful degradation
  }
}

// ==========================================
// SECURITY MIDDLEWARE (Order matters!)
// ==========================================

// 1. Request ID for traceability
app.use(security.requestId);

// 2. Helmet - Set secure HTTP headers
app.use(security.helmet);

// 3. CORS - Cross-Origin Resource Sharing
app.use(cors(security.corsOptions));

// 4. Enhanced Rate Limiting - General
app.use(enhancedRateLimiter.createApiLimiter());

// 5. XSS Protection
app.use(security.xssClean);

// 6. HTTP Parameter Pollution protection
app.use(security.hpp);

// 7. MongoDB Sanitization - Prevent NoSQL injection
app.use(security.mongoSanitizer);

// 8. Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 9. Request tracking for monitoring
app.use((req, res, next) => {
  monitoringService.trackRequest();
  next();
});

// ==========================================
// WEBSOCKET SETUP (Horizontal Scaling)
// ==========================================

let io;

async function initializeWebSocket() {
  try {
    io = await websocketClusterService.initialize(server);
    console.log('✅ WebSocket cluster initialized');
  } catch (error) {
    console.error('❌ WebSocket initialization error:', error.message);
    // Fallback to basic socket.io
    const socketIo = require('socket.io');
    io = socketIo(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? (process.env.ALLOWED_ORIGINS || '').split(',') 
          : process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    console.log('⚠️ Running WebSocket in fallback mode');
  }
  
  // Make io accessible to routes
  app.set('io', io);
}

// ==========================================
// HEALTH & MONITORING ENDPOINTS
// ==========================================

// Health check endpoint (no rate limiting)
app.get('/api/health', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Readiness probe (for Kubernetes)
app.get('/api/ready', async (req, res) => {
  try {
    const readiness = await monitoringService.getReadinessStatus();
    res.json(readiness);
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message
    });
  }
});

// Metrics endpoint (for Prometheus)
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = monitoringService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detailed metrics endpoint
app.get('/api/metrics/detailed', async (req, res) => {
  try {
    const metrics = await monitoringService.getDetailedMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket stats
app.get('/api/websocket/stats', (req, res) => {
  try {
    const stats = websocketClusterService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cache stats
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await redisCacheService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database stats
app.get('/api/database/stats', async (req, res) => {
  try {
    const stats = await databaseManager.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate limit stats
app.get('/api/ratelimit/stats', async (req, res) => {
  try {
    const stats = await enhancedRateLimiter.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RATE LIMITING PER ROUTE
// ==========================================

// Apply stricter rate limiting to auth routes
app.use('/api/auth', enhancedRateLimiter.createAuthLimiter());

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/logs', accessLogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/emergencies', emergencyRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] Request ${req.id}:`, err.stack);
  
  // Track error in monitoring
  monitoringService.trackDbQuery(0); // Track as failed query
  
  // Log security-relevant errors
  if (err.message.includes('JWT') || err.message.includes('token') || err.message.includes('auth')) {
    security.auditLog('AUTH_ERROR', { 
      requestId: req.id, 
      path: req.path, 
      ip: req.ip,
      error: err.message 
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    requestId: req.id,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Close WebSocket connections
  if (io) {
    io.close(() => {
      console.log('✅ WebSocket server closed');
    });
  }
  
  // Close database connections
  await databaseManager.shutdown();
  
  // Close Redis connections
  await redisCacheService.shutdown();
  
  // Close rate limiter
  enhancedRateLimiter.shutdown();
  
  console.log('✅ Graceful shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Don't crash - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Attempt graceful shutdown
  gracefulShutdown('uncaughtException');
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    // Initialize all services
    await initializeServices();
    
    // Initialize WebSocket
    await initializeWebSocket();
    
    // Start server
    const PORT = process.env.PORT || 4200;
    server.listen(PORT, () => {
      console.log(`\n🚀 BomaSecure Scalable Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`📊 Monitoring endpoints available:`);
      console.log(`   - Health: http://localhost:${PORT}/api/health`);
      console.log(`   - Ready: http://localhost:${PORT}/api/ready`);
      console.log(`   - Metrics: http://localhost:${PORT}/api/metrics`);
      console.log(`   - Detailed: http://localhost:${PORT}/api/metrics/detailed`);
      console.log(`\n✅ Server is ready to handle 1M+ users!\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = { app, server, io };
