// Enhanced Rate Limiting Middleware for BomaSecure
// Implements distributed rate limiting with Redis for 1M+ users

const redisCacheService = require('../services/redisCacheService');

class EnhancedRateLimiter {
  constructor() {
    this.localLimits = new Map(); // Fallback for when Redis is unavailable
    this.cleanupInterval = null;
    
    // Start cleanup interval for local limits
    this.startCleanup();
  }

  // Start cleanup interval
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupLocalLimits();
    }, 60000); // Clean up every minute
  }

  // Cleanup expired local limits
  cleanupLocalLimits() {
    const now = Date.now();
    for (const [key, limit] of this.localLimits.entries()) {
      if (now - limit.windowStart > limit.windowMs * 2) {
        this.localLimits.delete(key);
      }
    }
  }

  // Create rate limiter middleware
  createLimiter(options = {}) {
    const {
      windowMs = 60 * 1000, // 1 minute
      max = 100, // Max requests per window
      message = 'Too many requests, please try again later',
      keyGenerator = null,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      handler = null
    } = options;

    return async (req, res, next) => {
      try {
        // Generate key
        const key = keyGenerator ? keyGenerator(req) : this.defaultKeyGenerator(req);
        
        // Check rate limit
        const result = await this.checkRateLimit(key, max, windowMs / 1000);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
        });

        if (!result.allowed) {
          // Custom handler or default response
          if (handler) {
            return handler(req, res, next);
          }
          
          return res.status(429).json({
            success: false,
            message: message,
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }

        // Track response for skip options
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalSend = res.send;
          res.send = function(body) {
            const statusCode = res.statusCode;
            
            if (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) {
              // Don't count successful requests
            } else if (skipFailedRequests && statusCode >= 400) {
              // Don't count failed requests
            } else {
              // Count this request
            }
            
            return originalSend.call(this, body);
          };
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error.message);
        // Allow request if rate limiting fails
        next();
      }
    };
  }

  // Default key generator
  defaultKeyGenerator(req) {
    // Use IP address and user ID if available
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.userId || 'anonymous';
    return `${ip}:${userId}`;
  }

  // Check rate limit
  async checkRateLimit(identifier, limit, windowSeconds) {
    // Try Redis first
    if (redisCacheService.isAvailable()) {
      try {
        return await redisCacheService.checkRateLimit(identifier, 'api', limit, windowSeconds);
      } catch (error) {
        console.error('Redis rate limit error:', error.message);
        // Fall back to local limiting
      }
    }

    // Local rate limiting fallback
    return this.checkLocalRateLimit(identifier, limit, windowSeconds * 1000);
  }

  // Local rate limiting
  checkLocalRateLimit(identifier, limit, windowMs) {
    const now = Date.now();
    const key = identifier;

    if (!this.localLimits.has(key)) {
      this.localLimits.set(key, {
        count: 1,
        windowStart: now,
        windowMs: windowMs
      });
      return { allowed: true, remaining: limit - 1 };
    }

    const limitData = this.localLimits.get(key);

    // Check if window has expired
    if (now - limitData.windowStart > windowMs) {
      // Reset window
      limitData.count = 1;
      limitData.windowStart = now;
      return { allowed: true, remaining: limit - 1 };
    }

    // Increment count
    limitData.count++;

    const remaining = Math.max(0, limit - limitData.count);
    const allowed = limitData.count <= limit;

    return { allowed, remaining };
  }

  // Create auth rate limiter (stricter)
  createAuthLimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 20 : 500, // Higher limit in development
      message: 'Too many authentication attempts, please try again later',
      keyGenerator: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        return `auth:${ip}`;
      }
    });
  }

  // Create API rate limiter (standard)
  createApiLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
      message: 'API rate limit exceeded'
    });
  }

  // Create strict rate limiter (for sensitive endpoints)
  createStrictLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: process.env.NODE_ENV === 'production' ? 20 : 500, // Higher limit in development
      message: 'Rate limit exceeded for this endpoint'
    });
  }

  // Create WebSocket rate limiter
  createWebSocketLimiter() {
    return this.createLimiter({
      windowMs: 1000, // 1 second
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
      message: 'WebSocket rate limit exceeded',
      keyGenerator: (req) => {
        const userId = req.user?.userId || req.ip;
        return `ws:${userId}`;
      }
    });
  }

  // Rate limit by user tier
  createTierLimiter(tier = 'free') {
    const isProd = process.env.NODE_ENV === 'production';
    const limits = {
      free: { windowMs: 60 * 1000, max: isProd ? 60 : 500 },
      basic: { windowMs: 60 * 1000, max: isProd ? 120 : 1000 },
      premium: { windowMs: 60 * 1000, max: isProd ? 300 : 2000 },
      enterprise: { windowMs: 60 * 1000, max: isProd ? 1000 : 5000 }
    };

    const config = limits[tier] || limits.free;

    return this.createLimiter({
      ...config,
      message: `Rate limit exceeded for ${tier} tier`,
      keyGenerator: (req) => {
        const userId = req.user?.userId || req.ip;
        return `tier:${tier}:${userId}`;
      }
    });
  }

  // Get rate limit status
  async getStatus(identifier) {
    if (redisCacheService.isAvailable()) {
      try {
        const key = `bomasecure:ratelimit:api:${identifier}`;
        const count = await redisCacheService.client.get(key);
        return {
          identifier,
          count: count ? parseInt(count) : 0,
          source: 'redis'
        };
      } catch (error) {
        console.error('Error getting rate limit status:', error.message);
      }
    }

    // Local fallback
    const limitData = this.localLimits.get(identifier);
    return {
      identifier,
      count: limitData ? limitData.count : 0,
      source: 'local'
    };
  }

  // Reset rate limit for identifier
  async resetLimit(identifier) {
    if (redisCacheService.isAvailable()) {
      try {
        const key = `bomasecure:ratelimit:api:${identifier}`;
        await redisCacheService.client.del(key);
        return true;
      } catch (error) {
        console.error('Error resetting rate limit:', error.message);
      }
    }

    // Local fallback
    this.localLimits.delete(identifier);
    return true;
  }

  // Get all rate limit stats
  async getStats() {
    const stats = {
      redis: redisCacheService.isAvailable(),
      localLimits: this.localLimits.size,
      timestamp: new Date()
    };

    if (redisCacheService.isAvailable()) {
      try {
        const keys = await redisCacheService.client.keys('bomasecure:ratelimit:*');
        stats.redisKeys = keys.length;
      } catch (error) {
        stats.redisError = error.message;
      }
    }

    return stats;
  }

  // Cleanup
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.localLimits.clear();
  }
}

// Export singleton instance
module.exports = new EnhancedRateLimiter();
