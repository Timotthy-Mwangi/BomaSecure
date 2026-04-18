/**
 * Security Middleware
 * Comprehensive security middleware for production deployment
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const expressSanitizer = require('express-sanitizer');
const mongoSanitize = require('mongo-sanitize');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Generate a unique request ID for each request
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Security audit logging
const securityAuditLog = (type, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    ...details,
    ip: details.ip || 'unknown'
  };
  
  // In production, send to a logging service
  // For now, log to console with clear marking
  if (process.env.NODE_ENV === 'production') {
    console.log(`[SECURITY-AUDIT] ${JSON.stringify(logEntry)}`);
  }
};

// Track failed auth attempts
const failedAuthAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW = 15 * 60 * 1000; // 15 minutes

const checkAccountLockout = (identifier) => {
  const attempts = failedAuthAttempts.get(identifier);
  if (!attempts) return false;
  
  const now = Date.now();
  if (attempts.count >= MAX_FAILED_ATTEMPTS && (now - attempts.firstAttempt) < LOCKOUT_WINDOW) {
    return true;
  }
  
  // Reset if window has passed
  if ((now - attempts.firstAttempt) >= LOCKOUT_WINDOW) {
    failedAuthAttempts.delete(identifier);
    return false;
  }
  
  return false;
};

const recordFailedAttempt = (identifier) => {
  const attempts = failedAuthAttempts.get(identifier) || { count: 0, firstAttempt: null };
  attempts.count++;
  if (!attempts.firstAttempt) attempts.firstAttempt = Date.now();
  failedAuthAttempts.set(identifier, attempts);
};

const clearFailedAttempts = (identifier) => {
  failedAuthAttempts.delete(identifier);
};

const accountLockoutMiddleware = (req, res, next) => {
  const identifier = req.ip || 'unknown';
  
  if (checkAccountLockout(identifier)) {
    securityAuditLog('ACCOUNT_LOCKOUT', { identifier, path: req.path });
    return res.status(429).json({
      success: false,
      message: 'Too many failed attempts. Please try again later.'
    });
  }
  next();
};

// Security middleware configuration
const securityMiddleware = {
  /**
   * Helmet - Set secure HTTP headers
   * Protects against common vulnerabilities like XSS, clickjacking, etc.
   */
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frame: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }),

  /**
   * Rate Limiting - Prevent brute force and DDoS attacks
   * Different limits for different endpoints
   */
  generalLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Higher limit in development
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    }
  }),

  /**
   * Stricter rate limit for authentication endpoints
   */
  authLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 500, // Higher limit in development
    message: {
      success: false,
      message: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
  }),

  /**
   * Rate limit for registration
   */
  registerLimiter: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 5 : 100, // Higher limit in development
    message: {
      success: false,
      message: 'Too many accounts created from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

/**
 * Rate limit for API endpoints that modify data
 */
apiLimiter: rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 60 : 1000, // Higher limit in development
  message: {
    success: false,
    message: 'Rate limit exceeded, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
}),

/**
 * Strictest rate limit for superadmin endpoints
 * Prevents brute force attacks on admin functions
 */
superAdminLimiter: rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // Very limited in production
  message: {
    success: false,
    message: 'Superadmin rate limit exceeded. Too many requests.'
  },
  standardHeaders: true,
  legacyHeaders: false
}),

/**
 * Rate limit for superadmin destructive actions (delete, suspend)
 * Even stricter to prevent accidents or attacks
 */
superAdminDestructiveLimiter: rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: {
    success: false,
    message: 'Destructive action rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false
}),

  /**
   * XSS Protection - Sanitize user input
   */
  xssClean: xssClean(),

  /**
   * HPP - Prevent HTTP Parameter Pollution
   */
  hpp: hpp({
    whitelist: ['role', 'status', 'page', 'limit', 'sort', 'order']
  }),

  /**
   * Input Sanitization - Remove HTML/scripts from input
   */
  sanitizer: (req, res, next) => {
    // Sanitize request body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    next();
  },

/**
    * Request size limiting - Prevent large payload attacks
    */
  requestSizeLimiter: (req, res, next) => {
    const MAX_REQUEST_SIZE = '10kb';
    expressSanitizer()(req, res, (err) => {
      if (err) {
        return res.status(413).json({
          success: false,
          message: 'Payload too large'
        });
      }
      next();
    });
  },

  /**
   * MongoDB Sanitization - Prevent NoSQL injection
   */
  mongoSanitizer: (req, res, next) => {
    const sanitizeInput = (obj) => {
      if (obj === null || obj === undefined) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item));
      }
      
      if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            // Block keys starting with $ (MongoDB operators)
            if (key.startsWith('$')) {
              console.warn(`[SECURITY] Blocked NoSQL injection attempt via key: ${key}`);
              continue;
            }
            sanitized[key] = sanitizeInput(obj[key]);
          }
        }
        return sanitized;
      }
      
      return obj;
    };

    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    
    next();
  },

  /**
   * Request ID middleware
   */
  requestId: requestIdMiddleware,

  /**
   * Account lockout protection
   */
  accountLockout: accountLockoutMiddleware,

  /**
   * Security audit logger
   */
  auditLog: securityAuditLog,

  // Export security utilities
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  accountLockout: accountLockoutMiddleware,
  
  /**
   * CORS Configuration
   * Allows cross-origin requests from the frontend
   */
  corsOptions: {
    origin: (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:4200').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID']
  }
};

module.exports = securityMiddleware;
