// WebSocket Service for real-time communication

const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

// Initialize socket handlers
const initializeSocket = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
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

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.userId})`);

    // Join rooms based on role
    joinRooms(socket);

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
    });

    socket.on('join:admin', () => {
      if (socket.user.role === 'admin') {
        socket.join('admins');
        console.log(`Socket ${socket.user.name} joined admins`);
      }
    });

    socket.on('join:guards', () => {
      if (socket.user.role === 'guard') {
        socket.join('guards');
      }
    });

    socket.on('join:tenants', () => {
      if (socket.user.role === 'tenant') {
        socket.join('tenants');
        console.log(`Socket ${socket.user.name} joined tenants`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });

    // Handle ping for connection check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  return io;
};

// Join appropriate rooms based on user role
const joinRooms = (socket) => {
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
  }
};

// Emit to specific user
const emitToUser = (io, userId, event, data) => {
  io.to(`user-${userId}`).emit(event, data);
};

// Emit to tenant
const emitToTenant = (io, tenantId, event, data) => {
  io.to(`tenant-${tenantId}`).emit(event, data);
};

// Emit to guard
const emitToGuard = (io, guardId, event, data) => {
  io.to(`guard-${guardId}`).emit(event, data);
};

// Emit to all guards in an apartment
const emitToApartmentGuards = (io, apartmentId, event, data) => {
  io.to(`apartment-guards-${apartmentId}`).emit(event, data);
};

// Emit to all users in an apartment
const emitToApartment = (io, apartmentId, event, data) => {
  io.to(`apartment-${apartmentId}`).emit(event, data);
};

// Broadcast visitor arrival
const broadcastVisitorArrival = (io, apartmentId, tenantId, visitor) => {
  io.to(`tenant-${tenantId}`).emit('visitor:arrived', {
    visitor,
    timestamp: new Date()
  });
};

// Broadcast delivery arrival
const broadcastDeliveryArrival = (io, apartmentId, tenantId, delivery) => {
  io.to(`tenant-${tenantId}`).emit('delivery:arrived', {
    delivery,
    timestamp: new Date()
  });
};

// Broadcast access status change
const broadcastAccessStatus = (io, apartmentId, data) => {
  io.to(`apartment-${apartmentId}`).emit('access:status', {
    ...data,
    timestamp: new Date()
  });
};

// Broadcast user created (to admins and guards)
const broadcastUserCreated = (io, user) => {
  io.to('admins').emit('user:created', {
    user,
    timestamp: new Date()
  });
};

// Broadcast user updated (to admins and guards)
const broadcastUserUpdated = (io, userId, user) => {
  // Support both old format (userId, updates) and new format (userId, fullUser)
  const updates = user._id ? user.toJSON() : user;
  io.to('admins').emit('user:updated', {
    userId,
    updates: updates,
    timestamp: new Date()
  });
};

// Broadcast user deleted (to admins and guards)
const broadcastUserDeleted = (io, userId) => {
  io.to('admins').emit('user:deleted', {
    userId,
    timestamp: new Date()
  });
};

// Broadcast apartment created (to admins)
const broadcastApartmentCreated = (io, apartment) => {
  io.to('admins').emit('apartment:created', {
    apartment,
    timestamp: new Date()
  });
};

// Broadcast apartment updated (to admins)
const broadcastApartmentUpdated = (io, apartmentId, updates) => {
  io.to('admins').emit('apartment:updated', {
    apartmentId,
    updates,
    timestamp: new Date()
  });
};

// Broadcast apartment updated to tenants in the apartment
const broadcastApartmentUpdatedToTenants = (io, apartmentId, updates) => {
  io.to(`apartment-${apartmentId}`).emit('apartment:updated', {
    apartmentId,
    updates,
    timestamp: new Date()
  });
};

// Broadcast apartment deleted (to admins)
const broadcastApartmentDeleted = (io, apartmentId) => {
  io.to('admins').emit('apartment:deleted', {
    apartmentId,
    timestamp: new Date()
  });
};

// Broadcast notification to user
const broadcastNotification = (io, userId, notification) => {
  io.to(`user-${userId}`).emit('notification:new', notification);
};

// Broadcast emergency alert to all users in apartment
const broadcastEmergency = (io, apartmentId, emergency) => {
  io.to(`apartment-${apartmentId}`).emit('emergency:new', {
    emergency,
    timestamp: new Date()
  });
  io.to('admins').emit('emergency:new', {
    emergency,
    timestamp: new Date()
  });
};

// Broadcast announcement to all users
const broadcastAnnouncement = (io, announcement) => {
  io.emit('announcement:new', {
    announcement,
    timestamp: new Date()
  });
};

// Broadcast access log to relevant users
const broadcastAccessLog = (io, apartmentId, accessLog) => {
  io.to(`apartment-${apartmentId}`).emit('access:new', {
    accessLog,
    timestamp: new Date()
  });
  io.to('admins').emit('access:new', {
    accessLog,
    timestamp: new Date()
  });
};

// Broadcast report update
const broadcastReport = (io, report) => {
  io.to('admins').emit('report:new', {
    report,
    timestamp: new Date()
  });
};

// Broadcast payment update
const broadcastPaymentUpdate = (io, userId, payment) => {
  io.to(`user-${userId}`).emit('payment:update', payment);
  io.to('admins').emit('payment:new', payment);
};

// Broadcast rent payment update (for real-time tenant-admin communication)
const broadcastRentPayment = (io, apartmentId, payment) => {
  // Notify the specific tenant who made the payment
  if (payment.userId) {
    io.to(`user-${payment.userId}`).emit('rent:paid', {
      payment,
      timestamp: new Date()
    });
  }
  
  // Notify all admins
  io.to('admins').emit('rent:received', {
    payment,
    timestamp: new Date()
  });

  // Notify apartment-specific room if exists
  if (apartmentId) {
    io.to(`apartment-${apartmentId}`).emit('rent:update', {
      payment,
      timestamp: new Date()
    });
  }
};

// Broadcast tenant rent status change
const broadcastRentStatusChange = (io, apartmentId, tenantId, status) => {
  io.to(`user-${tenantId}`).emit('rent:status', status);
  io.to('admins').emit('tenant:rentStatus', {
    tenantId,
    status,
    timestamp: new Date()
  });
};

module.exports = {
  initializeSocket,
  emitToUser,
  emitToTenant,
  emitToGuard,
  emitToApartmentGuards,
  emitToApartment,
  broadcastVisitorArrival,
  broadcastDeliveryArrival,
  broadcastAccessStatus,
  broadcastUserCreated,
  broadcastUserUpdated,
  broadcastUserDeleted,
  broadcastApartmentCreated,
  broadcastApartmentUpdated,
  broadcastApartmentUpdatedToTenants,
  broadcastApartmentDeleted,
  broadcastNotification,
  broadcastEmergency,
  broadcastAnnouncement,
  broadcastAccessLog,
  broadcastReport,
  broadcastPaymentUpdate,
  broadcastRentPayment,
  broadcastRentStatusChange
};
