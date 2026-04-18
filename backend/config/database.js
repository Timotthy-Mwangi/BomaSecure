// Database Configuration for BomaSecure Scalability
// Implements connection pooling, read/write splitting, and optimization

const mongoose = require('mongoose');

class DatabaseManager {
  constructor() {
    this.writeConnection = null;
    this.readConnection = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.isShuttingDown = false;
  }

  // Initialize database connections with connection pooling
  async initialize() {
    try {
      await this.connectPrimary();
      
      // Setup read replica if configured
      if (process.env.MONGODB_READ_URI) {
        await this.connectReadReplica();
      }
      
      this.setupEventHandlers();
      this.isConnected = true;
      console.log('✅ Database connections established');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      // Don't crash - attempt reconnection
      this.scheduleReconnection();
      return false;
    }
  }

  // Connect to primary database (for writes)
  async connectPrimary() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bomasecure';
    
    const options = {
      // Connection pool settings for 1M+ users
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 100,
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 10,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      
      // Write concern for strong consistency
      retryWrites: true,
      w: 'majority',
      readConcern: { level: 'majority' },
      
      // Read preference
      readPreference: 'primary',
      
      // Performance settings
      autoIndex: false, // Disable in production for performance
      serverSelectionTimeoutMS: 15000,
      family: 4 // Force IPv4
    };

    // Use mongoose.connect() for the default connection so models work
    await mongoose.connect(uri, options);
    this.writeConnection = mongoose.connection;
    console.log('✅ Primary database connected');
    return this.writeConnection;
  }

  // Connect to read replica (for reads)
  async connectReadReplica() {
    const uri = process.env.MONGODB_READ_URI;
    
    const options = {
      // Connection pool settings
      maxPoolSize: parseInt(process.env.DB_READ_MAX_POOL_SIZE) || 200,
      minPoolSize: parseInt(process.env.DB_READ_MIN_POOL_SIZE) || 20,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      
      // Read from secondary replicas
      readPreference: 'secondaryPreferred',
      readConcern: { level: 'majority' },
      
      // Performance settings
      autoIndex: false,
      serverSelectionTimeoutMS: 15000,
      family: 4,
      
      // Compression
      compressors: ['snappy', 'zlib'],
      zlibCompressionLevel: 6
    };

    this.readConnection = await mongoose.createConnection(uri, options);
    console.log('✅ Read replica connected');
    return this.readConnection;
  }

  // Setup event handlers for monitoring
  setupEventHandlers() {
    // Primary connection events
    if (this.writeConnection) {
      this.writeConnection.on('connected', () => {
        console.log('🔗 Primary DB connected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.writeConnection.on('error', (err) => {
        console.error('❌ Primary DB error:', err.message);
        // Don't crash on errors
      });

      this.writeConnection.on('disconnected', () => {
        console.log('🔌 Primary DB disconnected');
        this.isConnected = false;
        if (!this.isShuttingDown) {
          this.scheduleReconnection();
        }
      });

      this.writeConnection.on('reconnected', () => {
        console.log('🔄 Primary DB reconnected');
        this.isConnected = true;
      });
    }

    // Read replica events
    if (this.readConnection) {
      this.readConnection.on('connected', () => {
        console.log('🔗 Read replica connected');
      });

      this.readConnection.on('error', (err) => {
        console.error('❌ Read replica error:', err.message);
        // Don't crash - fallback to primary
      });

      this.readConnection.on('disconnected', () => {
        console.log('🔌 Read replica disconnected');
      });
    }
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnection() {
    if (this.connectionAttempts >= this.maxRetries || this.isShuttingDown) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.connectionAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    
    console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${this.connectionAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.error('❌ Reconnection failed:', error.message);
      }
    }, delay);
  }

  // Get write connection (primary)
  getWriteConnection() {
    return this.writeConnection || mongoose.connection;
  }

  // Get read connection (replica or fallback to primary)
  getReadConnection() {
    return this.readConnection || this.writeConnection || mongoose.connection;
  }

  // Execute query with timeout
  async executeWithTimeout(query, timeoutMs = 5000) {
    return Promise.race([
      query,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      )
    ]);
  }

  // Execute read query (routes to replica if available)
  async executeRead(model, operation, query, options = {}) {
    const connection = this.getReadConnection();
    const Model = connection.model(model);
    
    const timeout = options.timeout || 5000;
    
    try {
      return await this.executeWithTimeout(
        Model[operation](query).maxTimeMS(timeout),
        timeout
      );
    } catch (error) {
      console.error(`Read query error (${operation}):`, error.message);
      throw error;
    }
  }

  // Execute write query (routes to primary)
  async executeWrite(model, operation, data, options = {}) {
    const connection = this.getWriteConnection();
    const Model = connection.model(model);
    
    const timeout = options.timeout || 10000;
    
    try {
      return await this.executeWithTimeout(
        Model[operation](data).maxTimeMS(timeout),
        timeout
      );
    } catch (error) {
      console.error(`Write query error (${operation}):`, error.message);
      throw error;
    }
  }

  // Check database health
  async checkHealth() {
    try {
      // Use mongoose.connection as fallback since models are registered there
      const conn = mongoose.connection;
      
      let primaryOk = false;
      if (conn?.readyState === 1) {
        try {
          const result = await conn.db.admin().ping();
          primaryOk = result.ok === 1;
        } catch (pingErr) {
          console.error('Ping error:', pingErr.message);
        }
      }
      
      return {
        primary: primaryOk,
        replica: false, // Not used in this setup
        isConnected: conn?.readyState === 1
      };
    } catch (error) {
      return {
        primary: false,
        replica: false,
        isConnected: false,
        error: error.message
      };
    }
  }

  // Get connection statistics
  async getStats() {
    try {
      const stats = {
        primary: null,
        replica: null
      };

      if (this.writeConnection) {
        const primaryStats = await this.writeConnection.db.stats();
        stats.primary = {
          collections: primaryStats.collections,
          documents: primaryStats.objects,
          dataSize: primaryStats.dataSize,
          indexSize: primaryStats.indexSize,
          connections: this.writeConnection.client?.topology?.s?.pool?.size || 0
        };
      }

      if (this.readConnection) {
        const replicaStats = await this.readConnection.db.stats();
        stats.replica = {
          collections: replicaStats.collections,
          documents: replicaStats.objects,
          dataSize: replicaStats.dataSize,
          indexSize: replicaStats.indexSize,
          connections: this.readConnection.client?.topology?.s?.pool?.size || 0
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error.message);
      return null;
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      this.isShuttingDown = true;
      if (this.writeConnection) {
        await this.writeConnection.close();
        console.log('✅ Primary database connection closed');
      }
      
      if (this.readConnection) {
        await this.readConnection.close();
        console.log('✅ Read replica connection closed');
      }
      
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager();
