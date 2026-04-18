// Redis Configuration for BomaSecure Scalability
// Supports both single instance and cluster modes

const Redis = require('ioredis');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  // Initialize Redis connection with automatic fallback
  async initialize() {
    try {
      if (this.client) {
        return this.client;
      }

      // Check if Redis cluster is configured
      if (process.env.REDIS_CLUSTER_NODES) {
        await this.initializeCluster();
      } else {
        await this.initializeSingle();
      }

      this.setupEventHandlers();
      this.isConnected = true;
      console.log('✅ Redis connection established');
      return this.client;
    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message);
      // Don't crash - continue without Redis (graceful degradation)
      return null;
    }
  }

  // Initialize Redis Cluster for horizontal scaling
  async initializeCluster() {
    const nodes = process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
      const [host, port] = node.split(':');
      return { host, port: parseInt(port) || 6379 };
    });

    this.client = new Redis.Cluster(nodes, {
      scaleReads: 'slave', // Distribute reads to replicas
      maxRedirections: 16,
      retryDelayOnFailover: 100,
      enableOfflineQueue: true,
      enableReadyCheck: true,
      lazyConnect: false,
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10000,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > this.maxRetries) return null;
          return Math.min(times * 100, 3000);
        }
      }
    });
  }

  // Initialize single Redis instance (for development/smaller deployments)
  async initializeSingle() {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      
      // Connection settings
      connectTimeout: 10000,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > this.maxRetries) return null;
        return Math.min(times * 100, 3000);
      },
      
      // Performance settings
      enableReadyCheck: true,
      autoResendUnfulfilledCommands: true,
      autoResubscribe: true,
      
      // Reconnection settings
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    };

    this.client = new Redis(config);
  }

  // Setup event handlers for monitoring
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('🔗 Redis client connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis client error:', err.message);
      // Don't crash on Redis errors - log and continue
    });

    this.client.on('close', () => {
      console.log('🔌 Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay) => {
      this.connectionAttempts++;
      console.log(`🔄 Redis reconnecting (attempt ${this.connectionAttempts}) in ${delay}ms`);
    });

    this.client.on('end', () => {
      console.log('🛑 Redis client connection ended');
      this.isConnected = false;
    });
  }

  // Get Redis client instance
  getClient() {
    return this.client;
  }

  // Check if Redis is connected
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  // Graceful shutdown
  async shutdown() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('✅ Redis connection closed gracefully');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error.message);
      }
    }
  }
}

// Export singleton instance
module.exports = new RedisConfig();
