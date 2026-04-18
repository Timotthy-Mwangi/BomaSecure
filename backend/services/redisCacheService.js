// Redis Caching Service for BomaSecure
// Implements intelligent caching strategies for 1M+ users

const redisConfig = require('../config/redis');

class RedisCacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 3600; // 1 hour default
    this.prefix = 'bomasecure:';
  }

  // Initialize the cache service
  async initialize() {
    this.client = await redisConfig.initialize();
    if (!this.client) {
      console.warn('⚠️ Redis not available - caching disabled');
    }
    return this.client;
  }

  // Check if caching is available
  isAvailable() {
    return this.client && redisConfig.isReady();
  }

  // Generate cache key with prefix
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  // ==================== USER CACHING ====================
  
  // Cache user data (1 hour TTL)
  async cacheUser(userId, userData) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`user:${userId}`);
      await this.client.setex(
        key,
        3600, // 1 hour
        JSON.stringify(userData)
      );
      return true;
    } catch (error) {
      console.error('Cache error (cacheUser):', error.message);
      return false;
    }
  }

  // Get cached user
  async getUser(userId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`user:${userId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache error (getUser):', error.message);
      return null;
    }
  }

  // Invalidate user cache
  async invalidateUser(userId) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = this.getKey(`user:${userId}`);
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache error (invalidateUser):', error.message);
      return false;
    }
  }

  // ==================== APARTMENT CACHING ====================
  
  // Cache apartment data (5 minutes TTL)
  async cacheApartment(apartmentId, apartmentData) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`apartment:${apartmentId}`);
      const pipeline = this.client.pipeline();
      
      pipeline.setex(key, 300, JSON.stringify(apartmentData));
      
      // Cache apartment members if available
      if (apartmentData.tenants && apartmentData.tenants.length > 0) {
        pipeline.sadd(
          this.getKey(`apartment:members:${apartmentId}`),
          ...apartmentData.tenants.map(t => t.toString())
        );
        pipeline.expire(this.getKey(`apartment:members:${apartmentId}`), 300);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache error (cacheApartment):', error.message);
      return false;
    }
  }

  // Get cached apartment
  async getApartment(apartmentId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`apartment:${apartmentId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache error (getApartment):', error.message);
      return null;
    }
  }

  // Invalidate apartment cache
  async invalidateApartment(apartmentId) {
    if (!this.isAvailable()) return false;
    
    try {
      const keys = [
        this.getKey(`apartment:${apartmentId}`),
        this.getKey(`apartment:members:${apartmentId}`),
        this.getKey(`apartment:stats:${apartmentId}`)
      ];
      await this.client.del(...keys);
      return true;
    } catch (error) {
      console.error('Cache error (invalidateApartment):', error.message);
      return false;
    }
  }

  // ==================== VISITOR CACHING ====================
  
  // Cache active visitors for apartment (2 minutes TTL)
  async cacheActiveVisitors(apartmentId, visitors) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`visitors:active:${apartmentId}`);
      await this.client.setex(key, 120, JSON.stringify(visitors));
      return true;
    } catch (error) {
      console.error('Cache error (cacheActiveVisitors):', error.message);
      return false;
    }
  }

  // Get cached active visitors
  async getActiveVisitors(apartmentId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`visitors:active:${apartmentId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache error (getActiveVisitors):', error.message);
      return null;
    }
  }

  // Increment active visitor count
  async incrementActiveVisitors(apartmentId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`visitors:count:${apartmentId}`);
      const count = await this.client.incr(key);
      
      // Set expiry on first increment
      if (count === 1) {
        await this.client.expire(key, 300); // 5 minutes
      }
      
      return count;
    } catch (error) {
      console.error('Cache error (incrementActiveVisitors):', error.message);
      return null;
    }
  }

  // Decrement active visitor count
  async decrementActiveVisitors(apartmentId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`visitors:count:${apartmentId}`);
      const count = await this.client.decr(key);
      return Math.max(0, count);
    } catch (error) {
      console.error('Cache error (decrementActiveVisitors):', error.message);
      return null;
    }
  }

  // Get active visitor count
  async getActiveVisitorCount(apartmentId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`visitors:count:${apartmentId}`);
      const count = await this.client.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error('Cache error (getActiveVisitorCount):', error.message);
      return null;
    }
  }

  // ==================== RATE LIMITING ====================
  
  // Check and increment rate limit
  async checkRateLimit(identifier, action, limit = 1000, windowSeconds = 60) {
    if (!this.isAvailable()) return { allowed: true, remaining: limit };
    
    try {
      const key = this.getKey(`ratelimit:${action}:${identifier}`);
      const current = await this.client.incr(key);
      
      // Set expiry on first request
      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }
      
      const remaining = Math.max(0, limit - current);
      const allowed = current <= limit;
      
      return { allowed, remaining, current };
    } catch (error) {
      console.error('Cache error (checkRateLimit):', error.message);
      // Allow request if rate limiting fails
      return { allowed: true, remaining: limit };
    }
  }

  // ==================== SESSION CACHING ====================
  
  // Cache user session
  async cacheSession(sessionId, sessionData, ttl = 86400) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`session:${sessionId}`);
      await this.client.setex(key, ttl, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('Cache error (cacheSession):', error.message);
      return false;
    }
  }

  // Get cached session
  async getSession(sessionId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`session:${sessionId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache error (getSession):', error.message);
      return null;
    }
  }

  // Invalidate session
  async invalidateSession(sessionId) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = this.getKey(`session:${sessionId}`);
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache error (invalidateSession):', error.message);
      return false;
    }
  }

  // ==================== STATISTICS CACHING ====================
  
  // Cache apartment statistics
  async cacheApartmentStats(apartmentId, stats) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`stats:apartment:${apartmentId}`);
      await this.client.setex(key, 60, JSON.stringify(stats)); // 1 minute TTL
      return true;
    } catch (error) {
      console.error('Cache error (cacheApartmentStats):', error.message);
      return false;
    }
  }

  // Get cached apartment statistics
  async getApartmentStats(apartmentId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`stats:apartment:${apartmentId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache error (getApartmentStats):', error.message);
      return null;
    }
  }

  // ==================== REAL-TIME DATA ====================
  
  // Store offline notification for later delivery
  async storeOfflineNotification(userId, event, data) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = this.getKey(`offline:${userId}`);
      const notification = {
        event,
        data,
        timestamp: Date.now()
      };
      
      await this.client.lpush(key, JSON.stringify(notification));
      await this.client.ltrim(key, 0, 99); // Keep last 100 notifications
      await this.client.expire(key, 86400); // 24 hours
      
      return true;
    } catch (error) {
      console.error('Cache error (storeOfflineNotification):', error.message);
      return false;
    }
  }

  // Get offline notifications
  async getOfflineNotifications(userId) {
    if (!this.isAvailable()) return [];
    
    try {
      const key = this.getKey(`offline:${userId}`);
      const notifications = await this.client.lrange(key, 0, -1);
      
      // Clear after retrieval
      if (notifications.length > 0) {
        await this.client.del(key);
      }
      
      return notifications.map(n => JSON.parse(n));
    } catch (error) {
      console.error('Cache error (getOfflineNotifications):', error.message);
      return [];
    }
  }

  // ==================== CACHE MANAGEMENT ====================
  
  // Clear all cache (use with caution)
  async clearAll() {
    if (!this.isAvailable()) return false;
    
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      console.log(`🗑️ Cleared ${keys.length} cache entries`);
      return true;
    } catch (error) {
      console.error('Cache error (clearAll):', error.message);
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    if (!this.isAvailable()) return null;
    
    try {
      const info = await this.client.info('memory');
      const keys = await this.client.keys(`${this.prefix}*`);
      
      return {
        totalKeys: keys.length,
        memoryInfo: info,
        isConnected: redisConfig.isReady()
      };
    } catch (error) {
      console.error('Cache error (getStats):', error.message);
      return null;
    }
  }

  // Graceful shutdown
  async shutdown() {
    await redisConfig.shutdown();
  }
}

// Export singleton instance
module.exports = new RedisCacheService();
