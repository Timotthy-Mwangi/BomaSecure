// WebSocket Cluster Service for BomaSecure
// Implements horizontal scaling with Redis adapter for 1M+ concurrent connections

const socketio = require('socket.io');
const redisAdapter = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const redisCacheService = require('./redisCacheService');

// Security: Require JWT_SECRET in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is required in production!');
  process.exit(1);
}

// Fallback for development only
const DEV_JWT_SECRET = process.env.JWT_SECRET || 'bomasecure-dev-secret-key-2024';
const getJwtSecret = () => {
  if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured for production');
  }
  return JWT_SECRET || DEV_JWT_SECRET;
};

class WebSocketClusterService {
  constructor() {
    this.io = null;
    this.pubClient = null;
    this.subClient = null;
    this.activeConnections = new Map();
    this.connectionCount = 0;
    this.messageRateLimits = new Map();
    this.initialized = false;
  }

  // Initialize WebSocket cluster with Redis adapter
  async initialize(server) {
    try {
      if (!this.io) {
        // Create Socket.io instance with optimized settings
        this.io = socketio(server, {
          cors: {
            origin: process.env.NODE_ENV === 'production' 
              ? (process.env.ALLOWED_ORIGINS || '').split(',') 
              : process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
          },
          
          // Critical settings for 1M+ connections
          transports: ['websocket', 'polling'], 
          allowUpgrades: true,
          pingTimeout: 60000,
          pingInterval: 25000,
          upgradeTimeout: 10000,
          maxHttpBufferSize: 1e6,
          
          perMessageDeflate: {
            threshold: 1024 
          },
          httpCompression: true 
        });
      }

      if (this.initialized) {
        console.log('⚠️ WebSocket cluster already initialized, skipping re-setup');
        return this.io;
      }

      // Attempt to setup Redis adapter (horizontal scaling)
      try {
        await this.setupRedisAdapter();
      } catch (adapterError) {
        console.warn('⚠️ WebSocket scaling disabled: Redis adapter failed. Falling back to single instance mode.');
      }
      
      // Setup authentication middleware
      this.setupAuthentication();
      
      // Setup connection handlers
      this.setupConnectionHandlers();
      
      // Setup rate limiting
      this.setupRateLimiting();
      
      // Setup monitoring
      this.setupMonitoring();
      
      this.initialized = true;
      console.log('✅ WebSocket cluster initialized');
      return this.io;
    } catch (error) {
      console.error('❌ Critical WebSocket initialization failure:', error.message);
      throw error;
    }
  }

  // Setup Redis adapter for horizontal scaling
  async setupRedisAdapter() {
    try {
      // Create Redis clients for pub/sub
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          if (times > 10) return null;
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: null // Allow indefinite retries in background
      };

      this.pubClient = new Redis(redisConfig);
      this.subClient = this.pubClient.duplicate();

      // Handle Redis errors gracefully
      this.pubClient.on('error', (err) => {
        console.error('Redis pub client error:', err.message);
      });

      this.subClient.on('error', (err) => {
        console.error('Redis sub client error:', err.message);
      });

      // Attach Redis adapter to Socket.io
      this.io.adapter(redisAdapter(this.pubClient, this.subClient));
      
      console.log('✅ Redis adapter configured for WebSocket scaling');
    } catch (error) {
      console.error('❌ Redis adapter setup failed:', error.message);
      throw error;
    }
  }

  // Setup authentication middleware
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
          return next(new Error('Invalid user'));
        }

        socket.user = {
          userId: user._id,
          role: user.role,
          apartmentId: user.apartmentId,
          name: user.name
        };
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  // Setup connection handlers
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      this.connectionCount++;
      this.activeConnections.set(socket.id, {
        userId: socket.user.userId,
        connectedAt: Date.now(),
        lastActivity: Date.now()
      });

      console.log(`User connected: ${socket.user.name} (${socket.user.userId}) - Total: ${this.connectionCount}`);

      // Join rooms based on role
      this.joinRooms(socket);

      // Broadcast real-time presence: Online
      this.broadcastUserStatus(socket.user.userId, true);

      // Handle joining specific rooms
      socket.on('join:apartment', (apartmentId) => {
        socket.join(`apartment-${apartmentId}`);
        console.log(`Socket ${socket.user.name} joined apartment-${apartmentId}`);
      });

      socket.on('join:tenant', (tenantId) => {
        socket.join(`tenant-${tenantId}`);
        console.log(`Socket ${socket.user.name} joined tenant-${tenantId}`);
      });

      socket.on('join:guard', (guardId) => {
        socket.join(`guard-${guardId}`);
        console.log(`Socket ${socket.user.name} joined guard-${guardId}`);
      });

      socket.on('join:admin', () => {
        if (socket.user.role === 'admin') {
          socket.join('admins');
          console.log(`Socket ${socket.user.name} joined admins`);
        }
      });

      socket.on('join:maintenance', () => {
        if (socket.user.role === 'maintenance' || socket.user.role === 'admin') {
          socket.join('maintenance-staff');
          console.log(`Socket ${socket.user.name} joined maintenance-staff`);
        }
      });

      socket.on('join:guards', () => {
        if (socket.user.role === 'guard') {
          socket.join('guards');
          console.log(`Socket ${socket.user.name} joined guards`);
        }
      });

      socket.on('join:tenants', () => {
        if (socket.user.role === 'tenant') {
          socket.join('tenants');
          console.log(`Socket ${socket.user.name} joined tenants`);
        }
      });

      // Handle ping for connection check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectionCount--;
        this.activeConnections.delete(socket.id);
        // Broadcast real-time presence: Offline
        this.broadcastUserStatus(socket.user.userId, false);
        console.log(`User disconnected: ${socket.user.name} (${reason}) - Total: ${this.connectionCount}`);
      });

      // Update last activity on any event
      socket.onAny(() => {
        const connection = this.activeConnections.get(socket.id);
        if (connection) {
          connection.lastActivity = Date.now();
        }
      });
    });
  }

  // Join appropriate rooms based on user role
  joinRooms(socket) {
    const { role, apartmentId, userId } = socket.user;

    // Join user-specific room
    socket.join(`user-${userId}`);

    // Join apartment room if user has apartment
    if (apartmentId) {
      socket.join(`apartment-${apartmentId}`);
    }

    // Join role-based rooms
    if (role === 'tenant') {
      socket.join(`tenant-${userId}`);
      socket.join('tenants');
      console.log(`[WS] Tenant ${userId} joined tenants room`);
    } else if (role === 'guard') {
      socket.join('guards');
      console.log(`[WS] Guard ${userId} joined guards room`);
      if (apartmentId) {
        socket.join(`apartment-guards-${apartmentId}`);
        console.log(`[WS] Guard ${userId} joined apartment-guards-${apartmentId}`);
      } else {
        console.log(`[WS] Guard ${userId} has no apartmentId - will only receive 'guards' broadcasts`);
      }
    } else if (role === 'admin') {
      socket.join('admins');
    } else if (role === 'maintenance') {
      socket.join('maintenance-staff');
      console.log(`[WS] Maintenance user ${userId} joined maintenance-staff room`);
    }
  }

  // Setup rate limiting per connection
  setupRateLimiting() {
    this.io.on('connection', (socket) => {
      // Use packet middleware to limit messages per second per connection
      socket.use((packet, next) => {
        const userId = socket.user?.userId;
        if (!userId) return next();

        const now = Date.now();
        const windowMs = 1000; // 1 second
        const maxMessages = 200; // Increased limit for complex admin dashboards

        if (!this.messageRateLimits.has(userId)) {
          this.messageRateLimits.set(userId, {
            count: 1,
            windowStart: now
          });
          return next();
        }

        const limit = this.messageRateLimits.get(userId);
        
        if (now - limit.windowStart > windowMs) {
          // Reset window
          limit.count = 1;
          limit.windowStart = now;
          return next();
        }

        limit.count++;

        if (limit.count > maxMessages) {
          console.warn(`[WS Rate Limit] Exceeded for user ${userId} (${socket.user.name})`);
          return next(new Error('Rate limit exceeded'));
        }

        next();
      });
    });
  }

  // Setup monitoring
  setupMonitoring() {
    // Log connection stats every 30 seconds
    setInterval(() => {
      console.log(`[WS Stats] Active connections: ${this.connectionCount}`);
    }, 30000);

    // Clean up stale rate limit entries every minute
    setInterval(() => {
      const now = Date.now();
      const windowMs = 1000;
      
      for (const [userId, limit] of this.messageRateLimits.entries()) {
        if (now - limit.windowStart > windowMs * 10) {
          this.messageRateLimits.delete(userId);
        }
      }
    }, 60000);
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }

  // Emit to tenant
  emitToTenant(tenantId, event, data) {
    this.io.to(`tenant-${tenantId}`).emit(event, data);
  }

  // Emit to guard
  emitToGuard(guardId, event, data) {
    this.io.to(`guard-${guardId}`).emit(event, data);
  }

  // Emit to all guards in an apartment
  emitToApartmentGuards(apartmentId, event, data) {
    this.io.to(`apartment-guards-${apartmentId}`).emit(event, data);
  }

  // Emit to all users in an apartment
  emitToApartment(apartmentId, event, data) {
    this.io.to(`apartment-${apartmentId}`).emit(event, data);
  }

  // Broadcast visitor arrival
  broadcastVisitorArrival(apartmentId, tenantId, visitor) {
    this.io.to(`tenant-${tenantId}`).emit('visitor:arrived', {
      visitor,
      timestamp: new Date()
    });

    // Also notify guards
    this.io.to(`apartment-guards-${apartmentId}`).emit('visitor:new', {
      visitor,
      timestamp: new Date()
    });
  }

  // Broadcast delivery arrival
  broadcastDeliveryArrival(apartmentId, tenantId, delivery) {
    this.io.to(`tenant-${tenantId}`).emit('delivery:arrived', {
      delivery,
      timestamp: new Date()
    });
  }

  // Broadcast access status change
  broadcastAccessStatus(apartmentId, data) {
    this.io.to(`apartment-${apartmentId}`).emit('access:status', {
      ...data,
      timestamp: new Date()
    });
  }

  // Broadcast user created (to admins and guards)
  broadcastUserCreated(user) {
    this.io.to('admins').emit('user:created', {
      user,
      timestamp: new Date()
    });
    this.io.to('guards').emit('user:created', {
      user,
      timestamp: new Date()
    });
  }

  // Broadcast user updated (to admins and guards)
  broadcastUserUpdated(userId, user) {
    // Support both old format (userId, updates) and new format (userId, fullUser)
    const updates = user._id ? user.toJSON() : user;
    this.io.to('admins').emit('user:updated', {
      userId,
      updates: updates,
      timestamp: new Date()
    });
    this.io.to('guards').emit('user:updated', {
      userId,
      updates: updates,
      timestamp: new Date()
    });
  }

  // Broadcast user deleted (to admins and guards)
  broadcastUserDeleted(userId) {
    this.io.to('admins').emit('user:deleted', {
      userId,
      timestamp: new Date()
    });
    this.io.to('guards').emit('user:deleted', {
      userId,
      timestamp: new Date()
    });
  }

  // Broadcast apartment created (to admins)
  broadcastApartmentCreated(apartment) {
    this.io.to('admins').emit('apartment:created', {
      apartment,
      timestamp: new Date()
    });
  }

  // Broadcast apartment updated (to admins)
  broadcastApartmentUpdated(apartmentId, updates) {
    this.io.to('admins').emit('apartment:updated', {
      apartmentId,
      updates,
      timestamp: new Date()
    });
  }

  // Broadcast apartment updated to tenants in the apartment
  broadcastApartmentUpdatedToTenants(apartmentId, updates) {
    this.io.to(`apartment-${apartmentId}`).emit('apartment:updated', {
      apartmentId,
      updates,
      timestamp: new Date()
    });
  }

  // Broadcast apartment deleted (to admins)
  broadcastApartmentDeleted(apartmentId) {
    this.io.to('admins').emit('apartment:deleted', {
      apartmentId,
      timestamp: new Date()
    });
  }

  // Broadcast notification to user
  broadcastNotification(userId, notification) {
    this.io.to(`user-${userId}`).emit('notification:new', notification);
  }

  // Broadcast emergency alert to all users in apartment
  broadcastEmergency(apartmentId, emergency) {
    this.io.to(`apartment-${apartmentId}`).emit('emergency:new', {
      emergency,
      timestamp: new Date()
    });
    this.io.to('admins').emit('emergency:new', {
      emergency,
      timestamp: new Date()
    });
  }

  // Broadcast announcement to all users
  broadcastAnnouncement(announcement) {
    this.io.emit('announcement:new', {
      announcement,
      timestamp: new Date()
    });
  }

  // Broadcast access log to relevant users
  broadcastAccessLog(apartmentId, accessLog) {
    this.io.to(`apartment-${apartmentId}`).emit('access:new', {
      accessLog,
      timestamp: new Date()
    });
    this.io.to('admins').emit('access:new', {
      accessLog,
      timestamp: new Date()
    });
  }

  // Broadcast report update
  broadcastReport(report) {
    this.io.to('admins').emit('report:new', {
      report,
      timestamp: new Date()
    });
  }

  // Broadcast payment update
  broadcastPaymentUpdate(userId, payment) {
    this.io.to(`user-${userId}`).emit('payment:update', payment);
    this.io.to('admins').emit('payment:new', payment);
  }

  // Broadcast maintenance request created
  broadcastMaintenanceCreated(request) {
    // Notify maintenance staff and admins
    this.io.to('maintenance-staff').emit('maintenance:new', request);
    this.io.to('admins').emit('maintenance:new', request);
    
    // Notify the specific tenant who created it
    if (request.reportedBy) {
      this.io.to(`user-${request.reportedBy._id || request.reportedBy}`).emit('maintenance:created', request);
    }
  }

  // Broadcast maintenance request status update
  broadcastMaintenanceUpdated(requestId, updates) {
    const payload = { requestId, updates, timestamp: new Date() };
    this.io.to('maintenance-staff').emit('maintenance:updated', payload);
    this.io.to('admins').emit('maintenance:updated', payload);
    
    // Notify the tenant involved
    const targetId = updates.reportedBy?._id || updates.reportedBy || updates.userId;
    if (targetId) {
      this.io.to(`user-${targetId}`).emit('maintenance:status_change', payload);
    }
    
    this.io.emit(`maintenance:update:${requestId}`, payload);
  }

  // Broadcast maintenance request deleted
  broadcastMaintenanceDeleted(requestId) {
    const payload = { requestId, timestamp: new Date() };
    this.io.to('maintenance-staff').emit('maintenance:deleted', payload);
    this.io.to('admins').emit('maintenance:deleted', payload);
  }

  // Broadcast user presence status to everyone in the directory
  broadcastUserStatus(userId, isOnline) {
    this.io.emit('user:presence', {
      userId,
      isOnline,
      timestamp: new Date()
    });
  }

  // Returns currently connected users on this node
  getOnlineUserIds() {
    const ids = [];
    for (const conn of this.activeConnections.values()) {
      if (conn.userId) ids.push(conn.userId.toString());
    }
    return ids;
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.connectionCount,
      activeConnections: this.activeConnections.size,
      rooms: this.io?.sockets?.adapter?.rooms?.size || 0
    };
  }

  // Graceful shutdown
  async shutdown() {
    try {
      if (this.io) {
        this.io.close();
        console.log('✅ WebSocket server closed');
      }
      
      if (this.pubClient) {
        await this.pubClient.quit();
        console.log('✅ Redis pub client closed');
      }
      
      if (this.subClient) {
        await this.subClient.quit();
        console.log('✅ Redis sub client closed');
      }
    } catch (error) {
      console.error('❌ Error closing WebSocket cluster:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new WebSocketClusterService();
